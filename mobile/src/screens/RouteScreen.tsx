// Ported from project/app/screens-extra.jsx (`RouteScreen`) — plan a point-to-point
// route with a battery-aware charge stop, or browse the "Guia Flui" curated
// road-trip itineraries (src/components/guide/Guide.tsx) and open one.
//
// State machine mirrors the source 1:1: `guide` (non-null) swaps the whole screen
// for <GuideDetail>; `rateGuide` is lifted here (not local to GuideDetail) exactly
// like the source, since RateFlow renders as a sibling overlay of GuideDetail's
// content rather than being owned by it. `done` gates the calculated-route summary
// vs. the guide browser, `battery` drives the battery-at-departure control.
//
// `onNavigate` (station hand-off from within a guide) does not appear anywhere in
// the source RouteScreen/GuideDetail — grepped, zero occurrences — so it is not
// wired here (per the porting task, only wire what the source actually calls).
import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, Seal } from '../components/icons/Icon';
import { GuideBrowser, GuideDetail } from '../components/guide/Guide';
import { useTheme } from '../theme/ThemeContext';
import { focus } from '../theme/tokens';
import { useToast } from '../state/ToastContext';
import { useCar } from '../state/CarContext';
import { batteryAfterDistance, chargeMinutesAtPower, effectiveChargePowerKw } from '../utils/evCharging';
import { DATA } from '../data/data';
import { Guide, GuideStop, RouteStop } from '../data/types';
import { RootStackParamList } from '../navigation/types';

// Curated geography of DATA.route's single scripted charge stop (see its `sub`
// text: "Recarga 18 min · 50→80% · km 32") — the *position* stays fixed (it's a
// curated real route, not a search result), but every number attached to it
// (battery on arrival, charge duration, connector compatibility) is now computed
// per the driver's selected car via src/utils/evCharging.ts instead of being the
// static numbers DATA.route.stops shipped with.
const CHARGE_STOP_KM = 32;
const CHARGE_CONNECTORS = ['CCS2', 'Type 2'];
const CHARGE_TARGET_PCT = 80;

function effectiveKwLabel(effectiveKw: number, stationKw: number): string {
  return effectiveKw < stationKw ? `carrega a até ${effectiveKw} kW (ponto oferece ${stationKw} kW)` : `carrega na potência máxima do ponto, ${stationKw} kW`;
}

// ---- battery slider ----
// Source uses a native `<input type="range">`. RN has no built-in slider primitive
// and no slider library is a dependency of this project, so this is a small
// PanResponder-driven equivalent with the same min/max semantics, plus
// accessibilityRole="adjustable" + increment/decrement actions so screen-reader
// users get the same step control a native range input would give them.
function BatterySlider({
  value,
  onChange,
  min = 10,
  max = 100,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));

  const setFromX = (x: number) => {
    if (width <= 0) return;
    const ratio = Math.max(0, Math.min(1, x / width));
    onChange(Math.round(min + ratio * (max - min)));
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => setFromX(e.nativeEvent.locationX),
      onPanResponderMove: (e) => setFromX(e.nativeEvent.locationX),
    })
  ).current;

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      {...pan.panHandlers}
      accessibilityRole="adjustable"
      accessibilityLabel="Bateria na saída"
      accessibilityValue={{ min, max, now: value, text: `${value}%` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment') onChange(Math.min(max, value + 5));
        else if (e.nativeEvent.actionName === 'decrement') onChange(Math.max(min, value - 5));
      }}
      style={{ height: 44, justifyContent: 'center' }}
    >
      <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.surface3, overflow: 'hidden' }}>
        <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: colors.primary }} />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: `${pct * 100}%`,
          marginLeft: -11,
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: colors.surface,
          borderWidth: 2,
          borderColor: colors.primary,
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 4,
          elevation: 3,
        }}
      />
    </View>
  );
}

export function RouteScreen() {
  const { colors, font, space } = useTheme();
  const { pushToast } = useToast();
  const { car } = useCar();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const R = DATA.route;

  const [battery, setBattery] = useState(R.startBattery);
  const [done, setDone] = useState(false);
  const [guide, setGuide] = useState<Guide | null>(null);
  const [rateGuide, setRateGuide] = useState<Guide | null>(null);

  const onStartTrip = (g: Guide) => navigation.navigate('Trip', { guide: g });

  // Recomputes every number on the route whenever the driver changes the
  // departure battery or their selected car — see the module comment above.
  const plan = useMemo(() => {
    const chargeStop = R.stops.find((s) => s.kind === 'charge');
    const stationPower = chargeStop?.power ?? 150;
    const compatible = CHARGE_CONNECTORS.includes(car.connector);
    const distAfterCharge = Math.max(0, R.distance - CHARGE_STOP_KM);

    const batteryAtCharge = batteryAfterDistance(car, battery, CHARGE_STOP_KM);
    const chargeMinutes = compatible ? chargeMinutesAtPower(car, stationPower, batteryAtCharge, CHARGE_TARGET_PCT) : null;
    const arriveBattery = compatible
      ? batteryAfterDistance(car, CHARGE_TARGET_PCT, distAfterCharge)
      : batteryAfterDistance(car, battery, R.distance); // no viable charge stop for this connector — project the whole distance on departure battery, so the shortfall is visible

    const stops: RouteStop[] = R.stops.map((s) => {
      if (s.kind === 'start') return { ...s, battery, sub: `Saída · bateria ${battery}%` };
      if (s.kind === 'charge') {
        return {
          ...s,
          battery: batteryAtCharge,
          // `undefined` (not the curated 18 min default) when the connector doesn't
          // match — there's no real charge time to report if the car can't plug in.
          time: compatible && chargeMinutes != null ? chargeMinutes : undefined,
          power: stationPower,
          sub: compatible
            ? `Recarga ${chargeMinutes} min · ${batteryAtCharge}→${CHARGE_TARGET_PCT}% · km ${CHARGE_STOP_KM}`
            : `Conector incompatível com o seu ${car.brand} ${car.model} (usa ${car.connector}) · km ${CHARGE_STOP_KM}`,
        };
      }
      return { ...s, battery: arriveBattery, sub: `Chegada · bateria ${arriveBattery}%` };
    });

    return {
      compatible,
      chargeMinutes,
      batteryAtCharge,
      arriveBattery,
      effectiveKw: effectiveChargePowerKw(car, stationPower),
      stationPower,
      stops,
    };
  }, [car, battery, R]);

  if (guide) {
    return (
      <GuideDetail
        g={guide}
        onBack={() => setGuide(null)}
        onStartTrip={onStartTrip}
        onRateGuide={setRateGuide}
        rateGuide={rateGuide}
        onCloseRate={() => setRateGuide(null)}
        onRateDone={(r) => {
          setRateGuide(null);
          pushToast(`Roteiro avaliado · +${r.watts} Watts`, 'check');
        }}
      />
    );
  }

  const chargeStops = R.stops.filter((s) => s.kind === 'charge').length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: insets.top + 14, paddingBottom: 96 }}>
        <Text style={{ fontFamily: font.display, fontSize: 30, marginBottom: 16, color: colors.ink }}>Planejar rota</Text>

        {/* inputs card */}
        <View style={{ padding: 16, marginBottom: 16, borderRadius: space.radius, backgroundColor: colors.surface }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <View style={{ paddingTop: 4, alignItems: 'center' }}>
              <View
                style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: focus, borderWidth: 2, borderColor: colors.surface }}
              />
              <View style={{ width: 2, height: 30, marginVertical: 4, backgroundColor: colors.lineStrong }} />
              <Icon name="nav" size={14} color={colors.primary} />
            </View>
            <View style={{ flex: 1, gap: 10 }}>
              {/* Source's inputs are uncontrolled (`defaultValue`, no onChange) — the
                  planner always calculates against the fixed DATA.route origin/destination
                  regardless of what's typed. Kept uncontrolled here for the same reason. */}
              <TextInput
                defaultValue={R.from}
                accessibilityLabel="Ponto de partida"
                style={{
                  padding: 14, borderRadius: 14, backgroundColor: colors.surface2,
                  borderWidth: 1.5, borderColor: colors.line, fontFamily: font.ui, fontSize: 16, color: colors.ink,
                }}
              />
              <TextInput
                defaultValue={R.to}
                accessibilityLabel="Destino"
                style={{
                  padding: 14, borderRadius: 14, backgroundColor: colors.surface2,
                  borderWidth: 1.5, borderColor: colors.line, fontFamily: font.ui, fontSize: 16, color: colors.ink,
                }}
              />
            </View>
          </View>

          <View style={{ marginTop: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="battery" size={15} color={colors.primary} />
                <Text style={{ fontWeight: '700', fontSize: 14, color: colors.ink }}>Bateria na saída</Text>
              </View>
              <Text style={{ fontFamily: font.mono, fontWeight: '600', color: colors.ink }}>{battery}%</Text>
            </View>
            <BatterySlider value={battery} onChange={setBattery} />
          </View>

          {/* car-aware summary — new, not in the source. Shows which car the plan is
              being calculated for and flags a charger mismatch before the driver taps
              "Calcular rota", instead of only surfacing it in the timeline below. */}
          <View
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14,
              padding: 10, borderRadius: 12,
              backgroundColor: plan.compatible ? colors.surface2 : colors.goldSoft,
            }}
          >
            <Icon name={plan.compatible ? 'car' : 'alert'} size={15} color={plan.compatible ? colors.inkSoft : colors.goldInk} />
            <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '600', color: plan.compatible ? colors.inkSoft : colors.goldInk }}>
              {plan.compatible
                ? `Calculado para o seu ${car.brand} ${car.model} · ${car.connector} · ${effectiveKwLabel(plan.effectiveKw, plan.stationPower)}`
                : `O ponto de recarga da rota não tem ${car.connector} (seu ${car.brand} ${car.model}) — a estimativa de bateria na chegada não considera recarga no caminho.`}
            </Text>
          </View>

          <Pressable
            onPress={() => {
              setDone(true);
              pushToast('Rota otimizada para o seu carro', 'check');
            }}
            accessibilityRole="button"
            accessibilityLabel="Calcular rota"
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 50,
              marginTop: 16, borderRadius: 999, paddingVertical: 16, backgroundColor: colors.primary,
            }}
          >
            <Icon name="route" size={18} color={colors.primaryInk} />
            <Text style={{ fontFamily: font.uiSemibold, fontSize: 16, fontWeight: '700', color: colors.primaryInk }}>Calcular rota</Text>
          </Pressable>
        </View>

        {done && (
          <View>
            {/* summary */}
            <View
              style={{
                flexDirection: 'row', justifyContent: 'space-around', padding: 16, marginBottom: 16,
                borderRadius: space.radius, backgroundColor: colors.surface,
              }}
            >
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontFamily: font.display, fontSize: 21, color: colors.ink }}>
                  {R.distance}
                  <Text style={{ fontSize: 12 }}> km</Text>
                </Text>
                <Text style={{ fontSize: 11, color: colors.inkFaint }}>distância</Text>
              </View>
              <View style={{ width: 1, backgroundColor: colors.line }} />
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontFamily: font.display, fontSize: 21, color: colors.ink }}>{R.duration}</Text>
                <Text style={{ fontSize: 11, color: colors.inkFaint }}>1 parada</Text>
              </View>
              <View style={{ width: 1, backgroundColor: colors.line }} />
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontFamily: font.display, fontSize: 21, color: colors.ok }}>{plan.arriveBattery}%</Text>
                <Text style={{ fontSize: 11, color: colors.inkFaint }}>na chegada</Text>
              </View>
            </View>

            <Text
              style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14, color: colors.inkFaint }}
            >
              Sua rota com recarga
            </Text>

            <View style={{ position: 'relative', paddingLeft: 30 }}>
              <View style={{ position: 'absolute', left: 9, top: 8, bottom: 8, width: 2, backgroundColor: colors.lineStrong }} />
              {plan.stops.map((s, i) => {
                const isCharge = s.kind === 'charge';
                const hasChargeTime = isCharge && s.time != null;
                const label = `${s.name}, ${s.sub}, bateria ${s.battery}%${hasChargeTime ? `, recarga de ${s.time} minutos, ${s.power} kW` : ''}`;
                return (
                  <View key={i} style={{ position: 'relative', marginBottom: 18 }} accessible accessibilityLabel={label}>
                    <View
                      style={{
                        position: 'absolute', left: -30, top: 3, width: 20, height: 20, borderRadius: 10,
                        backgroundColor: isCharge ? colors.primary : colors.surface,
                        borderWidth: isCharge ? 0 : 2, borderColor: colors.primary,
                      }}
                    />
                    <View style={{ padding: 14, borderRadius: space.radius, backgroundColor: colors.surface }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                            {isCharge && <Icon name="zap" size={16} color={colors.primary} />}
                            <Text style={{ fontWeight: '700', fontSize: 16, color: colors.ink }}>{s.name}</Text>
                            {!!s.selo && s.selo > 0 && <Seal size={15} color={colors.gold} />}
                          </View>
                          <Text style={{ fontSize: 12, marginTop: 3, color: colors.inkFaint }}>{s.sub}</Text>
                        </View>
                        <Text
                          style={{ fontFamily: font.mono, fontWeight: '600', fontSize: 15, color: s.battery < 30 ? colors.busy : colors.ink }}
                        >
                          {s.battery}%
                        </Text>
                      </View>
                      {hasChargeTime && (
                        <View
                          style={{
                            marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: colors.primarySoft,
                            flexDirection: 'row', alignItems: 'center', gap: 10,
                          }}
                        >
                          <Icon name="coffee" size={20} color={colors.primarySoftInk} />
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontWeight: '700', fontSize: 13, color: colors.primarySoftInk }}>
                              Enquanto carrega ({s.time} min)
                            </Text>
                            <Text style={{ fontSize: 12, color: colors.primarySoftInk, opacity: 0.85 }}>
                              Tempo pra um café e esticar as pernas
                            </Text>
                          </View>
                          <View style={{ paddingVertical: 4, paddingHorizontal: 8, borderRadius: 7, backgroundColor: colors.surface }}>
                            <Text style={{ fontFamily: font.mono, fontSize: 11, fontWeight: '600', color: colors.inkSoft }}>
                              {s.power} kW
                            </Text>
                          </View>
                        </View>
                      )}
                      {isCharge && !hasChargeTime && (
                        <View
                          style={{
                            marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: colors.goldSoft,
                            flexDirection: 'row', alignItems: 'center', gap: 10,
                          }}
                        >
                          <Icon name="alert" size={18} color={colors.goldInk} />
                          <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '600', color: colors.goldInk }}>
                            Conector incompatível com o seu carro — sem recarga real neste ponto.
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>

            <Pressable
              onPress={() =>
                onStartTrip({
                  id: 'planned',
                  // Source builds a partial, untyped guide-like object here (plain JS,
                  // no shape check). The RN `Trip` route requires a full `Guide` (see
                  // navigation/types.ts), so the fields the source never set for this
                  // synthetic object (cat/kicker/selo/cover/season/blurb*/tags) get
                  // harmless synthetic defaults below — none of them are read anywhere
                  // but TripScreen, and TripScreen (out of this port's scope) is still
                  // a placeholder.
                  cat: 'bate-volta',
                  kicker: 'Rota planejada',
                  selo: 0,
                  title: R.to,
                  region: `${R.from} → ${R.to}`,
                  cover: `${R.from} → ${R.to}`,
                  distance: R.distance,
                  duration: R.duration,
                  recharges: chargeStops,
                  season: '',
                  blurb: '',
                  blurbLong: '',
                  tags: [],
                  stops: plan.stops.map(
                    (s): GuideStop => ({
                      kind: s.kind,
                      name: s.name,
                      sub: s.sub,
                      icon: s.kind === 'charge' ? 'zap' : s.kind === 'end' ? 'flag' : 'car',
                      dur: s.time ? `${s.time} min` : undefined,
                      power: s.power,
                      selo: s.selo,
                      todo:
                        s.kind === 'charge'
                          ? plan.compatible
                            ? `Recarga planejada para o seu ${car.brand} ${car.model} — aproveite para um café.`
                            : `Conector incompatível com o seu ${car.brand} ${car.model} — procure outro ponto no caminho.`
                          : '',
                    })
                  ),
                })
              }
              accessibilityRole="button"
              accessibilityLabel="Iniciar navegação"
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 50,
                marginTop: 8, borderRadius: 999, paddingVertical: 16, backgroundColor: colors.primary,
              }}
            >
              <Icon name="nav" size={18} color={colors.primaryInk} />
              <Text style={{ fontFamily: font.uiSemibold, fontSize: 16, fontWeight: '700', color: colors.primaryInk }}>
                Iniciar navegação
              </Text>
            </Pressable>
          </View>
        )}

        {!done && <GuideBrowser onOpen={setGuide} />}
      </ScrollView>
    </View>
  );
}

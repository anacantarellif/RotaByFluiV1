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
import React, { useCallback, useMemo, useState } from 'react';
import { AccessibilityInfo, ScrollView, Text, TextInput, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, Seal } from '../components/icons/Icon';
import { AnimatedPressable } from '../components/motion/AnimatedPressable';
import { GuideBrowser, GuideDetail } from '../components/guide/Guide';
import { RouteHandoffSheet } from '../components/handoff/MapsHandoff';
import { ModalSheet } from '../components/sheets/ModalSheet';
import { useTheme } from '../theme/ThemeContext';
import { useScreenReaderEnabled } from '../hooks/useScreenReaderEnabled';
import { focus } from '../theme/tokens';
import { useToast } from '../state/ToastContext';
import { useCar } from '../state/CarContext';
import { useWatts } from '../state/WattsContext';
import { useMissions } from '../state/MissionsContext';
import { batteryAfterDistance, chargeMinutesAtPower, effectiveChargePowerKw } from '../utils/evCharging';
import { estimateDurationLabel, Terrain, terrainForGuide } from '../utils/duration';
import { DATA } from '../data/data';
import { Guide, GuideStop, RouteStop } from '../data/types';

// The planner picks a destination instead of accepting free-text addresses (the
// source's inputs were uncontrolled `defaultValue` fields that never fed the
// calculation at all — typing did nothing, which is the bug this fixes). Every
// option below has a REAL curated distance already in DATA (DATA.route.distance
// for the original Campinas scenario, DATA.guides[].distance for the Guia Flui
// regions) — no geocoding available, so this is grounded in data we actually
// have rather than inventing coordinates for arbitrary typed text.
type PlannerDestination = { id: string; label: string; region: string; distanceKm: number; terrain: Terrain };

const DESTINATIONS: PlannerDestination[] = [
  { id: 'route-default', label: DATA.route.to, region: DATA.route.from, distanceKm: DATA.route.distance, terrain: 'highway' },
  ...DATA.guides.map(
    (g): PlannerDestination => ({ id: g.id, label: g.title, region: g.region, distanceKm: g.distance, terrain: terrainForGuide(g) })
  ),
];

// Fraction of the trip where a fast-charge stop is placed when one is needed —
// derived from the original curated scenario (Pinheiros → Campinas: charge stop
// at km 32 of 98 ≈ 0.33), generalized to any picked destination's distance.
const CHARGE_STOP_FRACTION = 32 / 98;
const CHARGE_CONNECTORS = ['CCS2', 'Type 2'];
const CHARGE_TARGET_PCT = 80;
const CHARGE_STATION_POWER = 150; // typical DC fast charger, matches the original curated stop
// Below this arrival battery %, the trip is considered to need a charge stop —
// above it, the car makes the whole distance on departure charge alone. This is
// the "always reason about whether a stop is needed" half of the car-aware
// planner, not just "always insert one stop regardless of car/distance".
const NO_STOP_MIN_ARRIVAL_PCT = 15;

function effectiveKwLabel(effectiveKw: number, stationKw: number): string {
  return effectiveKw < stationKw ? `carrega a até ${effectiveKw} kW (ponto oferece ${stationKw} kW)` : `carrega na potência máxima do ponto, ${stationKw} kW`;
}

// ---- battery slider ----
// Source uses a native `<input type="range">`. RN has no built-in slider primitive
// and no slider library is a dependency of this project, so this is a small
// drag-to-adjust equivalent with the same min/max semantics, plus
// accessibilityRole="adjustable" + increment/decrement actions so screen-reader
// users get the same step control a native range input would give them.
//
// Built on react-native-gesture-handler's Gesture.Pan (already a dependency, used
// app-wide for the bottom sheets), not React Native's built-in PanResponder — an
// earlier version used PanResponder and the drag didn't register reliably once
// nested inside this screen's ScrollView (a known class of bug: a plain
// PanResponder view competes for the touch responder with an ancestor ScrollView
// and often loses it before onPanResponderGrant/Move ever fire). Gesture Handler
// negotiates that responder conflict correctly out of the box.
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
  // A screen reader takes over raw touch handling for its own touch-
  // exploration and swipe-to-adjust gestures on an accessibilityRole=
  // "adjustable" element; a Gesture.Pan registered on that same view was
  // reported to make the slider *undraggable* instead of just redundant —
  // the two are competing for the same touch stream. Below, the pan
  // handler is only attached when no screen reader is active; the
  // increment/decrement accessibility actions already handle the
  // screen-reader case on their own and don't need it.
  const screenReaderEnabled = useScreenReaderEnabled();

  const setFromX = useCallback(
    (x: number) => {
      if (width <= 0) return;
      const ratio = Math.max(0, Math.min(1, x / width));
      onChange(Math.round(min + ratio * (max - min)));
    },
    [width, min, max, onChange]
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .onBegin((e) => setFromX(e.x))
        .onUpdate((e) => setFromX(e.x))
        .runOnJS(true)
        .enabled(!screenReaderEnabled),
    [setFromX, screenReaderEnabled]
  );

  const track = (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      hitSlop={{ top: 14, bottom: 14 }}
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

  // The increment/decrement accessibility actions above only fire via
  // TalkBack's own swipe-up/down gesture on a focused "adjustable" element
  // — not discoverable by touch, and still reported as "not possible to
  // drag" even with the competing pan gesture disabled (expected: dragging
  // was never going to work for a screen-reader user, they need a
  // different control entirely). Visible +/- buttons give an explicit,
  // touch-discoverable way to do the same adjustment, shown only while a
  // screen reader is active so sighted users keep the plain drag track.
  if (screenReaderEnabled) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <AnimatedPressable
          onPress={() => {
            const next = Math.max(min, value - 5);
            onChange(next);
            AccessibilityInfo.announceForAccessibility(`Bateria na saída, ${next} por cento`);
          }}
          accessibilityRole="button"
          accessibilityLabel="Diminuir bateria na saída em 5 por cento"
          hitSlop={6}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="minus" size={18} color={colors.ink} />
        </AnimatedPressable>
        <View style={{ flex: 1 }}>{track}</View>
        <AnimatedPressable
          onPress={() => {
            const next = Math.min(max, value + 5);
            onChange(next);
            AccessibilityInfo.announceForAccessibility(`Bateria na saída, ${next} por cento`);
          }}
          accessibilityRole="button"
          accessibilityLabel="Aumentar bateria na saída em 5 por cento"
          hitSlop={6}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="plus" size={18} color={colors.ink} />
        </AnimatedPressable>
      </View>
    );
  }
  return <GestureDetector gesture={pan}>{track}</GestureDetector>;
}

// Real coordinates for a destination's start/end, when available, so a planned
// trip's "Iniciar navegação" → RouteHandoffSheet can pass real waypoints instead
// of a text-only destination (same fix as GuideStop.lat/lng, applied here too).
// The synthetic mid-route charge stop this screen invents has no real position
// for an arbitrary destination, so it's left without coordinates — origin and
// destination are still real, which is what actually mattered for the reported bug.
function destinationEndpoints(id: string): { start?: { lat: number; lng: number }; end?: { lat: number; lng: number } } {
  if (id === 'route-default') {
    const start = DATA.route.stops.find((s) => s.kind === 'start');
    const end = DATA.route.stops.find((s) => s.kind === 'end');
    return {
      start: start?.lat != null && start.lng != null ? { lat: start.lat, lng: start.lng } : undefined,
      end: end?.lat != null && end.lng != null ? { lat: end.lat, lng: end.lng } : undefined,
    };
  }
  const g = DATA.guides.find((g) => g.id === id);
  if (!g || g.stops.length === 0) return {};
  const start = g.stops[0];
  const end = g.stops[g.stops.length - 1];
  return {
    start: start.lat != null && start.lng != null ? { lat: start.lat, lng: start.lng } : undefined,
    end: end.lat != null && end.lng != null ? { lat: end.lat, lng: end.lng } : undefined,
  };
}

export function RouteScreen() {
  const { colors, font, space } = useTheme();
  const { pushToast } = useToast();
  const { car } = useCar();
  const { addWatts } = useWatts();
  const { recordRating, recordPhoto } = useMissions();
  const insets = useSafeAreaInsets();

  const [battery, setBattery] = useState(DATA.route.startBattery);
  const [done, setDone] = useState(false);
  const [guide, setGuide] = useState<Guide | null>(null);
  const [rateGuide, setRateGuide] = useState<Guide | null>(null);
  const [destId, setDestId] = useState(DESTINATIONS[0].id);
  const [destPickerOpen, setDestPickerOpen] = useState(false);
  // Planned (non-curated) route's "Iniciar navegação" hand-off — per product
  // decision there's no in-app turn-by-turn screen; this opens the same
  // RouteHandoffSheet a curated guide uses, built from a synthetic Guide-shaped
  // object so the real stop coordinates (destinationEndpoints below) become
  // real waypoints in Google Maps/Waze.
  const [plannedHandoff, setPlannedHandoff] = useState<Guide | null>(null);

  const destination = DESTINATIONS.find((d) => d.id === destId) ?? DESTINATIONS[0];

  // Recomputes every number on the route whenever the driver changes the
  // departure battery, their selected car, or the destination — see the module
  // comment above. Also decides WHETHER a charge stop is needed at all, instead
  // of always assuming one: a short trip within the car's real range gets a
  // direct plan with no stop.
  const plan = useMemo(() => {
    const endpoints = destinationEndpoints(destId);
    const arrivalPctDirect = batteryAfterDistance(car, battery, destination.distanceKm);
    const needsStop = arrivalPctDirect < NO_STOP_MIN_ARRIVAL_PCT;

    if (!needsStop) {
      const stops: RouteStop[] = [
        { kind: 'start', name: 'Sua localização', sub: `Saída · bateria ${battery}%`, battery, ...endpoints.start },
        { kind: 'end', name: destination.label, sub: `Chegada · bateria ${arrivalPctDirect}%`, battery: arrivalPctDirect, ...endpoints.end },
      ];
      return {
        needsStop: false as const,
        compatible: true,
        chargeMinutes: null as number | null,
        arriveBattery: arrivalPctDirect,
        effectiveKw: 0,
        stationPower: 0,
        chargeStopKm: 0,
        stops,
      };
    }

    const chargeStopKm = Math.max(1, Math.min(destination.distanceKm - 1, Math.round(destination.distanceKm * CHARGE_STOP_FRACTION)));
    const distAfterCharge = Math.max(0, destination.distanceKm - chargeStopKm);
    const compatible = CHARGE_CONNECTORS.includes(car.connector);
    const batteryAtCharge = batteryAfterDistance(car, battery, chargeStopKm);
    const chargeMinutes = compatible ? chargeMinutesAtPower(car, CHARGE_STATION_POWER, batteryAtCharge, CHARGE_TARGET_PCT) : null;
    const arriveBattery = compatible
      ? batteryAfterDistance(car, CHARGE_TARGET_PCT, distAfterCharge)
      : batteryAfterDistance(car, battery, destination.distanceKm); // no viable charge stop for this connector — project the whole distance on departure battery, so the shortfall is visible

    const stops: RouteStop[] = [
      { kind: 'start', name: 'Sua localização', sub: `Saída · bateria ${battery}%`, battery, ...endpoints.start },
      {
        kind: 'charge',
        name: 'Parada de recarga',
        power: CHARGE_STATION_POWER,
        selo: 2,
        battery: batteryAtCharge,
        // `undefined` (not a curated default) when the connector doesn't match —
        // there's no real charge time to report if the car can't plug in.
        time: compatible && chargeMinutes != null ? chargeMinutes : undefined,
        sub: compatible
          ? `Recarga ${chargeMinutes} min · ${batteryAtCharge}→${CHARGE_TARGET_PCT}% · km ${chargeStopKm}`
          : `Conector incompatível com o seu ${car.brand} ${car.model} (usa ${car.connector}) · km ${chargeStopKm}`,
      },
      { kind: 'end', name: destination.label, sub: `Chegada · bateria ${arriveBattery}%`, battery: arriveBattery, ...endpoints.end },
    ];

    return {
      needsStop: true as const,
      compatible,
      chargeMinutes,
      arriveBattery,
      effectiveKw: effectiveChargePowerKw(car, CHARGE_STATION_POWER),
      stationPower: CHARGE_STATION_POWER,
      chargeStopKm,
      stops,
    };
  }, [car, battery, destination, destId]);

  if (guide) {
    return (
      <GuideDetail
        g={guide}
        onBack={() => setGuide(null)}
        onRateGuide={setRateGuide}
        rateGuide={rateGuide}
        onCloseRate={() => setRateGuide(null)}
        onRateDone={(r) => {
          setRateGuide(null);
          addWatts(r.watts);
          recordRating();
          if (r.photos > 0) recordPhoto();
          pushToast(`Roteiro avaliado · +${r.watts} Watts`, 'check', true);
        }}
      />
    );
  }

  const chargeStops = plan.stops.filter((s) => s.kind === 'charge').length;
  const durationLabel = estimateDurationLabel(destination.distanceKm, destination.terrain);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: Math.max(insets.top, 24) + 14, paddingBottom: 96 }}>
        <Text style={{ fontFamily: font.display, fontSize: 30, marginBottom: 16, color: colors.ink }}>Planejar rota</Text>

        {/* origin/destination card */}
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
              {/* "De" has no free-text entry — no geocoding available, and per
                  product decision there's no in-app navigation to wire a live
                  position into either; "Iniciar navegação" hands the whole
                  plan off to Google Maps/Waze instead (see RouteHandoffSheet). */}
              <View
                style={{
                  padding: 14, borderRadius: 14, backgroundColor: colors.surface2,
                  borderWidth: 1.5, borderColor: colors.line,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.inkFaint, marginBottom: 2 }}>DE</Text>
                <Text style={{ fontFamily: font.ui, fontSize: 16, color: colors.ink }}>Sua localização atual</Text>
              </View>
              {/* "Destino" — a picker over real curated distances (DESTINATIONS),
                  not free text: typing here used to do nothing (the reported bug).
                  See the DESTINATIONS comment above. */}
              <AnimatedPressable
                onPress={() => setDestPickerOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={`Destino: ${destination.label}, ${destination.distanceKm} quilômetros. Toque para trocar`}
                style={{
                  flexDirection: 'row', alignItems: 'center', minHeight: 44,
                  padding: 14, borderRadius: 14, backgroundColor: colors.surface2,
                  borderWidth: 1.5, borderColor: colors.line,
                }}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.inkFaint, marginBottom: 2 }}>DESTINO</Text>
                  <Text style={{ fontFamily: font.ui, fontSize: 16, color: colors.ink }} numberOfLines={1}>
                    {destination.label}
                  </Text>
                </View>
                <Icon name="chevD" size={18} color={colors.inkFaint} />
              </AnimatedPressable>
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
              being calculated for and flags a charger mismatch (or that no stop is
              needed at all) before the driver taps "Calcular rota". */}
          <View
            accessible
            accessibilityLabel={
              !plan.needsStop
                ? `Seu ${car.brand} ${car.model} faz os ${destination.distanceKm} km direto, sem precisar recarregar no caminho.`
                : plan.compatible
                  ? `Calculado para o seu ${car.brand} ${car.model} · ${car.connector} · ${effectiveKwLabel(plan.effectiveKw, plan.stationPower)}`
                  : `O ponto de recarga do caminho não tem ${car.connector} (seu ${car.brand} ${car.model}) — a estimativa de bateria na chegada não considera recarga no caminho.`
            }
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14,
              padding: 10, borderRadius: 12,
              backgroundColor: !plan.needsStop || plan.compatible ? colors.surface2 : colors.goldSoft,
            }}
          >
            <Icon
              name={!plan.needsStop ? 'checkCircle' : plan.compatible ? 'car' : 'alert'}
              size={15}
              color={!plan.needsStop ? colors.ok : plan.compatible ? colors.inkSoft : colors.goldInk}
            />
            <Text
              style={{
                flex: 1, fontSize: 12.5, fontWeight: '600',
                color: !plan.needsStop || plan.compatible ? colors.inkSoft : colors.goldInk,
              }}
            >
              {!plan.needsStop
                ? `Seu ${car.brand} ${car.model} faz os ${destination.distanceKm} km direto, sem precisar recarregar no caminho.`
                : plan.compatible
                  ? `Calculado para o seu ${car.brand} ${car.model} · ${car.connector} · ${effectiveKwLabel(plan.effectiveKw, plan.stationPower)}`
                  : `O ponto de recarga do caminho não tem ${car.connector} (seu ${car.brand} ${car.model}) — a estimativa de bateria na chegada não considera recarga no caminho.`}
            </Text>
          </View>

          <AnimatedPressable
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
          </AnimatedPressable>
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
                  {destination.distanceKm}
                  <Text style={{ fontSize: 12 }}> km</Text>
                </Text>
                <Text style={{ fontSize: 11, color: colors.inkFaint }}>distância</Text>
              </View>
              <View style={{ width: 1, backgroundColor: colors.line }} />
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontFamily: font.display, fontSize: 21, color: colors.ink }}>{durationLabel}</Text>
                <Text style={{ fontSize: 11, color: colors.inkFaint }}>{chargeStops === 0 ? 'sem parada' : chargeStops === 1 ? '1 parada' : `${chargeStops} paradas`}</Text>
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
              {plan.needsStop ? 'Sua rota com recarga' : 'Sua rota direta'}
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

            <AnimatedPressable
              onPress={() =>
                setPlannedHandoff({
                  id: 'planned',
                  // Source builds a partial, untyped guide-like object here (plain JS,
                  // no shape check). RouteHandoffSheet takes a full `Guide` (see
                  // src/data/types.ts), so the fields the source never set for this
                  // synthetic object (cat/kicker/selo/cover/season/blurb*/tags) get
                  // harmless synthetic defaults below — none of them are read anywhere
                  // but the handoff sheet, which only reads title/region/distance/stops.
                  cat: 'bate-volta',
                  kicker: 'Rota planejada',
                  selo: 0,
                  title: destination.label,
                  region: destination.region,
                  cover: `Sua localização → ${destination.label}`,
                  distance: destination.distanceKm,
                  duration: durationLabel,
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
                      lat: s.lat,
                      lng: s.lng,
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
            </AnimatedPressable>

            {/* New — the source hid the curated Guia Flui itineraries entirely once a
                route was calculated, with no way back except leaving the tab. */}
            <AnimatedPressable
              onPress={() => setDone(false)}
              accessibilityRole="button"
              accessibilityLabel="Ver roteiros prontos"
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44,
                marginTop: 10, borderRadius: 999, paddingVertical: 13, backgroundColor: colors.surface3,
              }}
            >
              <Icon name="route" size={16} color={colors.ink} />
              <Text style={{ fontFamily: font.uiSemibold, fontSize: 14.5, fontWeight: '700', color: colors.ink }}>
                Ver roteiros prontos
              </Text>
            </AnimatedPressable>
          </View>
        )}

        {!done && <GuideBrowser onOpen={setGuide} />}
      </ScrollView>

      <DestinationPickerSheet
        open={destPickerOpen}
        selectedId={destId}
        onClose={() => setDestPickerOpen(false)}
        onPick={(id) => {
          setDestId(id);
          setDestPickerOpen(false);
        }}
      />

      {plannedHandoff && <RouteHandoffSheet guide={plannedHandoff} onClose={() => setPlannedHandoff(null)} />}
    </View>
  );
}

// Accent-insensitive substring match, so "sao roque" finds "São Roque".
function normalizeSearch(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

// ---- destination picker (new — replaces the source's dead free-text inputs) ----
//
// Search-as-you-type instead of a plain scrollable list: with only 5 curated
// destinations today a list was fine, but it doesn't scale — once there are many
// more addresses, requiring a full scroll to find one is exactly the kind of
// thing an autocomplete search avoids. Filters DESTINATIONS locally (no
// geocoding backend to query — see the DESTINATIONS comment above), but the UI
// pattern is the same one a real address-autocomplete would use.
function DestinationPickerSheet({
  open,
  selectedId,
  onClose,
  onPick,
}: {
  open: boolean;
  selectedId: string;
  onClose: () => void;
  onPick: (id: string) => void;
}) {
  const { colors, font, space } = useTheme();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = normalizeSearch(query.trim());
    if (!q) return DESTINATIONS;
    return DESTINATIONS.filter((d) => normalizeSearch(`${d.label} ${d.region}`).includes(q));
  }, [query]);

  if (!open) return null;
  return (
    <ModalSheet open={open} onClose={onClose} snapPoints={['75%']} label="Escolher destino">
      <View style={{ paddingHorizontal: space.pad, paddingTop: 4, gap: 14 }}>
        {/* No dismiss control of its own before — same note as the other
            sheets fixed alongside this one (see Station.tsx StationPeekContent). */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text accessibilityRole="header" style={{ fontFamily: font.display, fontSize: 22, fontWeight: '600', color: colors.ink }}>
            Para onde vamos?
          </Text>
          <AnimatedPressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Fechar"
            hitSlop={6}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="x" size={16} color={colors.ink} />
          </AnimatedPressable>
        </View>

        <View
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14,
            borderRadius: space.radiusSm, backgroundColor: colors.surface2, borderWidth: 1.5, borderColor: colors.line,
          }}
        >
          <Icon name="search" size={18} color={colors.inkFaint} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar destino"
            placeholderTextColor={colors.inkFaint}
            accessibilityLabel="Buscar destino por nome ou região"
            autoCorrect={false}
            style={{ flex: 1, minHeight: 48, fontFamily: font.ui, fontSize: 16, color: colors.ink }}
          />
          {query.length > 0 && (
            <AnimatedPressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Limpar busca" hitSlop={8}>
              <Icon name="x" size={16} color={colors.inkFaint} />
            </AnimatedPressable>
          )}
        </View>

        <View
          accessibilityLiveRegion="polite"
          style={{ minHeight: 0 }}
        >
          <Text style={{ fontSize: 12, color: colors.inkFaint, marginBottom: 2 }}>
            {results.length === 0
              ? 'Nenhum destino encontrado'
              : `${results.length} ${results.length === 1 ? 'destino encontrado' : 'destinos encontrados'}`}
          </Text>
        </View>

        <View style={{ gap: 10 }}>
          {results.map((d) => {
            const selected = d.id === selectedId;
            return (
              <AnimatedPressable
                key={d.id}
                onPress={() => onPick(d.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${d.label}, ${d.region}, ${d.distanceKm} quilômetros`}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14,
                  borderRadius: space.radiusSm,
                  backgroundColor: selected ? colors.primarySoft : colors.surface,
                  borderWidth: selected ? 2 : 1.5,
                  borderColor: selected ? colors.primary : colors.line,
                }}
              >
                <View
                  style={{
                    width: 42, height: 42, borderRadius: 12, backgroundColor: colors.surface2,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Icon name="map" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', fontSize: 15, color: colors.ink }}>{d.label}</Text>
                  <Text style={{ fontSize: 12, color: colors.inkFaint, marginTop: 2 }}>
                    {d.region} · {d.distanceKm} km
                  </Text>
                </View>
                {selected && <Icon name="checkCircle" size={22} color={colors.primary} fill={colors.primarySoft} />}
              </AnimatedPressable>
            );
          })}
        </View>
      </View>
    </ModalSheet>
  );
}

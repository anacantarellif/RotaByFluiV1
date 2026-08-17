// Ported from project/app/screens-extra.jsx — "Guia Flui" curated electric-car
// road-trip itineraries. Exports: GuideMeta, GuideCard, GuideTimeline, GuideDetail,
// GuideBrowser. Used exclusively by RouteScreen (src/screens/RouteScreen.tsx).
//
// The source also declares a local `SeloRow` duplicate (identical shape to the one
// already ported at ../icons/Icon, minus a `shadow` drop-shadow prop used only to
// keep the gold seals legible over the cover-photo placeholder). Per the porting
// task, that local duplicate is NOT recreated here — every SeloRow below is the
// shared `../icons/Icon` component. The drop-shadow nicety over the photo overlay
// is dropped as a result (no equivalent prop on the shared component); a minor,
// intentional visual loss, not a functional one.
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon, IconName, Seal, SeloRow } from '../icons/Icon';
import { useTheme } from '../../theme/ThemeContext';
import { useToast } from '../../state/ToastContext';
import { DATA } from '../../data/data';
import { Guide, GuideStop } from '../../data/types';
import { RateFlow, RateResult } from '../rating/RateFlow';
import { RouteHandoffSheet } from '../handoff/MapsHandoff';

// ---- cover-photo placeholder (source's `.ph` block, with the guide's `cover`
// blurb rendered as the visible caption instead of a fixed "foto" label) ----

function CoverPhoto({
  height,
  radius,
  cover,
  a11yLabel,
  children,
}: {
  height: number;
  radius: number;
  cover: string;
  a11yLabel: string;
  children?: React.ReactNode;
}) {
  const { colors, font } = useTheme();
  return (
    <View style={{ height, borderRadius: radius, backgroundColor: colors.surface2, overflow: 'hidden' }}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={a11yLabel}
        style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}
      >
        <View style={{ backgroundColor: colors.surface, paddingVertical: 3, paddingHorizontal: 7, borderRadius: 6 }}>
          <Text style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.inkFaint }}>
            {cover}
          </Text>
        </View>
      </View>
      {children}
    </View>
  );
}

// ---- GuideMeta ----

export function GuideMeta({ g, faint = false }: { g: Guide; faint?: boolean }) {
  const { colors } = useTheme();
  const c = faint ? colors.inkFaint : colors.inkSoft;
  return (
    <View style={{ flexDirection: 'row', gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Icon name="route" size={14} color={c} />
        <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.inkSoft }}>{g.distance} km</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Icon name="clock" size={14} color={c} />
        <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.inkSoft }}>{g.duration}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Icon name="zap" size={14} color={colors.primary} />
        <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.inkSoft }}>
          {g.recharges === 0 ? 'sem recarga' : g.recharges + ' recarga'}
        </Text>
      </View>
    </View>
  );
}

// ---- GuideCard ----

export function GuideCard({ g, onOpen }: { g: Guide; onOpen: () => void }) {
  const { colors, font, space } = useTheme();
  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`${g.title}, ${g.region}, Selo Flui nível ${g.selo}, ${g.distance} km, ${g.duration}`}
      style={{ width: '100%', marginBottom: 14, borderRadius: space.radius, backgroundColor: colors.surface, overflow: 'hidden' }}
    >
      <CoverPhoto height={150} radius={0} cover={g.cover} a11yLabel={`Imagem do roteiro ${g.title}: ${g.cover}`}>
        <View style={{ position: 'absolute', top: 12, left: 12 }}>
          <View style={{ backgroundColor: 'rgba(20,14,24,0.62)', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 7 }}>
            <Text style={{ fontFamily: font.mono, fontSize: 10, fontWeight: '600', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.9 }}>
              {g.kicker}
            </Text>
          </View>
        </View>
        <View style={{ position: 'absolute', top: 12, right: 12 }}>
          <SeloRow n={g.selo} size={18} />
        </View>
      </CoverPhoto>
      <View style={{ padding: 14, paddingTop: 14, paddingBottom: 16 }}>
        <Text style={{ fontFamily: font.mono, fontSize: 11, letterSpacing: 0.6, color: colors.inkFaint }}>{g.region}</Text>
        <Text style={{ fontFamily: font.display, fontSize: 22, fontWeight: '600', marginTop: 2, marginBottom: 6, color: colors.ink }}>
          {g.title}
        </Text>
        <Text style={{ fontSize: 13.5, lineHeight: 19.5, marginBottom: 12, color: colors.inkSoft }}>{g.blurb}</Text>
        <GuideMeta g={g} />
      </View>
    </Pressable>
  );
}

// ---- GuideTimeline ----

export function GuideTimeline({ stops }: { stops: GuideStop[] }) {
  const { colors, font, space } = useTheme();
  return (
    <View style={{ position: 'relative', paddingLeft: 30 }}>
      <View style={{ position: 'absolute', left: 9, top: 8, bottom: 8, width: 2, backgroundColor: colors.lineStrong }} />
      {stops.map((s, i) => {
        const isCharge = s.kind === 'charge';
        const label = [
          s.name,
          isCharge ? 'recarga' : s.kind === 'start' ? 'partida' : s.kind === 'end' ? 'chegada' : 'parada',
          s.time,
          s.dur,
          s.todo || undefined,
        ]
          .filter(Boolean)
          .join(', ');
        return (
          <View key={i} style={{ position: 'relative', marginBottom: 18 }} accessible accessibilityLabel={label}>
            <View
              style={{
                position: 'absolute',
                left: -30,
                top: 3,
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: isCharge ? colors.primary : colors.surface,
                borderWidth: isCharge ? 0 : 2,
                borderColor: colors.primary,
              }}
            />
            <View style={{ padding: 14, borderRadius: space.radius, backgroundColor: colors.surface }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
                  {isCharge && <Icon name="zap" size={15} color={colors.primary} />}
                  <Text style={{ fontWeight: '700', fontSize: 15.5, lineHeight: 19, color: colors.ink }}>{s.name}</Text>
                  {!!s.selo && s.selo > 0 && <Seal size={13} color={colors.gold} />}
                </View>
                {!!s.time && (
                  <Text style={{ fontFamily: font.mono, fontSize: 11.5, fontWeight: '600', color: colors.inkFaint }}>{s.time}</Text>
                )}
              </View>
              <Text style={{ fontSize: 12, marginTop: 3, color: colors.inkFaint }}>
                {s.sub}
                {isCharge && s.power ? ' · ' + s.power + ' kW' : ''}
              </Text>
              {!!s.todo && (
                <View
                  style={{
                    marginTop: 10,
                    padding: isCharge ? 12 : 0,
                    borderRadius: 12,
                    backgroundColor: isCharge ? colors.primarySoft : 'transparent',
                    flexDirection: 'row',
                    gap: 10,
                    alignItems: 'flex-start',
                  }}
                >
                  {!!s.icon && (
                    <Icon
                      name={s.icon as IconName}
                      size={18}
                      color={isCharge ? colors.primarySoftInk : colors.inkFaint}
                      style={{ marginTop: 1 }}
                    />
                  )}
                  <Text
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontSize: 13,
                      lineHeight: 18.5,
                      color: isCharge ? colors.primarySoftInk : colors.inkSoft,
                      fontWeight: isCharge ? '700' : '500',
                    }}
                  >
                    {s.todo}
                  </Text>
                  {!!s.dur && (
                    <View
                      style={{
                        paddingVertical: 4,
                        paddingHorizontal: 8,
                        borderRadius: 7,
                        backgroundColor: isCharge ? colors.surface : colors.surface3,
                        flexShrink: 0,
                      }}
                    >
                      <Text style={{ fontFamily: font.mono, fontSize: 11, fontWeight: '600', color: colors.inkSoft }}>{s.dur}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ---- GuideDetail ----

export type GuideDetailProps = {
  g: Guide;
  onBack: () => void;
  onStartTrip?: (g: Guide) => void;
  onRateGuide?: (g: Guide) => void;
  /** Lifted to the caller (RouteScreen), same as the source — RateFlow is only
   * mounted while this holds the guide currently being rated. */
  rateGuide: Guide | null;
  onCloseRate: () => void;
  onRateDone: (r: RateResult) => void;
};

export function GuideDetail({ g, onBack, onStartTrip, onRateGuide, rateGuide, onCloseRate, onRateDone }: GuideDetailProps) {
  const { colors, font, space } = useTheme();
  const { pushToast } = useToast();
  const [mapsOut, setMapsOut] = useState(false);

  const META: [string, string][] = [
    [g.distance + ' km', 'distância'],
    [g.duration, 'só ida'],
    [g.recharges === 0 ? '0' : String(g.recharges), g.recharges === 1 ? 'recarga' : 'recargas'],
    [g.season, 'melhor época'],
  ];

  const seloText =
    g.selo >= 3 ? 'Selo Flui · Vale a viagem' : g.selo === 2 ? 'Selo Flui · Vale o desvio' : 'Selo Flui · Vale a parada';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 96 }} showsVerticalScrollIndicator={false}>
        <CoverPhoto height={210} radius={0} cover={g.cover} a11yLabel={`Imagem do roteiro ${g.title}: ${g.cover}`}>
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Voltar aos roteiros"
            style={{
              position: 'absolute', top: 14, left: 14, width: 44, height: 44, borderRadius: 22,
              backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
              shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, elevation: 2,
            }}
          >
            <Icon name="chevL" size={20} color={colors.ink} />
          </Pressable>
          <Pressable
            onPress={() => pushToast('Roteiro copiado para compartilhar')}
            accessibilityRole="button"
            accessibilityLabel="Compartilhar roteiro"
            style={{
              position: 'absolute', top: 14, right: 14, width: 44, height: 44, borderRadius: 22,
              backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
              shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, elevation: 2,
            }}
          >
            <Icon name="share" size={18} color={colors.ink} />
          </Pressable>
          <View style={{ position: 'absolute', left: 16, bottom: 14 }}>
            <View style={{ backgroundColor: 'rgba(20,14,24,0.62)', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 7 }}>
              <Text style={{ fontFamily: font.mono, fontSize: 10, fontWeight: '600', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.9 }}>
                {g.kicker}
              </Text>
            </View>
          </View>
        </CoverPhoto>

        <View style={{ paddingHorizontal: 18, paddingTop: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: font.mono, fontSize: 11, letterSpacing: 0.6, color: colors.inkFaint }}>{g.region}</Text>
                <Text
                  accessibilityRole="header"
                  style={{ fontFamily: font.display, fontSize: 30, lineHeight: 32, marginTop: 3, color: colors.ink }}
                >
                  {g.title}
                </Text>
              </View>
              <SeloRow n={g.selo} size={20} />
            </View>

            <View
              style={{
                alignSelf: 'flex-start', marginTop: 12, flexDirection: 'row', alignItems: 'center',
                paddingVertical: 5, paddingHorizontal: 11, borderRadius: 999, backgroundColor: colors.goldSoft,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.goldInk }}>{seloText}</Text>
            </View>

            <Text style={{ fontFamily: font.display, fontStyle: 'italic', fontSize: 16, lineHeight: 24, marginTop: 14, color: colors.inkSoft }}>
              {g.blurbLong}
            </Text>

            <View
              style={{
                flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 14, paddingHorizontal: 8,
                marginVertical: 18, borderRadius: space.radius, backgroundColor: colors.surface,
              }}
            >
              {META.map(([v, l], i) => (
                <React.Fragment key={i}>
                  {i > 0 && <View style={{ width: 1, backgroundColor: colors.line }} />}
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text
                      style={{
                        fontFamily: font.display, fontSize: 18, color: l === 'recarga' || l === 'recargas' ? colors.primary : colors.ink,
                      }}
                    >
                      {v}
                    </Text>
                    <Text style={{ fontSize: 10.5, marginTop: 2, color: colors.inkFaint }}>{l}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>

            <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14, color: colors.inkFaint }}>
              O roteiro do Guia
            </Text>
            <GuideTimeline stops={g.stops} />

            <Pressable
              onPress={() => onStartTrip?.(g)}
              accessibilityRole="button"
              accessibilityLabel={`Iniciar o roteiro ${g.title}`}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 50,
                marginTop: 8, borderRadius: 999, paddingVertical: 16, backgroundColor: colors.primary,
              }}
            >
              <Icon name="nav" size={18} color={colors.primaryInk} />
              <Text style={{ fontFamily: font.uiSemibold, fontSize: 16, fontWeight: '700', color: colors.primaryInk }}>
                Iniciar este roteiro
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setMapsOut(true)}
              accessibilityRole="button"
              accessibilityLabel="Abrir roteiro no Google Maps ou Waze"
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 46,
                marginTop: 10, borderRadius: 999, paddingVertical: 13, borderWidth: 1.5, borderColor: colors.lineStrong,
              }}
            >
              <Icon name="nav" size={17} color={colors.ink} />
              <Text style={{ fontFamily: font.uiSemibold, fontSize: 15, fontWeight: '700', color: colors.ink }}>
                Abrir no Google Maps ou Waze
              </Text>
            </Pressable>
            <Pressable
              onPress={() => onRateGuide?.(g)}
              accessibilityRole="button"
              accessibilityLabel={`Avaliar o roteiro ${g.title}`}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 46,
                marginTop: 8, borderRadius: 999, paddingVertical: 13, borderWidth: 1.5, borderColor: colors.lineStrong,
              }}
            >
              <Icon name="star" size={17} color={colors.ink} />
              <Text style={{ fontFamily: font.uiSemibold, fontSize: 15, fontWeight: '700', color: colors.ink }}>
                Avaliar este roteiro
              </Text>
            </Pressable>
            <Pressable
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel="Voltar aos roteiros"
              style={{
                alignItems: 'center', justifyContent: 'center', minHeight: 46,
                marginTop: 8, marginBottom: 24, borderRadius: 999, paddingVertical: 13, backgroundColor: colors.surface3,
              }}
            >
              <Text style={{ fontFamily: font.uiSemibold, fontSize: 15, fontWeight: '700', color: colors.ink }}>Voltar aos roteiros</Text>
            </Pressable>
          </View>
      </ScrollView>

      {rateGuide && <RateFlow target={rateGuide} kind="guide" onClose={onCloseRate} onDone={onRateDone} />}
      {mapsOut && <RouteHandoffSheet guide={g} onClose={() => setMapsOut(false)} />}
    </View>
  );
}

// ---- GuideBrowser ----

const GUIDE_CATS: [string, string][] = [
  ['all', 'Todos'],
  ['bate-volta', 'Bate-volta'],
  ['serra', 'Serra'],
  ['praia', 'Praia'],
  ['cultura', 'Cultura'],
];

export function GuideBrowser({ onOpen }: { onOpen: (g: Guide) => void }) {
  const { colors, font } = useTheme();
  const [cat, setCat] = useState('all');
  const list = useMemo(() => (cat === 'all' ? DATA.guides : DATA.guides.filter((g) => g.cat === cat)), [cat]);

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 26, marginBottom: 5 }}>
        <Seal size={20} color={colors.gold} />
        <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: colors.goldInk }}>
          Guia Flui · Roteiros
        </Text>
      </View>
      <Text style={{ fontFamily: font.display, fontSize: 25, marginBottom: 6, color: colors.ink }}>Sem destino ainda?</Text>
      <Text style={{ fontSize: 14, lineHeight: 21, marginBottom: 16, color: colors.inkSoft }}>
        Viagens selecionadas para fazer de elétrico — com a parada de recarga já no lugar certo.
      </Text>

      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Filtrar roteiros por categoria"
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}
      >
        {GUIDE_CATS.map(([id, lb]) => {
          const on = cat === id;
          return (
            <Pressable
              key={id}
              onPress={() => setCat(id)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={lb}
              style={{
                minHeight: 44, justifyContent: 'center', paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999,
                backgroundColor: on ? colors.primary : colors.surface,
                borderWidth: on ? 0 : 1, borderColor: colors.line,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: on ? colors.primaryInk : colors.inkSoft }}>{lb}</Text>
            </Pressable>
          );
        })}
      </View>

      {list.map((g) => (
        <GuideCard key={g.id} g={g} onOpen={() => onOpen(g)} />
      ))}
    </View>
  );
}

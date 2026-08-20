// Ported from project/app/rating.jsx — multi-step rating flow for stations and
// itineraries (guides). Presented as a bottom sheet (source: `.sheet` / `role="dialog"`,
// see docs/HANDOFF.md §6 — triggered on arrival at a station, at the end of a
// roteiro/itinerary, or from the station detail sheet). Exports: RateFlow.
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Image, Pressable, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Icon, Seal } from '../icons/Icon';
import { ModalSheet } from '../sheets/ModalSheet';
import { AnimatedPressable } from '../motion/AnimatedPressable';
import { useTheme } from '../../theme/ThemeContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { estimateDurationLabel, terrainForGuide } from '../../utils/duration';
import { Guide, GuideStop, Station } from '../../data/types';

// Small sparkle burst around the Selo Flui badge when the driver turns the
// indication on — a delightful flourish for what's otherwise a fairly plain
// switch, and a concrete, positive interaction to animate rather than the
// state changes covered elsewhere (loading, press feedback). No-ops entirely
// under reduced-motion.
const SPARKLE_OFFSETS = [
  { x: -18, y: -16 },
  { x: 16, y: -18 },
  { x: -14, y: 14 },
  { x: 18, y: 10 },
];

function SeloSparkles({ active }: { active: boolean }) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const anims = useRef(SPARKLE_OFFSETS.map(() => new Animated.Value(0))).current;
  const wasActive = useRef(active);

  useEffect(() => {
    if (active && !wasActive.current && !reduced) {
      anims.forEach((v) => v.setValue(0));
      Animated.stagger(
        55,
        anims.map((v) => Animated.timing(v, { toValue: 1, duration: 560, useNativeDriver: true }))
      ).start();
    }
    wasActive.current = active;
  }, [active, reduced, anims]);

  if (reduced) return null;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 14, top: 14, width: 30, height: 30 }}>
      {anims.map((v, i) => {
        const { x, y } = SPARKLE_OFFSETS[i];
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: 15,
              top: 15,
              opacity: v.interpolate({ inputRange: [0, 0.15, 0.75, 1], outputRange: [0, 1, 1, 0] }),
              transform: [
                { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, x] }) },
                { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, y] }) },
                { scale: v.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.4, 1, 0.6] }) },
              ],
            }}
          >
            <Icon name="sparkle" size={12} color={colors.gold} />
          </Animated.View>
        );
      })}
    </View>
  );
}

type Kind = 'station' | 'guide';

const GOOD: Record<Kind, [string, string][]> = {
  station: [
    ['zap', 'Carregou rápido'], ['check', 'Ponto funcionando'], ['parking', 'Vaga fácil'],
    ['shield', 'Lugar seguro'], ['coffee', 'Café por perto'], ['food', 'Boa comida'],
    ['wc', 'Banheiro limpo'], ['wifi', 'Wi-Fi bom'], ['sun', 'Bem iluminado'],
  ],
  guide: [
    ['route', 'Trajeto tranquilo'], ['zap', 'Recarga no lugar certo'], ['clock', 'Tempos bem calculados'],
    ['mountain', 'Paisagem incrível'], ['food', 'Boas paradas para comer'], ['users', 'Bom com família'],
    ['sun', 'Vale o pôr do sol'], ['leaf', 'Muita natureza'],
  ],
};
const LABELS = ['Toque nas estrelas', 'Evite', 'Fraco', 'Ok', 'Muito bom', 'Excelente'];
const STEP_TITLES = ['Sua nota', 'O que foi bom', 'Pronto'];

export type RateResult = {
  stars: number;
  selo: boolean;
  watts: number;
  kind: Kind;
  photos: number;
  /** Local device URIs of real photos picked in the "Fotos" step, if any. */
  photoUris: string[];
  body: string;
};

export type RateFlowProps = {
  /** Station or Guide (full object from DATA, not an id) being rated. */
  target: Station | Guide;
  kind?: Kind;
  onClose: () => void;
  onDone: (result: RateResult) => void;
  // Every call site (nav.jsx, trip.jsx, screens-map.jsx, screens-extra.jsx) passes
  // pushToast down to RateFlow, so it's kept here for prop-contract parity — but the
  // source's RateFlow body never actually calls it (grepped: zero `pushToast(` calls
  // inside rating.jsx). Every call site pushes its own toast from the `onDone`
  // handler it passes in. Calling it again in here would double-fire the toast, so
  // this port intentionally leaves the prop unused internally, matching the source.
  pushToast?: (msg: string, icon?: string) => void;
};

// Big 1–5 star picker used for the overall rating (step 1).
function StarRow({
  value,
  onChange,
  size = 40,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: number;
}) {
  const { colors } = useTheme();
  // Source also tracks a `hover` state to preview the star count on mouse-over —
  // there's no hover concept on a touchscreen, so that preview is dropped here;
  // `value` alone drives the filled state.
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="Nota de 1 a 5 estrelas"
      style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Pressable
          key={i}
          onPress={() => onChange(i)}
          accessibilityRole="radio"
          accessibilityState={{ checked: value === i }}
          accessibilityLabel={`Avaliar com ${i} ${i === 1 ? 'estrela' : 'estrelas'}`}
          style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon
            name="star"
            size={size}
            fill={i <= value ? colors.gold : 'none'}
            color={i <= value ? colors.gold : colors.lineStrong}
            stroke={1.5}
          />
        </Pressable>
      ))}
    </View>
  );
}

// Per-stop mini rating row for guide itineraries (step 1, optional).
function StopRating({
  stop,
  value,
  onChange,
}: {
  stop: GuideStop;
  value: number;
  onChange: (v: number) => void;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: colors.line,
      }}
    >
      <View
        style={{
          width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surface2,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Icon
          name={stop.kind === 'charge' ? 'zap' : stop.icon || 'target'}
          size={17}
          color={stop.kind === 'charge' ? colors.primary : colors.inkSoft}
        />
      </View>
      <Text style={{ flex: 1, fontSize: 13.5, fontWeight: '600', color: colors.ink }} numberOfLines={1}>
        {stop.name}
      </Text>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={`Nota para ${stop.name}`}
        style={{ flexDirection: 'row', gap: 1, flexShrink: 0 }}
      >
        {[1, 2, 3, 4, 5].map((i) => (
          <Pressable
            key={i}
            onPress={() => onChange(i)}
            accessibilityRole="radio"
            accessibilityState={{ checked: value === i }}
            accessibilityLabel={`Avaliar ${stop.name} com ${i} de 5 estrelas`}
            hitSlop={{ top: 13, bottom: 13, left: 13, right: 13 }}
            style={{ minWidth: 44 / 5, minHeight: 34, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 }}
          >
            <Icon
              name="star"
              size={17}
              fill={i <= value ? colors.gold : 'none'}
              color={i <= value ? colors.gold : colors.lineStrong}
              stroke={1.6}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function RateFlow({ target, kind = 'station', onClose, onDone, pushToast: _pushToast }: RateFlowProps) {
  const { colors, space, font } = useTheme();
  const isGuide = kind === 'guide';

  const [step, setStep] = useState(0);
  const [stars, setStars] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [selo, setSelo] = useState(false);
  const [body, setBody] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [stopStars, setStopStars] = useState<Record<number, number>>({});

  // Picks one photo from the device library and adds it to the "Fotos" step —
  // the placeholder squares here used to just be a tap counter with no real
  // image behind them; this one really goes to the device's library. No-op
  // (silently) if the driver denies photo-library access or cancels the
  // picker — the step is optional either way.
  const pickPhoto = async () => {
    if (photos.length >= 3) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotos((p) => (p.length < 3 ? [...p, result.assets[0].uri] : p));
    }
  };
  const removePhoto = (uri: string) => setPhotos((p) => p.filter((u) => u !== uri));

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    // RN equivalent of the source's step-progress `role="img" aria-label` — announce
    // the new step to screen readers (docs/HANDOFF.md §5 live-region rule).
    AccessibilityInfo.announceForAccessibility(`Etapa ${step + 1} de 3 · ${STEP_TITLES[step]}`);
  }, [step]);

  const title = isGuide ? (target as Guide).title : (target as Station).name;
  const areaLine = isGuide ? (target as Guide).region : (target as Station).area;
  // Computed from real distance rather than the guide's curated `duration` text —
  // see src/utils/duration.ts for why (it didn't match the real driving time
  // Google Maps shows for the same coordinates).
  const metaLine = isGuide
    ? `${(target as Guide).distance} km · ${estimateDurationLabel((target as Guide).distance, terrainForGuide(target as Guide))}`
    : `${(target as Station).power} kW · ${(target as Station).connectors.join(' · ')}`;
  const rateable: GuideStop[] = isGuide ? (target as Guide).stops.filter((s) => s.kind !== 'start') : [];

  const toggleTag = (t: string) => setTags((v) => (v.includes(t) ? v.filter((x) => x !== t) : [...v, t]));
  const watts =
    200 + tags.length * 10 + photos.length * 50 + (body.trim() ? 40 : 0) + Object.keys(stopStars).length * 15 + (selo ? 60 : 0);

  const submit = () => setStep(2);
  const finish = () => onDone({ stars, selo, watts, kind, photos: photos.length, photoUris: photos, body });

  const canNext = step === 0 ? stars > 0 : true;

  return (
    <ModalSheet
      open
      onClose={onClose}
      label={`Avaliar ${isGuide ? 'roteiro' : 'ponto'}: ${title}`}
      snapPoints={['92%']}
      scroll={false}
    >
      <View style={{ flex: 1 }}>
        {/* ---------- header + step progress ---------- */}
        <View style={{ paddingHorizontal: 18, paddingTop: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: colors.inkFaint }}>
                {isGuide ? 'Avaliar roteiro' : 'Avaliar ponto'} · {STEP_TITLES[step]}
              </Text>
              <Text
                style={{ fontFamily: font.display, fontSize: 21, marginTop: 2, color: colors.ink }}
                numberOfLines={1}
              >
                {title}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Fechar avaliação"
              style={{
                width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface,
                alignItems: 'center', justifyContent: 'center',
                shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, elevation: 2,
              }}
            >
              <Icon name="x" size={20} color={colors.ink} />
            </Pressable>
          </View>
          <View
            accessibilityRole="image"
            accessibilityLabel={`Etapa ${step + 1} de 3`}
            style={{ flexDirection: 'row', gap: 5, marginTop: 14 }}
          >
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= step ? colors.primary : colors.line }}
              />
            ))}
          </View>
        </View>

        {/* ---------- scrollable body ----------
            This was a plain flex:1 View with no scroll mechanism at all,
            despite the label — fine when a step's content happened to fit the
            sheet, but step 0's per-stop rating list can run to 4+ rows (one
            per guide stop) and RN doesn't clip overflowing content by
            default, so on a real device with real content the "Continuar"
            footer below could end up genuinely unreachable, not just visually
            crowded (reported: needing to scroll to see it, when there was
            nothing to scroll). BottomSheetScrollView actually gives it
            somewhere to go, same pattern as StationDetailContent's ficha. */}
        <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 20 }}>
            {step === 0 && (
              <View>
                <View
                  style={{
                    flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12,
                    borderRadius: space.radius, backgroundColor: colors.surface2,
                  }}
                >
                  <View
                    accessibilityRole="image"
                    accessibilityLabel={`Imagem de ${title}`}
                    style={{
                      width: 68, height: 68, borderRadius: 18, flexShrink: 0,
                      backgroundColor: colors.surface3, alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: font.mono, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase',
                        color: colors.inkFaint, backgroundColor: colors.surface, paddingVertical: 3, paddingHorizontal: 7, borderRadius: 6,
                      }}
                    >
                      foto
                    </Text>
                  </View>
                  <View style={{ minWidth: 0, flex: 1 }}>
                    <Text style={{ fontSize: 11.5, fontWeight: '600', color: colors.inkFaint }}>{areaLine}</Text>
                    <Text style={{ fontSize: 14.5, fontWeight: '700', marginTop: 2, color: colors.ink }}>{metaLine}</Text>
                  </View>
                </View>

                <Text
                  style={{
                    fontFamily: font.display, fontSize: 19, fontWeight: '600', textAlign: 'center',
                    marginTop: 22, marginBottom: 12, color: colors.ink,
                  }}
                >
                  {isGuide ? 'Como foi fazer este roteiro?' : 'Como foi sua recarga aqui?'}
                </Text>
                <StarRow value={stars} onChange={setStars} />
                <Text
                  accessibilityLiveRegion="polite"
                  style={{
                    textAlign: 'center', fontSize: 13.5, fontWeight: '700', marginTop: 8, minHeight: 20,
                    color: stars ? colors.goldInk : colors.inkFaint,
                  }}
                >
                  {LABELS[stars]}
                </Text>

                {isGuide && rateable.length > 0 && (
                  <View style={{ marginTop: 22 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: colors.inkFaint, marginBottom: 8 }}>
                      Nota por parada{' '}
                      <Text style={{ textTransform: 'none', letterSpacing: 0, fontWeight: '600', color: colors.inkFaint }}>(opcional)</Text>
                    </Text>
                    {rateable.map((s, i) => (
                      <StopRating
                        key={i}
                        stop={s}
                        value={stopStars[i] || 0}
                        onChange={(v) => setStopStars((m) => ({ ...m, [i]: v }))}
                      />
                    ))}
                  </View>
                )}

                {!isGuide && (
                  <View style={{ width: '100%', marginTop: 22, position: 'relative' }}>
                    <SeloSparkles active={selo} />
                    <AnimatedPressable
                      onPress={() => setSelo(!selo)}
                      accessibilityRole="switch"
                      accessibilityState={{ checked: selo }}
                      accessibilityLabel="Indicar para o Selo Flui"
                      scaleTo={0.98}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 14,
                        padding: 14, borderRadius: space.radiusSm,
                        backgroundColor: selo ? colors.goldSoft : colors.surface,
                        borderWidth: selo ? 2 : 1.5, borderColor: selo ? colors.gold : colors.line,
                      }}
                    >
                      <Seal size={30} color={colors.gold} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '700', fontSize: 14.5, color: colors.ink }}>Indicar para o Selo Flui</Text>
                        <Text style={{ fontSize: 12, color: colors.inkFaint }}>Sua indicação alimenta a curadoria do guia</Text>
                      </View>
                      <View
                        style={{
                          width: 24, height: 24, borderRadius: 8, flexShrink: 0,
                          backgroundColor: selo ? colors.gold : colors.surface3,
                          alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        {/* Source hardcodes '#fff' for this checkmark too (inline JSX prop, not a
                            CSS var) — it needs a fixed light mark against the gold badge in both
                            themes, and no existing token models "ink that always reads light on
                            gold", so the literal is kept rather than picking a token that would be
                            wrong in one theme. */}
                        {selo && <Icon name="check" size={14} color="#fff" />}
                      </View>
                    </AnimatedPressable>
                  </View>
                )}
              </View>
            )}

            {step === 1 && (
              <View>
                <Text
                  style={{
                    fontFamily: font.display, fontSize: 19, fontWeight: '600', textAlign: 'center',
                    marginTop: 4, marginBottom: 12, color: colors.ink,
                  }}
                >
                  O que foi bom?
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {GOOD[kind].map(([ic, label]) => {
                    const on = tags.includes(label);
                    return (
                      <Pressable
                        key={label}
                        onPress={() => toggleTag(label)}
                        accessibilityRole="switch"
                        accessibilityState={{ checked: on }}
                        accessibilityLabel={label}
                        style={{
                          flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44,
                          paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999,
                          backgroundColor: on ? colors.primary : colors.surface,
                          borderWidth: on ? 0 : 1, borderColor: colors.line,
                        }}
                      >
                        <Icon name={ic} size={14} color={on ? colors.primaryInk : colors.primary} />
                        <Text style={{ fontSize: 13, fontWeight: '600', color: on ? colors.primaryInk : colors.inkSoft }}>{label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: colors.inkFaint, marginTop: 20, marginBottom: 9 }}>
                  Fotos
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {photos.map((uri, i) => (
                    <View key={uri} style={{ width: 74, height: 74 }}>
                      <Image
                        source={{ uri }}
                        accessibilityRole="image"
                        accessibilityLabel={`Foto ${i + 1} adicionada`}
                        style={{ width: 74, height: 74, borderRadius: 12, backgroundColor: colors.surface3 }}
                      />
                      <Pressable
                        onPress={() => removePhoto(uri)}
                        accessibilityRole="button"
                        accessibilityLabel={`Remover foto ${i + 1}`}
                        hitSlop={6}
                        style={{
                          position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11,
                          backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center',
                          borderWidth: 2, borderColor: colors.surface,
                        }}
                      >
                        <Icon name="x" size={11} color={colors.bg} />
                      </Pressable>
                    </View>
                  ))}
                  {photos.length < 3 && (
                    <Pressable
                      onPress={pickPhoto}
                      accessibilityRole="button"
                      accessibilityLabel="Adicionar foto"
                      style={{
                        width: 74, height: 74, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.lineStrong,
                        backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', gap: 3,
                      }}
                    >
                      <Icon name="camera" size={20} color={colors.primary} />
                      <Text style={{ fontFamily: font.ui, fontSize: 10, fontWeight: '700', color: colors.primary }}>+50 W</Text>
                    </Pressable>
                  )}
                </View>

                <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: colors.inkFaint, marginTop: 20, marginBottom: 9 }}>
                  Seu comentário
                </Text>
                <TextInput
                  value={body}
                  onChangeText={setBody}
                  multiline
                  numberOfLines={4}
                  accessibilityLabel="Comentário sobre a experiência"
                  placeholder={isGuide ? 'Conte como foi a viagem, o que valeu a pena…' : 'Conte como foi a recarga, o que ajudou…'}
                  placeholderTextColor={colors.inkFaint}
                  style={{
                    width: '100%', minHeight: 96, padding: 14, borderRadius: 14,
                    backgroundColor: colors.surface2, borderWidth: 1.5, borderColor: colors.line,
                    fontFamily: font.ui, fontSize: 16, color: colors.ink, textAlignVertical: 'top',
                  }}
                />
                <Text style={{ fontSize: 11.5, marginTop: 6, textAlign: 'right', color: colors.inkFaint }}>{body.length}/280</Text>
              </View>
            )}

            {step === 2 && (
              <View style={{ alignItems: 'center', paddingTop: 8 }}>
                <View
                  style={{
                    width: 66, height: 66, borderRadius: 33, backgroundColor: colors.ok,
                    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
                    shadowColor: colors.ok, shadowOpacity: 0.42, shadowRadius: 12, elevation: 6,
                  }}
                >
                  {/* Same fixed-white reasoning as the Selo checkmark above. */}
                  <Icon name="checkCircle" size={34} color="#fff" />
                </View>
                <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: colors.ok }}>
                  Avaliação publicada
                </Text>
                <Text style={{ fontFamily: font.display, fontSize: 23, marginTop: 4, marginBottom: 6, color: colors.ink }}>Obrigado!</Text>
                <Text style={{ fontSize: 13.5, textAlign: 'center', maxWidth: 280, color: colors.inkSoft }}>
                  {isGuide
                    ? 'Sua nota ajuda outros motoristas a decidir se o roteiro vale a viagem.'
                    : 'Sua avaliação entra na curadoria e aparece para quem buscar este ponto.'}
                </Text>

                <View
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 16,
                    paddingVertical: 10, paddingHorizontal: 18, borderRadius: 999,
                    backgroundColor: colors.primarySoft,
                  }}
                >
                  <Icon name="zap" size={17} color={colors.primary} />
                  <Text style={{ fontFamily: font.display, fontSize: 20, fontWeight: '700', color: colors.primarySoftInk }}>+{watts}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primarySoftInk }}>Watts</Text>
                </View>

                <View style={{ width: '100%', marginTop: 18, borderRadius: space.radius, backgroundColor: colors.surface2, paddingHorizontal: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.line }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>Sua nota</Text>
                    <View style={{ flexDirection: 'row', gap: 2 }}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Icon key={i} name="star" size={13} fill={i < stars ? colors.gold : 'none'} color={i < stars ? colors.gold : colors.lineStrong} stroke={1.6} />
                      ))}
                    </View>
                  </View>
                  {tags.length > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.line }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>Destaques</Text>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inkFaint }}>{tags.length} marcados</Text>
                    </View>
                  )}
                  {photos.length > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.line }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>Fotos</Text>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inkFaint }}>{photos.length}</Text>
                    </View>
                  )}
                  {selo && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 11 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>Selo Flui</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.goldInk }}>indicado</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
        </BottomSheetScrollView>

        {/* ---------- footer ----------
            Sits inside the sheet's own content (not the app's tab bar) — since
            ModalSheet now renders via BottomSheetModal's portal, it's always above
            the tab bar. ModalSheet also passes `bottomInset` (the device's own
            safe-area/gesture-bar height) to BottomSheetModal itself now, which
            shifts the sheet's whole frame above that bar — so this only needs a
            small fixed cushion on top of that, not a second full inset (adding
            `insets.bottom` again here would double-count it and push the button
            up further than necessary). */}
        <View
          style={{
            flexShrink: 0, padding: 18, paddingBottom: 26, backgroundColor: colors.surface,
            shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 20, shadowOffset: { width: 0, height: -8 }, elevation: 8,
          }}
        >
          {step === 0 && (
            <AnimatedPressable
              disabled={!canNext}
              onPress={() => setStep(1)}
              accessibilityRole="button"
              accessibilityLabel="Continuar"
              accessibilityState={{ disabled: !canNext }}
              style={{
                width: '100%', minHeight: 44, alignItems: 'center', justifyContent: 'center',
                borderRadius: 999, paddingVertical: 16, backgroundColor: colors.primary, opacity: canNext ? 1 : 0.5,
              }}
            >
              <Text style={{ fontFamily: font.uiSemibold, fontSize: 16, fontWeight: '700', color: colors.primaryInk }}>Continuar</Text>
            </AnimatedPressable>
          )}
          {step === 1 && (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <AnimatedPressable
                onPress={() => setStep(0)}
                accessibilityRole="button"
                accessibilityLabel="Voltar para a nota"
                style={{
                  width: 48, height: 48, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: colors.surface3,
                }}
              >
                <Icon name="chevL" size={18} color={colors.ink} />
              </AnimatedPressable>
              <AnimatedPressable
                onPress={submit}
                accessibilityRole="button"
                accessibilityLabel={`Publicar avaliação, mais ${watts} watts`}
                style={{
                  flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center',
                  borderRadius: 999, paddingVertical: 16, backgroundColor: colors.primary,
                }}
              >
                <Text style={{ fontFamily: font.uiSemibold, fontSize: 16, fontWeight: '700', color: colors.primaryInk }}>
                  Publicar · +{watts} W
                </Text>
              </AnimatedPressable>
            </View>
          )}
          {step === 2 && (
            <AnimatedPressable
              onPress={finish}
              accessibilityRole="button"
              accessibilityLabel="Concluir"
              style={{
                width: '100%', minHeight: 44, alignItems: 'center', justifyContent: 'center',
                borderRadius: 999, paddingVertical: 16, backgroundColor: colors.primary,
              }}
            >
              <Text style={{ fontFamily: font.uiSemibold, fontSize: 16, fontWeight: '700', color: colors.primaryInk }}>Concluir</Text>
            </AnimatedPressable>
          )}
        </View>
      </View>
    </ModalSheet>
  );
}

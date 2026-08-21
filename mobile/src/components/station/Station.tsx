// Ported from project/app/station.jsx — station peek + full detail (ficha).
// Exports: Stars, AMEN, AVAIL, StationSheet (peek + ficha content, one shared
// ModalSheet instance — see the comment on StationSheet below for why).
//
// Presented as a bottom sheet in the source (`.sheet-scrim` + `.sheet`/`.sheet.peek`,
// role="dialog" aria-modal) so it's built on the shared <ModalSheet> per
// PORTING_GUIDE.md ("station detail as a sheet if the source presents it that way").
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useTheme } from '../../theme/ThemeContext';
import { Icon, IconName, SeloBadge } from '../icons/Icon';
import { ModalSheet } from '../sheets/ModalSheet';
import { AnimatedPressable } from '../motion/AnimatedPressable';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { StationSkeleton } from '../skeletons/Skeletons';
import { useDelay } from '../../hooks/useDelay';
import { ROTA_CONFIG } from '../../config';
import { Avail, Review, Station } from '../../data/types';
import { useCar } from '../../state/CarContext';
import { useReviews } from '../../state/ReviewsContext';
import { estimateChargeAt, fmtChargeMinutes } from '../../utils/evCharging';
import { photoUrl } from '../../utils/placeholderPhoto';
import { FadeIn } from '../motion/FadeIn';

// ---- shared data maps (mirror the source's module-level AMEN / AVAIL) ----

export const AMEN: Record<string, [icon: IconName, label: string]> = {
  coffee: ['coffee', 'Café'],
  food: ['food', 'Restaurante'],
  wc: ['wc', 'Banheiro'],
  parking: ['parking', 'Estacionamento'],
  wifi: ['wifi', 'Wi-Fi'],
  shield: ['shield', 'Segurança 24h'],
  store: ['store', 'Mercado'],
  leaf: ['leaf', 'Área verde'],
  mountain: ['mountain', 'Mirante'],
};

// Source paired each status with a `var(--ok|busy|off)` string; here the color
// half comes straight from theme tokens (colors.ok/busy/off share the Avail
// keys), so this map only needs to carry the pt-BR label.
export const AVAIL: Record<Avail, string> = {
  ok: 'Disponível',
  busy: 'Movimentado',
  off: 'Indisponível',
};

// ---- Stars ----

export type StarsProps = {
  n: number;
  size?: number;
  /** Exposes a single "Nota X,X de 5" accessibility label for the row instead
   * of 5 individually-meaningless star icons. Source declared this prop but
   * never actually used it in the render (the star row had no aria-label at
   * all) — wired up here for real per PORTING_GUIDE.md's accessibility rule
   * that rating stars need a text-equivalent label. */
  label?: boolean;
};

export function Stars({ n, size = 14, label = true }: StarsProps) {
  const { colors } = useTheme();
  const rounded = Math.round(n);
  const a11yProps = label
    ? { accessible: true as const, accessibilityLabel: `Nota ${n.toFixed(1).replace('.', ',')} de 5` }
    : { accessible: false as const, importantForAccessibility: 'no-hide-descendants' as const };
  return (
    <View style={{ flexDirection: 'row', gap: 2, alignItems: 'center' }} {...a11yProps}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Icon
          key={i}
          name="star"
          size={size}
          fill={i < rounded ? colors.gold : 'none'}
          color={i < rounded ? colors.gold : colors.lineStrong}
          stroke={1.5}
        />
      ))}
    </View>
  );
}

// ---- shared bits (local helpers, not exported by the source either) ----

// `.ph` photo placeholder in the source paints a repeating diagonal-stripe
// texture with no real image behind it at all — there's no actual photography
// of these fictional/composite stations to bundle. When `seed` is given this
// now loads a real (stock) photo instead, deterministic per seed so a given
// station always shows the same photo rather than a different one on every
// open (see src/utils/placeholderPhoto.ts). Falls back to the flat caption box
// — never a broken-image icon — while loading and if the request fails
// (offline, first frame before it resolves).
function Photo({
  height,
  radius,
  caption,
  a11yLabel,
  seed,
  children,
}: {
  height: number;
  radius: number;
  caption: string;
  a11yLabel: string;
  seed?: string;
  children?: React.ReactNode;
}) {
  const { colors, font } = useTheme();
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const showPhoto = !!seed && !failed;

  return (
    <View
      style={{
        height,
        borderRadius: radius,
        backgroundColor: colors.surface2,
        overflow: 'hidden',
      }}
    >
      {showPhoto && (
        <Image
          source={{ uri: photoUrl(seed!, 500, Math.round((500 * height) / 240)) }}
          accessibilityIgnoresInvertColors
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      )}
      {(!showPhoto || !loaded) && (
        <View
          accessible={!showPhoto}
          accessibilityRole="image"
          accessibilityLabel={a11yLabel}
          style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}
        >
          <View style={{ backgroundColor: colors.surface, paddingVertical: 3, paddingHorizontal: 7, borderRadius: 6 }}>
            <Text
              style={{
                fontFamily: font.mono,
                fontSize: 10,
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: colors.inkFaint,
              }}
            >
              {caption}
            </Text>
          </View>
        </View>
      )}
      {showPhoto && loaded && (
        <View accessible accessibilityRole="image" accessibilityLabel={a11yLabel} style={StyleSheet.absoluteFill} />
      )}
      {children}
    </View>
  );
}

function Dot({ color }: { color: string }) {
  return <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />;
}

// Favorite ("curtir") button — pops the heart when it flips to favorited,
// on top of AnimatedPressable's own generic press-scale. Only animates on
// the true→becomes-favorited edge, not on unfavoriting, matching the usual
// "like" pop convention (a bounce is delightful when *adding*, but pointless
// noise on removal).
function FavoriteHeart({ fav, onPress }: { fav: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const pop = useRef(new Animated.Value(1)).current;
  const wasFav = useRef(fav);

  useEffect(() => {
    if (fav && !wasFav.current && !reduced) {
      pop.setValue(0.6);
      Animated.spring(pop, { toValue: 1, useNativeDriver: true, friction: 3.5, tension: 260 }).start();
    }
    wasFav.current = fav;
  }, [fav, reduced, pop]);

  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={fav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      accessibilityState={{ selected: fav }}
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.surface2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.View style={{ transform: [{ scale: pop }] }}>
        <Icon name="heart" size={20} fill={fav ? colors.off : 'none'} color={fav ? colors.off : colors.ink} />
      </Animated.View>
    </AnimatedPressable>
  );
}

function Spec({ icon, label, value, sub }: { icon: IconName; label: string; value: string; sub?: string }) {
  const { colors, font, space } = useTheme();
  return (
    <View
      style={{
        width: '48%',
        backgroundColor: colors.surface,
        borderRadius: space.radius,
        borderWidth: 1,
        borderColor: colors.line,
        padding: 13,
        gap: 6,
      }}
    >
      <Icon name={icon} size={18} color={colors.primary} />
      <View>
        <Text style={{ fontFamily: font.mono, fontSize: 16, fontWeight: '600', lineHeight: 18, color: colors.ink }}>
          {value}
        </Text>
        <Text style={{ fontSize: 11, marginTop: 2, color: colors.inkFaint }}>
          {label}
          {sub ? ` · ${sub}` : ''}
        </Text>
      </View>
    </View>
  );
}

// ---- StationSheet ----
//
// Peek and ficha (detail) used to each own their own <ModalSheet>, mounted and
// unmounted by the parent screen's `{cond && <X/>}` swap between them. That
// meant tapping "Ver ficha" unmounted one BottomSheetModal and mounted a
// different one *in the same React commit* — reported as the ficha sometimes
// just not appearing at all. Rather than keep chasing that race through gorhom's
// stack-behavior config, this merges both into one <StationSheet> that owns a
// single, always-mounted <ModalSheet> for as long as a station is active;
// switching from peek to ficha only changes its `mode` prop (content +
// snapPoints), which is a normal re-render — the BottomSheetModal instance
// itself never unmounts, so there's no mount/unmount race to have.
export type StationSheetMode = 'peek' | 'detail';

export type StationSheetProps = {
  st: Station;
  mode: StationSheetMode;
  onOpenDetail: () => void;
  onClose: () => void;
  onNavigate: (st: Station) => void;
  onReport?: (st: Station) => void;
  onRate?: (st: Station) => void;
  fav: boolean;
  onFav: (st: Station) => void;
};

export function StationSheet({ st, mode, onOpenDetail, onClose, onNavigate, onReport, onRate, fav, onFav }: StationSheetProps) {
  return (
    <ModalSheet
      open
      onClose={onClose}
      // Source's `.sheet.peek` has no fixed height (CSS auto-sizes to content);
      // gorhom's BottomSheet needs an explicit snap point, so 32% approximates
      // the compact peek card's real content height.
      snapPoints={mode === 'peek' ? ['32%'] : ['94%']}
      scroll={false}
      label={mode === 'peek' ? `Prévia: ${st.name}` : `Ficha do ponto ${st.name}`}
    >
      {mode === 'peek' ? (
        <StationPeekContent st={st} onOpen={onOpenDetail} onNavigate={onNavigate} />
      ) : (
        <StationDetailContent st={st} onClose={onClose} onNavigate={onNavigate} onReport={onReport} onRate={onRate} fav={fav} onFav={onFav} />
      )}
    </ModalSheet>
  );
}

// ---- peek content ----

function StationPeekContent({ st, onOpen, onNavigate }: { st: Station; onOpen: () => void; onNavigate: (st: Station) => void }) {
  const { colors, font, space } = useTheme();
  const avLabel = AVAIL[st.avail];
  const avColor = colors[st.avail];

  return (
    <>
      <AnimatedPressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`Abrir ficha completa de ${st.name}`}
        scaleTo={0.98}
        style={{ paddingHorizontal: space.pad, paddingTop: 6 }}
      >
        <View style={{ flexDirection: 'row', gap: 14 }}>
          <Photo height={84} radius={16} caption="foto" a11yLabel={`Foto do ponto ${st.name}`} seed={st.id} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <Dot color={avColor} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: avColor }}>{avLabel}</Text>
              <Text style={{ fontSize: 12, color: colors.inkFaint }}>
                · {st.free}/{st.total} livres · {st.dist}
              </Text>
            </View>
            <Text style={{ fontFamily: font.display, fontSize: 21, marginBottom: 3, color: colors.ink }}>{st.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Stars n={st.rating} size={13} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>{st.rating.toFixed(1)}</Text>
              <Text style={{ fontSize: 12, color: colors.inkFaint }}>({st.reviews})</Text>
            </View>
          </View>
        </View>
        {st.selo > 0 && (
          <View style={{ marginTop: 12, alignItems: 'flex-start' }}>
            <SeloBadge level={st.selo} />
          </View>
        )}
      </AnimatedPressable>

      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: space.pad, paddingTop: 14 }}>
        <AnimatedPressable
          onPress={() => onNavigate(st)}
          accessibilityRole="button"
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingVertical: 13,
            borderRadius: 100,
            backgroundColor: colors.primary,
          }}
        >
          <Icon name="nav" size={18} color={colors.primaryInk} />
          <Text style={{ fontFamily: font.uiSemibold, fontSize: space.ui, color: colors.primaryInk }}>Navegar</Text>
        </AnimatedPressable>
        <AnimatedPressable
          onPress={onOpen}
          accessibilityRole="button"
          hitSlop={8}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 13,
            paddingHorizontal: 20,
            borderRadius: 100,
            backgroundColor: colors.surface3,
          }}
        >
          <Text style={{ fontFamily: font.uiSemibold, fontSize: space.ui, color: colors.ink }}>Ver ficha</Text>
        </AnimatedPressable>
      </View>
    </>
  );
}

// ---- ficha (detail) content ----

function StationDetailContent({
  st,
  onClose,
  onNavigate,
  onReport,
  onRate,
  fav,
  onFav,
}: {
  st: Station;
  onClose: () => void;
  onNavigate: (st: Station) => void;
  onReport?: (st: Station) => void;
  onRate?: (st: Station) => void;
  fav: boolean;
  onFav: (st: Station) => void;
}) {
  const { colors, font, space } = useTheme();
  const { car } = useCar();
  const { getReviews } = useReviews();
  const estimate = estimateChargeAt(car, st);
  // Source called `useDelay(latency.detail)` with no dep key; the shared RN
  // hook requires one, so `st.id` is used — replays the loading skeleton
  // when a different station's ficha is opened, matching the source's intent.
  const ready = useDelay(ROTA_CONFIG.latency.detail, st.id);
  const avLabel = AVAIL[st.avail];
  const avColor = colors[st.avail];
  const pct = Math.round((st.free / st.total) * 100);
  // Real driver-submitted reviews (RateFlow → ReviewsContext) shown first,
  // ahead of the station's curated seed reviews — a photo added in RateFlow
  // shows up here for every user, not just the driver who added it.
  const reviews: Review[] = [...getReviews(st.id), ...st.reviewsList];

  return (
    <View style={{ flex: 1 }}>
      <BottomSheetScrollView contentContainerStyle={{ paddingTop: 4, paddingBottom: 24 }}>
          {!ready && <StationSkeleton />}
          {ready && (
            <FadeIn>
              {/* hero */}
              <View style={{ paddingHorizontal: space.pad }}>
                <Photo
                  height={170}
                  radius={20}
                  caption="foto da estação · 3 imagens"
                  a11yLabel={`Fotos do ponto ${st.name}, 3 imagens`}
                  seed={`${st.id}-hero`}
                >
                  <View style={{ position: 'absolute', top: 12, right: 12, flexDirection: 'row', gap: 8 }}>
                    <AnimatedPressable
                      onPress={onClose}
                      accessibilityRole="button"
                      accessibilityLabel="Fechar ficha do ponto"
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: colors.surface,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon name="chevD" size={20} color={colors.ink} />
                    </AnimatedPressable>
                  </View>
                  {st.selo > 0 && (
                    <View style={{ position: 'absolute', bottom: 12, left: 12 }}>
                      <SeloBadge level={st.selo} />
                    </View>
                  )}
                </Photo>
              </View>

              <View style={{ paddingHorizontal: space.pad, marginTop: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Dot color={avColor} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: avColor }}>{avLabel}</Text>
                  <Text style={{ fontSize: 12, color: colors.inkFaint }}>· Atualizado há 3 min</Text>
                </View>

                <Text
                  accessibilityRole="header"
                  style={{ fontFamily: font.display, fontSize: 28, marginBottom: 4, color: colors.ink }}
                >
                  {st.name}
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Icon name="nav" size={13} color={colors.inkSoft} />
                    <Text style={{ fontSize: 14, color: colors.inkSoft }}>
                      {st.area} · {st.dist}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 12 }}>
                  <Stars n={st.rating} />
                  <Text style={{ fontWeight: '800', fontSize: 15, color: colors.ink }}>{st.rating.toFixed(1)}</Text>
                  <Text style={{ fontSize: 13, color: colors.inkFaint }}>· {st.reviews} avaliações da comunidade</Text>
                </View>

                {/* blurb — editorial guide voice */}
                <Text
                  style={{
                    fontFamily: font.display,
                    fontStyle: 'italic',
                    fontSize: 16.5,
                    lineHeight: 24.75,
                    color: colors.ink,
                    marginBottom: 18,
                  }}
                >
                  “{st.blurb}”
                </Text>

                {/* live availability bar */}
                <View
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: space.radius,
                    padding: 14,
                    marginBottom: 16,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      marginBottom: 8,
                    }}
                  >
                    <Text style={{ fontWeight: '700', fontSize: 14, color: colors.ink }}>Pontos livres agora</Text>
                    <Text style={{ fontFamily: font.mono, fontSize: 15, fontWeight: '600', color: avColor }}>
                      {st.free} / {st.total}
                    </Text>
                  </View>
                  <View
                    accessibilityRole="image"
                    accessibilityLabel={`${st.free} de ${st.total} pontos livres`}
                    style={{ height: 8, borderRadius: 5, backgroundColor: colors.surface3, overflow: 'hidden' }}
                  >
                    <View style={{ width: `${pct}%`, height: '100%', borderRadius: 5, backgroundColor: avColor }} />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}>
                    <Icon name="clock" size={12} color={colors.inkFaint} />
                    <Text style={{ fontSize: 12, color: colors.inkFaint }}>Menor movimento entre {st.quiet}</Text>
                  </View>
                </View>

                {/* specs grid */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                  <Spec icon="zap" label="Potência máx." value={`${st.power} kW`} />
                  <Spec icon="plug" label="Conectores" value={st.connectors.join(' · ')} />
                  <Spec icon="clock" label="Funcionamento" value={st.hours} />
                  <Spec icon="dollar" label="Preço médio" value={`R$ ${st.price.toFixed(2).replace('.', ',')}`} sub="kWh" />
                </View>

                {/* car-aware charging estimate — new, not in the source (which had no
                    concept of a selected car). Every stop/route/trip screen in the app
                    reads the same useCar()+evCharging.ts pair so the numbers agree. */}
                <View
                  style={{
                    borderRadius: space.radius,
                    padding: 14,
                    marginBottom: 16,
                    backgroundColor: estimate.compatible ? colors.primarySoft : colors.goldSoft,
                  }}
                  accessible
                  accessibilityLabel={
                    estimate.compatible
                      ? `Com o seu ${car.brand} ${car.model}: recarga de ${estimate.fromPct} a ${estimate.toPct} por cento em aproximadamente ${estimate.minutes} minutos, a ${estimate.effectiveKw} quilowatts`
                      : `Atenção: o conector deste ponto não é compatível com o seu ${car.brand} ${car.model}, que usa ${car.connector}`
                  }
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: estimate.compatible ? 8 : 2 }}>
                    <Icon name={estimate.compatible ? 'zap' : 'alert'} size={16} color={estimate.compatible ? colors.primary : colors.goldInk} />
                    <Text style={{ fontWeight: '700', fontSize: 13.5, color: estimate.compatible ? colors.primarySoftInk : colors.goldInk }}>
                      {estimate.compatible ? `Para o seu ${car.brand} ${car.model}` : 'Conector incompatível com o seu carro'}
                    </Text>
                  </View>
                  {estimate.compatible ? (
                    <Text style={{ fontSize: 13, lineHeight: 18, color: colors.primarySoftInk }}>
                      {estimate.fromPct}% → {estimate.toPct}% em <Text style={{ fontFamily: font.mono, fontWeight: '700' }}>{fmtChargeMinutes(estimate.minutes ?? 0)}</Text>
                      {' '}· até {estimate.effectiveKw} kW ({estimate.effectiveKw < st.power ? `limitado pelo carro, ponto oferece ${st.power} kW` : 'potência máxima do ponto'})
                    </Text>
                  ) : (
                    <Text style={{ fontSize: 13, lineHeight: 18, color: colors.goldInk }}>
                      Este ponto tem {st.connectors.join(' / ')}, mas seu carro usa {car.connector}. Procure outro ponto ou troque de carro no Perfil.
                    </Text>
                  )}
                </View>

                {/* amenities */}
                <View style={{ marginBottom: 16 }}>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      letterSpacing: 1.5,
                      textTransform: 'uppercase',
                      color: colors.inkFaint,
                      marginBottom: 10,
                    }}
                  >
                    Comodidades próximas
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {st.amenities.map((a) => {
                      const amen = AMEN[a];
                      if (!amen) return null;
                      const [icon, label] = amen;
                      return (
                        <View
                          key={a}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            paddingVertical: 7,
                            paddingHorizontal: 12,
                            borderRadius: 100,
                            backgroundColor: colors.surface,
                            borderWidth: 1,
                            borderColor: colors.line,
                          }}
                        >
                          <Icon name={icon} size={15} color={colors.primary} />
                          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inkSoft }}>{label}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* community reviews */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    marginBottom: 12,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      letterSpacing: 1.5,
                      textTransform: 'uppercase',
                      color: colors.inkFaint,
                    }}
                  >
                    Vozes da comunidade
                  </Text>
                  <AnimatedPressable
                    onPress={() => onRate?.(st)}
                    accessibilityRole="button"
                    hitSlop={8}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingVertical: 7,
                      paddingHorizontal: 14,
                      borderRadius: 100,
                      borderWidth: 1.5,
                      borderColor: colors.lineStrong,
                    }}
                  >
                    <Icon name="edit" size={15} color={colors.ink} />
                    <Text style={{ fontFamily: font.uiSemibold, fontSize: 13, color: colors.ink }}>Avaliar</Text>
                  </AnimatedPressable>
                </View>

                {reviews.length === 0 && (
                  <View
                    style={{
                      backgroundColor: colors.surface,
                      borderRadius: space.radius,
                      borderWidth: 1,
                      borderColor: colors.line,
                      padding: 16,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 14, color: colors.inkSoft, textAlign: 'center' }}>
                      Seja o primeiro a avaliar este ponto.
                    </Text>
                    <AnimatedPressable
                      onPress={() => onRate?.(st)}
                      accessibilityRole="button"
                      style={{
                        marginTop: 12,
                        paddingVertical: 13,
                        paddingHorizontal: 20,
                        borderRadius: 100,
                        backgroundColor: colors.primary,
                      }}
                    >
                      <Text style={{ fontFamily: font.uiSemibold, fontSize: space.ui, color: colors.primaryInk }}>
                        Escrever avaliação
                      </Text>
                    </AnimatedPressable>
                  </View>
                )}

                {reviews.map((r, i) => {
                  const initials = r.who
                    .split(' ')
                    .map((s) => s[0])
                    .join('');
                  return (
                    <View
                      key={i}
                      style={{
                        backgroundColor: colors.surface,
                        borderRadius: space.radius,
                        borderWidth: 1,
                        borderColor: colors.line,
                        padding: 14,
                        marginBottom: 10,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: colors.surface3,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text style={{ fontWeight: '800', fontSize: 13, color: colors.primarySoftInk }}>{initials}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: '700', fontSize: 14, color: colors.ink }}>{r.who}</Text>
                          <Text style={{ fontSize: 11, color: colors.inkFaint }}>
                            {r.car} · há {r.when}
                          </Text>
                        </View>
                        <Stars n={r.stars} size={12} />
                      </View>
                      <Text style={{ fontSize: 14, lineHeight: 21, color: colors.ink }}>{r.body}</Text>
                      {r.photoUri && (
                        <Image
                          source={{ uri: r.photoUri }}
                          accessibilityRole="image"
                          accessibilityLabel={`Foto adicionada por ${r.who}`}
                          style={{ width: '100%', height: 160, borderRadius: 12, marginTop: 10, backgroundColor: colors.surface3 }}
                        />
                      )}
                      {/* Source renders this as a `<button className="chip">` with no
                          onClick handler at all (a "mark helpful" affordance that was
                          never wired up). Kept as a non-interactive chip rather than
                          adding a Pressable that would do nothing on press. */}
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          alignSelf: 'flex-start',
                          gap: 6,
                          marginTop: 10,
                          paddingVertical: 7,
                          paddingHorizontal: 12,
                          borderRadius: 100,
                          backgroundColor: colors.surface,
                          borderWidth: 1,
                          borderColor: colors.line,
                        }}
                      >
                        <Icon name="thumb" size={13} color={colors.inkSoft} />
                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.inkSoft }}>Útil · {r.helpful}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </FadeIn>
          )}
        </BottomSheetScrollView>

        {/* sticky actions */}
        <View
          style={{
            flexDirection: 'row',
            gap: 10,
            paddingHorizontal: space.pad,
            paddingVertical: 12,
            borderTopWidth: 1,
            borderTopColor: colors.line,
            backgroundColor: colors.surface,
          }}
        >
          <FavoriteHeart fav={fav} onPress={() => onFav(st)} />
          <AnimatedPressable
            onPress={() => onReport?.(st)}
            accessibilityRole="button"
            accessibilityLabel="Reportar problema neste ponto"
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.surface2,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="alert" size={20} color={colors.ink} />
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => onNavigate(st)}
            accessibilityRole="button"
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingVertical: 13,
              borderRadius: 100,
              backgroundColor: colors.primary,
            }}
          >
            <Icon name="nav" size={18} color={colors.primaryInk} />
            <Text style={{ fontFamily: font.uiSemibold, fontSize: space.ui, color: colors.primaryInk }}>Iniciar rota</Text>
          </AnimatedPressable>
        </View>
      </View>
  );
}


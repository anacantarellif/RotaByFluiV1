// Ported from project/app/skeletons.jsx — shimmer placeholders shaped like the
// content that's about to arrive, so layout never jumps when data lands.
// See docs/LOADING-STATES.md.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';

function useShimmer() {
  const reduced = useReducedMotion();
  const opacity = useRef(new Animated.Value(reduced ? 0.55 : 0.35)).current;

  useEffect(() => {
    if (reduced) {
      opacity.setValue(0.55);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.85, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, opacity]);

  return opacity;
}

export function Skeleton({
  w = '100%' as number | `${number}%`,
  h = 14,
  r = 8,
  style,
}: {
  w?: number | `${number}%`;
  h?: number;
  r?: number;
  style?: object;
}) {
  const { colors } = useTheme();
  const opacity = useShimmer();
  return (
    <Animated.View
      style={[{ width: w, height: h, borderRadius: r, backgroundColor: colors.surface3, opacity }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

export function Spinner({ size = 18, color }: { size?: number; color?: string }) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const spin = useRef(new Animated.Value(0)).current;
  const c = color ?? colors.ink;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: reduced ? 2000 : 800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel="Carregando"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: c,
        borderTopColor: 'transparent',
        transform: [{ rotate }],
      }}
    />
  );
}

export function MapSkeleton() {
  const { colors } = useTheme();
  const dots = [
    [28, 22], [64, 34], [42, 58], [72, 70], [22, 78],
  ] as const;
  return (
    <View
      style={StyleSheet.absoluteFill}
      accessibilityRole="progressbar"
      accessibilityLabel="Carregando o mapa"
    >
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.mapLand }]}>
        {[12, 31, 50, 69, 88].map((top, i) => (
          <View key={`h${i}`} style={{ position: 'absolute', left: 0, right: 0, top: `${top}%`, height: 1, backgroundColor: colors.mapRoadLine }} />
        ))}
        {[14, 38, 62, 86].map((left, i) => (
          <View key={`v${i}`} style={{ position: 'absolute', top: 0, bottom: 0, left: `${left}%`, width: 1, backgroundColor: colors.mapRoadLine }} />
        ))}
        {dots.map(([left, top], i) => (
          <View
            key={i}
            style={{
              position: 'absolute', left: `${left}%`, top: `${top}%`,
              width: 10, height: 10, borderRadius: 5, marginLeft: -5, marginTop: -5,
              backgroundColor: colors.primary, opacity: 0.5,
            }}
          />
        ))}
      </View>
      <View
        style={{
          position: 'absolute', bottom: 16, alignSelf: 'center',
          flexDirection: 'row', alignItems: 'center', gap: 8,
          backgroundColor: colors.surface, paddingVertical: 8, paddingHorizontal: 14,
          borderRadius: 999, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, elevation: 3,
        }}
      >
        <Spinner size={15} color={colors.primary} />
        <Text style={{ color: colors.ink, fontSize: 13 }}>Carregando pontos próximos…</Text>
      </View>
    </View>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  const { colors, space } = useTheme();
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Carregando a lista de pontos">
      <Skeleton w="46%" h={12} style={{ marginBottom: 14 }} />
      {Array.from({ length: rows }).map((_, i) => (
        <View
          key={i}
          style={{
            padding: 14, marginBottom: 10, borderRadius: space.radiusSm,
            backgroundColor: colors.surface, flexDirection: 'row', gap: 12, alignItems: 'center',
          }}
        >
          <Skeleton w={44} h={44} r={14} />
          <View style={{ flex: 1 }}>
            <Skeleton w={i % 2 ? '54%' : '68%'} h={15} style={{ marginBottom: 8 }} />
            <Skeleton w="38%" h={11} />
          </View>
          <Skeleton w={38} h={22} r={7} />
        </View>
      ))}
    </View>
  );
}

export function StationSkeleton() {
  return (
    <View style={{ paddingHorizontal: 18 }} accessibilityRole="progressbar" accessibilityLabel="Carregando a ficha do ponto">
      <Skeleton h={170} r={20} style={{ marginBottom: 14 }} />
      <Skeleton w="62%" h={24} style={{ marginBottom: 9 }} />
      <Skeleton w="40%" h={13} style={{ marginBottom: 18 }} />
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
        {[72, 88, 64].map((w, i) => (
          <Skeleton key={i} w={w} h={30} r={100} />
        ))}
      </View>
      <Skeleton h={13} style={{ marginBottom: 8 }} />
      <Skeleton h={13} style={{ marginBottom: 8 }} />
      <Skeleton w="72%" h={13} />
    </View>
  );
}

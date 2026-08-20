// Fades its children in on mount — used where a skeleton swaps for real
// content (e.g. StationDetailContent once its ficha finishes "loading"), so
// that swap reads as a transition instead of a hard cut. Respects
// reduced-motion (content just appears, no animation).
import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export function FadeIn({
  children,
  style,
  duration = 260,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  duration?: number;
}) {
  const reduced = useReducedMotion();
  const opacity = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) return;
    Animated.timing(opacity, { toValue: 1, duration, useNativeDriver: true }).start();
  }, [reduced, opacity, duration]);

  return <Animated.View style={[style, { opacity }]}>{children}</Animated.View>;
}

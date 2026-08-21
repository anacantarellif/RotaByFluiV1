// Scale-down-on-press feedback, reusable across the app. `TouchableOpacity`
// (used for several existing action buttons) already fades on press by
// itself; the plain `Pressable`s used for RateFlow's primary actions had no
// press feedback at all beyond the OS's own ripple/highlight, which read as
// unresponsive/hard to use on a touch-first flow (reported on the rating
// flow specifically). Respects reduced-motion (no scale animation, tap still
// works instantly).
import React, { useRef } from 'react';
import { Animated, Pressable, PressableProps } from 'react-native';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export function AnimatedPressable({
  children,
  style,
  scaleTo = 0.96,
  onPressIn,
  onPressOut,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  children: React.ReactNode;
  // Typed loosely on purpose: plain ViewStyle covers most callers, but
  // several (e.g. Chip) pass an Animated-interpolated style object straight
  // through to get both that color animation and this component's own
  // press-scale on the same element — RN's own StyleProp<Animated...> generic
  // nesting fights TS here, and it's not worth fighting for an internal prop.
  style?: any;
  scaleTo?: number;
}) {
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Pressable
      {...rest}
      onPressIn={(e) => {
        if (!reduced) Animated.spring(scale, { toValue: scaleTo, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (!reduced) Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start();
        onPressOut?.(e);
      }}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

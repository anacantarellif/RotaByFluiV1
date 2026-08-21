// Scale-down-on-press feedback, reusable across the app. `TouchableOpacity`
// (used for several existing action buttons) already fades on press by
// itself; the plain `Pressable`s used for RateFlow's primary actions had no
// press feedback at all beyond the OS's own ripple/highlight, which read as
// unresponsive/hard to use on a touch-first flow (reported on the rating
// flow specifically). Respects reduced-motion (no scale animation, tap still
// works instantly).
//
// Built on Animated.createAnimatedComponent(Pressable) — a single animated
// node that IS the Pressable, not a plain Pressable wrapping a separately
// styled Animated.View child. An earlier version split them: the outer
// Pressable got no style at all, so a caller's `flex: 1` / `width: '100%'`
// only ever sized the inner child — the outer node the parent's flex layout
// actually measures stayed unstyled and shrank to content size, with
// nothing for that inner flex:1 to grow into. Every button built on this
// component lost its "fill available space" sizing that way (reported: "os
// botões... tem que usar o espaço que eles tem disponível, estilo fill
// container"). Putting `style` (including the scale transform) directly on
// the one animated Pressable node fixes that at the root.
import React, { useRef } from 'react';
import { Animated, Pressable, PressableProps } from 'react-native';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

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
    <AnimatedPressableBase
      {...rest}
      onPressIn={(e: any) => {
        if (!reduced) Animated.spring(scale, { toValue: scaleTo, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
        onPressIn?.(e);
      }}
      onPressOut={(e: any) => {
        if (!reduced) Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start();
        onPressOut?.(e);
      }}
      style={[style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressableBase>
  );
}

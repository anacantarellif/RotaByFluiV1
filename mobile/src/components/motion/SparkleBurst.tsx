// Small reusable sparkle-burst flourish: a handful of sparkle glyphs that pop
// outward and fade whenever `trigger` changes to a new value. Extracted from
// RateFlow's Selo Flui sparkle (see RateFlow.tsx `SeloSparkles`) so the same
// effect can back other "you just earned something" moments — first user:
// ToastContext, for the sparkle on Watts-earning toasts (rating, reporting).
// No-ops entirely under reduced-motion.
import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { Icon } from '../icons/Icon';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const OFFSETS = [
  { x: -20, y: -14 },
  { x: 18, y: -18 },
  { x: -16, y: 12 },
  { x: 20, y: 10 },
  { x: 2, y: -22 },
];

export function SparkleBurst({ trigger, color, size = 12 }: { trigger: number; color: string; size?: number }) {
  const reduced = useReducedMotion();
  const anims = useRef(OFFSETS.map(() => new Animated.Value(0))).current;
  const lastTrigger = useRef(trigger);

  useEffect(() => {
    if (trigger !== lastTrigger.current && trigger > 0 && !reduced) {
      anims.forEach((v) => v.setValue(0));
      Animated.stagger(
        45,
        anims.map((v) => Animated.timing(v, { toValue: 1, duration: 520, useNativeDriver: true }))
      ).start();
    }
    lastTrigger.current = trigger;
  }, [trigger, reduced, anims]);

  if (reduced) return null;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}>
      {anims.map((v, i) => {
        const { x, y } = OFFSETS[i];
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              opacity: v.interpolate({ inputRange: [0, 0.15, 0.75, 1], outputRange: [0, 1, 1, 0] }),
              transform: [
                { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, x] }) },
                { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, y] }) },
                { scale: v.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.4, 1, 0.6] }) },
              ],
            }}
          >
            <Icon name="sparkle" size={size} color={color} />
          </Animated.View>
        );
      })}
    </View>
  );
}

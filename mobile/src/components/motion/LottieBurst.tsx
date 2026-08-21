// One-shot Lottie burst — plays the given animation once whenever `trigger`
// changes to a new, positive value. Used for the "brilhinhos" (sparkles)
// flourish wherever something is earned or indicated: the Selo Flui toggle
// in RateFlow, and Watts-earning toasts (ToastContext). Replaces the earlier
// hand-drawn Animated.Value sparkle bursts with a real designer-provided
// animation. No-ops entirely under reduced-motion.
import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import LottieView from 'lottie-react-native';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import sparkleSource from '../../assets/lottie/sparkle.json';

// Source canvas is 1125×708 — kept proportional so the burst's particle
// spread doesn't distort.
const ASPECT = 1125 / 708;

export function LottieBurst({ trigger, size = 130 }: { trigger: number; size?: number }) {
  const reduced = useReducedMotion();
  const ref = useRef<LottieView>(null);
  const lastTrigger = useRef(trigger);
  const height = size / ASPECT;

  useEffect(() => {
    if (trigger !== lastTrigger.current && trigger > 0 && !reduced) {
      ref.current?.reset();
      ref.current?.play();
    }
    lastTrigger.current = trigger;
  }, [trigger, reduced]);

  if (reduced) return null;

  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: '50%', top: '50%', width: size, height, marginLeft: -size / 2, marginTop: -height / 2 }}
    >
      <LottieView ref={ref} source={sparkleSource} loop={false} autoPlay={false} style={{ width: size, height }} />
    </View>
  );
}

import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// RN equivalent of the web prototype's `prefers-reduced-motion` handling
// (docs/HANDOFF.md §5): shimmer/animations should turn off when this is true.
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => mounted && setReduced(v));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return reduced;
}

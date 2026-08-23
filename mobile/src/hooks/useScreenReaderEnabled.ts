import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// Same shape as useReducedMotion.ts, for the other half of AccessibilityInfo:
// whether TalkBack (Android) / VoiceOver (iOS) is running. Lets a component
// switch to a screen-reader-friendly interaction instead of a gesture-only
// one — e.g. BatterySlider (RouteScreen.tsx) drops its custom Gesture.Pan
// drag handler when this is true, relying only on its existing
// accessibilityRole="adjustable" + increment/decrement actions, since a
// screen reader's own touch-exploration takes over raw touch handling and
// a competing custom pan gesture on the same view was reported to make the
// slider undraggable rather than just redundant.
export function useScreenReaderEnabled() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isScreenReaderEnabled().then((v) => mounted && setEnabled(v));
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setEnabled);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return enabled;
}

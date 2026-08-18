// Real device GPS tracking for NavScreen/TripScreen. This is new — the source
// prototype (project/app/nav.jsx, trip.jsx) only ever animated a synthetic seeded
// position, since a browser sandbox can't reliably access GPS. The RN app can, and
// the user asked for the in-app map to be driven by the driver's real position
// (not a simulation, and not by cutting away to an external Maps app) — see the
// "modo de demonstração" fallback in LocationNotice.tsx for when that's not
// possible (permission denied, or testing far from any real station).
import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { GeoPoint } from '../utils/routeSim';

export type LiveLocationStatus = 'checking' | 'granted' | 'denied' | 'unavailable';

export type LiveLocationState = {
  status: LiveLocationStatus;
  coords: (GeoPoint & { heading: number | null; speed: number | null; accuracy: number | null }) | null;
  requestPermission: () => void;
};

export function useLiveLocation(active: boolean): LiveLocationState {
  const [status, setStatus] = useState<LiveLocationStatus>('checking');
  const [coords, setCoords] = useState<LiveLocationState['coords']>(null);
  const subscription = useRef<Location.LocationSubscription | null>(null);
  const [attempt, setAttempt] = useState(0);

  const requestPermission = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    (async () => {
      setStatus('checking');
      try {
        const servicesOn = await Location.hasServicesEnabledAsync();
        if (!servicesOn) {
          if (!cancelled) setStatus('unavailable');
          return;
        }
        const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (permStatus !== 'granted') {
          setStatus('denied');
          return;
        }
        setStatus('granted');

        subscription.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1500, distanceInterval: 5 },
          (loc) => {
            if (cancelled) return;
            setCoords({
              lat: loc.coords.latitude,
              lng: loc.coords.longitude,
              heading: loc.coords.heading ?? null,
              speed: loc.coords.speed ?? null,
              accuracy: loc.coords.accuracy ?? null,
            });
          }
        );
      } catch {
        if (!cancelled) setStatus('unavailable');
      }
    })();

    return () => {
      cancelled = true;
      subscription.current?.remove();
      subscription.current = null;
    };
  }, [active, attempt]);

  return { status, coords, requestPermission };
}

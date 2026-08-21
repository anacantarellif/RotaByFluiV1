// Ported from project/app/gmap.jsx <GeoMapView>. See docs/MAPS.md.
//
// The web prototype has two interchangeable providers (Google JS API vs a keyless
// raster-tile fallback) so it can be demoed with no billing account. react-native-maps
// doesn't have an equivalent keyless path on Android (the underlying map is always
// Google Play Services there), so the provider rule here is:
//   - googleMapsApiKey set, OR platform === 'android'  -> PROVIDER_GOOGLE
//   - iOS with no key                                   -> PROVIDER_DEFAULT (Apple Maps)
// Same props, same markers, same callbacks either way — see docs/MAPS.md §1 for the
// full rationale and what still needs a real key to ship on Android.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import MapView, { Circle, Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { useTheme } from '../../theme/ThemeContext';
import { ROTA_CONFIG } from '../../config';
import { DATA } from '../../data/data';
import { Station, Report } from '../../data/types';
import { GMAP_STYLE_DARK, GMAP_STYLE_LIGHT } from './mapStyles';
import { pinLabel, ReportPin, StationPin } from './MarkerPins';
import { MapSkeleton } from '../skeletons/Skeletons';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const DELTA = 0.09;

export function GeoMapView({
  stations,
  active,
  onPin,
  onReport,
  showReports = true,
  recenterSignal = 0,
}: {
  stations?: Station[];
  active?: string | null;
  onPin: (st: Station) => void;
  onReport?: (r: Report) => void;
  showReports?: boolean;
  recenterSignal?: number;
}) {
  const { mode, markers } = useTheme();
  const mapRef = useRef<MapView>(null);
  const [loading, setLoading] = useState(true);
  const hasKey = !!ROTA_CONFIG.googleMapsApiKey;
  const provider = hasKey || Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;

  const list = stations ?? DATA.stations;
  const home = DATA.map_default;
  const userGeo = DATA.user_geo;

  const initialRegion: Region = useMemo(
    () => ({ latitude: home.lat, longitude: home.lng, latitudeDelta: DELTA, longitudeDelta: DELTA }),
    [home.lat, home.lng]
  );

  useEffect(() => {
    if (recenterSignal > 0) {
      mapRef.current?.animateToRegion(
        { latitude: userGeo.lat, longitude: userGeo.lng, latitudeDelta: 0.04, longitudeDelta: 0.04 },
        350
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterSignal]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={provider}
        initialRegion={initialRegion}
        customMapStyle={provider === PROVIDER_GOOGLE ? (mode === 'dark' ? GMAP_STYLE_DARK : GMAP_STYLE_LIGHT) : undefined}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        rotateEnabled
        onMapLoaded={() => setLoading(false)}
        accessibilityLabel="Mapa interativo dos pontos de recarga"
      >
        {showReports &&
          onReport &&
          DATA.reports.map((r) => (
            <Marker
              key={r.id}
              coordinate={{ latitude: r.lat, longitude: r.lng }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
              onPress={() => onReport(r)}
              accessibilityLabel={`Reporte da comunidade: ${r.label}, há ${r.when}. Toque para ver detalhes`}
            >
              <ReportPin r={r} />
            </Marker>
          ))}

        {list.map((st) => (
          <StationMarker key={st.id} st={st} active={active === st.id} markerStyle={markers} onPin={onPin} />
        ))}

        {/* Pulsing "ondinha" ring around the driver's location — a native
            Circle overlay (radius animated via a plain state update, driven
            by an Animated.Value listener) instead of animating a Marker's
            rasterized content. See UserLocationPulse below for why. */}
        <UserLocationPulse coordinate={{ latitude: userGeo.lat, longitude: userGeo.lng }} />
      </MapView>

      {loading && <MapSkeleton />}
    </View>
  );
}

// `tracksViewChanges` controls whether react-native-maps keeps re-rasterizing
// a Marker's RN-view content into a native bitmap. Leaving it permanently
// true (the previous approach here, meant to fix an earlier "clipped on
// first render" bug) turned out to be the wrong direction entirely: Android
// react-native-maps re-snapshotting the *same* marker every frame is a
// documented source of bitmap corruption, and it lines up exactly with what
// got reported — both markers that had it permanently true (station pins,
// the old animated user-location marker) showed a corrupted/oversized
// square-shaped snapshot artifact, while ReportPin markers, which have
// always used `tracksViewChanges={false}`, were never reported broken.
//
// The correct pattern: start true (so the very first snapshot reflects a
// fully-settled layout, the original bug this was fixing), then flip to
// false shortly after so react-native-maps stops re-capturing it — and flip
// back to true only when something that actually changes the marker's
// appearance changes (here: selection or the dot/pin style toggle), for one
// more settle-and-stop cycle.
function useSettleTracking(deps: React.DependencyList, delay = 350) {
  const [tracking, setTracking] = useState(true);
  useEffect(() => {
    setTracking(true);
    const t = setTimeout(() => setTracking(false), delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return tracking;
}

function StationMarker({
  st,
  active,
  markerStyle,
  onPin,
}: {
  st: Station;
  active: boolean;
  markerStyle: 'pin' | 'dot';
  onPin: (st: Station) => void;
}) {
  const tracking = useSettleTracking([active, markerStyle]);
  return (
    <Marker
      coordinate={{ latitude: st.lat, longitude: st.lng }}
      anchor={{ x: 0.5, y: 1 }}
      zIndex={active ? 10 : 1}
      onPress={() => onPin(st)}
      accessibilityLabel={pinLabel(st)}
      tracksViewChanges={tracking}
    >
      <StationPin st={st} active={active} markerStyle={markerStyle} />
    </Marker>
  );
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Ported from styles.css `.userdot .pulse` — an expanding, fading ring behind
// the solid position dot, looping.
//
// This used to be a Marker whose RN-view content animated (first a hand-drawn
// Animated.View ring, briefly a Lottie ring) — both hit the same Android
// react-native-maps bitmap-snapshot problems (see useSettleTracking above,
// and Lottie specifically doesn't snapshot inside a Marker at all). A
// continuously *animating* marker fundamentally needs continuous
// re-rasterization, so it can't just get the "settle and stop" fix given to
// the station pins above. The actual fix is to stop trying to animate marker
// bitmap content for this at all: draw the ring as a native `Circle` map
// overlay instead (radius in meters, drawn by the map SDK itself, no RN-view
// snapshotting involved), and keep the solid center dot as a separate,
// genuinely static Marker (tracksViewChanges={false} always — nothing about
// it ever changes after mount).
function UserLocationPulse({ coordinate }: { coordinate: { latitude: number; longitude: number } }) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const pulse = useRef(new Animated.Value(0)).current;
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const id = pulse.addListener(({ value }) => setProgress(value));
    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 2400, easing: Easing.out(Easing.ease), useNativeDriver: false })
    );
    loop.start();
    return () => {
      pulse.removeListener(id);
      loop.stop();
    };
  }, [reduced, pulse]);

  const [r, g, b] = hexToRgb(colors.primary);

  return (
    <>
      {!reduced && (
        <Circle
          center={coordinate}
          radius={12 + progress * 90}
          fillColor={`rgba(${r},${g},${b},${0.35 * (1 - progress)})`}
          strokeColor="transparent"
          zIndex={1}
        />
      )}
      <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false} accessibilityLabel="Sua localização">
        <View
          style={{
            width: 18, height: 18, borderRadius: 9,
            backgroundColor: colors.primary, borderWidth: 3, borderColor: colors.surface,
          }}
        />
      </Marker>
    </>
  );
}

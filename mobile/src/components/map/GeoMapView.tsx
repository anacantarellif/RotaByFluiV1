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
import MapView, { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE, Region } from 'react-native-maps';
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
          <Marker
            key={st.id}
            coordinate={{ latitude: st.lat, longitude: st.lng }}
            anchor={{ x: 0.5, y: 1 }}
            zIndex={active === st.id ? 10 : 1}
            onPress={() => onPin(st)}
            accessibilityLabel={pinLabel(st)}
            // Station pins were still reported clipped after sizing their
            // wrapper box to the rotated shape's true diagonal — the JS layout
            // fix was correct, but with tracksViewChanges left at its default,
            // react-native-maps rasterizes the marker into a native bitmap
            // *once*, which on Android can happen before that layout has
            // actually settled, baking in a clipped snapshot that then never
            // gets recaptured. True here keeps it re-rasterizing from the
            // current (correct) layout — a handful of station pins is cheap
            // enough that the usual perf reason to avoid this doesn't apply.
            tracksViewChanges
          >
            <StationPin st={st} active={active === st.id} markerStyle={markers} />
          </Marker>
        ))}

        <Marker
          coordinate={{ latitude: userGeo.lat, longitude: userGeo.lng }}
          anchor={{ x: 0.5, y: 0.5 }}
          // Unlike the other markers, this one animates (the pulsing "ondinha"
          // ring below) — react-native-maps only rasterizes a Marker's child
          // into what's actually shown on the map when tracksViewChanges is
          // true, so leaving this false (like the static station/report pins)
          // would freeze the pulse as a single static frame. Just one marker,
          // so the continuous-recapture cost is negligible.
          tracksViewChanges
          accessibilityLabel="Sua localização"
        >
          <UserDot />
        </Marker>
      </MapView>

      {loading && <MapSkeleton />}
    </View>
  );
}

// Ported from styles.css `.userdot .pulse` — an expanding, fading ring behind
// the solid position dot, looping. Marked `tracksViewChanges={false}` on its
// <Marker> (GeoMapView above), so this needs to run as a native-driven
// animation the OS can composite without React re-measuring the marker every
// frame — `useNativeDriver: true` on both legs does that.
function UserDot() {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 2400, easing: Easing.out(Easing.ease), useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, pulse]);

  return (
    <View style={{ width: 18, height: 18, alignItems: 'center', justifyContent: 'center' }}>
      {!reduced && (
        <Animated.View
          style={{
            position: 'absolute',
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: colors.primary,
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 4.5] }) }],
          }}
        />
      )}
      <View
        style={{
          width: 18, height: 18, borderRadius: 9,
          backgroundColor: colors.primary, borderWidth: 3, borderColor: colors.surface,
          shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
        }}
      />
    </View>
  );
}

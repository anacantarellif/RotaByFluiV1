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

        {list.map((st) => {
          const isActive = active === st.id;
          return (
            <Marker
              // Forces a full remount (and with it, exactly one fresh
              // snapshot) whenever something that actually changes this
              // pin's appearance changes, instead of leaving
              // tracksViewChanges permanently true to keep re-rasterizing in
              // place. Permanently-true was the real bug, not a workaround
              // for one: screenshot evidence showed the *same* pin shape
              // rendering correctly in one color (red/off) and clipped to
              // just its top arc in others (green/ok, amber/busy) in the
              // very same render pass — non-deterministic corruption from
              // continuously re-rasterizing on Android, not anything
              // color-specific. ReportPin below has used
              // tracksViewChanges={false} permanently this whole time and
              // has never once been reported broken — this matches that
              // proven-safe pattern instead of fighting the continuous one
              // further.
              key={`${st.id}-${isActive}-${markers}-${mode}`}
              coordinate={{ latitude: st.lat, longitude: st.lng }}
              anchor={{ x: 0.5, y: 1 }}
              zIndex={isActive ? 10 : 1}
              onPress={() => onPin(st)}
              accessibilityLabel={pinLabel(st)}
              tracksViewChanges={false}
            >
              <StationPin st={st} active={isActive} markerStyle={markers} />
            </Marker>
          );
        })}

        {/* Split into two markers instead of one: the solid dot never
            changes after mount, so it gets the same proven
            tracksViewChanges={false} treatment as ReportPin/StationMarker
            (reported vanishing entirely when it shared a marker with the
            continuously-animating ring — splitting it out means its own
            snapshot is never at the mercy of the ring's per-frame
            re-rasterization). The ring genuinely animates every frame, so it
            still needs tracksViewChanges true — it's the one marker in this
            app where that's unavoidable, not a default choice. Ring declared
            first so the solid dot paints on top of it (later siblings paint
            over earlier ones), not the other way around. */}
        <Marker coordinate={{ latitude: userGeo.lat, longitude: userGeo.lng }} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges>
          <UserDotPulseRing />
        </Marker>
        <Marker
          coordinate={{ latitude: userGeo.lat, longitude: userGeo.lng }}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}
          accessibilityLabel="Sua localização"
        >
          <UserDotSolid />
        </Marker>
      </MapView>

      {loading && <MapSkeleton />}
    </View>
  );
}

// Solid center dot for the user-location marker — its own Marker now (see
// GeoMapView above), split out from the pulsing ring specifically so its
// snapshot is a one-time, tracksViewChanges={false} capture that's never at
// the mercy of the ring's continuous per-frame re-rasterization. Reported
// vanishing entirely when the two shared one marker.
function UserDotSolid() {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: RING_BASE, height: RING_BASE, borderRadius: RING_BASE / 2,
        backgroundColor: colors.primary, borderWidth: 3, borderColor: colors.surface,
      }}
      collapsable={false}
    />
  );
}

// Ported from styles.css `.userdot .pulse` — an expanding, fading ring,
// looping, behind the solid dot (now a separate marker, see UserDotSolid
// above).
//
// Found the real cause of the persistent clipping (screenshot showed a solid
// purple SQUARE where a ring should be): the ring grows via `transform:
// scale` up to 4.5× — and just like `rotate` on the diamond pins earlier,
// `scale` doesn't resize the element's own *measured* layout box. The
// wrapper here was only 18×18 while the ring visually grows to ~81px at its
// peak (18 × 4.5); react-native-maps measures/snapshots that 18×18 box and
// clips everything painted outside it. At peak size, that tiny 18px window
// only ever sees the very center of an 81px circle — far from its curved
// edge, which just looks like a solid-colored square, not a ring. Sized the
// wrapper to the ring's true peak extent instead.
//
// That fix alone still needed this: `position: 'absolute'` children are NOT
// affected by their parent's `alignItems`/`justifyContent` in RN — those
// only apply to normal-flow children. The ring defaulted to its implicit
// `top: 0, left: 0`, which happened to look centered back when the wrapper
// was the *same* 18×18 size as the ring itself (top-left-aligned == fully
// overlapping at equal sizes) — but enlarging the wrapper to 81×81 left the
// ring anchored to that box's top-left corner instead of its center,
// nowhere near the actually-centered solid dot (reported: the dot
// disappeared and only an oddly-placed pulse remained). Explicit centering
// offsets below fix that.
const RING_BASE = 18;
const RING_SCALE_MAX = 4.5;
const RING_BOX = RING_BASE * RING_SCALE_MAX;
const RING_CENTER_OFFSET = (RING_BOX - RING_BASE) / 2;

function UserDotPulseRing() {
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

  if (reduced) return null;

  return (
    <View style={{ width: RING_BOX, height: RING_BOX }} collapsable={false}>
      <Animated.View
        style={{
          position: 'absolute',
          top: RING_CENTER_OFFSET,
          left: RING_CENTER_OFFSET,
          width: RING_BASE,
          height: RING_BASE,
          borderRadius: RING_BASE / 2,
          backgroundColor: colors.primary,
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, RING_SCALE_MAX] }) }],
        }}
      />
    </View>
  );
}

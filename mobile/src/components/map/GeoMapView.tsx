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
        {/* Every custom-view Marker in this file uses tracksViewChanges
            permanently true — read react-native-maps' own Android source
            (MapMarker.java) to settle this instead of guessing again.
            addToMap() bakes a marker's *first* bitmap synchronously via
            createDrawable(), which falls back to drawing whatever's
            currently there into a 100×100 canvas if the RN view hasn't
            finished its async layout pass yet by that exact moment — a real
            race, not a hypothetical one. With tracksViewChanges true,
            ViewChangesTracker just re-captures every ~40ms
            (`fps = 40` in that file) until a properly-settled frame gets
            through — self-healing. With it false from mount, that first
            (possibly-empty) capture is never retried: setTracksViewChanges
            only calls updateMarkerIcon() again on a true→false *transition*
            (guarded by `if (shouldTrack == tracksViewChangesActive) return`,
            and tracksViewChangesActive starts false) — false from the very
            first call never takes that branch. A previous attempt set
            station pins and the pulse dot to tracksViewChanges={false} from
            mount (plus, for the pins, a remount-on-change `key`, which
            re-triggers this exact race on every remount instead of avoiding
            it) — reported result: every station pin and the pulse dot
            vanished outright. That's this race caught in the worst way,
            confirming the diagnosis. Continuous tracking's own occasional
            partial-frame catches (reported earlier as clipping) are a
            transient timing artifact of the ~40ms recapture cycle catching
            an in-between layout pass, not permanent corruption — the next
            tick self-corrects it, unlike a frozen empty capture. */}
        {showReports &&
          onReport &&
          DATA.reports.map((r) => (
            <Marker
              key={r.id}
              coordinate={{ latitude: r.lat, longitude: r.lng }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges
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
            tracksViewChanges
          >
            <StationPin st={st} active={active === st.id} markerStyle={markers} />
          </Marker>
        ))}

        {/* One marker for the dot + ring together — see UserDot below for
            why this used to be split into two and isn't anymore. */}
        <Marker
          coordinate={{ latitude: userGeo.lat, longitude: userGeo.lng }}
          anchor={{ x: 0.5, y: 0.5 }}
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

// Ported from styles.css `.userdot .pulse` — an expanding, fading ring
// behind the solid position dot, looping.
//
// Went through several wrong turns before this one — see git history for
// the full trail. The fix that finally landed for station pins (never grow
// a marker's canvas beyond a single reliably-correct size — draw any extra
// decoration as an overlay *inside* that same size instead) applies here
// too: this used to grow the ring via `transform: scale` up to 4.5×, which
// meant reserving a much bigger wrapper box (81px) than the dot's own
// naturally-correct 18px — the same "bigger than the reliably-correct size"
// pattern that broke the pins. Confirmed (once the pin fix landed) that the
// ring and dot still didn't line up and the ring was still cut, pointing at
// the same root cause here, not a separate one.
//
// Fixed the same way: the ring never grows past a fixed, modest size now —
// no `scale` transform at all, no need for a bigger box than the dot
// already used. It pulses by fading only (opacity), trading the "expanding
// wave" look for a "breathing" one in exchange for not needing more
// canvas space than what's already proven reliable.
const RING_BASE = 18;
const RING_SIZE = 32;

function UserDot() {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, pulse]);

  return (
    <View style={{ width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' }} collapsable={false}>
      {!reduced && (
        <Animated.View
          style={{
            position: 'absolute',
            width: RING_SIZE,
            height: RING_SIZE,
            borderRadius: RING_SIZE / 2,
            backgroundColor: colors.primary,
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.5] }),
          }}
        />
      )}
      <View
        style={{
          width: RING_BASE, height: RING_BASE, borderRadius: RING_BASE / 2,
          backgroundColor: colors.primary, borderWidth: 3, borderColor: colors.surface,
        }}
      />
    </View>
  );
}

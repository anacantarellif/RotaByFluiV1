// Ported from project/app/nav.jsx — turn-by-turn navigation to a single station.
//
// The source only ever animates a synthetic seeded position over its illustrated
// 1000×1500 SVG map (a browser sandbox can't reliably read GPS). This port can:
// per docs/MAPS.md §5 ("Posição do carro: hoje animada por requestAnimationFrame,
// para produção Geolocation.watchPosition") and the explicit product decision
// ("o app precisa mostrar a parte do roteiro relacionada com o ponto B" as the
// driver passes real points, not a simulated animation), this screen drives the
// map from real device GPS (useLiveLocation) whenever permission + signal are
// available, falling back to the source's demo animation only when they aren't
// (LocationNotice's "modo de demonstração", explicitly labeled as a simulation)
// or when the driver picks it deliberately.
//
// There's still no real routing engine (no Directions API — see docs/MAPS.md §5),
// so the drawn path is the same "few doglegs" synthetic polyline the source used
// (src/utils/routeSim.ts), just drawn with real lat/lng over the real map
// (<Polyline>) instead of the legacy illustrated canvas. One deliberate deviation
// from the source in real-GPS mode: turn-by-turn instructions ("vire à esquerda")
// are NOT fabricated against the synthetic line, because on the real road network
// they'd routinely contradict what the driver is actually seeing — real mode shows
// real distance/ETA and a heading arrow instead. Demo mode keeps the source's full
// turn-by-turn heuristic, since there the whole route is synthetic and internally
// consistent.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeContext';
import { useToast } from '../state/ToastContext';
import { useCar } from '../state/CarContext';
import { useLiveLocation } from '../hooks/useLiveLocation';
import { LocationNotice } from '../components/LocationNotice';
import { Icon, Seal } from '../components/icons/Icon';
import { Spinner } from '../components/skeletons/Skeletons';
import { RateFlow } from '../components/rating/RateFlow';
import { GMAP_STYLE_DARK, GMAP_STYLE_LIGHT } from '../components/map/mapStyles';
import { ROTA_CONFIG } from '../config';
import { DATA } from '../data/data';
import { Station } from '../data/types';
import { batteryAfterDistance } from '../utils/evCharging';
import { bearingDeg, fmtDistanceMeters, haversineMeters } from '../utils/geo';
import { addClock, buildRoute, cumLengths, fmtMeters, GeoPoint, locateAt, rng, seedFromId, STREETS, Turn, turnAt, TURN_LABEL } from '../utils/routeSim';

type Props = NativeStackScreenProps<RootStackParamList, 'Nav'>;

const ARRIVAL_THRESHOLD_M = 40;
const DEMO_START_BATTERY = 62;
// Same implied average as the source (nav.jsx: `Math.round(km / 22 * 60)`) — a
// same-city trip to a station, not a highway leg.
const NAV_AVG_KMH = 22;

const TURN_PATH: Record<Turn, string> = {
  straight: 'M12 21V6M12 6l-5 5M12 6l5 5',
  left: 'M17 21v-6a5 5 0 0 0-5-5H7M7 10l4-4M7 10l4 4',
  right: 'M7 21v-6a5 5 0 0 1 5-5h5M17 10l-4-4M17 10l-4 4',
};

function TurnArrow({ type, size = 32, color = '#fff' }: { type: Turn; size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d={TURN_PATH[type]} />
    </Svg>
  );
}

function DestFlag({ station }: { station: Station }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          width: 42, height: 42, borderRadius: 13, backgroundColor: colors.off,
          alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.surface,
          shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5, elevation: 5,
        }}
      >
        {station.selo > 0 ? <Seal size={18} /> : <Icon name="flag" size={18} color="#fff" />}
      </View>
      <View
        style={{
          width: 0, height: 0, marginTop: -1,
          borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 9,
          borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: colors.off,
        }}
      />
    </View>
  );
}

function CarMarker({ heading }: { heading: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', transform: [{ rotate: `${heading}deg` }] }}>
      <View
        style={{
          width: 0, height: 0, marginBottom: -2,
          borderLeftWidth: 6, borderRightWidth: 6, borderBottomWidth: 10,
          borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: colors.primary,
        }}
      />
      <View
        style={{
          width: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary,
          borderWidth: 3, borderColor: colors.surface,
          shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, elevation: 5,
        }}
      />
    </View>
  );
}

// Vertices travelled so far, plus the interpolated current point — drawn as the
// "done" portion of the route in the primary color, over the full route in a
// muted one (mirrors the source's `route-line` / `route-done` dashed overlay).
function progressPath(pts: GeoPoint[], cum: number[], d: number, here: GeoPoint): GeoPoint[] {
  let i = 1;
  while (i < cum.length - 1 && cum[i] < d) i++;
  return [...pts.slice(0, i), here];
}

export function NavScreen({ route, navigation }: Props) {
  const { station } = route.params;
  const { colors, mode, font } = useTheme();
  const insets = useSafeAreaInsets();
  const { pushToast } = useToast();
  const { car } = useCar();

  const [demoMode, setDemoMode] = useState(false);
  const live = useLiveLocation(!demoMode);
  const usingRealGps = !demoMode && live.status === 'granted';

  // Anchors the synthetic polyline once (real GPS locks, or demo mode starts) so
  // the drawn route doesn't jump around as later GPS fixes arrive.
  const [origin, setOrigin] = useState<GeoPoint | null>(null);
  useEffect(() => {
    if (origin) return;
    if (demoMode) { setOrigin(DATA.user_geo); return; }
    if (live.coords) setOrigin({ lat: live.coords.lat, lng: live.coords.lng });
  }, [origin, demoMode, live.coords]);

  const [follow, setFollow] = useState(true);
  const [d, setD] = useState(0);
  const [arrived, setArrived] = useState(false);
  const [realRemainingM, setRealRemainingM] = useState<number | null>(null);
  const [rating, setRating] = useState(false);
  const mapRef = useRef<MapView>(null);

  const destPoint: GeoPoint = { lat: station.lat, lng: station.lng };
  const seed = seedFromId(station.id);

  // Demo mode fabricates a "few doglegs" street-like line (routeSim.ts) purely
  // as a visual stand-in, over a route that's entirely synthetic anyway — fine
  // there. Drawing that same fabricated shape over the REAL map in real-GPS mode
  // looked actively wrong (reported: "a rota não é correta") — it has no relation
  // to actual streets, so on real imagery it visibly cuts through blocks/buildings
  // at the wrong angles instead of just reading as an approximation. Real mode
  // draws a plain straight line instead — still not a real route (no Directions
  // API — docs/MAPS.md §5), but a straight line doesn't *claim* to be a street
  // route the way a fake dogleg shape does, so it doesn't visibly contradict the
  // basemap under it.
  const pts = useMemo(() => {
    if (!origin) return [];
    return demoMode ? buildRoute(origin, destPoint, seed) : [origin, destPoint];
  }, [origin, station.id, demoMode]);
  const cum = useMemo(() => cumLengths(pts), [pts]);
  const totalUnits = cum[cum.length - 1] || 0;
  // Headline distance from real haversine (origin → destination), not the
  // station's curated `dist` label — this is the actual anchor the whole screen
  // (ETA, battery-on-arrival, progress) is derived from.
  const initialRemainingM = useMemo(() => (origin ? haversineMeters(origin, destPoint) : 0), [origin, station.id]);
  const kmTotal = initialRemainingM / 1000;
  const totalMin = Math.max(2, Math.round((kmTotal / NAV_AVG_KMH) * 60));
  const arriveBatteryPct = batteryAfterDistance(car, DEMO_START_BATTERY, kmTotal);

  const departStreet = useMemo(() => STREETS[Math.floor(rng(seed + 1)() * STREETS.length)], [seed]);
  const maneuvers = useMemo(() => {
    if (pts.length < 2) return [];
    const r = rng(seed + 3);
    const list: { at: number; type: Turn | 'arrive'; street: string }[] = [];
    for (let i = 1; i < pts.length - 1; i++) list.push({ at: cum[i], type: turnAt(pts, i), street: STREETS[Math.floor(r() * STREETS.length)] });
    list.push({ at: cum[cum.length - 1], type: 'arrive', street: station.name });
    return list;
  }, [pts, cum, seed, station.name]);

  // Demo animation — same clamp spirit as the source, scaled to our realistic
  // `totalMin` instead of the source's pixel-space `totalUnits` (this route's
  // units are lat/lng degrees, several orders of magnitude smaller).
  useEffect(() => {
    if (!demoMode || arrived || totalUnits <= 0) return;
    const durMs = Math.min(30000, Math.max(12000, totalMin * 1200));
    const t0 = Date.now();
    const id = setInterval(() => {
      const f = (Date.now() - t0) / durMs;
      setD(Math.min(totalUnits, f * totalUnits));
      if (f >= 1) {
        clearInterval(id);
        setArrived(true);
      }
    }, 80);
    return () => clearInterval(id);
  }, [demoMode, totalUnits, totalMin, arrived, station.id]);

  // Real mode — progress + arrival driven by the driver's actual GPS distance to
  // the station, not a timer.
  useEffect(() => {
    if (!usingRealGps || !live.coords) return;
    const remain = haversineMeters({ lat: live.coords.lat, lng: live.coords.lng }, destPoint);
    setRealRemainingM(remain);
    if (remain <= ARRIVAL_THRESHOLD_M) setArrived(true);
  }, [usingRealGps, live.coords, station.id]);

  // Everything below is a plain derived value (not a hook), computed with
  // null-safe fallbacks so it can sit above the early returns — all hooks in this
  // component (including the camera-follow effect right after) must run
  // unconditionally on every render, so none of them can come after a `return`.
  const originSafe = origin ?? destPoint;
  const dEff = demoMode ? d : totalUnits * (1 - Math.min(1, (realRemainingM ?? initialRemainingM) / Math.max(1, initialRemainingM)));
  const projectedHere = pts.length ? locateAt(pts, cum, dEff) : null;
  const markerPos: GeoPoint = usingRealGps && live.coords ? { lat: live.coords.lat, lng: live.coords.lng } : projectedHere ?? originSafe;
  const realHeading = usingRealGps ? live.coords?.heading : null;
  const headingDeg = realHeading != null && realHeading >= 0 ? realHeading : projectedHere?.heading ?? bearingDeg(markerPos, destPoint);

  const remainMeters = usingRealGps ? Math.round(realRemainingM ?? initialRemainingM) : Math.round((1 - (totalUnits ? dEff / totalUnits : 0)) * initialRemainingM);
  const remainMin = Math.max(0, Math.round((remainMeters / 1000 / NAV_AVG_KMH) * 60));

  const hasKey = !!ROTA_CONFIG.googleMapsApiKey;
  const provider = hasKey || Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;
  const doneCoords = pts.length ? progressPath(pts, cum, dEff, projectedHere ?? markerPos) : [];

  useEffect(() => {
    if (!follow || !origin) return;
    mapRef.current?.animateCamera({ center: { latitude: markerPos.lat, longitude: markerPos.lng }, heading: headingDeg, pitch: 45, zoom: 17 }, { duration: 400 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [follow, origin, markerPos.lat, markerPos.lng, headingDeg]);

  if (!demoMode && (live.status === 'checking' || live.status === 'denied' || live.status === 'unavailable')) {
    return (
      <LocationNotice
        status={live.status}
        destinationName={station.name}
        destinationLat={station.lat}
        destinationLng={station.lng}
        onRetry={live.requestPermission}
        onDemoMode={() => setDemoMode(true)}
      />
    );
  }

  if (!origin || (usingRealGps && !live.coords)) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <Spinner size={28} color={colors.primary} />
        <Text style={{ color: colors.inkSoft, fontSize: 14 }}>Localizando você…</Text>
      </View>
    );
  }

  // ---- demo-mode maneuver banner state ----
  const nextIdx = maneuvers.length ? Math.max(0, maneuvers.findIndex((m) => m.at > d)) : -1;
  const nextManIdx = nextIdx === -1 ? maneuvers.length - 1 : nextIdx;
  const nextMan = maneuvers[nextManIdx];
  const afterMan = maneuvers[nextManIdx + 1];
  const metersToNext = nextMan ? Math.max(0, Math.round(((nextMan.at - d) / (totalUnits || 1)) * initialRemainingM)) : 0;
  const isFirst = !!nextMan && nextMan.type !== 'arrive' && metersToNext > initialRemainingM * 0.55;
  const showArriveDemo = arrived || nextMan?.type === 'arrive';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={provider}
        customMapStyle={provider === PROVIDER_GOOGLE ? (mode === 'dark' ? GMAP_STYLE_DARK : GMAP_STYLE_LIGHT) : undefined}
        initialRegion={{ latitude: origin.lat, longitude: origin.lng, latitudeDelta: 0.03, longitudeDelta: 0.03 }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        onPanDrag={() => setFollow(false)}
        accessibilityLabel={`Mapa de navegação até ${station.name}`}
      >
        {pts.length > 0 && (
          <Polyline
            coordinates={pts.map((p) => ({ latitude: p.lat, longitude: p.lng }))}
            strokeColor={colors.lineStrong}
            strokeWidth={demoMode ? 6 : 4}
            lineDashPattern={demoMode ? undefined : [10, 8]}
          />
        )}
        {doneCoords.length > 1 && (
          <Polyline
            coordinates={doneCoords.map((p) => ({ latitude: p.lat, longitude: p.lng }))}
            strokeColor={colors.primary}
            strokeWidth={demoMode ? 6 : 4}
            lineDashPattern={demoMode ? undefined : [10, 8]}
          />
        )}
        <Marker coordinate={{ latitude: destPoint.lat, longitude: destPoint.lng }} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={false}>
          <DestFlag station={station} />
        </Marker>
        <Marker coordinate={{ latitude: markerPos.lat, longitude: markerPos.lng }} anchor={{ x: 0.5, y: 0.5 }}>
          <CarMarker heading={headingDeg} />
        </Marker>
      </MapView>

      {/* top maneuver banner */}
      {!rating && (
        <View
          accessibilityLiveRegion="polite"
          accessibilityRole="summary"
          style={{
            position: 'absolute', top: insets.top + 10, left: 14, right: 14,
            backgroundColor: colors.ink, borderRadius: 20, padding: 16,
            shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
              {demoMode ? (
                (arrived || showArriveDemo) ? (
                  <Icon name="flag" size={30} color="#fff" />
                ) : (
                  <TurnArrow type={(nextMan?.type as Turn) ?? 'straight'} size={32} />
                )
              ) : arrived ? (
                <Icon name="flag" size={30} color="#fff" />
              ) : (
                <View style={{ transform: [{ rotate: `${headingDeg}deg` }] }}>
                  <Icon name="nav" size={26} color="#fff" />
                </View>
              )}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: font.mono, fontSize: 21, fontWeight: '700', color: '#fff' }}>
                {arrived ? 'Chegou' : demoMode ? fmtMeters(metersToNext) : fmtDistanceMeters(remainMeters)}
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.85)', marginTop: 1 }} numberOfLines={1}>
                {arrived ? (
                  station.name
                ) : demoMode ? (
                  isFirst ? `Siga por ${departStreet}` : `${TURN_LABEL[nextMan?.type ?? 'straight']} · ${nextMan?.street ?? ''}`
                ) : (
                  `Siga em direção a ${station.name}`
                )}
              </Text>
            </View>
          </View>
          {demoMode && afterMan && !showArriveDemo && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)' }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>Depois</Text>
              {afterMan.type === 'arrive' ? <Icon name="flag" size={14} color="rgba(255,255,255,0.7)" /> : <TurnArrow type={afterMan.type as Turn} size={16} color="rgba(255,255,255,0.7)" />}
              <Text style={{ fontSize: 12.5, fontWeight: '600', color: 'rgba(255,255,255,0.7)' }} numberOfLines={1}>
                {afterMan.type === 'arrive' ? station.name : afterMan.street}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* re-center */}
      {!arrived && (
        <Pressable
          onPress={() => setFollow((f) => !f)}
          accessibilityRole="button"
          accessibilityLabel={follow ? 'Desativar seguir automático' : 'Voltar a seguir minha posição'}
          accessibilityState={{ selected: follow }}
          style={{
            position: 'absolute', right: 14, bottom: 148,
            width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surface,
            alignItems: 'center', justifyContent: 'center',
            shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, elevation: 4,
          }}
        >
          <Icon name="crosshair" size={20} color={follow ? colors.primary : colors.inkSoft} />
        </Pressable>
      )}

      {/* bottom panel */}
      {!arrived && !rating ? (
        <View
          style={{
            position: 'absolute', left: 0, right: 0, bottom: 0,
            flexDirection: 'row', alignItems: 'center', gap: 14,
            paddingHorizontal: 18, paddingTop: 16, paddingBottom: 16 + Math.max(16, insets.bottom),
            backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
            shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16, shadowOffset: { width: 0, height: -6 }, elevation: 8,
          }}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontFamily: font.display, fontSize: 26, color: colors.ink }}>
              <Text style={{ fontWeight: '800' }}>{remainMin}</Text> min
            </Text>
            <Text style={{ fontSize: 12.5, color: colors.inkFaint, marginTop: 2 }} numberOfLines={1}>
              {fmtDistanceMeters(remainMeters)} · chega {addClock('09:41', remainMin)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 100, backgroundColor: colors.primarySoft }}>
            <Icon name="battery" size={16} color={colors.ok} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primarySoftInk }}>{arriveBatteryPct}%</Text>
          </View>
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Encerrar navegação"
            style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.off, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="x" size={22} color="#fff" />
          </Pressable>
        </View>
      ) : rating ? null : (
        <View
          style={{
            position: 'absolute', left: 0, right: 0, bottom: 0,
            padding: 24, paddingBottom: 24 + Math.max(20, insets.bottom),
            backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
            alignItems: 'center',
            shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16, shadowOffset: { width: 0, height: -6 }, elevation: 8,
          }}
        >
          <View
            style={{
              width: 60, height: 60, borderRadius: 30, backgroundColor: colors.ok,
              alignItems: 'center', justifyContent: 'center', marginBottom: 12,
              shadowColor: colors.ok, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
            }}
          >
            <Icon name="checkCircle" size={30} color="#fff" />
          </View>
          <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: colors.ok }}>Você chegou</Text>
          <Text accessibilityRole="header" style={{ fontFamily: font.display, fontSize: 24, marginTop: 2, marginBottom: 2, color: colors.ink }}>
            {station.name}
          </Text>
          <Text style={{ fontSize: 13.5, color: colors.inkSoft, marginBottom: 18, textAlign: 'center' }}>
            {station.area ? `${station.area} · ` : ''}
            {station.free != null ? `${station.free}/${station.total} pontos livres agora` : 'Boa recarga!'}
          </Text>
          <Pressable
            onPress={() => {
              pushToast('Sessão de recarga iniciada', 'zap');
              navigation.goBack();
            }}
            accessibilityRole="button"
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%',
              minHeight: 50, borderRadius: 999, backgroundColor: colors.primary,
            }}
          >
            <Icon name="zap" size={18} color={colors.primaryInk} />
            <Text style={{ fontFamily: font.uiSemibold, fontSize: 16, color: colors.primaryInk }}>Iniciar recarga</Text>
          </Pressable>
          <Pressable
            onPress={() => setRating(true)}
            accessibilityRole="button"
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%',
              minHeight: 46, marginTop: 10, borderRadius: 999, borderWidth: 1.5, borderColor: colors.lineStrong,
            }}
          >
            <Icon name="star" size={17} color={colors.ink} />
            <Text style={{ fontFamily: font.uiSemibold, fontSize: 15, color: colors.ink }}>Avaliar este ponto</Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 6 }}
          >
            <Text style={{ fontFamily: font.uiSemibold, fontSize: 14, color: colors.inkFaint }}>Concluir</Text>
          </Pressable>
        </View>
      )}

      {rating && (
        <RateFlow
          target={station}
          kind="station"
          onClose={() => setRating(false)}
          onDone={(r) => {
            setRating(false);
            pushToast(`Avaliação publicada · +${r.watts} Watts`, 'check');
            navigation.goBack();
          }}
        />
      )}
    </View>
  );
}

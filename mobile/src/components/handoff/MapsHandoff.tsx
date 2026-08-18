// Ported from project/app/maps.jsx — Google Maps / Waze handoff sheets.
//
// MapsHandoffSheet: shown from a station's "Navegar" action, lets the driver pick
// Google Maps, Waze, or in-app ("Navegar no Rota") turn-by-turn.
// RouteHandoffSheet: shown at the end of a roteiro (itinerary), hands the whole
// route (all stops as waypoints, when we have real coordinates for them — see
// below) to Google Maps or the final stop to Waze.
//
// Not a 1:1 port, on purpose (per the porting task):
//   - The source's `window.open(url, '_blank')` is replaced with real deep links via
//     RN `Linking` (`Linking.canOpenURL` + `Linking.openURL`), since this is a native
//     app, not a browser tab. Both URLs used (google.com/maps/dir + waze.com/ul) are
//     plain https:// links, so `canOpenURL` succeeds on-device even without the
//     Google Maps/Waze app installed — the OS just opens it in-browser instead. We
//     still check + catch so we can fall back to a toast if `openURL` ever rejects.
//   - The source's per-station `GEO`/`DEFAULT_GEO` lookup table doesn't exist here:
//     `src/data/data.ts` already carries real `lat`/`lng` on every `Station`, so we
//     read `dest.lat` / `dest.lng` straight off the prop instead of looking anything up.
//   - The source's `<iframe src={gmapsEmbed(...)}>` (a live, keyless Google Maps
//     embed) has no RN equivalent without a WebView + billing-enabled API key
//     (out of scope here — see src/config.ts). We always render what the source
//     itself used as the *blocked-embed fallback* (`.gmaps-fallback`: brand glyph +
//     "Prévia do ..." caption) as the permanent preview.
//   - The source's `onRotaNav` prop is dropped in favor of `useNavigation()` — per
//     PORTING_GUIDE.md, navigation plumbing shouldn't be threaded through props,
//     RootNavigator resolves the 'Nav' route from anywhere in the Tabs stack.
//   - `pushToast` is no longer a prop; it comes from `useToast()`.
//
// Known limitation (route waypoints): `RouteHandoffSheet` tries to resolve each
// `guide.stops[].name` to a real `Station` in `DATA.stations` (by normalized name
// match) to get lat/lng for Google Maps' `waypoints=` param. As of the current
// `src/data/data.ts`, none of the curated guides' stop names (e.g. "Tremembé",
// "Taubaté · Via Vale", "Campos do Jordão · Capivari") match any of the 7 real
// charging stations (`st1`..`st7`) — those are two unrelated fictional datasets in
// the prototype. So today every guide falls back to a *text* destination (stop
// name + guide.region passed as a free-text `destination=`/`q=` address, which both
// Google Maps and Waze deep links accept) with no waypoints/origin. This isn't
// guessed data — it's a real, documented gap: ship real coordinates on `GuideStop`
// (or a station-id reference) to get true multi-stop routing.
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ModalSheet } from '../sheets/ModalSheet';
import { Icon, Seal } from '../icons/Icon';
import { GoogleGlyph, WazeGlyph } from '../icons/BrandGlyphs';
import { useTheme } from '../../theme/ThemeContext';
import { useToast } from '../../state/ToastContext';
import { DATA } from '../../data/data';
import { Station, Guide } from '../../data/types';
import { RootStackParamList } from '../../navigation/types';
import { gmapsUrl, wazeUrl, openExternalUrl } from '../../utils/externalNav';

type LatLng = { lat: number; lng: number };
type AppId = 'gmaps' | 'waze';

// Combining diacritical marks block (U+0300–U+036F), stripped after NFD
// decomposition so accented names ("Tremembé", "São Paulo") compare equal to
// their unaccented form.
const DIACRITICS_RE = /[̀-ͯ]/g;

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITICS_RE, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Best-effort match of a guide stop's free-text name to a real station in DATA
// (see the "known limitation" note at the top of this file).
function stationCoordsForName(name: string): LatLng | null {
  const target = normalize(name);
  if (!target) return null;
  const match = DATA.stations.find((s) => {
    const n = normalize(s.name);
    return n === target || n.includes(target) || target.includes(n);
  });
  return match ? { lat: match.lat, lng: match.lng } : null;
}

function guideStopCoords(guide: Guide): LatLng[] {
  const coords: LatLng[] = [];
  for (const s of guide.stops) {
    const c = stationCoordsForName(s.name);
    if (c) coords.push(c);
  }
  return coords;
}

function guideTextDestination(guide: Guide): string {
  const last = guide.stops[guide.stops.length - 1];
  return `${last?.name ?? guide.title}, ${guide.region}`;
}

function gmapsRouteUrl(guide: Guide): string {
  const pts = guideStopCoords(guide);
  if (pts.length === 0) {
    const q = encodeURIComponent(guideTextDestination(guide));
    return `https://www.google.com/maps/dir/?api=1&destination=${q}&travelmode=driving`;
  }
  const fmt = (p: LatLng) => `${p.lat},${p.lng}`;
  let url = `https://www.google.com/maps/dir/?api=1&destination=${fmt(pts[pts.length - 1])}&travelmode=driving`;
  if (pts.length > 1) {
    url += `&origin=${fmt(pts[0])}`;
    const mid = pts.slice(1, -1);
    if (mid.length) url += `&waypoints=${mid.map(fmt).join('|')}`;
  }
  return url;
}
function wazeRouteUrl(guide: Guide): string {
  const pts = guideStopCoords(guide);
  if (pts.length === 0) {
    const q = encodeURIComponent(guideTextDestination(guide));
    return `https://waze.com/ul?q=${q}&navigate=yes`;
  }
  const last = pts[pts.length - 1];
  return `https://waze.com/ul?ll=${last.lat},${last.lng}&navigate=yes`;
}

// ---- brand glyphs -----------------------------------------------------------
// Fixed brand-identity colors (Google's four-color mark, Waze's cyan) — these are
// official app marks, not themeable UI, so literal hex here is intentional (same
// as the source, which also hardcodes these instead of reading CSS vars).

// ---- MapsHandoffSheet -----------------------------------------------------

type MapsHandoffPick = 'gmaps' | 'rota' | 'waze';

type MapsApp = { id: MapsHandoffPick; name: string; sub: string; badge?: string };

const MAPS_APPS: MapsApp[] = [
  { id: 'gmaps', name: 'Google Maps', sub: 'Trânsito em tempo real', badge: 'Recomendado' },
  { id: 'rota', name: 'Navegar no Rota', sub: 'Com as paradas do guia' },
  { id: 'waze', name: 'Waze', sub: 'Alertas da comunidade' },
];

export function MapsHandoffSheet({
  dest,
  onClose,
}: {
  dest: Station;
  onClose: () => void;
}) {
  const { colors, space, font } = useTheme();
  const { pushToast } = useToast();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [pick, setPick] = useState<MapsHandoffPick>('gmaps');
  const [remember, setRemember] = useState(false);
  const activeApp = MAPS_APPS.find((a) => a.id === pick)!;

  const go = async () => {
    if (pick === 'rota') {
      onClose();
      navigation.navigate('Nav', { station: dest });
      return;
    }
    const url = pick === 'gmaps' ? gmapsUrl(dest.lat, dest.lng) : wazeUrl(dest.lat, dest.lng);
    const appName = pick === 'gmaps' ? 'Google Maps' : 'Waze';
    const opened = await openExternalUrl(url);
    onClose();
    pushToast(opened ? `Abrindo no ${appName}…` : `${appName} não está instalado`, opened ? 'nav' : 'alert');
  };

  const styles = useHandoffStyles();

  return (
    <ModalSheet open onClose={onClose} label={`Como navegar até ${dest.name}`}>
      <View style={{ paddingHorizontal: space.pad, paddingTop: 4, paddingBottom: 18 }}>
        <Text style={[styles.eyebrow, { color: colors.inkFaint }]}>Navegar até</Text>
        <View style={styles.kv}>
          <Text
            style={[styles.title, { color: colors.ink, fontFamily: font.display }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {dest.name}
          </Text>
          {dest.selo > 0 && <Seal size={16} label={`Selo Flui nível ${dest.selo}`} />}
        </View>

        <MapPreviewFallback caption="Prévia do Google Maps" />

        <View style={styles.coordsRow}>
          <Icon name="target" size={12} color={colors.inkFaint} />
          <Text style={[styles.coordsText, { color: colors.inkFaint, fontFamily: font.mono }]}>
            {dest.lat.toFixed(4)}, {dest.lng.toFixed(4)}
            {dest.area ? ` · ${dest.area}` : ''}
          </Text>
        </View>

        <View style={styles.appList} accessibilityRole="radiogroup" accessibilityLabel="Escolha o aplicativo de navegação">
          {MAPS_APPS.map((a) => {
            const on = pick === a.id;
            return (
              <Pressable
                key={a.id}
                onPress={() => setPick(a.id)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${a.name}, ${a.sub}`}
                hitSlop={4}
                style={[
                  styles.appRow,
                  {
                    backgroundColor: on ? colors.primarySoft : colors.surface,
                    borderColor: on ? colors.primary : colors.line,
                    borderWidth: on ? 2 : 1.5,
                  },
                ]}
              >
                <View style={[styles.glyph, { backgroundColor: on ? colors.surface : colors.surface2 }]}>
                  {a.id === 'gmaps' ? <GoogleGlyph /> : a.id === 'waze' ? <WazeGlyph /> : <Icon name="nav" size={22} color={colors.primary} />}
                </View>
                <View style={styles.txt}>
                  <View style={styles.nmRow}>
                    <Text style={[styles.nm, { color: colors.ink, fontFamily: font.uiSemibold }]}>{a.name}</Text>
                    {a.badge && (
                      <View
                        style={[
                          styles.rec,
                          { backgroundColor: on ? colors.primary : colors.surface, borderColor: colors.primary, borderWidth: on ? 0 : 1 },
                        ]}
                      >
                        <Text style={[styles.recText, { color: on ? '#fff' : colors.primary, fontFamily: font.uiSemibold }]}>{a.badge}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.sb, { color: colors.inkFaint, fontFamily: font.uiSemibold }]}>{a.sub}</Text>
                </View>
                <View style={[styles.radio, { borderColor: on ? colors.primary : colors.lineStrong }]}>
                  {on && <View style={[styles.radioInd, { backgroundColor: colors.primary }]} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() => setRemember((r) => !r)}
          accessibilityRole="switch"
          accessibilityState={{ checked: remember }}
          accessibilityLabel={`Sempre abrir no ${activeApp.name}`}
          hitSlop={4}
          style={styles.remember}
        >
          <View style={[styles.rememberBox, { backgroundColor: remember ? colors.primary : colors.surface3 }]}>
            {remember && <Icon name="check" size={13} color="#fff" />}
          </View>
          <Text style={[styles.rememberText, { color: colors.inkSoft, fontFamily: font.uiSemibold }]}>
            Sempre abrir no {activeApp.name}
          </Text>
        </Pressable>

        <Pressable
          onPress={go}
          accessibilityRole="button"
          accessibilityLabel={pick === 'rota' ? 'Iniciar no Rota' : `Abrir no ${activeApp.name}`}
          style={[styles.btnPrimary, { backgroundColor: colors.primary, marginTop: 14 }]}
        >
          <Icon name="nav" size={18} color={colors.primaryInk} />
          <Text style={[styles.btnPrimaryText, { color: colors.primaryInk, fontFamily: font.uiSemibold }]}>
            {pick === 'rota' ? 'Iniciar no Rota' : `Abrir no ${activeApp.name}`}
          </Text>
        </Pressable>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Cancelar"
          style={[styles.btnGhost, { backgroundColor: colors.surface3, marginTop: 8 }]}
        >
          <Text style={[styles.btnGhostText, { color: colors.ink, fontFamily: font.uiSemibold, fontSize: space.ui }]}>Cancelar</Text>
        </Pressable>
      </View>
    </ModalSheet>
  );
}

// ---- RouteHandoffSheet ------------------------------------------------------

export function RouteHandoffSheet({
  guide,
  onClose,
}: {
  guide: Guide;
  onClose: () => void;
}) {
  const { colors, space, font } = useTheme();
  const { pushToast } = useToast();
  const [pick, setPick] = useState<AppId>('gmaps');
  const styles = useHandoffStyles();

  const routeApps: MapsApp[] = useMemo(
    () => [
      { id: 'gmaps', name: 'Google Maps', sub: `Todas as ${guide.stops.length} paradas do guia`, badge: 'Completo' },
      { id: 'waze', name: 'Waze', sub: 'Vai direto ao destino final' },
    ],
    [guide.stops.length]
  );

  const go = async () => {
    const url = pick === 'gmaps' ? gmapsRouteUrl(guide) : wazeRouteUrl(guide);
    const opened = await openExternalUrl(url);
    onClose();
    if (!opened) {
      pushToast(`${pick === 'gmaps' ? 'Google Maps' : 'Waze'} não está instalado`, 'alert');
      return;
    }
    pushToast(pick === 'gmaps' ? 'Roteiro aberto no Google Maps' : 'Destino aberto no Waze', 'nav');
  };

  return (
    <ModalSheet open onClose={onClose} label={`Abrir o roteiro ${guide.title} em outro app`}>
      <View style={{ paddingHorizontal: space.pad, paddingTop: 4, paddingBottom: 18 }}>
        <Text style={[styles.eyebrow, { color: colors.inkFaint }]}>Levar o roteiro para</Text>
        <Text style={[styles.title, { color: colors.ink, fontFamily: font.display, marginTop: 2, marginBottom: 12 }]}>
          {guide.title}
        </Text>

        <MapPreviewFallback caption="Prévia do trajeto" />

        <View style={[styles.routeStopsNote, { backgroundColor: colors.primarySoft }]}>
          <Icon name="route" size={15} color={colors.primary} />
          <Text style={[styles.routeStopsText, { color: colors.primarySoftInk, fontFamily: font.uiSemibold }]}>
            <Text style={{ fontFamily: font.uiSemibold }}>{guide.stops.length} paradas</Text> vão como pontos de passagem · {guide.distance} km
          </Text>
        </View>

        <View style={styles.appList} accessibilityRole="radiogroup" accessibilityLabel="Escolha o aplicativo">
          {routeApps.map((a) => {
            const on = pick === a.id;
            return (
              <Pressable
                key={a.id}
                onPress={() => setPick(a.id as AppId)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${a.name}, ${a.sub}`}
                hitSlop={4}
                style={[
                  styles.appRow,
                  {
                    backgroundColor: on ? colors.primarySoft : colors.surface,
                    borderColor: on ? colors.primary : colors.line,
                    borderWidth: on ? 2 : 1.5,
                  },
                ]}
              >
                <View style={[styles.glyph, { backgroundColor: on ? colors.surface : colors.surface2 }]}>
                  {a.id === 'gmaps' ? <GoogleGlyph /> : <WazeGlyph />}
                </View>
                <View style={styles.txt}>
                  <View style={styles.nmRow}>
                    <Text style={[styles.nm, { color: colors.ink, fontFamily: font.uiSemibold }]}>{a.name}</Text>
                    {a.badge && (
                      <View
                        style={[
                          styles.rec,
                          { backgroundColor: on ? colors.primary : colors.surface, borderColor: colors.primary, borderWidth: on ? 0 : 1 },
                        ]}
                      >
                        <Text style={[styles.recText, { color: on ? '#fff' : colors.primary, fontFamily: font.uiSemibold }]}>{a.badge}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.sb, { color: colors.inkFaint, fontFamily: font.uiSemibold }]}>{a.sub}</Text>
                </View>
                <View style={[styles.radio, { borderColor: on ? colors.primary : colors.lineStrong }]}>
                  {on && <View style={[styles.radioInd, { backgroundColor: colors.primary }]} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={go}
          accessibilityRole="button"
          accessibilityLabel={`Abrir no ${pick === 'gmaps' ? 'Google Maps' : 'Waze'}`}
          style={[styles.btnPrimary, { backgroundColor: colors.primary, marginTop: 14 }]}
        >
          <Icon name="nav" size={18} color={colors.primaryInk} />
          <Text style={[styles.btnPrimaryText, { color: colors.primaryInk, fontFamily: font.uiSemibold }]}>
            Abrir no {pick === 'gmaps' ? 'Google Maps' : 'Waze'}
          </Text>
        </Pressable>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Cancelar"
          style={[styles.btnGhost, { backgroundColor: colors.surface3, marginTop: 8 }]}
        >
          <Text style={[styles.btnGhostText, { color: colors.ink, fontFamily: font.uiSemibold, fontSize: space.ui }]}>Cancelar</Text>
        </Pressable>
      </View>
    </ModalSheet>
  );
}

// Stand-in for the source's `.gmaps-preview` iframe — see the file-header comment.
function MapPreviewFallback({ caption }: { caption: string }) {
  const { colors, space, font } = useTheme();
  return (
    <View
      style={{
        height: 132,
        borderRadius: space.radius > 16 ? 16 : space.radius,
        overflow: 'hidden',
        backgroundColor: colors.surface3,
        borderWidth: 1,
        borderColor: colors.line,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 10,
      }}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <GoogleGlyph size={22} />
      <Text style={{ fontSize: 12.5, fontFamily: font.uiSemibold, color: colors.inkFaint }}>{caption}</Text>
    </View>
  );
}

function useHandoffStyles() {
  return useMemo(
    () =>
      StyleSheet.create({
        eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase' },
        kv: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 2, marginBottom: 12 },
        title: { fontSize: 22, lineHeight: 26, flexShrink: 1 },
        coordsRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
        coordsText: { fontSize: 11.5, fontWeight: '600' },
        appList: { flexDirection: 'column', gap: 8, marginTop: 16 },
        appRow: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%', padding: 12, minHeight: 62, borderRadius: 12 },
        glyph: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
        txt: { flex: 1, minWidth: 0 },
        nmRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
        nm: { fontSize: 14.5, fontWeight: '700' },
        rec: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', paddingVertical: 3, paddingHorizontal: 7, borderRadius: 100 },
        recText: { fontSize: 9.5, fontWeight: '800', textTransform: 'uppercase' },
        sb: { fontSize: 12, fontWeight: '600', marginTop: 2 },
        radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
        radioInd: { width: 11, height: 11, borderRadius: 5.5 },
        remember: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', marginTop: 14, paddingVertical: 10, paddingHorizontal: 2, minHeight: 44 },
        rememberBox: { width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
        rememberText: { fontSize: 13, fontWeight: '600' },
        btnPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', minHeight: 50, borderRadius: 999, paddingVertical: 16, paddingHorizontal: 22 },
        btnPrimaryText: { fontSize: 16, fontWeight: '700' },
        btnGhost: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: 46, borderRadius: 999, paddingVertical: 13, paddingHorizontal: 20 },
        btnGhostText: { fontWeight: '700' },
        routeStopsNote: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingVertical: 11, paddingHorizontal: 13, borderRadius: 12 },
        routeStopsText: { fontSize: 12.5, fontWeight: '600', flex: 1, flexShrink: 1 },
      }),
    []
  );
}

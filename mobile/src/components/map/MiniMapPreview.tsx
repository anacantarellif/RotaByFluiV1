// Real, live map preview for the Maps/Waze handoff sheets — replaces the
// text+glyph placeholder that used to stand in for the source's `<iframe
// src={gmapsEmbed(...)}>` (a live, keyless Google Maps embed with no RN
// equivalent without a WebView + billing-enabled API key). We don't have that
// key, but the app's own main map already renders a real Google-provided map
// on Android with no key at all (see docs/MAPS.md §1 — PROVIDER_GOOGLE works
// keylessly on Android; only iOS falls back to Apple's PROVIDER_DEFAULT
// without one) — this reuses that same proven setup at a small, non-interactive
// size instead of a placeholder box.
//
// `liteMode` (Android only) renders a static bitmap snapshot instead of a live
// interactive map — exactly what a "preview" should be, and it sidesteps what
// would otherwise be a real gesture conflict: a normal MapView's pan/zoom
// gestures fighting the bottom sheet's own pan-to-dismiss gesture. iOS has no
// liteMode, so scroll/zoom/rotate are disabled directly there instead.
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { useTheme } from '../../theme/ThemeContext';
import { ROTA_CONFIG } from '../../config';
import { GMAP_STYLE_DARK, GMAP_STYLE_LIGHT } from './mapStyles';

export type PreviewPoint = { lat: number; lng: number };

export function MiniMapPreview({
  points,
  height = 132,
  radius = 16,
}: {
  points: PreviewPoint[];
  height?: number;
  radius?: number;
}) {
  const { colors, mode } = useTheme();
  const hasKey = !!ROTA_CONFIG.googleMapsApiKey;
  const provider = hasKey || Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;

  if (points.length === 0) return null;

  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  // Pad the bounding box so a single point (or two very close ones) doesn't
  // zoom in past what's useful, and so the outermost markers aren't flush
  // against the preview's edge.
  const region: Region = {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(0.02, (maxLat - minLat) * 1.7),
    longitudeDelta: Math.max(0.02, (maxLng - minLng) * 1.7),
  };

  return (
    <View
      style={{ height, borderRadius: radius, overflow: 'hidden', borderWidth: 1, borderColor: colors.line, marginTop: 10 }}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Prévia do trajeto no mapa"
    >
      <MapView
        style={StyleSheet.absoluteFill}
        provider={provider}
        initialRegion={region}
        customMapStyle={provider === PROVIDER_GOOGLE ? (mode === 'dark' ? GMAP_STYLE_DARK : GMAP_STYLE_LIGHT) : undefined}
        liteMode={Platform.OS === 'android'}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        showsCompass={false}
        toolbarEnabled={false}
        pointerEvents="none"
      >
        {points.map((p, i) => (
          <Marker key={i} coordinate={{ latitude: p.lat, longitude: p.lng }} tracksViewChanges={false} />
        ))}
      </MapView>
    </View>
  );
}

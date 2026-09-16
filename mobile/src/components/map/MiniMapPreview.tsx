// Real, live map preview for the Maps/Waze handoff sheets — replaces the
// text+glyph placeholder that used to stand in for the source's `<iframe
// src={gmapsEmbed(...)}>` (a live, keyless Google Maps embed with no RN
// equivalent without a WebView + billing-enabled API key). Without a real
// key, Android's Google Maps SDK won't load tile imagery at all (a blank
// canvas), so this uses the same free OpenStreetMap-based fallback tiles as
// the main map (see GeoMapView.tsx) instead of a placeholder box.
//
// `liteMode` (Android only, Google-specific) renders a static bitmap
// snapshot instead of a live interactive map — exactly what a "preview"
// should be, and it sidesteps what would otherwise be a real gesture
// conflict: a normal MapView's pan/zoom gestures fighting the bottom
// sheet's own pan-to-dismiss gesture. It has no effect on the free-tile
// fallback (a Google SDK feature), so scroll/zoom/rotate are disabled
// directly via props there instead, same as iOS already does.
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE, Region, UrlTile } from 'react-native-maps';
import { useTheme } from '../../theme/ThemeContext';
import { ROTA_CONFIG } from '../../config';
import { GMAP_STYLE_DARK, GMAP_STYLE_LIGHT, OSM_TILE_DARK, OSM_TILE_LIGHT } from './mapStyles';

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
  const provider = hasKey ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;
  const usesFreeTiles = !hasKey && Platform.OS === 'android';

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
        liteMode={Platform.OS === 'android' && hasKey}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        showsCompass={false}
        toolbarEnabled={false}
        pointerEvents="none"
      >
        {usesFreeTiles && (
          <UrlTile
            urlTemplate={mode === 'dark' ? OSM_TILE_DARK : OSM_TILE_LIGHT}
            maximumZ={19}
            zIndex={-1}
          />
        )}
        {points.map((p, i) => (
          <Marker key={i} coordinate={{ latitude: p.lat, longitude: p.lng }} tracksViewChanges={false} />
        ))}
      </MapView>
      {usesFreeTiles && (
        <View style={styles.attribution} pointerEvents="none">
          <Text style={styles.attributionText}>© OpenStreetMap © CARTO</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  attribution: {
    position: 'absolute',
    left: 4,
    bottom: 2,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  attributionText: {
    fontSize: 7,
    color: '#333',
  },
});

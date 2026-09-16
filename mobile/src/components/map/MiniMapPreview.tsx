// Real, live map preview for the Maps/Waze handoff sheets — replaces the
// text+glyph placeholder that used to stand in for the source's `<iframe
// src={gmapsEmbed(...)}>` (a live, keyless Google Maps embed with no RN
// equivalent without a WebView + billing-enabled API key).
//
// Without a real key, Android's Google Maps SDK doesn't just skip tile
// imagery — its underlying native map object fails to initialize at all
// (see LeafletMapView.tsx's header for the full story), so this uses the
// same WebView + Leaflet.js + free OpenStreetMap tiles fallback as the main
// map there, simplified: no markers need to be tappable here, this is a
// static-looking, non-interactive preview.
//
// `liteMode` (Android only, Google-specific) renders a static bitmap
// snapshot instead of a live interactive map — exactly what a "preview"
// should be, and it sidesteps what would otherwise be a real gesture
// conflict: a normal MapView's pan/zoom gestures fighting the bottom
// sheet's own pan-to-dismiss gesture. Kept for the real-Google-key path;
// the WebView fallback is non-interactive by construction instead (its own
// touch events are disabled, same as the native path's props already did).
import React, { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { WebView } from 'react-native-webview';
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

  const html = useMemo(() => {
    if (!usesFreeTiles) return '';
    const tileUrl = mode === 'dark' ? OSM_TILE_DARK : OSM_TILE_LIGHT;
    const pointsJson = JSON.stringify(points);
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; background: ${colors.surface}; }
  .attribution { position: absolute; left: 4px; bottom: 2px; z-index: 1000; font-size: 7px; background: rgba(255,255,255,0.75); padding: 1px 4px; border-radius: 3px; color: #333; }
  ${mode === 'dark' ? '.leaflet-tile-pane { filter: invert(1) hue-rotate(180deg) brightness(0.95) contrast(0.9); }' : ''}
  .rota-dot { border-radius: 50%; border: 2px solid #fff; background: ${colors.primary}; box-shadow: 0 1px 3px rgba(0,0,0,0.4); }
</style></head>
<body>
  <div id="map"></div>
  <div class="attribution">© OpenStreetMap contributors</div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', {
      zoomControl: false, attributionControl: false, dragging: false, touchZoom: false,
      scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, tap: false,
    }).fitBounds([[${minLat}, ${minLng}], [${maxLat}, ${maxLng}]], { padding: [24, 24] });
    L.tileLayer('${tileUrl}', { maxZoom: 19, subdomains: 'abc' }).addTo(map);
    var points = ${pointsJson};
    points.forEach(function (p) {
      L.marker([p.lat, p.lng], {
        icon: L.divIcon({ className: '', html: '<div class="rota-dot" style="width:14px;height:14px"></div>', iconSize: [14, 14], iconAnchor: [7, 7] }),
        interactive: false,
      }).addTo(map);
    });
  </script>
</body></html>`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usesFreeTiles, mode]);

  if (points.length === 0) return null;

  return (
    <View
      style={{ height, borderRadius: radius, overflow: 'hidden', borderWidth: 1, borderColor: colors.line, marginTop: 10 }}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Prévia do trajeto no mapa"
    >
      {usesFreeTiles ? (
        <WebView
          source={{ html }}
          style={StyleSheet.absoluteFill}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['*']}
          scrollEnabled={false}
          bounces={false}
          pointerEvents="none"
        />
      ) : (
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
      )}
    </View>
  );
}

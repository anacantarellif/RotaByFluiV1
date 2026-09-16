// Muted Google Maps JSON styling so the basemap matches the Rota palette.
// Ported from project/app/gmap.jsx (GMAP_STYLE_LIGHT / GMAP_STYLE_DARK).
export const GMAP_STYLE_LIGHT = [
  { elementType: 'geometry', stylers: [{ color: '#F6F1E7' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6A6275' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#FFFDF8' }] },
  { featureType: 'poi', stylers: [{ visibility: 'simplified' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#DDE9D2' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#FFF8E8' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#F2D9A0' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#BFD8E8' }] },
];

export const GMAP_STYLE_DARK = [
  { elementType: 'geometry', stylers: [{ color: '#1A1522' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9A92A3' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#14111B' }] },
  { featureType: 'poi', stylers: [{ visibility: 'simplified' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1E2A20' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2A2333' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#141E28' }] },
];

// Free, keyless raster basemap — used on Android whenever no Google Maps API
// key is configured, since Android's Google Maps SDK refuses to load any tile
// imagery at all without a billed key (see the comment in GeoMapView.tsx).
// CARTO's public tile CDN (tried first) turned out to also require a free API
// key now — tiles loaded, but tiled over with a repeating "API KEY REQUIRED"
// watermark. Plain OpenStreetMap tiles worked with no key at all, but read as
// visually "busier" than Google's own clean default style (every POI icon
// rendered at moderate zoom, thick road casings) — Esri's free ArcGIS Online
// "World_Street_Map" tileset (no signup, been the standard free Leaflet
// alternative for years, longer track record than CARTO's) is a closer match
// to that muted look, with the same standard behavior of revealing more
// detail at higher zoom every raster tile provider has. Note the {y}/{x}
// order in Esri's URL — reversed from the {x}/{y} every other provider here
// uses. There's no free Esri dark tileset either, so LeafletMapView applies
// the same CSS filter (invert + hue-rotate) to these for dark mode.
// Attribution ("Esri" + OpenStreetMap contributors, since Esri's own street
// data is OSM-derived in many regions) is rendered alongside every map that
// uses these, per both licenses' requirements.
export const OSM_TILE_LIGHT = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
export const OSM_TILE_DARK = OSM_TILE_LIGHT;



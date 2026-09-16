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
// Went through two providers before landing here: CARTO's free tiles turned
// out to need their own key too (a repeating "API KEY REQUIRED" watermark),
// and plain OpenStreetMap/Esri "World_Street_Map" tiles, while genuinely
// keyless, use full-saturation colors that visually compete with this app's
// own colored pins (reported). Esri's "Light/Dark Gray Canvas" basemaps are
// built for exactly this — a muted, mostly-monochrome background meant to sit
// *behind* colorful data markers, which is exactly this app's use case. The
// base layer alone has no labels at all; the matching "Reference" tileset is
// a second, transparent overlay with just road/place labels — both layers
// get stacked in LeafletMapView/MiniMapPreview. A real free dark tileset
// exists here too, so dark mode no longer needs the CSS-filter trick the
// previous two providers required. Note the {y}/{x} order in Esri's URLs —
// reversed from the {x}/{y} most other tile providers use. "Esri" credit is
// rendered alongside every map that uses these, per Esri's terms.
export const OSM_TILE_LIGHT = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';
export const OSM_TILE_LIGHT_LABELS =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}';
export const OSM_TILE_DARK = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
export const OSM_TILE_DARK_LABELS =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}';




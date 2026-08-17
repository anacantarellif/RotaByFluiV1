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

// Real-world geo math for GPS-driven screens (NavScreen, TripScreen). Distinct
// from routeSim.ts's flat-plane approximation (which is fine for drawing a
// synthetic polyline over a small area) — proximity checks against a real device
// GPS fix (e.g. "is the driver within 120m of this stop") need an accurate
// distance, so this uses the haversine formula.
import { GeoPoint } from './routeSim';

const EARTH_RADIUS_M = 6371000;

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Compass bearing (0 = north, 90 = east) from `a` to `b` — used to rotate the car
// marker toward the real direction of travel/next waypoint when we don't have a
// device heading reading.
export function bearingDeg(a: GeoPoint, b: GeoPoint): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function fmtDistanceMeters(m: number): string {
  if (m >= 1000) return (m / 1000).toFixed(1).replace('.', ',') + ' km';
  return Math.max(0, Math.round(m / 10) * 10) + ' m';
}

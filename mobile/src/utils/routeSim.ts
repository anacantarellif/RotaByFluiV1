// Shared route-simulation math for NavScreen and TripScreen, ported from the seeded
// PRNG + polyline/maneuver-heuristic logic in project/app/nav.jsx and trip.jsx.
//
// The web prototype draws these synthetic routes over its illustrated 1000×1500 SVG
// map (`MapStatic`). We don't port that map (see docs/MAPS.md §5 / PORTING_GUIDE.md);
// instead these same waypoints are real lat/lng, meant to be drawn with
// react-native-maps' <Polyline> over <GeoMapView>, and the animated position feeds a
// <Marker>/camera instead of a translated canvas div. The "few doglegs between two
// points" + "turn angle at each interior vertex" heuristic is unchanged — it's
// exactly as simulated in the source (see docs/MAPS.md §5's "o que ainda é simulado"
// table: real routing needs the Directions API later).

export type GeoPoint = { lat: number; lng: number };
export type Turn = 'left' | 'right' | 'straight';

// Deterministic PRNG (mulberry32), identical algorithm to the source's `rng(seed)`.
export function rng(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFromId(id: string, salt = 7) {
  return [...id].reduce((a, c) => a + c.charCodeAt(0), salt);
}

// Planar approximation in degree-space (equirectangular, longitude scaled by
// cos(latitude)) — accurate enough for city-scale routes and cheap to compute
// every animation frame, unlike true haversine.
const LAT0 = -23.55; // São Paulo reference latitude for the longitude scale factor
const LNG_SCALE = Math.cos((LAT0 * Math.PI) / 180);

function toPlane(p: GeoPoint) {
  return { x: p.lng * LNG_SCALE, y: p.lat };
}
function planeDist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

// Build a street-like polyline (a few doglegs) from start to end, deterministic per seed.
// `jitterDeg` controls how far the doglegs wander off the straight line, in degrees.
export function buildRoute(start: GeoPoint, end: GeoPoint, seed: number, jitterDeg = 0.0035): GeoPoint[] {
  const r = rng(seed);
  const dLat = end.lat - start.lat;
  const dLng = end.lng - start.lng;
  const j = () => (r() - 0.5) * jitterDeg;
  return [
    { lat: start.lat, lng: start.lng },
    { lat: start.lat + dLat * 0.1 + j(), lng: start.lng + dLng * (0.3 + r() * 0.12) + j() },
    { lat: start.lat + dLat * (0.55 + r() * 0.1) + j(), lng: start.lng + dLng * (0.46 + r() * 0.1) + j() },
    { lat: start.lat + dLat * (0.84 + r() * 0.06) + j(), lng: start.lng + dLng * (0.82 + r() * 0.08) + j() },
    { lat: end.lat, lng: end.lng },
  ];
}

export function cumLengths(pts: GeoPoint[]) {
  const plane = pts.map(toPlane);
  const cum = [0];
  for (let i = 1; i < plane.length; i++) cum[i] = cum[i - 1] + planeDist(plane[i - 1], plane[i]);
  return cum;
}

export type Located = { lat: number; lng: number; heading: number; seg: number };

// Position + heading (0 = north, 90 = east) at travelled distance `d` (same units as cumLengths).
export function locateAt(pts: GeoPoint[], cum: number[], d: number): Located {
  const total = cum[cum.length - 1];
  d = Math.max(0, Math.min(total, d));
  let i = 1;
  while (i < cum.length - 1 && cum[i] < d) i++;
  const a = pts[i - 1];
  const b = pts[i];
  const segLen = cum[i] - cum[i - 1] || 1;
  const f = (d - cum[i - 1]) / segLen;
  const lat = a.lat + (b.lat - a.lat) * f;
  const lng = a.lng + (b.lng - a.lng) * f;
  const pa = toPlane(a);
  const pb = toPlane(b);
  const heading = (Math.atan2(pb.x - pa.x, pb.y - pa.y) * 180) / Math.PI; // 0 = north
  return { lat, lng, heading, seg: i };
}

// Turn type at interior vertex i (1..n-2).
export function turnAt(pts: GeoPoint[], i: number): Turn {
  if (i < 1 || i > pts.length - 2) return 'straight';
  const a = toPlane(pts[i - 1]);
  const b = toPlane(pts[i]);
  const c = toPlane(pts[i + 1]);
  const v1x = b.x - a.x, v1y = b.y - a.y;
  const v2x = c.x - b.x, v2y = c.y - b.y;
  const cross = v1x * v2y - v1y * v2x;
  const dot = v1x * v2x + v1y * v2y;
  const ang = (Math.abs(Math.atan2(cross, dot)) * 180) / Math.PI;
  if (ang < 16) return 'straight';
  return cross > 0 ? 'right' : 'left';
}

export const TURN_LABEL: Record<Turn | 'arrive', string> = {
  left: 'Vire à esquerda',
  right: 'Vire à direita',
  straight: 'Siga em frente',
  arrive: 'Chegando',
};

export const STREETS = [
  'Av. Paulista', 'R. da Consolação', 'Av. Rebouças', 'R. Augusta', 'Av. Faria Lima',
  'R. Teodoro Sampaio', 'Av. Pacaembu', 'R. Cardeal Arcoverde', 'Av. Sumaré', 'R. Oscar Freire',
  'Av. Nove de Julho', 'R. Haddock Lobo', 'Av. Brasil',
];

export const HIGHWAYS = [
  'Rod. Ayrton Senna', 'Rod. Carvalho Pinto', 'Rod. dos Tamoios', 'Rod. Castello Branco',
  'Rod. Anhanguera', 'Av. dos Estados', 'SP-123', 'Rod. Fernão Dias',
];

export function fmtMeters(m: number) {
  if (m >= 1000) return (m / 1000).toFixed(1).replace('.', ',') + ' km';
  return Math.max(10, Math.round(m / 10) * 10) + ' m';
}

export function fmtKm(km: number) {
  if (km < 1) return Math.max(50, Math.round((km * 1000) / 50) * 50) + ' m';
  return (km < 10 ? km.toFixed(1).replace('.', ',') : String(Math.round(km))) + ' km';
}

export function addClock(base: string, mins: number) {
  const [h, m] = base.split(':').map(Number);
  let t = (h * 60 + m + Math.round(mins)) % 1440;
  if (t < 0) t += 1440;
  return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
}

// ---------- multi-leg itinerary geometry (for TripScreen), mirrors trip.jsx's buildGeo ----------
// The source scatters stops between two fixed illustrated-map anchor points; there's no
// real geocoding for guide stops in DATA, so we do the same synthetic scatter but around
// a real-world anchor pair (DATA.user_geo as "A" and a fixed offset toward the countryside
// as "B") so the whole trip still renders on the real map. This is cosmetic/simulated the
// same way the source's placement is — see docs/MAPS.md §5.
export function buildTripGeo(stopCount: number, seed: number, anchorA: GeoPoint, anchorB: GeoPoint) {
  const r = rng(seed);
  const n = stopCount;
  const stopPts: GeoPoint[] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    stopPts.push({
      lat: anchorA.lat + (anchorB.lat - anchorA.lat) * t + (r() - 0.5) * 0.03,
      lng: anchorA.lng + (anchorB.lng - anchorA.lng) * t + (r() - 0.5) * 0.055,
    });
  }
  const legs: GeoPoint[][] = [];
  for (let i = 0; i < stopPts.length - 1; i++) {
    const p = stopPts[i];
    const q = stopPts[i + 1];
    legs.push([
      p,
      { lat: p.lat + (q.lat - p.lat) * 0.18 + (r() - 0.5) * 0.02, lng: p.lng + (q.lng - p.lng) * 0.32 + (r() - 0.5) * 0.022 },
      { lat: p.lat + (q.lat - p.lat) * 0.5 + (r() - 0.5) * 0.02, lng: p.lng + (q.lng - p.lng) * 0.5 + (r() - 0.5) * 0.027 },
      { lat: p.lat + (q.lat - p.lat) * 0.86 + (r() - 0.5) * 0.013, lng: p.lng + (q.lng - p.lng) * 0.8 + (r() - 0.5) * 0.017 },
      q,
    ]);
  }
  const lens = legs.map((pts) => {
    const plane = pts.map(toPlane);
    let s = 0;
    for (let i = 1; i < plane.length; i++) s += planeDist(plane[i - 1], plane[i]);
    return s;
  });
  const road = legs.map(() => HIGHWAYS[Math.floor(r() * HIGHWAYS.length)]);
  return { stopPts, legs, lens, road };
}

// Position + heading + vertex/cum info along one leg's polyline, mirrors trip.jsx's `along`.
export function along(pts: GeoPoint[], f: number) {
  const cum = cumLengths(pts);
  const total = cum[cum.length - 1] || 1;
  const d = Math.max(0, Math.min(total, f * total));
  const loc = locateAt(pts, cum, d);
  return { ...loc, cum, total, d };
}

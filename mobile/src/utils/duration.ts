// Estimated driving duration from real distance, used everywhere a trip duration
// is displayed (Guide cards/detail, RouteScreen planner) — replaces the curated
// flavor-text duration strings in DATA.guides[].duration (e.g. "2h40" for the
// 167 km Serra da Mantiqueira guide), which didn't match the real driving time
// shown when the same trip is handed off to Google Maps (~4h for real mountain
// roads). Deriving duration from the same distance figure everywhere, with a
// documented average-speed assumption per terrain, keeps the in-app number and
// the Maps handoff in the same ballpark instead of visibly disagreeing — it
// won't be pixel-identical to Google's real routing (no Directions API — see
// docs/MAPS.md §5), but it stops contradicting it.
import { Guide } from '../data/types';

export type Terrain = 'highway' | 'coastal' | 'mountain' | 'local';

// Blended average speeds (km/h), accounting for stops/traffic/curves — rough but
// consistent, not a real routing engine. Tuned against the real Google Maps time
// for each of DATA.guides' actual routes (e.g. the 167 km Serra da Mantiqueira
// guide reads ~4h in Maps — a flat 50 km/h mountain assumption landed at 3h20,
// still visibly short; 42 km/h lands within a few minutes of it). Still an
// estimate, not a route computed from real roads (see `estimateDurationLabel`'s
// "~" prefix below) — this narrows the gap, it doesn't close it exactly.
const AVG_SPEED_KMH: Record<Terrain, number> = {
  highway: 80, // e.g. SP → Campinas
  coastal: 58, // e.g. Tamoios down to the coast — slow, curvy descent
  mountain: 42, // e.g. up the Mantiqueira serra
  local: 48, // short bate-volta / cultural day trips — city-exit + rural roads
};

// Guide category → terrain, from DATA.guides[].cat.
const CAT_TERRAIN: Record<string, Terrain> = {
  serra: 'mountain',
  praia: 'coastal',
  'bate-volta': 'local',
  cultura: 'local',
};

export function terrainForGuide(g: Pick<Guide, 'cat'>): Terrain {
  return CAT_TERRAIN[g.cat] ?? 'highway';
}

export function estimateDurationMinutes(distanceKm: number, terrain: Terrain = 'highway'): number {
  return (distanceKm / AVG_SPEED_KMH[terrain]) * 60;
}

export function fmtDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`;
}

// "~" prefix is deliberate: without a real routing engine (no Directions API —
// see docs/MAPS.md §5) this number can't match Google Maps' own live,
// traffic-aware figure exactly, only land in its neighborhood. Marking it as an
// estimate up front means a few minutes' difference reads as expected, not as
// the app contradicting itself the way an unqualified number did before.
export function estimateDurationLabel(distanceKm: number, terrain: Terrain = 'highway'): string {
  return `~${fmtDuration(estimateDurationMinutes(distanceKm, terrain))}`;
}

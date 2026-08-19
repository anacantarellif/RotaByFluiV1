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
// consistent, not a real routing engine.
const AVG_SPEED_KMH: Record<Terrain, number> = {
  highway: 80, // e.g. SP → Campinas
  coastal: 65, // e.g. Tamoios down to the coast
  mountain: 50, // e.g. up the Mantiqueira serra
  local: 55, // short bate-volta / cultural day trips
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

export function estimateDurationLabel(distanceKm: number, terrain: Terrain = 'highway'): string {
  return fmtDuration(estimateDurationMinutes(distanceKm, terrain));
}

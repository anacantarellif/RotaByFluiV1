// EV charging/consumption math, driven by the driver's selected `Car`
// (`src/state/CarContext.tsx`) crossed with a `Station`'s real specs
// (`power`, `connectors[]`). Used anywhere the app shows or animates a charging
// or driving duration — StationDetail's "tempo estimado", RouteScreen's planner,
// TripScreen's ChargeSheet, NavScreen's arrival-battery estimate — so every one of
// those screens agrees on the same numbers for the same car, instead of each
// screen guessing its own fixed constant (which is what project/app/*.jsx did:
// nav.jsx used a flat 1.6 %/km, trip.jsx a flat 0.34 %/km, both car-agnostic).
import { Car, Station } from '../data/types';

// AC vs. DC threshold: stations at or below 22 kW are single/three-phase AC
// (limited by the car's onboard charger, `car.ackw`); above that they're DC fast
// chargers (limited by the car's DC charge curve, `car.dckw`). This mirrors the
// app's own POWER_STEPS tiers (0/22/50/100/150) in screens-map.jsx's FilterSheet,
// where 22 kW is the AC/DC boundary.
const AC_DC_THRESHOLD_KW = 22;

// Real EVs don't charge at a flat rate: power tapers as the pack fills, most
// sharply above ~80%. A single flat-rate estimate would be wrong (and misleading
// for trip planning, which is the whole point of this module) — so charging time
// is computed in two segments: full effective power up to 80%, then a tapered
// rate above it. This is a simplified two-segment approximation of a real
// charging curve, not a manufacturer-specific curve — good enough for trip-time
// estimates, not for battery-management-system accuracy.
const TAPER_FROM_PCT = 80;
const TAPER_FACTOR = 0.45;

export function isAcStation(stationPowerKw: number): boolean {
  return stationPowerKw <= AC_DC_THRESHOLD_KW;
}

// The car's own max charge rate for this station's power tier — the station's
// power is a ceiling, the car's onboard/DC charger is the other ceiling, and the
// real charging rate is whichever is lower.
export function carMaxRateKw(car: Car, stationPowerKw: number): number {
  return isAcStation(stationPowerKw) ? car.ackw : car.dckw;
}

export function effectiveChargePowerKw(car: Car, stationPowerKw: number): number {
  return Math.min(stationPowerKw, carMaxRateKw(car, stationPowerKw));
}

export function isConnectorCompatible(car: Car, station: Station): boolean {
  return station.connectors.includes(car.connector);
}

// kWh needed to go from `fromPct` to `toPct` of this car's pack.
export function energyForPercent(car: Car, fromPct: number, toPct: number): number {
  const span = Math.max(0, toPct - fromPct);
  return (span / 100) * car.battery;
}

// Core charge-time math against a raw station power (kW), with no connector
// check — used directly by callers that already know (or have separately
// verified) compatibility, e.g. RouteScreen's planned charge stop, which isn't a
// real `Station` from DATA, just a curated route waypoint with a power rating.
// `chargeTimeMinutes` below is the Station-aware wrapper most callers should use.
export function chargeMinutesAtPower(car: Car, stationPowerKw: number, fromPct: number, toPct: number): number {
  if (toPct <= fromPct) return 0;
  const power = effectiveChargePowerKw(car, stationPowerKw);
  if (power <= 0) return 0;

  const taperStart = Math.max(fromPct, Math.min(toPct, TAPER_FROM_PCT));
  const fullSegmentKwh = energyForPercent(car, fromPct, taperStart);
  const taperedSegmentKwh = energyForPercent(car, taperStart, toPct);

  const fullMinutes = (fullSegmentKwh / power) * 60;
  const taperedMinutes = (taperedSegmentKwh / (power * TAPER_FACTOR)) * 60;
  return Math.round(fullMinutes + taperedMinutes);
}

// Minutes to charge from `fromPct` to `toPct` at this station, for this car —
// `null` when the connector isn't compatible (there's no real charging time to
// report, the car physically can't plug in).
export function chargeTimeMinutes(car: Car, station: Station, fromPct: number, toPct: number): number | null {
  if (!isConnectorCompatible(car, station)) return null;
  return chargeMinutesAtPower(car, station.power, fromPct, toPct);
}

// % of pack consumed per km, from the car's own range/battery ratio (not a fixed
// app-wide constant — a Kwid and a Model 3 don't consume the same %/km).
export function consumptionPctPerKm(car: Car): number {
  return 100 / car.range;
}

export function batteryAfterDistance(car: Car, startPct: number, km: number): number {
  return Math.max(0, Math.round(startPct - km * consumptionPctPerKm(car)));
}

export function fmtChargeMinutes(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export type ChargeEstimate = {
  compatible: boolean;
  effectiveKw: number;
  minutes: number | null;
  fromPct: number;
  toPct: number;
};

// The one call every screen should use for "how long would MY car take here" —
// wraps the compatibility check + math above into a single result so screens
// don't have to remember to check `isConnectorCompatible` themselves.
export function estimateChargeAt(car: Car, station: Station, fromPct = 20, toPct = 80): ChargeEstimate {
  const compatible = isConnectorCompatible(car, station);
  return {
    compatible,
    effectiveKw: effectiveChargePowerKw(car, station.power),
    minutes: compatible ? chargeTimeMinutes(car, station, fromPct, toPct) : null,
    fromPct,
    toPct,
  };
}

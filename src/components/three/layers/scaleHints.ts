// Per-layer scale calibration + light-distance formatter.
//
// Each scale layer renders in 0–10k scene units, but those units map to
// wildly different real-world distances depending on the layer. This module
// turns a camera distance (scene units in the active layer) into a friendly
// "X light-years" string for the HUD readout.
//
// Calibrations are STYLIZED — chosen so the readout's order of magnitude
// matches the layer's intent (planets in Solar = light-minutes/hours, nearby
// stars in Stellar = light-years, galactic arm in Galaxy = thousands of LY,
// galaxy-to-galaxy in Universe = millions/billions of LY). They're not
// astronomically precise; they're "feels right at a glance".

import type { ViewScale } from "@/store/solarSystemStore";

const LIGHT_MINUTE_KM = 17_987_547.48; // c × 60s
const LIGHT_HOUR_KM = LIGHT_MINUTE_KM * 60;
const LIGHT_DAY_KM = LIGHT_HOUR_KM * 24;
const LIGHT_YEAR_KM = LIGHT_DAY_KM * 365.25;

/**
 * How many KILOMETERS one scene-space unit represents in each layer. Picked
 * so that typical camera distances map to friendly readouts:
 *  - Solar (camera ~50–200 units): light-minutes → light-hours
 *  - Stellar (camera ~700 units): a few light-years (Alpha-Centauri-ish)
 *  - Galaxy (camera ~2000 units): tens of thousands of light-years (galactic arm)
 *  - Universe (camera ~3500 units): hundreds of millions to billions of light-years
 */
const KM_PER_UNIT: Record<ViewScale, number> = {
  // Calibrated so Earth's orbit (~24 units in stylized scale) ≈ 8 light-minutes
  // → 1 unit ≈ 6.25 light-minutes ≈ 1.12e8 km.
  solar: 1.12e8,
  // 1 unit ≈ 0.0035 ly → Alpha Centauri at ~770 scene units ≈ 2.7 ly
  // (real Alpha Centauri is 4.37 ly; stylized for legibility).
  stellar: 0.0035 * LIGHT_YEAR_KM,
  // 1 unit ≈ 35 ly → marker at ~600 scene units ≈ 21,000 ly (~galactic radius)
  galaxy: 35 * LIGHT_YEAR_KM,
  // 1 unit ≈ 350,000 ly → Milky Way at ~1800 units ≈ 630 Mly
  universe: 350_000 * LIGHT_YEAR_KM
};

/**
 * Convert a scene-space camera distance + active layer into the equivalent
 * real-world distance in kilometers.
 */
export function sceneDistanceToKm(distance: number, layer: ViewScale): number {
  return distance * KM_PER_UNIT[layer];
}

/**
 * Format a real-world distance in kilometers as a friendly light-time string
 * like "8 LIGHT-MINUTES", "4 LIGHT-YEARS", or "120 THOUSAND LIGHT-YEARS".
 * Picks the largest unit that keeps the value ≥ 1, then attaches a
 * thousand/million/billion magnifier if needed.
 */
export function formatLightDistance(km: number): string {
  if (!isFinite(km) || km <= 0) return "—";

  // Pick the largest light-unit that gives a value ≥ 1.
  const tiers: Array<{ unit: string; factor: number }> = [
    { unit: "LIGHT-YEARS", factor: LIGHT_YEAR_KM },
    { unit: "LIGHT-DAYS", factor: LIGHT_DAY_KM },
    { unit: "LIGHT-HOURS", factor: LIGHT_HOUR_KM },
    { unit: "LIGHT-MINUTES", factor: LIGHT_MINUTE_KM }
  ];
  let chosen = tiers[tiers.length - 1]; // default to light-minutes for tiny values
  for (const tier of tiers) {
    if (km >= tier.factor) {
      chosen = tier;
      break;
    }
  }
  let value = km / chosen.factor;
  let magnifier = "";

  // For light-years, apply thousand / million / billion magnifiers so the
  // displayed value stays in 1–999.
  if (chosen.unit === "LIGHT-YEARS") {
    if (value >= 1_000_000_000) {
      value /= 1_000_000_000;
      magnifier = "BILLION ";
    } else if (value >= 1_000_000) {
      value /= 1_000_000;
      magnifier = "MILLION ";
    } else if (value >= 1_000) {
      value /= 1_000;
      magnifier = "THOUSAND ";
    }
  }

  const rounded =
    value >= 100 ? Math.round(value) : value >= 10 ? Math.round(value * 10) / 10 : Math.round(value * 100) / 100;

  return `${rounded} ${magnifier}${chosen.unit}`;
}

/**
 * Convenience: take a scene-space distance + layer and produce the final
 * display string in one call.
 */
export function formatSceneDistance(distance: number, layer: ViewScale): string {
  return formatLightDistance(sceneDistanceToKm(distance, layer));
}

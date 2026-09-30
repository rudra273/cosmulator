// Per-layer scale calibration + light-distance formatter.
//
// Each scale layer renders in 0–10k scene units, but those units map to
// wildly different real-world distances depending on the layer. This module
// turns a camera distance (scene units in the active layer) into a friendly
// "X light-years" string for the HUD readout.
//
// Calibrations live in src/data/scales.ts (LY_PER_UNIT).

import { LIGHT_YEAR_KM, LY_PER_UNIT, type ViewScale } from "@/data/scales";

const LIGHT_MINUTE_KM = 17_987_547.48; // c × 60s
const LIGHT_HOUR_KM = LIGHT_MINUTE_KM * 60;
const LIGHT_DAY_KM = LIGHT_HOUR_KM * 24;

/**
 * Convert a scene-space camera distance + active layer into the equivalent
 * real-world distance in kilometers.
 */
export function sceneDistanceToKm(distance: number, layer: ViewScale): number {
  return distance * LY_PER_UNIT[layer] * LIGHT_YEAR_KM;
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

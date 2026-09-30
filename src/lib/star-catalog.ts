// Decoder for public/data/hyg-naked-eye.bin (built by
// scripts/build-star-catalog.mjs — keep the layouts in sync). Pure; runs
// under the node test harness.

import { absoluteMagnitude, equatorialToGalactic, galacticToScene, SUN_ABSOLUTE_MAGNITUDE } from "./stellar-coords";
import { stellarRadius } from "../data/scales";

export const STAR_CATALOG_URL = "/data/hyg-naked-eye.bin";
const RECORD_BYTES = 8;
const SUN_BV = 0.65;

export interface DecodedStar {
  raHours: number;
  decDeg: number;
  distanceLy: number;
  mag: number;
  bv: number;
}

export function decodeStarRecords(buffer: ArrayBuffer): DecodedStar[] {
  const view = new DataView(buffer);
  const magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  if (magic !== "HYG1") throw new Error(`unexpected star catalog header ${magic}`);
  const count = view.getUint32(4, true);
  const stars: DecodedStar[] = [];
  for (let i = 0; i < count; i++) {
    const o = 8 + i * RECORD_BYTES;
    const ci = view.getInt8(o + 7);
    stars.push({
      raHours: (view.getUint16(o, true) / 65535) * 24,
      decDeg: (view.getInt16(o + 2, true) / 32767) * 90,
      distanceLy: Math.pow(10, (view.getUint16(o + 4, true) / 65535) * 4),
      mag: view.getInt8(o + 6) / 10,
      bv: ci === -128 ? SUN_BV : ci / 50
    });
  }
  return stars;
}

/** B−V colour index → effective temperature (Ballesteros 2012). */
export function bvToKelvin(bv: number): number {
  return 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62));
}

/** Blackbody temperature → approximate sRGB (0..1), after Tanner Helland's fit. */
export function kelvinToRgb(kelvin: number): [number, number, number] {
  const t = Math.max(1000, Math.min(40000, kelvin)) / 100;
  const r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
  const g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  const c = (v: number) => Math.max(0, Math.min(255, v)) / 255;
  return [c(r), c(g), c(b)];
}

/**
 * Radius of a BACKGROUND star in the Stellar Neighborhood. On the log scale
 * the naked-eye catalogue (median ~400 ly) piles into a thin 900–1,400-unit
 * shell that reads as a small globe once you zoom out. So beyond ~25 ly the
 * background spreads as distance^0.7: still ordered by distance (farther is
 * farther), but a deep volume to ~19,000 units that surrounds the camera at
 * every zoom. Nearer than ~25 ly it stays on the log scale, matching the
 * named stars and the 10 ly ring. Named stars themselves stay log-scaled.
 */
export const SPREAD_COEFF = 68.7;
export const SPREAD_POWER = 0.7;
export function backgroundRadius(distanceLy: number): number {
  return Math.max(stellarRadius(distanceLy), SPREAD_COEFF * Math.pow(distanceLy, SPREAD_POWER));
}

/** A star to leave out of the field (drawn separately as a named sprite). */
export interface SkipStar {
  raHours: number;
  decDeg: number;
  apparentMag: number;
}

const SKIP_RADIANS = (0.3 * Math.PI) / 180;

/** Geometry-ready arrays: scene positions, colours dimmed for faint stars,
 *  and point sizes from luminosity (scaled with the spread, so each star
 *  looks the same size from the Sun as on the log scale). Catalogue entries
 *  within 0.3° and 0.7 mag of a `skip` star are dropped. */
export function buildStarField(stars: DecodedStar[], skip: SkipStar[] = []) {
  const skipDirs = skip.map((k) => ({ dir: equatorialToGalactic(k.raHours, k.decDeg), mag: k.apparentMag }));
  const kept = stars.filter((s) => {
    if (skipDirs.length === 0) return true;
    const d = equatorialToGalactic(s.raHours, s.decDeg);
    return !skipDirs.some((k) => Math.abs(k.mag - s.mag) < 0.7 && Math.acos(Math.min(1, d[0] * k.dir[0] + d[1] * k.dir[1] + d[2] * k.dir[2])) < SKIP_RADIANS);
  });
  const positions = new Float32Array(kept.length * 3);
  const colors = new Float32Array(kept.length * 3);
  const sizes = new Float32Array(kept.length);
  kept.forEach((s, i) => {
    const dir = galacticToScene(equatorialToGalactic(s.raHours, s.decDeg));
    const r = backgroundRadius(s.distanceLy);
    positions.set([dir[0] * r, dir[1] * r, dir[2] * r], i * 3);
    const brighter = SUN_ABSOLUTE_MAGNITUDE - absoluteMagnitude(s.mag, s.distanceLy);
    const k = Math.max(0.35, Math.min(1, 0.55 + brighter * 0.08));
    const [cr, cg, cb] = kelvinToRgb(bvToKelvin(s.bv));
    colors.set([cr * k, cg * k, cb * k], i * 3);
    const base = Math.max(4, Math.min(22, 6 + brighter * 1.2));
    sizes[i] = base * (r / stellarRadius(s.distanceLy));
  });
  return { positions, colors, sizes };
}

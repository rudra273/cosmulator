// Decoder for public/data/hyg-naked-eye.bin (built by
// scripts/build-star-catalog.mjs — keep the layouts in sync). Pure; runs
// under the node test harness.

import { absoluteMagnitude, starScenePosition, SUN_ABSOLUTE_MAGNITUDE } from "./stellar-coords";

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

/** Geometry-ready arrays: scene positions, colours dimmed for faint stars,
 *  and point sizes from luminosity. */
export function buildStarField(stars: DecodedStar[]) {
  const positions = new Float32Array(stars.length * 3);
  const colors = new Float32Array(stars.length * 3);
  const sizes = new Float32Array(stars.length);
  stars.forEach((s, i) => {
    positions.set(starScenePosition(s.raHours, s.decDeg, s.distanceLy), i * 3);
    const brighter = SUN_ABSOLUTE_MAGNITUDE - absoluteMagnitude(s.mag, s.distanceLy);
    const k = Math.max(0.35, Math.min(1, 0.55 + brighter * 0.08));
    const [r, g, b] = kelvinToRgb(bvToKelvin(s.bv));
    colors.set([r * k, g * k, b * k], i * 3);
    sizes[i] = Math.max(4, Math.min(22, 6 + brighter * 1.2));
  });
  return { positions, colors, sizes };
}

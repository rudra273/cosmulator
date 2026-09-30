// Real sky positions → Stellar Neighborhood scene positions. Pure; runs under
// the node test harness.
//
// Pipeline: RA/Dec (J2000) → galactic unit vector → scene axes aligned with
// the Galaxy layer (galactic north = +Y, l = 0 toward Sgr A*) → radius from
// the log distance compression in src/data/scales.ts.

import { GALACTIC_CENTER_DIRECTION } from "../data/galaxy";
import { stellarRadius } from "../data/scales";

export type Vec3 = [number, number, number];

// Equatorial (J2000) → galactic rotation (Hipparcos, ESA 1997 vol. 1 §1.5.3).
const EQ_TO_GAL = [
  [-0.0548755604, -0.8734370902, -0.4838350155],
  [0.4941094279, -0.44482963, 0.7469822445],
  [-0.867666149, -0.1980763734, 0.4559837762]
];

/** Galactic unit vector: x toward the galactic centre, y toward l = 90°, z toward the north galactic pole. */
export function equatorialToGalactic(raHours: number, decDeg: number): Vec3 {
  const ra = (raHours / 24) * 2 * Math.PI;
  const dec = (decDeg * Math.PI) / 180;
  const e = [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)];
  return EQ_TO_GAL.map((row) => row[0] * e[0] + row[1] * e[1] + row[2] * e[2]) as Vec3;
}

/** Galactic direction → scene direction. l = 0 maps to GALACTIC_CENTER_DIRECTION,
 *  the north galactic pole to +Y; the mapping stays right-handed. */
export function galacticToScene([gx, gy, gz]: Vec3): Vec3 {
  const [ux, , uz] = GALACTIC_CENTER_DIRECTION;
  const v: Vec3 = [uz, 0, -ux]; // Y × u, so u × v = +Y
  return [gx * ux + gy * v[0], gz, gx * uz + gy * v[2]];
}

/** Scene direction for galactic longitude / latitude (degrees). */
export function galacticDirection(lDeg: number, bDeg: number): Vec3 {
  const l = (lDeg * Math.PI) / 180, b = (bDeg * Math.PI) / 180;
  return galacticToScene([Math.cos(b) * Math.cos(l), Math.cos(b) * Math.sin(l), Math.sin(b)]);
}

/** Linear-scale position of an object seen from `origin` (the Sun) at
 *  galactic l/b and a distance, in a layer with `lyPerUnit`. */
export function positionFromSun(origin: Vec3, lDeg: number, bDeg: number, distanceLy: number, lyPerUnit: number): Vec3 {
  const d = galacticDirection(lDeg, bDeg);
  const k = distanceLy / lyPerUnit;
  return [origin[0] + d[0] * k, origin[1] + d[1] * k, origin[2] + d[2] * k];
}

/** Scene position of a star from its catalog coordinates. */
export function starScenePosition(raHours: number, decDeg: number, distanceLy: number): Vec3 {
  const d = galacticToScene(equatorialToGalactic(raHours, decDeg));
  const r = stellarRadius(distanceLy);
  return [d[0] * r, d[1] * r, d[2] * r];
}

const LY_PER_PARSEC = 3.26156;

/** Absolute visual magnitude from apparent magnitude and distance. */
export function absoluteMagnitude(apparentMag: number, distanceLy: number): number {
  return apparentMag - 5 * Math.log10(distanceLy / LY_PER_PARSEC / 10);
}

// Approximate perceived colours by spectral class (O hot blue → M cool red).
const CLASS_COLORS: Record<string, string> = {
  O: "#9bb0ff", B: "#aabfff", A: "#cad7ff", F: "#f8f7ff", G: "#fff4ea", K: "#ffd2a1", M: "#ffb07a"
};

export function spectralColor(spectralClass: string): string {
  return CLASS_COLORS[spectralClass.trim().charAt(0).toUpperCase()] ?? "#ffffff";
}

export const SUN_ABSOLUTE_MAGNITUDE = 4.83;

/** Sprite size from absolute magnitude: a luminosity cue, clamped so dim red
 *  dwarfs stay visible and supergiants don't swamp the view. */
export function starSpriteSize(absMag: number): number {
  return Math.min(200, Math.max(34, 60 + (SUN_ABSOLUTE_MAGNITUDE - absMag) * 10));
}

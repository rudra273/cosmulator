// Heliopause and the Voyager probes: the Solar System's outer boundary.
// Pure; runs under the node test harness.
//
// Voyager directions are J2000 RA/Dec as seen from the Sun; distances grow
// linearly from a 2024.0 reference at their current escape speeds (~17 and
// ~15 km/s). Good to about an AU from 1990, after their last planetary
// flybys, onward.

export type Vec3 = [number, number, number];

/** Where each Voyager crossed into interstellar space (NASA/JPL). */
export const HELIOPAUSE_AU = 120;

export interface Probe {
  id: string;
  name: string;
  raHours: number;
  decDeg: number;
  au2024: number;
  auPerYear: number;
  crossed: string;
}

export const VOYAGERS: Probe[] = [
  { id: "voyager-1", name: "Voyager 1", raHours: 17.22, decDeg: 12.1, au2024: 162.1, auPerYear: 3.58, crossed: "Aug 2012 at 121.6 AU" },
  { id: "voyager-2", name: "Voyager 2", raHours: 20.1, decDeg: -60.3, au2024: 135.4, auPerYear: 3.24, crossed: "Nov 2018 at 119.0 AU" }
];

/** The linear model only holds after the last planetary flyby (Neptune, 1989). */
export const VOYAGER_MODEL_START_YEAR = 1990;

const OBLIQUITY = (23.4393 * Math.PI) / 180;

/** Unit vector in scene axes: ecliptic plane = XZ, ecliptic longitude λ at
 *  (cos λ, ·, −sin λ), ecliptic north = +Y (same as the planets). */
export function eclipticSceneDirection(raHours: number, decDeg: number): Vec3 {
  const ra = (raHours / 24) * 2 * Math.PI;
  const dec = (decDeg * Math.PI) / 180;
  const x = Math.cos(dec) * Math.cos(ra);
  const y = Math.cos(dec) * Math.sin(ra);
  const z = Math.sin(dec);
  const ye = y * Math.cos(OBLIQUITY) + z * Math.sin(OBLIQUITY);
  const ze = -y * Math.sin(OBLIQUITY) + z * Math.cos(OBLIQUITY);
  return [x, ze, -ye];
}

export function probeDistanceAU(probe: Probe, year: number): number {
  return probe.au2024 + probe.auPerYear * (year - 2024);
}

// The S-stars: stars orbiting Sagittarius A*, the Milky Way's central black
// hole, tracked since 1992 (ESO VLT / Keck). Orbital elements rounded from
// Gillessen et al. (2017), "An update on monitoring stellar orbits in the
// Galactic Center", ApJ 837, 30, Table 3. Semi-major axes are in arcseconds
// as seen from Earth; angles in degrees; tP is the year of pericentre.
//
// Scene units in the Galactic Centre layer are astronomical units (AU). Sky
// axes (north, east, away from us) are turned into the same scene axes as
// every other layer, so the orbits are oriented as they really are.

import { equatorialVectorToScene, type Vec3 } from "../lib/stellar-coords";
import { J2000_MS, DAY_MS } from "../lib/simulation-time";

/** Distance to Sgr A* (Gillessen 2017): 1″ there is this many AU. */
export const SGR_A_DISTANCE_PC = 8320;
/** Black hole mass in Suns (Gillessen 2017). */
export const SGR_A_MASS_SUNS = 4.28e6;
/** Sgr A* sky position (J2000). */
export const SGR_A_RA_HOURS = 17.761123;
export const SGR_A_DEC_DEG = -29.007811;

export interface SStar {
  id: string;
  name: string;
  aArcsec: number;
  e: number;
  iDeg: number;
  OmegaDeg: number;
  omegaDeg: number;
  tPeriYear: number;
  note?: string;
}

export const S_STARS: SStar[] = [
  { id: "s2", name: "S2", aArcsec: 0.1255, e: 0.8839, iDeg: 134.18, OmegaDeg: 226.94, omegaDeg: 65.51, tPeriYear: 2018.38,
    note: "Passed 120 AU from the black hole in May 2018 at ~7,650 km/s (2.5% of light speed); the GRAVITY team measured Einstein's gravitational redshift and orbital precession in its light." },
  { id: "s1", name: "S1", aArcsec: 0.595, e: 0.556, iDeg: 119.14, OmegaDeg: 342.04, omegaDeg: 122.3, tPeriYear: 2001.8 },
  { id: "s8", name: "S8", aArcsec: 0.4047, e: 0.8031, iDeg: 74.37, OmegaDeg: 315.43, omegaDeg: 346.7, tPeriYear: 1983.64 },
  { id: "s12", name: "S12", aArcsec: 0.2987, e: 0.8883, iDeg: 33.56, OmegaDeg: 230.1, omegaDeg: 317.9, tPeriYear: 1995.59 },
  { id: "s13", name: "S13", aArcsec: 0.2641, e: 0.425, iDeg: 24.7, OmegaDeg: 74.5, omegaDeg: 245.2, tPeriYear: 2004.86 },
  { id: "s14", name: "S14", aArcsec: 0.2863, e: 0.9761, iDeg: 100.59, OmegaDeg: 226.38, omegaDeg: 334.59, tPeriYear: 2000.12,
    note: "The most eccentric known S-star orbit: it dives to ~60 AU from the black hole." },
  { id: "s29", name: "S29", aArcsec: 0.428, e: 0.728, iDeg: 105.8, OmegaDeg: 161.96, omegaDeg: 346.5, tPeriYear: 2025.96 },
  { id: "s38", name: "S38", aArcsec: 0.1416, e: 0.8201, iDeg: 171.1, OmegaDeg: 101.06, omegaDeg: 17.99, tPeriYear: 2003.19 },
  { id: "s55", name: "S55", aArcsec: 0.1078, e: 0.7209, iDeg: 150.1, OmegaDeg: 325.5, omegaDeg: 331.5, tPeriYear: 2009.34,
    note: "One of the shortest known periods: ~13 years." },
  { id: "s4", name: "S4", aArcsec: 0.357, e: 0.3905, iDeg: 80.33, OmegaDeg: 258.84, omegaDeg: 290.8, tPeriYear: 1957.4 },
  { id: "s9", name: "S9", aArcsec: 0.2724, e: 0.644, iDeg: 82.41, OmegaDeg: 156.6, omegaDeg: 150.6, tPeriYear: 1976.71 },
  { id: "s17", name: "S17", aArcsec: 0.3559, e: 0.397, iDeg: 96.83, OmegaDeg: 191.62, omegaDeg: 326.0, tPeriYear: 1991.19 },
  { id: "s18", name: "S18", aArcsec: 0.2379, e: 0.471, iDeg: 110.67, OmegaDeg: 49.11, omegaDeg: 349.46, tPeriYear: 1993.86 },
  { id: "s21", name: "S21", aArcsec: 0.219, e: 0.764, iDeg: 58.8, OmegaDeg: 259.64, omegaDeg: 166.4, tPeriYear: 2027.4 }
];

const DEG = Math.PI / 180;
const JULIAN_YEAR_MS = 365.25 * DAY_MS;

export const semiMajorAu = (s: SStar) => s.aArcsec * SGR_A_DISTANCE_PC;

/** Orbital period in years from Kepler's third law. */
export function periodYears(s: SStar): number {
  return Math.sqrt(Math.pow(semiMajorAu(s), 3) / SGR_A_MASS_SUNS);
}

export const pericentreAu = (s: SStar) => semiMajorAu(s) * (1 - s.e);

/** Decimal (Julian) year of a timestamp. */
export const decimalYear = (ms: number) => 2000 + (ms - J2000_MS) / JULIAN_YEAR_MS;

/** Eccentric anomaly from mean anomaly (Newton's method). */
export function solveKepler(M: number, e: number): number {
  let E = e > 0.8 ? Math.PI : M;
  for (let i = 0; i < 30; i++) {
    const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= d;
    if (Math.abs(d) < 1e-12) break;
  }
  return E;
}

// Sky axes at Sgr A*, in scene coordinates.
const SKY = (() => {
  const ra = (SGR_A_RA_HOURS / 24) * 2 * Math.PI, dec = SGR_A_DEC_DEG * DEG;
  return {
    away: equatorialVectorToScene([Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)]),
    north: equatorialVectorToScene([-Math.sin(dec) * Math.cos(ra), -Math.sin(dec) * Math.sin(ra), Math.cos(dec)]),
    east: equatorialVectorToScene([-Math.sin(ra), Math.cos(ra), 0])
  };
})();

/** Position (AU, scene axes) at true anomaly ν. Thiele–Innes convention:
 *  Ω measured from north through east, z positive away from the Sun. */
export function orbitPointAu(s: SStar, nu: number): Vec3 {
  const a = semiMajorAu(s);
  const r = (a * (1 - s.e * s.e)) / (1 + s.e * Math.cos(nu));
  const u = s.omegaDeg * DEG + nu, O = s.OmegaDeg * DEG, i = s.iDeg * DEG;
  const n = r * (Math.cos(O) * Math.cos(u) - Math.sin(O) * Math.sin(u) * Math.cos(i));
  const e = r * (Math.sin(O) * Math.cos(u) + Math.cos(O) * Math.sin(u) * Math.cos(i));
  const z = r * Math.sin(u) * Math.sin(i);
  return [0, 1, 2].map((k) => n * SKY.north[k] + e * SKY.east[k] + z * SKY.away[k]) as Vec3;
}

/** Where the star is at a given time (ms since 1970). */
export function sStarPositionAu(s: SStar, ms: number): Vec3 {
  const P = periodYears(s);
  const M = (2 * Math.PI * (decimalYear(ms) - s.tPeriYear)) / P;
  const E = solveKepler(((M % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI, s.e);
  const nu = 2 * Math.atan2(Math.sqrt(1 + s.e) * Math.sin(E / 2), Math.sqrt(1 - s.e) * Math.cos(E / 2));
  return orbitPointAu(s, nu);
}

/** Closed orbit polyline, denser near pericentre (uniform in eccentric anomaly). */
export function orbitPathAu(s: SStar, segments = 256): Vec3[] {
  const pts: Vec3[] = [];
  for (let k = 0; k <= segments; k++) {
    const E = -Math.PI + (2 * Math.PI * k) / segments;
    const nu = 2 * Math.atan2(Math.sqrt(1 + s.e) * Math.sin(E / 2), Math.sqrt(1 - s.e) * Math.cos(E / 2));
    pts.push(orbitPointAu(s, nu));
  }
  return pts;
}

/** Speed (km/s) at distance r (AU) from the vis-viva equation. */
export function speedKmS(s: SStar, rAu: number): number {
  const GM = 1.32712440018e11 * SGR_A_MASS_SUNS; // km³/s²
  const AU_KM = 1.495978707e8;
  return Math.sqrt(GM * (2 / (rAu * AU_KM) - 1 / (semiMajorAu(s) * AU_KM)));
}

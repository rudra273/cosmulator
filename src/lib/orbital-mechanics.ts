// ---------------------------------------------------------------------------
// Constants for the NASA-Eyes-style real-positions rendering. Planets are
// placed at their actual heliocentric positions for Date.now() + elapsedTime;
// orbits are tilted onto their real planes.
// ---------------------------------------------------------------------------

/** J2000.0 epoch in milliseconds (2000-01-01 12:00 UTC). */
export const J2000_EPOCH_MS = Date.UTC(2000, 0, 1, 12, 0, 0);

export const MS_PER_DAY = 86_400_000;
export const DAYS_PER_CENTURY = 36525;

/**
 * Real orbital inclinations are small (Jupiter ~1.3°, Mercury ~7°). In stylized
 * scale we exaggerate them so the NASA-Eyes-style tilt reads visually; in
 * realistic scale we keep true values (everything is already subtle by design).
 */
export const INCLINATION_EXAGGERATION_STYLIZED = 5;
export const INCLINATION_EXAGGERATION_REALISTIC = 1;

/** A body's orbital-plane orientation, used to tilt an in-plane position into 3D. */
export interface OrbitalPlane {
  inclinationRad: number; // i — already exaggerated by the caller if applicable
  longitudeAscendingNodeRad: number; // Ω
  argumentOfPeriapsisRad: number; // ω = ϖ − Ω
}

/**
 * Rotates a point that currently lies in the XZ plane (y = 0) onto its true
 * orbital plane. Our scene uses Y-up, so the ecliptic is the XZ plane and the
 * orbital-plane rotations happen around Y (substituting for the textbook's Z).
 * Sequence: Ry(Ω) · Rx(i) · Ry(ω) applied to the in-plane position.
 *
 * This is the SINGLE source of truth for the tilt — both the planet's
 * per-frame position and every vertex of its orbit polyline flow through it,
 * so dots and rings can never drift apart.
 */
export function applyOrbitalRotation(
  flatPos: [number, number, number],
  plane: OrbitalPlane
): [number, number, number] {
  const [x0, , z0] = flatPos;
  const { inclinationRad: i, longitudeAscendingNodeRad: O, argumentOfPeriapsisRad: w } = plane;

  // Step 1: Ry(ω) — rotate within the orbital plane around its normal (Y).
  // Y stays 0; the planet just slides around its own ellipse to align periapsis.
  const cw = Math.cos(w);
  const sw = Math.sin(w);
  const x1 = x0 * cw + z0 * sw;
  const z1 = -x0 * sw + z0 * cw;

  // Step 2: Rx(i) — tilt the plane up around the line of nodes (X axis).
  // Introduces a Y component proportional to z1.
  const ci = Math.cos(i);
  const si = Math.sin(i);
  const y2 = -z1 * si;
  const z2 = z1 * ci;

  // Step 3: Ry(Ω) — orient the line of nodes within the ecliptic (XZ plane).
  // x1 is unchanged by Rx(i); use it directly.
  const cO = Math.cos(O);
  const sO = Math.sin(O);
  const x3 = x1 * cO + z2 * sO;
  const z3 = -x1 * sO + z2 * cO;

  return [x3, y2, z3];
}

/**
 * Solves Kepler's Equation: M = E - e * sin(E)
 * uses Newton-Raphson iteration.
 * 
 * @param M Mean Anomaly (in radians)
 * @param e Eccentricity of the orbit
 * @returns Eccentric Anomaly E (in radians)
 */
export function solveKeplerEquation(M: number, e: number): number {
  let E = M; // Initial guess
  const tolerance = 1e-6;
  const maxIterations = 15;

  for (let i = 0; i < maxIterations; i++) {
    const delta = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E = E - delta;
    if (Math.abs(delta) < tolerance) {
      break;
    }
  }
  return E;
}

/**
 * Computes the 3D position of a planet in its orbit for a given elapsed time.
 * Orbits are drawn in the XZ plane with the Sun at (0, 0, 0).
 * 
 * @param distance Real distance in AU (used as semi-major axis 'a')
 * @param eccentricity Orbital eccentricity 'e'
 * @param orbitalPeriod Orbital period in days
 * @param time Elapsed simulation time
 * @param isRealisticScale Whether we are rendering in realistic proportions
 * @returns [x, y, z] coordinates
 */
export function computeOrbitalPosition(
  distance: number,
  eccentricity: number,
  orbitalPeriod: number,
  time: number,
  isRealisticScale: boolean,
  // Defensive defaults: a body without ephemeris (e.g. an asteroid-belt
  // particle) omits these and gets a flat-XZ position.
  orbitalPlane?: OrbitalPlane,
  meanAnomalyAtEpochRad?: number
): [number, number, number] {
  // 1. Get the scaled semi-major axis 'a'
  const a = getScaledDistance(distance, isRealisticScale);

  // 2. Compute Mean Anomaly M. When the caller supplies M directly (real-
  // positions path), we use it as-is; otherwise fall back to the legacy
  // sweep tied to the simulation's elapsed time.
  const M =
    meanAnomalyAtEpochRad !== undefined
      ? meanAnomalyAtEpochRad + (2 * Math.PI * time) / orbitalPeriod
      : (2 * Math.PI * time) / orbitalPeriod;

  // 3. Solve Kepler's equation for Eccentric Anomaly E
  const E = solveKeplerEquation(M, eccentricity);

  // 4. Compute True Anomaly (theta)
  const trueAnomaly = 2 * Math.atan2(
    Math.sqrt(1 + eccentricity) * Math.sin(E / 2),
    Math.sqrt(1 - eccentricity) * Math.cos(E / 2)
  );

  // 5. Compute radial distance 'r' in the orbital plane
  const r = a * (1 - eccentricity * Math.cos(E));

  // 6. Project position onto the XZ plane (Y is up in Three.js, so orbits lie flat on XZ)
  const x = r * Math.cos(trueAnomaly);
  const z = r * Math.sin(trueAnomaly);
  const flat: [number, number, number] = [x, 0, z];

  // 7. If an orbital plane was supplied, tilt the in-plane point into 3D.
  return orbitalPlane ? applyOrbitalRotation(flat, orbitalPlane) : flat;
}

/**
 * Generates an array of points forming the elliptical orbit curve.
 * Used for drawing orbit lines.
 * 
 * @param distance Real distance in AU
 * @param eccentricity Orbital eccentricity
 * @param isRealisticScale Whether we are rendering in realistic proportions
 * @param segments Number of points to generate for the ellipse
 */
export function generateOrbitPath(
  distance: number,
  eccentricity: number,
  isRealisticScale: boolean,
  segments = 128,
  // Defensive default: omit for bodies without ephemeris → flat XZ ring.
  orbitalPlane?: OrbitalPlane
): [number, number, number][] {
  const points: [number, number, number][] = [];
  const a = getScaledDistance(distance, isRealisticScale);

  // Semi-minor axis b = a * sqrt(1 - e^2)
  const b = a * Math.sqrt(1 - eccentricity * eccentricity);

  // Focus offset (distance from center of ellipse to focus where Sun resides)
  // c = a * e
  const c = a * eccentricity;

  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * 2 * Math.PI;

    // An ellipse centered at (-c, 0) in the XZ plane puts the focus (Sun) at (0, 0)
    const x = a * Math.cos(theta) - c;
    const z = b * Math.sin(theta);
    const flat: [number, number, number] = [x, 0, z];

    points.push(orbitalPlane ? applyOrbitalRotation(flat, orbitalPlane) : flat);
  }

  return points;
}

/**
 * Resolves a body's J2000 mean elements at a given instant into the inputs
 * `computeOrbitalPosition` + `generateOrbitPath` need: a Mean Anomaly and the
 * three orbital-plane angles (i, Ω, ω). Returning both shapes from one call
 * guarantees the planet's dot and its orbit polyline use IDENTICAL angles in
 * the same frame — they can never visually drift apart.
 *
 * Drift: each element evolves linearly per century (T = days / 36525).
 * Inclination is multiplied by the per-mode exaggeration constant; everything
 * else returns radians ready for the rotation helper.
 */
export function computeMeanAnomalyAndAngles(
  ephemeris: import("@/data/bodies/types").J2000Elements,
  daysSinceJ2000: number,
  isRealisticScale: boolean
): {
  meanAnomalyAtEpochRad: number;
  semiMajorAxisAU: number;
  eccentricity: number;
  inclinationRad: number;
  longitudeAscendingNodeRad: number;
  argumentOfPeriapsisRad: number;
} {
  const T = daysSinceJ2000 / DAYS_PER_CENTURY;
  const r = ephemeris.ratesPerCentury;

  const a = ephemeris.semiMajorAxisAU + r.semiMajorAxisAU * T;
  const e = ephemeris.eccentricity + r.eccentricity * T;

  // Drift each angular element, then convert to radians once.
  const DEG2RAD = Math.PI / 180;
  const iDegRaw = ephemeris.inclinationDeg + r.inclinationDeg * T;
  const exaggeration = isRealisticScale
    ? INCLINATION_EXAGGERATION_REALISTIC
    : INCLINATION_EXAGGERATION_STYLIZED;
  const iRad = iDegRaw * exaggeration * DEG2RAD;

  const omegaCapRad =
    (ephemeris.longitudeAscendingNodeDeg + r.longitudeAscendingNodeDeg * T) * DEG2RAD;
  const varpiRad =
    (ephemeris.longitudePerihelionDeg + r.longitudePerihelionDeg * T) * DEG2RAD;
  const LRad = (ephemeris.meanLongitudeDeg + r.meanLongitudeDeg * T) * DEG2RAD;

  // Argument of periapsis ω = ϖ − Ω, Mean Anomaly at this instant M = L − ϖ.
  const argPerRad = varpiRad - omegaCapRad;
  let M = LRad - varpiRad;
  // Normalize M to (−π, π] so Kepler converges quickly.
  M = ((M + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;

  return {
    meanAnomalyAtEpochRad: M,
    semiMajorAxisAU: a,
    eccentricity: e,
    inclinationRad: iRad,
    longitudeAscendingNodeRad: omegaCapRad,
    argumentOfPeriapsisRad: argPerRad
  };
}

/**
 * Calculates the scaled distance (semi-major axis) for Three.js units.
 * Applies a power-based compression in stylized mode to make all planets visible.
 */
export function getScaledDistance(distance: number, isRealisticScale: boolean): number {
  if (isRealisticScale) {
    // 1 AU = 150 Three.js units
    return distance * 150;
  } else {
    // Stylized scale: power compression to keep planets between 16 and 105 units from the Sun
    return Math.pow(distance, 0.6) * 25 + 15;
  }
}

/**
 * Calculates the scaled radius of a planet in Three.js units.
 * Earth is the baseline (radius = 6371 km).
 */
export function getScaledRadius(radius: number, isRealisticScale: boolean): number {
  const EARTH_RADIUS = 6371.0;
  const ratio = radius / EARTH_RADIUS;

  if (isRealisticScale) {
    // Realistic scale: Earth is ~0.1 units. Sun is ~10.9 units.
    // Extremely small, but mathematically proportional.
    return ratio * 0.1;
  } else {
    // Stylized scale: power ratio so gas giants don't completely dwarf terrestrial planets
    // Base size for Earth is 1.0, Jupiter is ~3.3, Mercury is ~0.6
    return Math.pow(ratio, 0.45) * 1.2;
  }
}

/**
 * Gets the scaled radius of the Sun specifically.
 */
export function getScaledSunRadius(isRealisticScale: boolean): number {
  if (isRealisticScale) {
    // Sun is 109x Earth radius
    return 10.9;
  } else {
    // In stylized mode, Sun is large but capped so it doesn't swallow everything
    return 6.0;
  }
}

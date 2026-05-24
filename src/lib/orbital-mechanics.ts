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
  isRealisticScale: boolean
): [number, number, number] {
  // 1. Get the scaled semi-major axis 'a'
  const a = getScaledDistance(distance, isRealisticScale);
  
  // 2. Compute Mean Anomaly M
  // Speed is inversely proportional to the orbital period
  const M = (2 * Math.PI * time) / orbitalPeriod;
  
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
  const y = 0; // Flat orbits for cleaner gameplay/navigation
  
  return [x, y, z];
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
  segments = 128
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
    const y = 0;
    
    points.push([x, y, z]);
  }
  
  return points;
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

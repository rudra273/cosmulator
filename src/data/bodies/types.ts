// Unified celestial-body data model.
//
// A discriminated union keyed on `type`. Adding a new kind of object later
// (moon, comet, spacecraft) means adding a member here + a render branch in
// CelestialBody — the data files and registry stay one-file-per-body.

export type BodyType = "star" | "planet"; // future: "moon" | "comet" | "spacecraft"

// Surface rendering style. Maps to the uPlanetType branch in the surface
// shader; "star" uses the dedicated star shader path.
export type ShaderType = "rocky" | "banded" | "water" | "star";

export interface RingsConfig {
  innerRadius: number; // relative to planet radius (e.g. 1.3)
  outerRadius: number; // relative to planet radius (e.g. 2.3)
  colors: string[]; // band colors (currently informational; shader derives from baseColor)
}

/**
 * J2000.0 mean orbital elements + per-century drift rates — drives planet
 * positions (NASA-Eyes-style real placement). All angles in degrees. Values
 * are the standard Standish / JPL "Keplerian Elements for Approximate
 * Positions of the Major Planets" table, valid to ~arcminute precision for
 * 1800 AD – 2050 AD — plenty for visualization.
 */
export interface J2000Elements {
  semiMajorAxisAU: number; // a — duplicates legacy `distance` on purpose
  eccentricity: number; // e — duplicates legacy `eccentricity` on purpose
  inclinationDeg: number; // i (relative to ecliptic)
  longitudeAscendingNodeDeg: number; // Ω
  longitudePerihelionDeg: number; // ϖ = Ω + ω
  meanLongitudeDeg: number; // L at epoch
  ratesPerCentury: {
    semiMajorAxisAU: number;
    eccentricity: number;
    inclinationDeg: number;
    longitudeAscendingNodeDeg: number;
    longitudePerihelionDeg: number;
    meanLongitudeDeg: number;
  };
}

interface BaseBody {
  id: string;
  name: string;
  radius: number; // in km
  rotationPeriod: number; // in hours (negative means retrograde)
  axialTilt: number; // in degrees
  baseColor: string; // primary color (UI dots, ring tint, orbit line)
  surfaceColors: string[]; // gradient colors for the procedural shader
  shaderType: ShaderType; // selects the surface shader (replaces id-based switch)
  geometrySegments?: number; // sphere detail; defaults applied per type
  noiseScale?: number; // procedural noise params (were id-derived previously)
  noiseFreq?: number;
  // Info-panel content (shared by all bodies)
  funFacts: string[];
  description: string;
  mass: string; // in 10^24 kg
  temperature: string; // average surface temp
}

export interface StarBody extends BaseBody {
  type: "star";
  shaderType: "star";
}

export interface PlanetBody extends BaseBody {
  type: "planet";
  distance: number; // in AU (semi-major axis)
  orbitalPeriod: number; // in Earth days
  eccentricity: number; // orbital eccentricity
  atmosphereColor?: string; // Fresnel glow color (if any)
  rings?: RingsConfig; // present only for ringed planets
  // J2000 elements driving the body's real position. Absent → the body
  // renders as a flat XZ ring (defensive fallback; all 8 planets define it).
  ephemeris?: J2000Elements;
}

export type CelestialBody = StarBody | PlanetBody;

// Configuration for a procedural particle field (e.g. the asteroid belt).
export interface ParticleFieldConfig {
  id: string;
  count: number;
  minAU: number;
  maxAU: number;
  color: string;
  sizeRange: [number, number]; // [min, max] per-particle size
  inclination: number; // max out-of-plane spread (radians)
}

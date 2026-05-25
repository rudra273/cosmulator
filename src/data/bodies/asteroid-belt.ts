import type { ParticleFieldConfig } from "./types";

// The main asteroid belt between Mars and Jupiter. Drives the generic
// ParticleField component. Values mirror the original inline AsteroidBelt.
export const asteroidBelt: ParticleFieldConfig = {
  id: "asteroid-belt",
  count: 1200,
  minAU: 2.1,
  maxAU: 3.3,
  color: "#a69480",
  sizeRange: [0.04, 0.12], // base 0.04 + up to 0.08
  inclination: 0.08 // max out-of-plane spread (radians)
};

// Celestial body registry.
//
// To add a new body: create a file in this folder exporting its config, then
// register it in the arrays below. The scene and UI pick it up automatically.

import type { CelestialBody, PlanetBody, ParticleFieldConfig } from "./types";
import { sun } from "./sun";
import { mercury } from "./mercury";
import { venus } from "./venus";
import { earth } from "./earth";
import { mars } from "./mars";
import { jupiter } from "./jupiter";
import { saturn } from "./saturn";
import { uranus } from "./uranus";
import { neptune } from "./neptune";
import { asteroidBelt } from "./asteroid-belt";

// The central star.
export const STAR = sun;

// Planets, in orbital order. Order here drives the UI planet rail.
export const PLANETS: PlanetBody[] = [
  mercury,
  venus,
  earth,
  mars,
  jupiter,
  saturn,
  uranus,
  neptune
];

// Everything the scene renders as a CelestialBody (star + planets).
export const BODIES: CelestialBody[] = [STAR, ...PLANETS];

// Procedural particle fields (asteroid belts, debris rings, etc.).
export const PARTICLE_FIELDS: ParticleFieldConfig[] = [asteroidBelt];

// Lookup by id across every body (used by the info panel / selection).
export function getBodyById(id: string | null): CelestialBody | undefined {
  if (!id) return undefined;
  return BODIES.find((b) => b.id === id);
}

export * from "./types";

// Celestial body registry.
//
// To add a new body: create a file in this folder exporting its config, then
// register it in the arrays below. The scene and UI pick it up automatically.

import type { CelestialBody, PlanetBody, MoonBody, ParticleFieldConfig } from "./types";
import { sun } from "./sun";
import { mercury } from "./mercury";
import { venus } from "./venus";
import { earth } from "./earth";
import { mars } from "./mars";
import { jupiter } from "./jupiter";
import { saturn } from "./saturn";
import { uranus } from "./uranus";
import { neptune } from "./neptune";
import { moon } from "./moon";
import { SMALL_WORLDS, kuiperBelt } from "./small-worlds";
import { satellites, charon } from "./satellites";
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

// Natural satellites — orbit a planet rather than the Sun.
// Rendered as nested children of their parent planet in the Solar layer.
export const MOONS: MoonBody[] = [moon, ...satellites, charon];

// Everything the scene renders as a CelestialBody (star + planets + moons).
export const BODIES: CelestialBody[] = [STAR, ...PLANETS, ...SMALL_WORLDS, ...MOONS];

// Procedural particle fields (asteroid belts, debris rings, etc.).
export const PARTICLE_FIELDS: ParticleFieldConfig[] = [asteroidBelt, kuiperBelt];

// Lookup by id across every body (used by the info panel / selection).
export function getBodyById(id: string | null): CelestialBody | undefined {
  if (!id) return undefined;
  return BODIES.find((b) => b.id === id);
}

/** All moons of a given planet, in registry order. */
export function getMoonsOfPlanet(planetId: string): MoonBody[] {
  return MOONS.filter((m) => m.parentId === planetId);
}

export { SMALL_WORLDS };
export const ORBITING_BODIES = [...PLANETS, ...SMALL_WORLDS];
export * from "./types";

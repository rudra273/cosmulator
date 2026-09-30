import type { PlanetBody, MoonBody } from "@/data/bodies/types";
import { PLANETS, getMoonsOfPlanet } from "../data/bodies";
import { computeMeanAnomalyAndAngles, computeOrbitalPosition, getScaledDistance, getScaledRadius, solveKeplerEquation, applyOrbitalRotation } from "./orbital-mechanics";
import { simulationDays } from "./simulation-time";

export function planetPlane(body: PlanetBody, epochMs: number, realistic: boolean) {
  return body.ephemeris
    ? computeMeanAnomalyAndAngles(body.ephemeris, simulationDays(epochMs, 0), realistic)
    : undefined;
}

// Compressed-distance view only: while a planet is focused, heliocentric
// distances (and the room given to moon systems) ease out by up to
// FOCUS_SPREAD so neighbours and the Sun recede and moons can open up.
// Animated per frame by SolarLayer; every consumer reads the live value.
export const FOCUS_SPREAD = 3;
export const focusSpread = { value: 1 };

export function planetPosition(body: PlanetBody, epochMs: number, elapsed: number, realistic: boolean) {
  const days = simulationDays(epochMs, elapsed);
  const plane = planetPlane(body, epochMs, realistic);
  const anomaly = body.ephemeris
    ? computeMeanAnomalyAndAngles(body.ephemeris, days, realistic).meanAnomalyAtEpochRad
    : undefined;
  const p = computeOrbitalPosition(body.distance, body.eccentricity, body.orbitalPeriod,
    anomaly === undefined ? days : 0, realistic, plane, anomaly);
  const k = realistic ? 1 : focusSpread.value;
  return [p[0] * k, p[1] * k, p[2] * k] as [number, number, number];
}

export const KM_TO_SCENE = 150 / 149597870.7;

// Real distance mode is independent of rendered body sizes. Compressed moon
// systems leave room around exaggerated parent spheres and preserve ordering.
// A system is squeezed (outside the parent and its rings) until its outermost
// orbit spans at most MOON_SYSTEM_GAP_FRACTION of the gap to the nearest
// planet's orbit, so the Moon never looks farther away than Venus or Mars.
const MOON_SYSTEM_GAP_FRACTION = 0.45;

export function moonOrbitRadius(body: MoonBody, parent: PlanetBody, realistic: boolean) {
  if (realistic) return parent.radius * body.distance * KM_TO_SCENE;
  const parentRadius = getScaledRadius(parent.radius, false);
  const spread = (m: MoonBody) => parentRadius * (2.5 + m.distance * 0.15);
  const orbit = getScaledDistance(parent.distance, false);
  const gap = Math.min(...PLANETS.filter(p => p.id !== parent.id)
    .map(p => Math.abs(getScaledDistance(p.distance, false) - orbit)));
  const limit = MOON_SYSTEM_GAP_FRACTION * gap * focusSpread.value;
  const outermost = Math.max(...getMoonsOfPlanet(parent.id).map(spread));
  if (outermost <= limit) return spread(body);
  const clearance = parentRadius * (parent.rings?.outerRadius ?? 1);
  return clearance + (spread(body) - clearance) * (limit - clearance) / (outermost - clearance);
}

export function moonElements(body: MoonBody, days: number) {
  const rad = Math.PI / 180;
  // Schlyter low-precision lunar elements; epoch 2000 Jan 0.0, 1.5 days
  // before J2000. Includes regression of the nodes and apsidal precession.
  // https://stjarnhimlen.se/comp/ppcomp.html — not an eclipse ephemeris.
  const d = days + 1.5;
  return {
    inclinationRad: body.inclinationDeg * rad,
    longitudeAscendingNodeRad: (body.id === 'moon' ? 125.1228 - 0.0529538083 * d : body.ascendingNodeDeg ?? 0) * rad,
    argumentOfPeriapsisRad: (body.id === 'moon' ? 318.0634 + 0.1643573223 * d : body.periapsisDeg ?? 0) * rad,
    meanAnomaly: ((body.id === 'moon' ? 115.3654 + 13.0649929509 * d : (body.meanAnomalyDeg ?? 0) + 360 * days / body.orbitalPeriod) % 360) * rad
  };
}

export function orientMoon(body: MoonBody, flat: [number, number, number], days: number, parentTilt = 0): [number, number, number] {
  const p = applyOrbitalRotation(flat, moonElements(body, days));
  if (body.referencePlane !== 'equator') return p;
  const a = parentTilt * Math.PI / 180;
  return [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a), p[2]];
}

export function moonPosition(body: MoonBody, radius: number, days: number, parentTilt = 0): [number, number, number] {
  const E = solveKeplerEquation(moonElements(body, days).meanAnomaly, body.eccentricity);
  return orientMoon(body, [radius * (Math.cos(E) - body.eccentricity), 0,
    -radius * Math.sqrt(1 - body.eccentricity ** 2) * Math.sin(E)], days, parentTilt);
}

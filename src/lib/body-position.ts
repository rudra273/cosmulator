import type { PlanetBody, MoonBody } from "@/data/bodies/types";
import { computeMeanAnomalyAndAngles, computeOrbitalPosition, getScaledRadius, solveKeplerEquation, applyOrbitalRotation } from "./orbital-mechanics";
import { simulationDays } from "./simulation-time";

export function planetPlane(body: PlanetBody, epochMs: number, realistic: boolean) {
  return body.ephemeris
    ? computeMeanAnomalyAndAngles(body.ephemeris, simulationDays(epochMs, 0), realistic)
    : undefined;
}

export function planetPosition(body: PlanetBody, epochMs: number, elapsed: number, realistic: boolean) {
  const days = simulationDays(epochMs, elapsed);
  const plane = planetPlane(body, epochMs, realistic);
  const anomaly = body.ephemeris
    ? computeMeanAnomalyAndAngles(body.ephemeris, days, realistic).meanAnomalyAtEpochRad
    : undefined;
  return computeOrbitalPosition(body.distance, body.eccentricity, body.orbitalPeriod,
    anomaly === undefined ? days : 0, realistic, plane, anomaly);
}

export const KM_TO_SCENE = 150 / 149597870.7;

// Real distance mode is independent of rendered body sizes. Compressed moon
// systems leave room around exaggerated parent spheres and preserve ordering.
export function moonOrbitRadius(body: MoonBody, parent: PlanetBody, realistic: boolean) {
  return realistic ? parent.radius * body.distance * KM_TO_SCENE
    : getScaledRadius(parent.radius, false) * (2.5 + body.distance * 0.15);
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

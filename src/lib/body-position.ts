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

export function moonOrbitRadius(body: MoonBody, parent: PlanetBody, realistic: boolean) {
  return getScaledRadius(parent.radius, realistic) * body.distance * (realistic ? 0.5 : 0.05);
}

export function moonPosition(body: MoonBody, radius: number, days: number): [number, number, number] {
  const E = solveKeplerEquation(2 * Math.PI * days / body.orbitalPeriod, body.eccentricity);
  // Eccentric anomaly coordinates avoid a redundant true-anomaly conversion.
  return applyOrbitalRotation([
    radius * (Math.cos(E) - body.eccentricity), 0,
    radius * Math.sqrt(1 - body.eccentricity ** 2) * Math.sin(E)
  ], { inclinationRad: body.inclinationDeg * Math.PI / 180,
    longitudeAscendingNodeRad: 0, argumentOfPeriapsisRad: 0 });
}

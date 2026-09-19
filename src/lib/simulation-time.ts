// Rates are simulated days per real second. All motion derives from one date.
export const DAY_MS = 86_400_000;
export const J2000_MS = Date.UTC(2000, 0, 1, 12);
export const MIN_SIMULATION_MS = Date.UTC(1800, 0, 1);
export const MAX_SIMULATION_MS = Date.UTC(2051, 0, 1) - 1;
export const simulationDays = (epochMs: number, elapsedDays: number) =>
  (epochMs - J2000_MS) / DAY_MS + elapsedDays;
export function rotationAtDays(days: number, periodHours: number): number {
  if (!periodHours) return 0;
  return ((days * 24 / periodHours) % 1) * Math.PI * 2;
}
export function advanceClock(epochMs: number, elapsedDays: number, deltaSeconds: number, rate: number) {
  const next = epochMs + (elapsedDays + deltaSeconds * rate) * DAY_MS;
  const bounded = Math.max(MIN_SIMULATION_MS, Math.min(MAX_SIMULATION_MS, next));
  return { elapsedTime: (bounded - epochMs) / DAY_MS, atLimit: bounded !== next };
}

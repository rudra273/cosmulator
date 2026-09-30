// Orbits of planets around catalog stars, for the mini system diagram in the
// star card. Semi-major axes and periods are rounded from the NASA Exoplanet
// Archive. Luminosity is bolometric (all wavelengths) — red dwarfs emit mostly
// in the infrared, so visible-light brightness badly underestimates it.

export interface ExoplanetOrbit {
  name: string;
  aAU: number;
  periodDays: number;
}

export interface PlanetSystem {
  luminositySolar: number;
  planets: ExoplanetOrbit[];
}

export const PLANET_SYSTEMS: Record<string, PlanetSystem> = {
  "proxima-centauri": { luminositySolar: 0.0017, planets: [
    { name: "d", aAU: 0.0288, periodDays: 5.12 },
    { name: "b", aAU: 0.0485, periodDays: 11.19 }
  ] },
  "trappist-1": { luminositySolar: 0.00055, planets: [
    { name: "b", aAU: 0.01154, periodDays: 1.51 },
    { name: "c", aAU: 0.0158, periodDays: 2.42 },
    { name: "d", aAU: 0.02227, periodDays: 4.05 },
    { name: "e", aAU: 0.02925, periodDays: 6.1 },
    { name: "f", aAU: 0.03849, periodDays: 9.21 },
    { name: "g", aAU: 0.04683, periodDays: 12.35 },
    { name: "h", aAU: 0.06189, periodDays: 18.77 }
  ] },
  "51-pegasi": { luminositySolar: 1.36, planets: [{ name: "b", aAU: 0.052, periodDays: 4.23 }] },
  "epsilon-eridani": { luminositySolar: 0.34, planets: [{ name: "b", aAU: 3.5, periodDays: 2690 }] },
  "teegardens-star": { luminositySolar: 0.00073, planets: [
    { name: "b", aAU: 0.0259, periodDays: 4.91 },
    { name: "c", aAU: 0.0455, periodDays: 11.41 }
  ] },
  "ross-128": { luminositySolar: 0.0036, planets: [{ name: "b", aAU: 0.0496, periodDays: 9.87 }] },
  "gliese-1061": { luminositySolar: 0.0017, planets: [
    { name: "b", aAU: 0.021, periodDays: 3.2 },
    { name: "c", aAU: 0.035, periodDays: 6.7 },
    { name: "d", aAU: 0.054, periodDays: 13.0 }
  ] },
  "wolf-1061": { luminositySolar: 0.0098, planets: [
    { name: "b", aAU: 0.0375, periodDays: 4.89 },
    { name: "c", aAU: 0.089, periodDays: 17.87 },
    { name: "d", aAU: 0.47, periodDays: 217 }
  ] },
  "luytens-star": { luminositySolar: 0.0088, planets: [{ name: "b", aAU: 0.091, periodDays: 18.65 }] },
  pollux: { luminositySolar: 36, planets: [{ name: "b", aAU: 1.64, periodDays: 590 }] }
};

/**
 * Rough conservative habitable zone (AU) from bolometric luminosity, using
 * effective stellar fluxes ~1.1 (inner, runaway greenhouse) and ~0.53 (outer,
 * maximum greenhouse) times Earth's.
 */
export function habitableZone(luminositySolar: number): [number, number] {
  return [Math.sqrt(luminositySolar / 1.1), Math.sqrt(luminositySolar / 0.53)];
}

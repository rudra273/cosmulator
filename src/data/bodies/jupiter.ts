import type { PlanetBody } from "./types";

export const jupiter: PlanetBody = {
  type: "planet",
  id: "jupiter",
  name: "Jupiter",
  radius: 69911.0,
  distance: 5.203,
  orbitalPeriod: 4332.59,
  rotationPeriod: 9.93,
  axialTilt: 3.13,
  eccentricity: 0.0484,
  ephemeris: {
    semiMajorAxisAU: 5.20288700,
    eccentricity: 0.04838624,
    inclinationDeg: 1.30439695,
    longitudeAscendingNodeDeg: 100.47390909,
    longitudePerihelionDeg: 14.72847983,
    meanLongitudeDeg: 34.39644051,
    ratesPerCentury: {
      semiMajorAxisAU: -0.00011607,
      eccentricity: -0.00013253,
      inclinationDeg: -0.00183714,
      longitudeAscendingNodeDeg: 0.20469106,
      longitudePerihelionDeg: 0.21252668,
      meanLongitudeDeg: 3034.74612775
    }
  },
  baseColor: "#b07f35",
  surfaceColors: ["#5c3d14", "#b07f35", "#dfc5a0", "#8a5820"],
  atmosphereColor: "#e6cca6",
  shaderType: "banded",
  // Jupiter has rings, but they are extremely faint — skipped for visual clarity.
  funFacts: [
    "Jupiter is more than twice as massive than all the other planets in our solar system combined.",
    "Its Great Red Spot is a gigantic, swirling storm wider than Earth that has raged for hundreds of years.",
    "Jupiter has the shortest day in the solar system, rotating once every 9 hours and 56 minutes."
  ],
  description:
    "Jupiter is the giant of our solar system: a massive gas giant composed mostly of hydrogen and helium. It is surrounded by dozens of moons, an intense magnetic field, and is famous for its colorful, turbulent bands of clouds.",
  mass: "1,898",
  temperature: "-108 °C"
};

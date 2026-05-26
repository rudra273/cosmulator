import type { PlanetBody } from "./types";

export const uranus: PlanetBody = {
  type: "planet",
  id: "uranus",
  name: "Uranus",
  radius: 25362.0,
  distance: 19.191,
  orbitalPeriod: 30687.15,
  rotationPeriod: -17.24, // Retrograde
  axialTilt: 97.77,
  eccentricity: 0.0472,
  ephemeris: {
    semiMajorAxisAU: 19.18916464,
    eccentricity: 0.04725744,
    inclinationDeg: 0.77263783,
    longitudeAscendingNodeDeg: 74.01692503,
    longitudePerihelionDeg: 170.95427630,
    meanLongitudeDeg: 313.23810451,
    ratesPerCentury: {
      semiMajorAxisAU: -0.00196176,
      eccentricity: -0.00004397,
      inclinationDeg: -0.00242939,
      longitudeAscendingNodeDeg: 0.04240589,
      longitudePerihelionDeg: 0.40805281,
      meanLongitudeDeg: 428.48202785
    }
  },
  baseColor: "#b3f0ff",
  surfaceColors: ["#408080", "#80c0c0", "#b3f0ff"],
  atmosphereColor: "#d9f2f2",
  shaderType: "banded",
  rings: {
    innerRadius: 1.15,
    outerRadius: 1.5,
    colors: [
      "rgba(64, 128, 128, 0.15)",
      "rgba(128, 192, 192, 0.25)",
      "rgba(179, 240, 240, 0.15)"
    ]
  },
  funFacts: [
    "Uranus rotates on its side like a rolling ball, likely due to a collision with an Earth-sized body long ago.",
    "Uranus was the first planet to be discovered using a telescope (by William Herschel in 1781).",
    "Because of its extreme tilt, a single season at its poles lasts for 21 Earth years!"
  ],
  description:
    "Uranus is an 'ice giant' with a thick, freezing mantle of water, ammonia, and methane ice surrounding a rocky core. Its pale cyan-blue color comes from methane gas in its hydrogen-helium atmosphere.",
  mass: "86.8",
  temperature: "-197 °C"
};

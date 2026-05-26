import type { PlanetBody } from "./types";

export const mars: PlanetBody = {
  type: "planet",
  id: "mars",
  name: "Mars",
  radius: 3389.5,
  distance: 1.524,
  orbitalPeriod: 686.98,
  rotationPeriod: 24.62,
  axialTilt: 25.19,
  eccentricity: 0.0934,
  ephemeris: {
    semiMajorAxisAU: 1.52371034,
    eccentricity: 0.09339410,
    inclinationDeg: 1.84969142,
    longitudeAscendingNodeDeg: 49.55953891,
    longitudePerihelionDeg: -23.94362959,
    meanLongitudeDeg: -4.55343205,
    ratesPerCentury: {
      semiMajorAxisAU: 0.00001847,
      eccentricity: 0.00007882,
      inclinationDeg: -0.00813131,
      longitudeAscendingNodeDeg: -0.29257343,
      longitudePerihelionDeg: 0.44441088,
      meanLongitudeDeg: 19140.30268499
    }
  },
  baseColor: "#c1440e",
  surfaceColors: ["#4a1204", "#c1440e", "#e77d51"],
  atmosphereColor: "#ffccb3",
  shaderType: "rocky",
  funFacts: [
    "Mars is known as the Red Planet because iron minerals in its soil rust, causing the atmosphere and surface to look red.",
    "Mars is home to Olympus Mons, the largest volcano in the solar system, which is three times taller than Mount Everest.",
    "Mars has two tiny, potato-shaped moons called Phobos and Deimos."
  ],
  description:
    "Mars is a cold, dusty desert world with a very thin carbon dioxide atmosphere. It has polar ice caps, extinct volcanoes, and canyons, with geological evidence suggesting it was once much warmer and wetter with liquid water.",
  mass: "0.642",
  temperature: "-62 °C"
};

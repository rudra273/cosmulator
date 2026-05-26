import type { PlanetBody } from "./types";

export const earth: PlanetBody = {
  type: "planet",
  id: "earth",
  name: "Earth",
  radius: 6371.0,
  distance: 1.0,
  orbitalPeriod: 365.25,
  rotationPeriod: 23.93,
  axialTilt: 23.44,
  eccentricity: 0.0167,
  ephemeris: {
    semiMajorAxisAU: 1.00000261,
    eccentricity: 0.01671123,
    inclinationDeg: -0.00001531,
    longitudeAscendingNodeDeg: 0.0,
    longitudePerihelionDeg: 102.93768193,
    meanLongitudeDeg: 100.46457166,
    ratesPerCentury: {
      semiMajorAxisAU: 0.00000562,
      eccentricity: -0.00004392,
      inclinationDeg: -0.01294668,
      longitudeAscendingNodeDeg: 0.0,
      longitudePerihelionDeg: 0.32327364,
      meanLongitudeDeg: 35999.37244981
    }
  },
  baseColor: "#2b82c9",
  surfaceColors: ["#0d233a", "#2b82c9", "#3d8b3d"],
  atmosphereColor: "#99ccff",
  shaderType: "water",
  // Earth used distinct noise params in the original id-based switch.
  noiseScale: 0.35,
  noiseFreq: 2.5,
  funFacts: [
    "Earth is the only known planet in the universe that supports life.",
    "About 71% of Earth's surface is covered by liquid water.",
    "Earth's atmosphere protects us from meteoroids, most of which burn up before hitting the surface."
  ],
  description:
    "Earth, our home planet, is the third planet from the Sun and the only place we know of so far that’s inhabited by living things. It is a water world, with oceans covering most of its surface, and an atmosphere rich in nitrogen and oxygen.",
  mass: "5.97",
  temperature: "15 °C"
};

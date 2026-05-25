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

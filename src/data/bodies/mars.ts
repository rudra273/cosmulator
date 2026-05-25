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

import type { PlanetBody } from "./types";

export const venus: PlanetBody = {
  type: "planet",
  id: "venus",
  name: "Venus",
  radius: 6051.8,
  distance: 0.723,
  orbitalPeriod: 224.7,
  rotationPeriod: -5832.5, // Retrograde
  axialTilt: 177.3,
  eccentricity: 0.0068,
  baseColor: "#e6b800",
  surfaceColors: ["#804d00", "#cc7a00", "#ffc266"],
  atmosphereColor: "#ffdb99",
  shaderType: "banded",
  funFacts: [
    "Venus spins backward on its axis compared to most other planets, meaning the Sun rises in the west.",
    "It is the hottest planet in our solar system, with surface temperatures hot enough to melt lead.",
    "A day on Venus (one rotation) is longer than a year (one orbit around the Sun)."
  ],
  description:
    "Venus is Earth's 'twin' in size but has a runaway greenhouse effect. Its thick, toxic atmosphere of carbon dioxide and clouds of sulfuric acid trap heat, creating a crushing pressure and roasting temperatures at the surface.",
  mass: "4.87",
  temperature: "465 °C"
};

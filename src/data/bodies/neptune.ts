import type { PlanetBody } from "./types";

export const neptune: PlanetBody = {
  type: "planet",
  id: "neptune",
  name: "Neptune",
  radius: 24622.0,
  distance: 30.069,
  orbitalPeriod: 60190.03,
  rotationPeriod: 16.11,
  axialTilt: 28.32,
  eccentricity: 0.0086,
  baseColor: "#274687",
  surfaceColors: ["#0f1d3a", "#274687", "#4b73b5"],
  atmosphereColor: "#7096d1",
  shaderType: "banded",
  rings: {
    innerRadius: 1.12,
    outerRadius: 1.35,
    colors: [
      "rgba(39, 70, 135, 0.1)",
      "rgba(112, 150, 209, 0.2)",
      "rgba(75, 115, 181, 0.1)"
    ]
  },
  funFacts: [
    "Neptune is the most distant planet in our solar system and the windiest, with winds reaching supersonic speeds.",
    "It is the only planet in our solar system whose existence was predicted using math before it was actually seen.",
    "Neptune is about 30 times farther from the Sun than Earth is, taking 165 Earth years to complete one orbit."
  ],
  description:
    "Neptune is a dark, cold ice giant swept by supersonic winds. Its beautiful deep blue color is caused by methane gas in its atmosphere. Like Uranus, it is composed mainly of water, ammonia, and methane ice.",
  mass: "102",
  temperature: "-201 °C"
};

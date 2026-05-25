import type { PlanetBody } from "./types";

export const saturn: PlanetBody = {
  type: "planet",
  id: "saturn",
  name: "Saturn",
  radius: 58232.0,
  distance: 9.537,
  orbitalPeriod: 10759.22,
  rotationPeriod: 10.66,
  axialTilt: 26.73,
  eccentricity: 0.0542,
  baseColor: "#e2bf7d",
  surfaceColors: ["#7a5c2d", "#e2bf7d", "#f5e4c3"],
  atmosphereColor: "#f2dfbd",
  shaderType: "banded",
  rings: {
    innerRadius: 1.3,
    outerRadius: 2.3,
    colors: [
      "rgba(168, 140, 94, 0.8)",
      "rgba(107, 88, 59, 0.4)",
      "rgba(224, 203, 168, 0.9)",
      "rgba(138, 117, 84, 0.6)"
    ]
  },
  funFacts: [
    "Saturn's beautiful ring system is not solid; it is made of billions of individual chunks of ice, rock, and dust.",
    "Saturn is the least dense planet in the solar system; if you could find a bathtub big enough, Saturn would float!",
    "Saturn's winds are extremely fast, reaching up to 1,800 kilometers per hour."
  ],
  description:
    "Saturn is the second-largest planet in our solar system and is adorned with a dazzling, complex system of icy rings. Like Jupiter, it is a gas giant made mostly of hydrogen and helium, featuring a highly active atmosphere.",
  mass: "568",
  temperature: "-139 °C"
};

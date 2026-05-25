import type { PlanetBody } from "./types";

export const mercury: PlanetBody = {
  type: "planet",
  id: "mercury",
  name: "Mercury",
  radius: 2439.7,
  distance: 0.387,
  orbitalPeriod: 87.97,
  rotationPeriod: 1407.6,
  axialTilt: 0.034,
  eccentricity: 0.2056,
  baseColor: "#8c8c8c",
  surfaceColors: ["#4d4d4d", "#8c8c8c", "#b3b3b3"],
  shaderType: "rocky",
  funFacts: [
    "Mercury is the closest planet to the Sun and the smallest planet in our solar system.",
    "Despite being closest to the Sun, it is not the hottest planet (Venus is).",
    "Mercury has no atmosphere, meaning its sky is always black and it has no weather."
  ],
  description:
    "Mercury is a rocky planet with a heavily cratered surface, resembling Earth's Moon. It experiences extreme temperature swings, from freezing cold nights (-180°C) to scorching hot days (430°C) due to its lack of atmosphere.",
  mass: "0.330",
  temperature: "-180°C to 430°C"
};

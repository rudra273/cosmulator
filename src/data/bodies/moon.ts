import type { MoonBody } from "./types";

/**
 * Earth's Moon — first satellite body in the registry.
 *
 * Orbital values are real (sidereal month, mean distance in Earth-radii,
 * eccentricity, inclination relative to ecliptic). Rendered at the project's
 * stylized scale.
 */
export const moon: MoonBody = {
  type: "moon",
  id: "moon",
  name: "Moon",
  parentId: "earth",
  radius: 1737.4, // km
  // 384,400 km / 6,371 km ≈ 60.3 Earth-radii — friendlier than 0.00257 AU.
  distance: 60.3,
  orbitalPeriod: 27.32, // sidereal month, days
  rotationPeriod: 655.7, // hours; tidally locked, so equal to orbital period
  axialTilt: 6.68, // degrees
  eccentricity: 0.0549,
  inclinationDeg: 5.14, // tilt relative to ecliptic (close enough for stylized)
  baseColor: "#c8c4be",
  surfaceColors: ["#5a564f", "#9d9890", "#e0dad1"],
  shaderType: "rocky",
  funFacts: [
    "The Moon is Earth's only natural satellite and the fifth-largest moon in the solar system.",
    "It is tidally locked to Earth — the same side always faces us.",
    "Its gravity is responsible for Earth's tides, and it gradually drifts away by ~3.8 cm per year."
  ],
  description:
    "The Moon is a rocky, cratered world about a quarter of Earth's diameter. Formed roughly 4.5 billion years ago, likely from debris of a giant impact between proto-Earth and a Mars-sized body. It has no atmosphere, dramatic temperature swings, and a surface dusted with regolith from countless impacts.",
  mass: "0.073",
  temperature: "-173°C to 127°C"
};

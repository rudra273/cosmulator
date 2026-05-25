import type { StarBody } from "./types";

export const sun: StarBody = {
  type: "star",
  id: "sun",
  name: "Sun",
  radius: 696340, // in km
  rotationPeriod: 609.12, // in hours
  axialTilt: 7.25, // in degrees
  baseColor: "#ffaa00",
  surfaceColors: ["#ff3300", "#ffaa00", "#ffffcc"],
  shaderType: "star",
  geometrySegments: 64,
  funFacts: [
    "The Sun accounts for 99.86% of the total mass of the entire Solar System.",
    "Over one million Earths could fit inside the Sun.",
    "The Sun's core reaches temperatures of over 15 million degrees Celsius."
  ],
  description:
    "The Sun is a yellow dwarf star, a hot ball of glowing gases at the heart of our solar system. Its gravity holds the solar system together, keeping everything from the biggest planets to tiny debris in its orbit.",
  mass: "1,989,100",
  temperature: "5,500 °C (Surface)"
};

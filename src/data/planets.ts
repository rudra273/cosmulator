export interface PlanetData {
  id: string;
  name: string;
  radius: number; // in km
  distance: number; // in AU
  orbitalPeriod: number; // in Earth days
  rotationPeriod: number; // in hours (negative means retrograde)
  axialTilt: number; // in degrees
  eccentricity: number; // orbital eccentricity
  baseColor: string; // Hex code for primary color representation
  surfaceColors: string[]; // Gradient colors for procedural shader
  atmosphereColor?: string; // Color of atmosphere glow (if any)
  hasRings: boolean;
  ringsConfig?: {
    innerRadius: number; // relative to planet radius (e.g. 1.4)
    outerRadius: number; // relative to planet radius (e.g. 2.3)
    colors: string[]; // Band colors for rings
  };
  funFacts: string[];
  description: string;
  mass: string; // in 10^24 kg
  temperature: string; // average surface temp
}

export const SUN_DATA = {
  id: "sun",
  name: "Sun",
  radius: 696340, // in km
  rotationPeriod: 609.12, // in hours
  axialTilt: 7.25, // in degrees
  baseColor: "#ffaa00",
  surfaceColors: ["#ff3300", "#ffaa00", "#ffffcc"],
  funFacts: [
    "The Sun accounts for 99.86% of the total mass of the entire Solar System.",
    "Over one million Earths could fit inside the Sun.",
    "The Sun's core reaches temperatures of over 15 million degrees Celsius."
  ],
  description: "The Sun is a yellow dwarf star, a hot ball of glowing gases at the heart of our solar system. Its gravity holds the solar system together, keeping everything from the biggest planets to tiny debris in its orbit.",
  mass: "1,989,100",
  temperature: "5,500 °C (Surface)"
};

export const PLANETS: PlanetData[] = [
  {
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
    hasRings: false,
    funFacts: [
      "Mercury is the closest planet to the Sun and the smallest planet in our solar system.",
      "Despite being closest to the Sun, it is not the hottest planet (Venus is).",
      "Mercury has no atmosphere, meaning its sky is always black and it has no weather."
    ],
    description: "Mercury is a rocky planet with a heavily cratered surface, resembling Earth's Moon. It experiences extreme temperature swings, from freezing cold nights (-180°C) to scorching hot days (430°C) due to its lack of atmosphere.",
    mass: "0.330",
    temperature: "-180°C to 430°C"
  },
  {
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
    hasRings: false,
    funFacts: [
      "Venus spins backward on its axis compared to most other planets, meaning the Sun rises in the west.",
      "It is the hottest planet in our solar system, with surface temperatures hot enough to melt lead.",
      "A day on Venus (one rotation) is longer than a year (one orbit around the Sun)."
    ],
    description: "Venus is Earth's 'twin' in size but has a runaway greenhouse effect. Its thick, toxic atmosphere of carbon dioxide and clouds of sulfuric acid trap heat, creating a crushing pressure and roasting temperatures at the surface.",
    mass: "4.87",
    temperature: "465 °C"
  },
  {
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
    hasRings: false,
    funFacts: [
      "Earth is the only known planet in the universe that supports life.",
      "About 71% of Earth's surface is covered by liquid water.",
      "Earth's atmosphere protects us from meteoroids, most of which burn up before hitting the surface."
    ],
    description: "Earth, our home planet, is the third planet from the Sun and the only place we know of so far that’s inhabited by living things. It is a water world, with oceans covering most of its surface, and an atmosphere rich in nitrogen and oxygen.",
    mass: "5.97",
    temperature: "15 °C"
  },
  {
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
    hasRings: false,
    funFacts: [
      "Mars is known as the Red Planet because iron minerals in its soil rust, causing the atmosphere and surface to look red.",
      "Mars is home to Olympus Mons, the largest volcano in the solar system, which is three times taller than Mount Everest.",
      "Mars has two tiny, potato-shaped moons called Phobos and Deimos."
    ],
    description: "Mars is a cold, dusty desert world with a very thin carbon dioxide atmosphere. It has polar ice caps, extinct volcanoes, and canyons, with geological evidence suggesting it was once much warmer and wetter with liquid water.",
    mass: "0.642",
    temperature: "-62 °C"
  },
  {
    id: "jupiter",
    name: "Jupiter",
    radius: 69911.0,
    distance: 5.203,
    orbitalPeriod: 4332.59,
    rotationPeriod: 9.93,
    axialTilt: 3.13,
    eccentricity: 0.0484,
    baseColor: "#b07f35",
    surfaceColors: ["#5c3d14", "#b07f35", "#dfc5a0", "#8a5820"],
    atmosphereColor: "#e6cca6",
    hasRings: false, // Jupiter has rings but they are extremely faint, we will skip them for visual simplicity
    funFacts: [
      "Jupiter is more than twice as massive than all the other planets in our solar system combined.",
      "Its Great Red Spot is a gigantic, swirling storm wider than Earth that has raged for hundreds of years.",
      "Jupiter has the shortest day in the solar system, rotating once every 9 hours and 56 minutes."
    ],
    description: "Jupiter is the giant of our solar system: a massive gas giant composed mostly of hydrogen and helium. It is surrounded by dozens of moons, an intense magnetic field, and is famous for its colorful, turbulent bands of clouds.",
    mass: "1,898",
    temperature: "-108 °C"
  },
  {
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
    hasRings: true,
    ringsConfig: {
      innerRadius: 1.3,
      outerRadius: 2.3,
      colors: ["rgba(168, 140, 94, 0.8)", "rgba(107, 88, 59, 0.4)", "rgba(224, 203, 168, 0.9)", "rgba(138, 117, 84, 0.6)"]
    },
    funFacts: [
      "Saturn's beautiful ring system is not solid; it is made of billions of individual chunks of ice, rock, and dust.",
      "Saturn is the least dense planet in the solar system; if you could find a bathtub big enough, Saturn would float!",
      "Saturn's winds are extremely fast, reaching up to 1,800 kilometers per hour."
    ],
    description: "Saturn is the second-largest planet in our solar system and is adorned with a dazzling, complex system of icy rings. Like Jupiter, it is a gas giant made mostly of hydrogen and helium, featuring a highly active atmosphere.",
    mass: "568",
    temperature: "-139 °C"
  },
  {
    id: "uranus",
    name: "Uranus",
    radius: 25362.0,
    distance: 19.191,
    orbitalPeriod: 30687.15,
    rotationPeriod: -17.24, // Retrograde
    axialTilt: 97.77,
    eccentricity: 0.0472,
    baseColor: "#b3f0ff",
    surfaceColors: ["#408080", "#80c0c0", "#b3f0ff"],
    atmosphereColor: "#d9f2f2",
    hasRings: true,
    ringsConfig: {
      innerRadius: 1.15,
      outerRadius: 1.5,
      colors: ["rgba(64, 128, 128, 0.15)", "rgba(128, 192, 192, 0.25)", "rgba(179, 240, 240, 0.15)"]
    },
    funFacts: [
      "Uranus rotates on its side like a rolling ball, likely due to a collision with an Earth-sized body long ago.",
      "Uranus was the first planet to be discovered using a telescope (by William Herschel in 1781).",
      "Because of its extreme tilt, a single season at its poles lasts for 21 Earth years!"
    ],
    description: "Uranus is an 'ice giant' with a thick, freezing mantle of water, ammonia, and methane ice surrounding a rocky core. Its pale cyan-blue color comes from methane gas in its hydrogen-helium atmosphere.",
    mass: "86.8",
    temperature: "-197 °C"
  },
  {
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
    hasRings: true,
    ringsConfig: {
      innerRadius: 1.12,
      outerRadius: 1.35,
      colors: ["rgba(39, 70, 135, 0.1)", "rgba(112, 150, 209, 0.2)", "rgba(75, 115, 181, 0.1)"]
    },
    funFacts: [
      "Neptune is the most distant planet in our solar system and the windiest, with winds reaching supersonic speeds.",
      "It is the only planet in our solar system whose existence was predicted using math before it was actually seen.",
      "Neptune is about 30 times farther from the Sun than Earth is, taking 165 Earth years to complete one orbit."
    ],
    description: "Neptune is a dark, cold ice giant swept by supersonic winds. Its beautiful deep blue color is caused by methane gas in its atmosphere. Like Uranus, it is composed mainly of water, ammonia, and methane ice.",
    mass: "102",
    temperature: "-201 °C"
  }
];

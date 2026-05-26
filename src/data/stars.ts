// Famous nearby stars for the Stellar Neighborhood layer.
//
// Positions are STYLIZED — visually plausible distribution within the layer's
// 0–10k unit coordinate budget, not true light-year coordinates. Distances
// follow the order of real distance from the Sun (Alpha Centauri close, Deneb
// far) but are compressed for legibility, like the rest of the project.
//
// Colors are the real spectral-class colors for each star (O-blue → M-red).

export interface NearbyStar {
  id: string;
  name: string;
  position: [number, number, number]; // stylized scene-space position
  size: number; // visual sprite size (apparent brightness proxy)
  color: string; // spectral-class hex
  spectralClass: string; // short label e.g. "M2 Iab", "A0 V"
  description: string; // one-liner for the optional hover/info tooltip
}

// Spectral-class palette — eyeballed standard star colors.
const SPECTRAL = {
  O: "#9bb5ff", // hot blue
  B: "#aabfff", // blue-white
  A: "#cad7ff", // white
  F: "#f8f7ff", // pale yellow-white
  G: "#fff4ea", // Sun-like yellow-white
  K: "#ffd2a1", // orange
  M: "#ff9d6f", // red
};

// The Sun, rendered as the central anchor of the stellar neighborhood.
export const SUN_STELLAR: NearbyStar = {
  id: "sun",
  name: "Sun",
  position: [0, 0, 0],
  size: 220, // largest sprite, dominates the center
  color: "#ffe28a",
  spectralClass: "G2 V",
  description: "Our star — a yellow dwarf at the center of the solar system."
};

// ~15 famous nearby/recognizable stars. Positions are spread around a sphere
// of roughly 1000–2500 units; brighter / more famous stars are slightly larger.
export const NEARBY_STARS: NearbyStar[] = [
  {
    id: "alpha-centauri",
    name: "Alpha Centauri",
    position: [-650, 80, -420],
    size: 120,
    color: SPECTRAL.G,
    spectralClass: "G2 V + K1 V",
    description: "The closest star system to the Sun — a triple system 4.37 light-years away."
  },
  {
    id: "sirius",
    name: "Sirius",
    position: [800, -120, -300],
    size: 160,
    color: SPECTRAL.A,
    spectralClass: "A1 V",
    description: "The brightest star in Earth's night sky, ~8.6 light-years away."
  },
  {
    id: "vega",
    name: "Vega",
    position: [-250, 400, 850],
    size: 130,
    color: SPECTRAL.A,
    spectralClass: "A0 V",
    description: "A nearby blue-white star, 25 light-years away — once Earth's pole star."
  },
  {
    id: "betelgeuse",
    name: "Betelgeuse",
    position: [1200, 600, 900],
    size: 200, // red supergiant, huge
    color: SPECTRAL.M,
    spectralClass: "M2 Iab",
    description: "A red supergiant in Orion, large enough to engulf Jupiter's orbit."
  },
  {
    id: "rigel",
    name: "Rigel",
    position: [1500, -300, 700],
    size: 170,
    color: SPECTRAL.B,
    spectralClass: "B8 Ia",
    description: "A blue supergiant in Orion, one of the most luminous stars visible."
  },
  {
    id: "procyon",
    name: "Procyon",
    position: [600, 200, 400],
    size: 110,
    color: SPECTRAL.F,
    spectralClass: "F5 IV-V",
    description: "A bright binary system ~11.5 light-years away in Canis Minor."
  },
  {
    id: "arcturus",
    name: "Arcturus",
    position: [-900, 350, -200],
    size: 140,
    color: SPECTRAL.K,
    spectralClass: "K1.5 III",
    description: "An orange giant, the brightest star in the northern celestial hemisphere."
  },
  {
    id: "aldebaran",
    name: "Aldebaran",
    position: [950, -250, 600],
    size: 135,
    color: SPECTRAL.K,
    spectralClass: "K5 III",
    description: "The eye of Taurus the Bull, an orange giant ~65 light-years away."
  },
  {
    id: "antares",
    name: "Antares",
    position: [-1100, -400, 800],
    size: 175,
    color: SPECTRAL.M,
    spectralClass: "M1.5 Iab",
    description: "A red supergiant in Scorpius, often called 'rival of Mars' for its color."
  },
  {
    id: "altair",
    name: "Altair",
    position: [400, 600, 1100],
    size: 115,
    color: SPECTRAL.A,
    spectralClass: "A7 V",
    description: "A nearby white star, ~17 light-years away — one of the closest visible stars."
  },
  {
    id: "capella",
    name: "Capella",
    position: [-700, 700, 500],
    size: 145,
    color: SPECTRAL.G,
    spectralClass: "G3 III + G0 III",
    description: "A bright yellow giant binary, the brightest star in Auriga."
  },
  {
    id: "deneb",
    name: "Deneb",
    position: [-400, 950, 1600], // most distant of the bunch
    size: 200, // huge luminosity even at distance
    color: SPECTRAL.A,
    spectralClass: "A2 Ia",
    description: "A blue-white supergiant ~2,600 light-years away, in the Summer Triangle."
  },
  {
    id: "polaris",
    name: "Polaris",
    position: [0, 1300, 0], // straight up — the North Star
    size: 125,
    color: SPECTRAL.F,
    spectralClass: "F7 Ib",
    description: "The North Star — a Cepheid variable currently aligned with Earth's axis."
  },
  {
    id: "spica",
    name: "Spica",
    position: [-1300, 150, -600],
    size: 145,
    color: SPECTRAL.B,
    spectralClass: "B1 III-IV + B2 V",
    description: "A hot blue binary in Virgo, ~260 light-years away."
  },
  {
    id: "pollux",
    name: "Pollux",
    position: [550, 450, -800],
    size: 130,
    color: SPECTRAL.K,
    spectralClass: "K0 III",
    description: "An orange giant in Gemini — the closest known giant star to the Sun."
  }
];

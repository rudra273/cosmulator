// Real stars for the Stellar Neighborhood layer.
//
// Coordinates are J2000 right ascension / declination; distances, spectral
// types, apparent magnitudes and radii are rounded from SIMBAD / Hipparcos /
// Gaia values as commonly cited. Distances to distant supergiants
// (Betelgeuse, Deneb, Orion's Belt) are uncertain by tens of percent.
//
// Scene positions keep each star's true direction (aligned with the Galaxy
// layer, see src/lib/stellar-coords.ts) with log-compressed distance.

import {
  absoluteMagnitude,
  spectralColor,
  starScenePosition,
  starSpriteSize,
  SUN_ABSOLUTE_MAGNITUDE
} from "../lib/stellar-coords";

export interface CatalogStar {
  id: string;
  name: string;
  raHours: number;
  decDeg: number;
  distanceLy: number;
  spectralClass: string;
  apparentMag: number;
  /** Radius in solar radii, where reasonably well measured. */
  radiusSolar?: number;
  constellation: string;
  description: string;
  /** Known planets (confirmed unless noted). */
  planets?: string[];
  /** Always labelled; the rest show their name on hover or selection. */
  featured?: boolean;
}

export interface NearbyStar extends CatalogStar {
  position: [number, number, number];
  color: string;
  absoluteMag: number;
  size: number;
}

export const STAR_CATALOG: CatalogStar[] = [
  // --- Nearest stars (< 15 ly) ---
  { id: "proxima-centauri", name: "Proxima Centauri", raHours: 14.4953, decDeg: -62.679, distanceLy: 4.24, spectralClass: "M5.5 Ve", apparentMag: 11.13, radiusSolar: 0.154, constellation: "Centaurus", featured: true,
    description: "The closest star to the Sun: a small red dwarf flare star orbiting the Alpha Centauri pair.",
    planets: ["Proxima b — Earth-mass, in the habitable zone", "Proxima d — about a quarter of Earth's mass"] },
  { id: "alpha-centauri", name: "Alpha Centauri", raHours: 14.6600, decDeg: -60.835, distanceLy: 4.37, spectralClass: "G2 V + K1 V", apparentMag: -0.27, radiusSolar: 1.22, constellation: "Centaurus", featured: true,
    description: "A pair of Sun-like stars orbiting each other every 80 years; the third-brightest star in Earth's sky." },
  { id: "barnards-star", name: "Barnard's Star", raHours: 17.9635, decDeg: 4.693, distanceLy: 5.96, spectralClass: "M4 V", apparentMag: 9.51, radiusSolar: 0.19, constellation: "Ophiuchus", featured: true,
    description: "The fastest-moving star across our sky, drifting a Moon-width every 180 years.",
    planets: ["Four small rocky planets reported in 2024–2025, all closer in than Mercury is to the Sun"] },
  { id: "wolf-359", name: "Wolf 359", raHours: 10.9414, decDeg: 7.015, distanceLy: 7.86, spectralClass: "M6 V", apparentMag: 13.51, radiusSolar: 0.14, constellation: "Leo",
    description: "One of the faintest and lowest-mass stars known; invisible without a telescope despite being this close." },
  { id: "lalande-21185", name: "Lalande 21185", raHours: 11.0556, decDeg: 35.970, distanceLy: 8.31, spectralClass: "M2 V", apparentMag: 7.52, radiusSolar: 0.39, constellation: "Ursa Major",
    description: "The brightest red dwarf in the northern sky, just below naked-eye visibility.",
    planets: ["Lalande 21185 b — a few Earth masses, 9.9-day orbit"] },
  { id: "sirius", name: "Sirius", raHours: 6.7525, decDeg: -16.716, distanceLy: 8.60, spectralClass: "A1 V", apparentMag: -1.46, radiusSolar: 1.71, constellation: "Canis Major", featured: true,
    description: "The brightest star in the night sky, with a white-dwarf companion, Sirius B." },
  { id: "epsilon-eridani", name: "Epsilon Eridani", raHours: 3.5488, decDeg: -9.458, distanceLy: 10.47, spectralClass: "K2 V", apparentMag: 3.73, radiusSolar: 0.74, constellation: "Eridanus", featured: true,
    description: "A young orange star with dust belts, like a younger version of our Solar System.",
    planets: ["Epsilon Eridani b — a Jupiter-like giant"] },
  { id: "lacaille-9352", name: "Lacaille 9352", raHours: 23.0978, decDeg: -35.853, distanceLy: 10.72, spectralClass: "M0.5 V", apparentMag: 7.34, radiusSolar: 0.47, constellation: "Piscis Austrinus",
    description: "A red dwarf with one of the fastest proper motions in the sky." },
  { id: "ross-128", name: "Ross 128", raHours: 11.7956, decDeg: 0.804, distanceLy: 11.0, spectralClass: "M4 V", apparentMag: 11.13, radiusSolar: 0.2, constellation: "Virgo",
    description: "A quiet red dwarf that is slowly approaching; it will be the nearest star in about 71,000 years.",
    planets: ["Ross 128 b — Earth-sized, temperate"] },
  { id: "61-cygni", name: "61 Cygni", raHours: 21.1150, decDeg: 38.749, distanceLy: 11.4, spectralClass: "K5 V + K7 V", apparentMag: 5.20, radiusSolar: 0.67, constellation: "Cygnus",
    description: "The first star to have its distance measured (Bessel, 1838), which proved how far the stars really are." },
  { id: "procyon", name: "Procyon", raHours: 7.6550, decDeg: 5.225, distanceLy: 11.46, spectralClass: "F5 IV–V", apparentMag: 0.34, radiusSolar: 2.05, constellation: "Canis Minor", featured: true,
    description: "A bright white star beginning to swell off the main sequence, with a white-dwarf companion." },
  { id: "epsilon-indi", name: "Epsilon Indi", raHours: 22.0561, decDeg: -56.786, distanceLy: 11.87, spectralClass: "K5 V", apparentMag: 4.69, radiusSolar: 0.71, constellation: "Indus",
    description: "An orange dwarf with a pair of brown dwarfs in a wide orbit.",
    planets: ["Epsilon Indi Ab — a cold super-Jupiter imaged directly by JWST (2024)"] },
  { id: "tau-ceti", name: "Tau Ceti", raHours: 1.7345, decDeg: -15.938, distanceLy: 11.9, spectralClass: "G8 V", apparentMag: 3.50, radiusSolar: 0.79, constellation: "Cetus", featured: true,
    description: "The nearest single Sun-like star; a long-time target in the search for life.",
    planets: ["Four super-Earth candidates (unconfirmed)"] },
  { id: "gliese-1061", name: "Gliese 1061", raHours: 3.6000, decDeg: -44.513, distanceLy: 12.0, spectralClass: "M5.5 V", apparentMag: 13.03, radiusSolar: 0.16, constellation: "Horologium",
    description: "A dim red dwarf hosting a compact system of rocky planets.",
    planets: ["Gliese 1061 b, c, d — Earth-mass planets; d lies in the habitable zone"] },
  { id: "luytens-star", name: "Luyten's Star", raHours: 7.4568, decDeg: 5.226, distanceLy: 12.35, spectralClass: "M3.5 V", apparentMag: 9.87, radiusSolar: 0.35, constellation: "Canis Minor",
    description: "A red dwarf just 1.2 ly from Procyon, which would shine brightly in its sky.",
    planets: ["GJ 273 b — a super-Earth in the habitable zone"] },
  { id: "teegardens-star", name: "Teegarden's Star", raHours: 2.8836, decDeg: 16.881, distanceLy: 12.5, spectralClass: "M7 V", apparentMag: 15.1, radiusSolar: 0.11, constellation: "Aries",
    description: "A tiny, very dim red dwarf only discovered in 2003.",
    planets: ["Teegarden's Star b and c — Earth-mass; b is among the most Earth-like known"] },
  { id: "kapteyns-star", name: "Kapteyn's Star", raHours: 5.1946, decDeg: -45.018, distanceLy: 12.83, spectralClass: "M1 VI", apparentMag: 8.85, radiusSolar: 0.29, constellation: "Pictor",
    description: "An ancient halo star passing through the disc on a highly tilted orbit around the galaxy." },
  { id: "wolf-1061", name: "Wolf 1061", raHours: 16.5050, decDeg: -12.663, distanceLy: 14.0, spectralClass: "M3 V", apparentMag: 10.07, radiusSolar: 0.31, constellation: "Ophiuchus",
    description: "A red dwarf with three known planets.",
    planets: ["Wolf 1061 b, c, d — c is a super-Earth near the habitable zone"] },

  // --- Bright and well-known stars ---
  { id: "altair", name: "Altair", raHours: 19.8464, decDeg: 8.868, distanceLy: 16.7, spectralClass: "A7 V", apparentMag: 0.76, radiusSolar: 1.79, constellation: "Aquila", featured: true,
    description: "Spins so fast (once every 9 hours) that it bulges visibly at its equator." },
  { id: "vega", name: "Vega", raHours: 18.6156, decDeg: 38.784, distanceLy: 25.0, spectralClass: "A0 V", apparentMag: 0.03, radiusSolar: 2.5, constellation: "Lyra", featured: true,
    description: "The historical zero point of the magnitude scale; it will be the pole star again in about 12,000 years." },
  { id: "fomalhaut", name: "Fomalhaut", raHours: 22.9608, decDeg: -29.622, distanceLy: 25.1, spectralClass: "A3 V", apparentMag: 1.16, radiusSolar: 1.84, constellation: "Piscis Austrinus",
    description: "Surrounded by a wide, sharp-edged debris ring imaged by Hubble and JWST." },
  { id: "pollux", name: "Pollux", raHours: 7.7553, decDeg: 28.026, distanceLy: 33.8, spectralClass: "K0 III", apparentMag: 1.14, radiusSolar: 9.1, constellation: "Gemini",
    description: "The closest giant star to the Sun.",
    planets: ["Pollux b (Thestias) — a gas giant about twice Jupiter's mass"] },
  { id: "arcturus", name: "Arcturus", raHours: 14.2612, decDeg: 19.183, distanceLy: 36.7, spectralClass: "K1.5 III", apparentMag: -0.05, radiusSolar: 25.4, constellation: "Boötes", featured: true,
    description: "The brightest star in the northern celestial hemisphere: an old orange giant." },
  { id: "trappist-1", name: "TRAPPIST-1", raHours: 23.1080, decDeg: -5.041, distanceLy: 40.7, spectralClass: "M8 V", apparentMag: 18.8, radiusSolar: 0.12, constellation: "Aquarius", featured: true,
    description: "An ultracool dwarf barely larger than Jupiter, with the richest known system of Earth-sized planets.",
    planets: ["Seven Earth-sized planets (b–h), three or four in the habitable zone"] },
  { id: "capella", name: "Capella", raHours: 5.2782, decDeg: 45.998, distanceLy: 42.9, spectralClass: "G3 III + G0 III", apparentMag: 0.08, radiusSolar: 12, constellation: "Auriga",
    description: "Two yellow giants orbiting each other every 104 days, seen as one bright star." },
  { id: "51-pegasi", name: "51 Pegasi", raHours: 22.9577, decDeg: 20.769, distanceLy: 50.6, spectralClass: "G2 IV", apparentMag: 5.46, radiusSolar: 1.15, constellation: "Pegasus", featured: true,
    description: "Where the first exoplanet around a Sun-like star was found (Mayor & Queloz, 1995; Nobel Prize 2019).",
    planets: ["51 Pegasi b (Dimidium) — the first 'hot Jupiter', 4.2-day orbit"] },
  { id: "castor", name: "Castor", raHours: 7.5767, decDeg: 31.888, distanceLy: 51, spectralClass: "A1 V", apparentMag: 1.58, radiusSolar: 2.4, constellation: "Gemini",
    description: "Looks like one star but is six: three pairs of stars bound together." },
  { id: "aldebaran", name: "Aldebaran", raHours: 4.5987, decDeg: 16.509, distanceLy: 65.3, spectralClass: "K5 III", apparentMag: 0.86, radiusSolar: 45, constellation: "Taurus", featured: true,
    description: "The orange eye of Taurus; it only appears to sit in the Hyades cluster, which is twice as far away." },
  { id: "regulus", name: "Regulus", raHours: 10.1395, decDeg: 11.967, distanceLy: 79.3, spectralClass: "B8 IVn", apparentMag: 1.40, radiusSolar: 4.2, constellation: "Leo",
    description: "Rotates so fast it is flattened into an egg shape, close to flying apart." },
  { id: "merak", name: "Merak", raHours: 11.0307, decDeg: 56.383, distanceLy: 79.7, spectralClass: "A1 V", apparentMag: 2.37, radiusSolar: 3.0, constellation: "Ursa Major",
    description: "One of the two Big Dipper 'pointer' stars that lead to Polaris." },
  { id: "megrez", name: "Megrez", raHours: 12.2571, decDeg: 57.033, distanceLy: 80.5, spectralClass: "A3 V", apparentMag: 3.31, radiusSolar: 1.4, constellation: "Ursa Major",
    description: "The faintest of the seven Big Dipper stars, joining the handle to the bowl." },
  { id: "alioth", name: "Alioth", raHours: 12.9005, decDeg: 55.960, distanceLy: 82.6, spectralClass: "A1 III–IVp", apparentMag: 1.77, radiusSolar: 4.1, constellation: "Ursa Major",
    description: "The brightest star of the Big Dipper." },
  { id: "mizar", name: "Mizar", raHours: 13.3988, decDeg: 54.925, distanceLy: 82.9, spectralClass: "A2 V", apparentMag: 2.23, radiusSolar: 2.4, constellation: "Ursa Major",
    description: "With nearby Alcor, a classic naked-eye double; each is itself multiple." },
  { id: "phecda", name: "Phecda", raHours: 11.8972, decDeg: 53.695, distanceLy: 83.2, spectralClass: "A0 Ve", apparentMag: 2.44, radiusSolar: 3.0, constellation: "Ursa Major",
    description: "The lower corner of the Big Dipper's bowl." },
  { id: "gacrux", name: "Gacrux", raHours: 12.5194, decDeg: -57.113, distanceLy: 88.6, spectralClass: "M3.5 III", apparentMag: 1.63, radiusSolar: 84, constellation: "Crux",
    description: "The red giant at the top of the Southern Cross — much nearer than the cross's other stars." },
  { id: "algol", name: "Algol", raHours: 3.1361, decDeg: 40.956, distanceLy: 90, spectralClass: "B8 V", apparentMag: 2.12, radiusSolar: 2.7, constellation: "Perseus",
    description: "The 'Demon Star': an eclipsing binary that dims noticeably every 2.87 days." },
  { id: "alkaid", name: "Alkaid", raHours: 13.7923, decDeg: 49.313, distanceLy: 104, spectralClass: "B3 V", apparentMag: 1.86, radiusSolar: 3.4, constellation: "Ursa Major",
    description: "The tip of the Big Dipper's handle — unlike the other five middle stars, not part of the moving group." },
  { id: "dubhe", name: "Dubhe", raHours: 11.0621, decDeg: 61.751, distanceLy: 123, spectralClass: "K0 III", apparentMag: 1.79, radiusSolar: 17, constellation: "Ursa Major",
    description: "The Big Dipper's other pointer star: an orange giant." },
  { id: "achernar", name: "Achernar", raHours: 1.6286, decDeg: -57.237, distanceLy: 139, spectralClass: "B6 Vep", apparentMag: 0.46, constellation: "Eridanus",
    description: "One of the least round stars known, spinning so fast its equator is ~35% wider than its poles." },
  { id: "spica", name: "Spica", raHours: 13.4199, decDeg: -11.161, distanceLy: 250, spectralClass: "B1 III–IV", apparentMag: 0.97, radiusSolar: 7.5, constellation: "Virgo",
    description: "Two hot blue stars so close together that they distort each other into egg shapes." },
  { id: "bellatrix", name: "Bellatrix", raHours: 5.4189, decDeg: 6.350, distanceLy: 250, spectralClass: "B2 III", apparentMag: 1.64, radiusSolar: 5.8, constellation: "Orion",
    description: "Orion's western shoulder; far nearer than the rest of the constellation." },
  { id: "mimosa", name: "Mimosa", raHours: 12.7953, decDeg: -59.689, distanceLy: 280, spectralClass: "B0.5 III", apparentMag: 1.25, radiusSolar: 8.4, constellation: "Crux",
    description: "A hot blue giant on the Southern Cross's left arm." },
  { id: "canopus", name: "Canopus", raHours: 6.3992, decDeg: -52.696, distanceLy: 310, spectralClass: "A9 II", apparentMag: -0.74, radiusSolar: 71, constellation: "Carina", featured: true,
    description: "The second-brightest star in the night sky; spacecraft use it as a navigation reference." },
  { id: "acrux", name: "Acrux", raHours: 12.4433, decDeg: -63.099, distanceLy: 320, spectralClass: "B0.5 IV", apparentMag: 0.76, radiusSolar: 7.8, constellation: "Crux",
    description: "The foot of the Southern Cross, a multiple system of hot blue stars." },
  { id: "imai", name: "Imai", raHours: 12.2524, decDeg: -58.749, distanceLy: 345, spectralClass: "B2 IV", apparentMag: 2.79, constellation: "Crux",
    description: "The Southern Cross's faintest main star (Delta Crucis)." },
  { id: "hadar", name: "Hadar", raHours: 14.0637, decDeg: -60.373, distanceLy: 390, spectralClass: "B1 III", apparentMag: 0.61, constellation: "Centaurus",
    description: "Beside Alpha Centauri in the sky, but about 90 times farther away." },
  { id: "polaris", name: "Polaris", raHours: 2.5303, decDeg: 89.264, distanceLy: 433, spectralClass: "F7 Ib", apparentMag: 1.98, radiusSolar: 46, constellation: "Ursa Minor", featured: true,
    description: "The North Star, within a degree of the celestial pole; a pulsating Cepheid variable." },
  { id: "betelgeuse", name: "Betelgeuse", raHours: 5.9195, decDeg: 7.407, distanceLy: 550, spectralClass: "M1–2 Ia–Iab", apparentMag: 0.50, radiusSolar: 760, constellation: "Orion", featured: true,
    description: "A red supergiant that would reach past Mars's orbit if it replaced the Sun; it will end as a supernova. Distance uncertain (~500–650 ly)." },
  { id: "antares", name: "Antares", raHours: 16.4901, decDeg: -26.432, distanceLy: 550, spectralClass: "M1.5 Iab", apparentMag: 1.06, radiusSolar: 680, constellation: "Scorpius", featured: true,
    description: "The red heart of Scorpius, named 'rival of Mars' for its colour." },
  { id: "shaula", name: "Shaula", raHours: 17.5601, decDeg: -37.104, distanceLy: 570, spectralClass: "B2 IV", apparentMag: 1.62, constellation: "Scorpius",
    description: "The stinger of Scorpius, a hot triple system." },
  { id: "saiph", name: "Saiph", raHours: 5.7959, decDeg: -9.670, distanceLy: 650, spectralClass: "B0.5 Ia", apparentMag: 2.07, radiusSolar: 22, constellation: "Orion",
    description: "Orion's eastern knee, a blue supergiant." },
  { id: "rigel", name: "Rigel", raHours: 5.2423, decDeg: -8.202, distanceLy: 860, spectralClass: "B8 Ia", apparentMag: 0.13, radiusSolar: 79, constellation: "Orion", featured: true,
    description: "A blue supergiant tens of thousands of times more luminous than the Sun." },
  { id: "mintaka", name: "Mintaka", raHours: 5.5334, decDeg: -0.299, distanceLy: 1200, spectralClass: "O9.5 II", apparentMag: 2.23, radiusSolar: 16.5, constellation: "Orion",
    description: "The westernmost star of Orion's Belt. Distance uncertain." },
  { id: "alnitak", name: "Alnitak", raHours: 5.6793, decDeg: -1.943, distanceLy: 1260, spectralClass: "O9.5 Iab", apparentMag: 1.77, radiusSolar: 20, constellation: "Orion",
    description: "The easternmost belt star, beside the Flame and Horsehead nebulae. Distance uncertain." },
  { id: "alnilam", name: "Alnilam", raHours: 5.6036, decDeg: -1.202, distanceLy: 1340, spectralClass: "B0 Ia", apparentMag: 1.69, radiusSolar: 42, constellation: "Orion",
    description: "The middle belt star and the most luminous of the three. Distance uncertain (~1,300–2,000 ly)." },
  { id: "deneb", name: "Deneb", raHours: 20.6905, decDeg: 45.280, distanceLy: 2600, spectralClass: "A2 Ia", apparentMag: 1.25, radiusSolar: 200, constellation: "Cygnus", featured: true,
    description: "One of the most luminous stars visible to the naked eye; its light left around the fall of Rome. Distance uncertain." }
];

function derive(star: CatalogStar): NearbyStar {
  const absoluteMag = absoluteMagnitude(star.apparentMag, star.distanceLy);
  return {
    ...star,
    position: starScenePosition(star.raHours, star.decDeg, star.distanceLy),
    color: spectralColor(star.spectralClass),
    absoluteMag,
    size: starSpriteSize(absoluteMag)
  };
}

export const NEARBY_STARS: NearbyStar[] = STAR_CATALOG.map(derive);

// The Sun, at the layer origin.
export const SUN_STELLAR = {
  id: "sun",
  name: "Sun",
  position: [0, 0, 0] as [number, number, number],
  size: starSpriteSize(SUN_ABSOLUTE_MAGNITUDE) * 1.4, // slightly emphasised: "you are here"
  color: "#ffe28a",
  spectralClass: "G2 V",
  description: "Our star — a yellow dwarf at the center of the solar system."
};

/**
 * Familiar star patterns, drawn in 3D. From the Sun they look like the
 * constellations; orbit away and they fall apart, because their stars are at
 * very different distances.
 */
export const CONSTELLATION_LINES: { name: string; pairs: [string, string][] }[] = [
  { name: "Orion", pairs: [["betelgeuse", "bellatrix"], ["betelgeuse", "alnitak"], ["bellatrix", "mintaka"], ["mintaka", "alnilam"], ["alnilam", "alnitak"], ["alnitak", "saiph"], ["mintaka", "rigel"]] },
  { name: "Big Dipper", pairs: [["dubhe", "merak"], ["merak", "phecda"], ["phecda", "megrez"], ["megrez", "dubhe"], ["megrez", "alioth"], ["alioth", "mizar"], ["mizar", "alkaid"]] },
  { name: "Southern Cross", pairs: [["acrux", "gacrux"], ["mimosa", "imai"]] },
  { name: "Summer Triangle", pairs: [["vega", "deneb"], ["deneb", "altair"], ["altair", "vega"]] },
  { name: "Winter Triangle", pairs: [["betelgeuse", "sirius"], ["sirius", "procyon"], ["procyon", "betelgeuse"]] }
];

export function getStarById(id: string | null): NearbyStar | undefined {
  return id ? NEARBY_STARS.find((s) => s.id === id) : undefined;
}

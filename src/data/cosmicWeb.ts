// Landmarks of the nearby cosmic web, placed like the survey galaxies: real
// galactic direction and redshift distance (cz / H0). Rounded from NED /
// SIMBAD and Tully et al. 2014 (Laniakea, Nature 513, 71).

export interface CosmicLandmark {
  id: string;
  name: string;
  lDeg: number;
  bDeg: number;
  czKmS: number;
  note: string;
  /** Labelled at the overview; the rest appear when zoomed in. */
  major?: boolean;
}

export const COSMIC_LANDMARKS: CosmicLandmark[] = [
  { id: "virgo", name: "Virgo Cluster", lDeg: 283.8, bDeg: 74.5, czKmS: 1100, note: "The nearest large galaxy cluster, ~1,500 galaxies; it pulls on the Local Group.", major: true },
  { id: "fornax", name: "Fornax Cluster", lDeg: 236.7, bDeg: -53.6, czKmS: 1400, note: "A compact cluster in the southern sky." },
  { id: "centaurus", name: "Centaurus Cluster", lDeg: 302.4, bDeg: 21.6, czKmS: 3400, note: "A rich cluster on the way to the Great Attractor." },
  { id: "hydra", name: "Hydra Cluster", lDeg: 269.6, bDeg: 26.5, czKmS: 3700, note: "One of the largest clusters within 200 million light-years." },
  { id: "norma", name: "Norma Cluster · Great Attractor", lDeg: 325.3, bDeg: -7.3, czKmS: 4700, note: "The core of the Great Attractor, near the centre of Laniakea, half hidden behind the Milky Way.", major: true },
  { id: "perseus", name: "Perseus Cluster", lDeg: 150.6, bDeg: -13.3, czKmS: 5400, note: "Part of the Perseus–Pisces supercluster; its hot gas 'hums' a B-flat 57 octaves below middle C.", major: true },
  { id: "coma", name: "Coma Cluster", lDeg: 58.1, bDeg: 88.0, czKmS: 6900, note: "A rich cluster of 1,000+ galaxies where Zwicky first inferred dark matter (1933).", major: true },
  { id: "shapley", name: "Shapley Supercluster", lDeg: 311.8, bDeg: 30.7, czKmS: 14500, note: "The most massive structure in the nearby universe, beyond the edge of this survey slice.", major: true }
];

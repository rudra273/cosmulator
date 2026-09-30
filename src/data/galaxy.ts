// Milky Way geometry for the Galaxy layer, measured from the texture itself:
// NASA/JPL-Caltech/R. Hurt (SSC/Caltech) face-on illustration (PIA10748),
// seen from the north galactic pole with the galactic centre at the image
// centre.
//
// Positions come from Wikimedia's annotation of that same image
// (File:Milky_Way_Arms_ssc2008-10.svg): its 25,000 ly ring is 196 SVG units,
// the Sun sits 205 units from the centre, and the image is drawn there at
// scale 1.038 rotated 180°. So the full image spans ~135,600 ly and the Sun
// is 0.193 of the image width below the centre (~26,150 ly).

/** Width of the texture in scene units (the disc mesh is this wide). */
export const GALAXY_IMAGE_SPAN_UNITS = 4050;
/** Width of the texture in light-years (1024 px × 1.038 × 25,000/196 ly). */
export const GALAXY_IMAGE_SPAN_LY = 135_600;
/** The galactic centre sits 0.19% of the width right of the image centre;
 *  the disc mesh is shifted so the centre lands on the scene origin. */
export const GALAXY_IMAGE_CENTER_OFFSET_X = -0.0019 * GALAXY_IMAGE_SPAN_UNITS;

// Annotation SVG units → scene units: undo the 180° rotation and 1.038 scale.
const ANNOTATION_TO_SCENE = GALAXY_IMAGE_SPAN_UNITS / (1024 * 1.038);

/** A point from the annotation SVG (relative to the galactic centre, y down,
 *  Sun toward −y) in scene coordinates (disc in XZ, Sun toward +Z). */
export function fromAnnotation(svgX: number, svgY: number): [number, number, number] {
  return [-svgX * ANNOTATION_TO_SCENE, 0, -svgY * ANNOTATION_TO_SCENE];
}

// The Sun, on the Orion–Cygnus spur.
export const SUN_GALAXY_POSITION = fromAnnotation(0, -205);

/** Unit vector (scene XZ plane) from the Sun toward the galactic centre. The
 *  Stellar layer orients real star directions with it, so looking toward
 *  Sagittarius in the neighborhood points at Sgr A* in the Galaxy layer. */
export const GALACTIC_CENTER_DIRECTION: [number, number, number] = (() => {
  const [x, , z] = SUN_GALAXY_POSITION;
  const l = Math.hypot(x, z);
  return [-x / l, 0, -z / l];
})();

/** Arm names at the annotation's label anchors. */
export const ARM_LABELS: { name: string; position: [number, number, number] }[] = [
  { name: "Orion Spur", position: fromAnnotation(20, -260) },
  { name: "Perseus Arm", position: fromAnnotation(220, -180) },
  { name: "Outer Arm", position: fromAnnotation(310, -140) },
  { name: "Carina–Sagittarius Arm", position: fromAnnotation(-320, -30) },
  { name: "Scutum–Centaurus Arm", position: fromAnnotation(-250, 70) },
  { name: "Norma Arm", position: fromAnnotation(-170, -10) }
];

/** Galactic bar direction in the scene (image: lower-left → upper-right, ~40°). */
export const BAR_ANGLE_RAD = (40 * Math.PI) / 180;

/**
 * Named objects placed from real galactic longitude / latitude / distance
 * from the Sun (SIMBAD / Harris 2010 globular cluster catalogue, rounded).
 */
export interface GalacticObject {
  id: string;
  name: string;
  kind: "globular" | "dwarf galaxy" | "nebula";
  lDeg: number;
  bDeg: number;
  distanceLy: number;
  note: string;
}

export const GALACTIC_OBJECTS: GalacticObject[] = [
  { id: "omega-cen", name: "Omega Centauri", kind: "globular", lDeg: 309.1, bDeg: 15.0, distanceLy: 17_100, note: "The largest globular cluster: ~10 million stars, possibly a captured galaxy core." },
  { id: "47-tuc", name: "47 Tucanae", kind: "globular", lDeg: 305.9, bDeg: -44.9, distanceLy: 14_700, note: "A dense, bright globular cluster next to the Small Magellanic Cloud in the sky." },
  { id: "m13", name: "M13", kind: "globular", lDeg: 59.0, bDeg: 40.9, distanceLy: 22_200, note: "The Great Globular Cluster in Hercules; target of the 1974 Arecibo message." },
  { id: "carina-nebula", name: "Carina Nebula", kind: "nebula", lDeg: 287.6, bDeg: -0.6, distanceLy: 7_500, note: "A giant star-forming region home to the massive star Eta Carinae." },
  { id: "eagle-nebula", name: "Eagle Nebula", kind: "nebula", lDeg: 17.0, bDeg: 0.8, distanceLy: 5_700, note: "Home of the 'Pillars of Creation'." },
  { id: "lmc", name: "Large Magellanic Cloud", kind: "dwarf galaxy", lDeg: 280.5, bDeg: -32.9, distanceLy: 163_000, note: "The largest satellite galaxy of the Milky Way." },
  { id: "smc", name: "Small Magellanic Cloud", kind: "dwarf galaxy", lDeg: 302.8, bDeg: -44.3, distanceLy: 200_000, note: "A dwarf galaxy being tidally stretched by the Milky Way and the LMC." },
  { id: "sgr-dsph", name: "Sagittarius Dwarf", kind: "dwarf galaxy", lDeg: 5.6, bDeg: -14.2, distanceLy: 65_000, note: "A dwarf galaxy being torn apart as it passes through the Milky Way's disc." }
];

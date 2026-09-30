// Shared Milky Way disc geometry. The Galaxy layer draws with it and the
// scale-transition engine uses it to find where the Sun sits in galaxy space,
// so the marker the user clicks and the anchor the camera flies to agree.

export const GALAXY_DISC = {
  innerRadius: 100,
  outerRadius: 1500,
  armCount: 4, // the Milky Way is a four-major-arm barred spiral
  armTightness: 0.9 // log-spiral coefficient; lower = looser winding
};

/** Point `t` (0 = inner edge, 1 = rim) along procedural log-spiral arm `armIndex`. */
export function spiralArmPoint(armIndex: number, t: number): [number, number, number] {
  const { innerRadius, outerRadius, armCount, armTightness } = GALAXY_DISC;
  const r = innerRadius + t * (outerRadius - innerRadius);
  const angle = (armIndex / armCount) * Math.PI * 2 + Math.log(r / innerRadius + 1) * armTightness;
  return [Math.cos(angle) * r, 0, Math.sin(angle) * r];
}

// Orion Spur, roughly where the Sun sits (~23k ly from the centre at the
// Galaxy layer's 25 ly/unit calibration; the measured value is ~26k ly).
export const SUN_GALAXY_POSITION = spiralArmPoint(0, 0.58);

/** Unit vector (scene XZ plane) from the Sun toward the galactic centre. The
 *  Stellar layer orients real star directions with it, so looking toward
 *  Sagittarius in the neighborhood points at Sgr A* in the Galaxy layer. */
export const GALACTIC_CENTER_DIRECTION: [number, number, number] = (() => {
  const [x, , z] = SUN_GALAXY_POSITION;
  const l = Math.hypot(x, z);
  return [-x / l, 0, -z / l];
})();

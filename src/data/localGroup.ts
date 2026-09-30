// The Local Group: the Milky Way's neighbourhood of ~80 galaxies within
// ~5 million light-years. Positions (galactic l/b, distance from the Sun),
// types and sizes rounded from McConnachie (2012), "The observed properties of
// dwarf galaxies in and around the Local Group", AJ 144, 4. At this scale the
// Sun's 26,000 ly offset from the Milky Way's centre is negligible, so the
// Milky Way sits at the origin.
//
// Scene axes match the Galaxy layer: Milky Way disc in XZ, galactic north +Y.

import { galacticDirection, discNormal, type Vec3 } from "../lib/stellar-coords";
import { LY_PER_UNIT } from "./scales";

/** Local Group layer scale. */
export const LOCAL_GROUP_LY_PER_UNIT = LY_PER_UNIT.localGroup;

export interface LocalGroupMember {
  id: string;
  name: string;
  kind: "spiral" | "elliptical" | "irregular" | "dwarf spheroidal";
  lDeg: number;
  bDeg: number;
  distanceMly: number;
  /** Visible diameter in thousands of light-years (rounded). */
  diameterKly: number;
  note: string;
  /** Sky orientation for the large spirals (drawn as tilted discs). */
  disc?: { raHours: number; decDeg: number; positionAngleDeg: number; inclinationDeg: number };
}

export const LOCAL_GROUP: LocalGroupMember[] = [
  { id: "m31", name: "Andromeda (M31)", kind: "spiral", lDeg: 121.17, bDeg: -21.57, distanceMly: 2.54, diameterKly: 150,
    note: "The largest Local Group galaxy. It is approaching at ~110 km/s and will merge with the Milky Way in about 4.5 billion years.",
    disc: { raHours: 0.7123, decDeg: 41.269, positionAngleDeg: 38, inclinationDeg: 77 } },
  { id: "m33", name: "Triangulum (M33)", kind: "spiral", lDeg: 133.61, bDeg: -31.33, distanceMly: 2.73, diameterKly: 60,
    note: "The third-largest member; possibly a satellite of Andromeda.",
    disc: { raHours: 1.5641, decDeg: 30.66, positionAngleDeg: 23, inclinationDeg: 55 } },
  { id: "lmc", name: "Large Magellanic Cloud", kind: "irregular", lDeg: 280.47, bDeg: -32.89, distanceMly: 0.163, diameterKly: 32, note: "The Milky Way's largest satellite." },
  { id: "smc", name: "Small Magellanic Cloud", kind: "irregular", lDeg: 302.8, bDeg: -44.3, distanceMly: 0.2, diameterKly: 19, note: "Being stretched by the Milky Way and the LMC." },
  { id: "sgr-dsph", name: "Sagittarius Dwarf", kind: "dwarf spheroidal", lDeg: 5.57, bDeg: -14.17, distanceMly: 0.065, diameterKly: 10, note: "Being torn apart inside the Milky Way's disc." },
  { id: "m32", name: "M32", kind: "elliptical", lDeg: 121.15, bDeg: -21.98, distanceMly: 2.49, diameterKly: 6.5, note: "A compact elliptical satellite of Andromeda." },
  { id: "m110", name: "M110", kind: "elliptical", lDeg: 120.72, bDeg: -21.14, distanceMly: 2.69, diameterKly: 17, note: "A dwarf elliptical satellite of Andromeda." },
  { id: "ngc185", name: "NGC 185", kind: "dwarf spheroidal", lDeg: 120.79, bDeg: -14.48, distanceMly: 2.02, diameterKly: 8, note: "An Andromeda satellite." },
  { id: "ngc147", name: "NGC 147", kind: "dwarf spheroidal", lDeg: 119.82, bDeg: -14.25, distanceMly: 2.53, diameterKly: 10, note: "An Andromeda satellite." },
  { id: "ic10", name: "IC 10", kind: "irregular", lDeg: 118.97, bDeg: -3.33, distanceMly: 2.58, diameterKly: 5, note: "A starburst galaxy, hidden behind the Milky Way's disc." },
  { id: "ngc6822", name: "Barnard's Galaxy", kind: "irregular", lDeg: 25.34, bDeg: -18.4, distanceMly: 1.63, diameterKly: 7, note: "NGC 6822, a barred irregular galaxy." },
  { id: "ic1613", name: "IC 1613", kind: "irregular", lDeg: 129.73, bDeg: -60.58, distanceMly: 2.38, diameterKly: 10, note: "A quiet dwarf irregular galaxy." },
  { id: "wlm", name: "WLM", kind: "irregular", lDeg: 75.86, bDeg: -73.62, distanceMly: 3.04, diameterKly: 8, note: "Wolf–Lundmark–Melotte, an isolated dwarf at the Local Group's edge." },
  { id: "leo-i", name: "Leo I", kind: "dwarf spheroidal", lDeg: 225.99, bDeg: 49.11, distanceMly: 0.82, diameterKly: 2, note: "One of the most distant Milky Way satellites." },
  { id: "leo-ii", name: "Leo II", kind: "dwarf spheroidal", lDeg: 220.17, bDeg: 67.23, distanceMly: 0.69, diameterKly: 1.4, note: "A small Milky Way satellite." },
  { id: "fornax", name: "Fornax Dwarf", kind: "dwarf spheroidal", lDeg: 237.1, bDeg: -65.65, distanceMly: 0.46, diameterKly: 3, note: "Has its own globular clusters." },
  { id: "sculptor", name: "Sculptor Dwarf", kind: "dwarf spheroidal", lDeg: 287.53, bDeg: -83.16, distanceMly: 0.28, diameterKly: 2.5, note: "The first dwarf spheroidal discovered (1937)." },
  { id: "draco", name: "Draco Dwarf", kind: "dwarf spheroidal", lDeg: 86.37, bDeg: 34.72, distanceMly: 0.26, diameterKly: 1.5, note: "One of the most dark-matter-dominated galaxies known." },
  { id: "ursa-minor", name: "Ursa Minor Dwarf", kind: "dwarf spheroidal", lDeg: 104.97, bDeg: 44.8, distanceMly: 0.22, diameterKly: 1.5, note: "An ancient, faint Milky Way satellite." },
  { id: "carina", name: "Carina Dwarf", kind: "dwarf spheroidal", lDeg: 260.11, bDeg: -22.22, distanceMly: 0.33, diameterKly: 1.5, note: "A faint Milky Way satellite." },
  { id: "sextans", name: "Sextans Dwarf", kind: "dwarf spheroidal", lDeg: 243.5, bDeg: 42.27, distanceMly: 0.28, diameterKly: 3, note: "A diffuse Milky Way satellite." }
];

export interface PlacedMember extends LocalGroupMember {
  position: Vec3;
  radiusUnits: number;
  normal?: Vec3;
}

export const PLACED_LOCAL_GROUP: PlacedMember[] = LOCAL_GROUP.map((m) => {
  const d = galacticDirection(m.lDeg, m.bDeg);
  const k = (m.distanceMly * 1e6) / LOCAL_GROUP_LY_PER_UNIT;
  return {
    ...m,
    position: [d[0] * k, d[1] * k, d[2] * k] as Vec3,
    radiusUnits: (m.diameterKly * 1000) / 2 / LOCAL_GROUP_LY_PER_UNIT,
    normal: m.disc ? discNormal(m.disc.raHours, m.disc.decDeg, m.disc.positionAngleDeg, m.disc.inclinationDeg) : undefined
  };
});

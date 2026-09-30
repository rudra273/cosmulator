// Decoder for public/data/2mrs-cz12000.bin (built by
// scripts/build-galaxy-survey.mjs — keep the layouts in sync). Pure; runs
// under the node test harness.
//
// Distances are "redshift distances", cz / H0: fine for structure at this
// scale, but cluster members' own motions smear clusters along the line of
// sight ("fingers of God").

import { galacticDirection, type Vec3 } from "./stellar-coords";

export const GALAXY_SURVEY_URL = "/data/2mrs-cz12000.bin";
export const HUBBLE_CONSTANT = 70; // km/s/Mpc
const MLY_PER_MPC = 3.26156;

export function czToMly(czKmS: number): number {
  return (czKmS / HUBBLE_CONSTANT) * MLY_PER_MPC;
}

export interface SurveyGalaxy {
  lDeg: number;
  bDeg: number;
  czKmS: number;
}

export function decodeSurvey(buffer: ArrayBuffer): SurveyGalaxy[] {
  const view = new DataView(buffer);
  const magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  if (magic !== "2MRS") throw new Error(`unexpected survey header ${magic}`);
  const count = view.getUint32(4, true);
  const out: SurveyGalaxy[] = [];
  for (let i = 0; i < count; i++) {
    const o = 8 + i * 6;
    out.push({
      lDeg: (view.getUint16(o, true) / 65535) * 360,
      bDeg: (view.getInt16(o + 2, true) / 32767) * 90,
      czKmS: view.getUint16(o + 4, true)
    });
  }
  return out;
}

export function surveyPosition(g: { lDeg: number; bDeg: number; czKmS: number }, lyPerUnit: number): Vec3 {
  const d = galacticDirection(g.lDeg, g.bDeg);
  const k = (czToMly(g.czKmS) * 1e6) / lyPerUnit;
  return [d[0] * k, d[1] * k, d[2] * k];
}

/** Positions, colours (warm nearby → cool far) and sizes for a point field. */
export function buildSurveyField(galaxies: SurveyGalaxy[], lyPerUnit: number, maxCz = 12000) {
  const positions = new Float32Array(galaxies.length * 3);
  const colors = new Float32Array(galaxies.length * 3);
  const sizes = new Float32Array(galaxies.length);
  galaxies.forEach((g, i) => {
    positions.set(surveyPosition(g, lyPerUnit), i * 3);
    const t = Math.min(1, g.czKmS / maxCz);
    colors.set([1.0 - 0.35 * t, 0.86 - 0.1 * t, 0.7 + 0.3 * t], i * 3);
    sizes[i] = 14;
  });
  return { positions, colors, sizes };
}

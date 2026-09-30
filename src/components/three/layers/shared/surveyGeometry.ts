import * as THREE from "three";
import { LY_PER_UNIT } from "@/data/scales";
import { GALAXY_SURVEY_URL, buildSurveyField, decodeSurvey } from "@/lib/galaxy-survey";

// The 2MRS point field in Cosmic Web layer units, parsed once per page load
// and shared by every layer that draws it (callers clone before mounting,
// since RoundPoints disposes its geometry on unmount).
let cached: Promise<THREE.BufferGeometry> | null = null;

export function loadSurveyGeometry(): Promise<THREE.BufferGeometry> {
  cached ??= fetch(GALAXY_SURVEY_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`galaxy survey: HTTP ${r.status}`);
      return r.arrayBuffer();
    })
    .then((buf) => {
      const { positions, colors, sizes } = buildSurveyField(decodeSurvey(buf), LY_PER_UNIT.cosmicWeb);
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      g.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
      return g;
    })
    .catch((err) => {
      cached = null; // allow a retry on the next mount
      throw err;
    });
  return cached;
}

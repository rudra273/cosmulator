// Single source of truth for how the scale layers relate to each other and to
// real distances. The HUD readout and the transition engine both read this.

import { SUN_GALAXY_POSITION } from "./galaxy";

export type ViewScale = "solar" | "stellar" | "galaxy" | "universe";

export const LAYER_ORDER: ViewScale[] = ["solar", "stellar", "galaxy", "universe"];

export const LIGHT_YEAR_KM = 9_460_730_472_580.8;

/**
 * Light-years represented by one scene unit in each layer.
 *  - solar: Earth's stylized orbit (~24 units) ≈ 8 light-minutes.
 *  - stellar: nominal only — the Stellar layer is log-compressed (see
 *    stellarRadius); convert with sceneDistanceToLy.
 *  - galaxy: the painted disc (radius ~2025 units) spans ~50k ly.
 *  - universe: placeholder until the Local Group / cosmic web layers land
 *    (PLAN Phase 4).
 */
export const LY_PER_UNIT: Record<ViewScale, number> = {
  solar: 1.12e8 / LIGHT_YEAR_KM,
  stellar: 0.0035,
  galaxy: 25,
  universe: 350_000
};

/**
 * The object two adjacent layers share. During a transition the inner layer
 * is drawn inside the outer one at `positionInOuter`, so the Sun becomes the
 * Orion Spur marker and the galaxy becomes the Milky Way marker.
 *
 * `handoff` is the camera distance from the anchor, in outer-layer units, that
 * corresponds to the inner layer's view at the moment of handoff: when
 * ascending it matches the zoomed-out inner view; when descending it matches
 * the inner layer's overview pose.
 */
export interface ScaleAnchor {
  inner: ViewScale;
  outer: ViewScale;
  name: string;
  positionInOuter: [number, number, number];
  handoff: { ascend: number; descend: number };
}

export const ANCHORS: ScaleAnchor[] = [
  { inner: "solar", outer: "stellar", name: "Sun", positionInOuter: [0, 0, 0], handoff: { ascend: 150, descend: 40 } },
  { inner: "stellar", outer: "galaxy", name: "Sun", positionInOuter: SUN_GALAXY_POSITION, handoff: { ascend: 300, descend: 60 } },
  { inner: "galaxy", outer: "universe", name: "Milky Way", positionInOuter: [0, 0, 0], handoff: { ascend: 3000, descend: 400 } }
];

/**
 * Stellar Neighborhood radial compression: r = STELLAR_LOG_SCALE · log10(1 + ly).
 * Real directions are kept; distance is logarithmic so α Centauri (4.4 ly) and
 * Deneb (~2,600 ly) fit one view: 4.4 ly → 328, 10 → 468, 100 → 902,
 * 1,000 → 1,350, 2,600 → 1,537 units.
 */
export const STELLAR_LOG_SCALE = 450;

export function stellarRadius(ly: number): number {
  return STELLAR_LOG_SCALE * Math.log10(1 + ly);
}

export function stellarDistanceLy(radius: number): number {
  return Math.pow(10, radius / STELLAR_LOG_SCALE) - 1;
}

/** Real distance (light-years) represented by a scene distance from the layer origin. */
export function sceneDistanceToLy(layer: ViewScale, distance: number): number {
  return layer === "stellar" ? stellarDistanceLy(distance) : distance * LY_PER_UNIT[layer];
}

export function anchorBetween(a: ViewScale, b: ViewScale): ScaleAnchor | undefined {
  return ANCHORS.find((x) => (x.inner === a && x.outer === b) || (x.inner === b && x.outer === a));
}

export function outerOf(layer: ViewScale): ViewScale | null {
  return LAYER_ORDER[LAYER_ORDER.indexOf(layer) + 1] ?? null;
}

export function innerOf(layer: ViewScale): ViewScale | null {
  return LAYER_ORDER[LAYER_ORDER.indexOf(layer) - 1] ?? null;
}

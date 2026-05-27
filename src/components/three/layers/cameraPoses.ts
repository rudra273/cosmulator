import type { ViewScale } from "@/store/solarSystemStore";

/**
 * Per-layer camera configuration. Each layer operates in its own 0–10k-unit
 * coordinate space, so each gets its own initial overview pose and zoom
 * bounds. The Solar layer's numbers mirror what CameraController already uses
 * (kept here for reference / cross-layer consistency); Galaxy and Universe
 * are defined here for the layers that consume them.
 *
 * Conventions:
 *  - `cameraPos` is the initial overview camera position.
 *  - `target` is what the camera is initially aimed at (world origin in all
 *    layers — each layer is centered there).
 *  - `minDistance` / `maxDistance` are passed to OrbitControls.
 *  - `ascendThreshold` is the fraction of maxDistance past which zooming out
 *    triggers a transition up to the next-outer layer. Step 7 wires this.
 */
export interface CameraPose {
  cameraPos: [number, number, number];
  target: [number, number, number];
  minDistance: number;
  /** OrbitControls.maxDistance — the absolute outer bound. Ascend fires at
   *  `maxDistance * ascendThreshold`. We deliberately set this well beyond
   *  the "comfortable overview" distance so the user keeps zooming smoothly
   *  past the overview into the pull-back zone before triggering ascend. */
  maxDistance: number;
  ascendThreshold: number; // fraction of maxDistance, e.g. 0.95
  /** Camera distance at which the visible content starts shrinking on the
   *  wheel (the start of the pull-back zone). Below this, content renders at
   *  natural size. Between `pullbackStart` and `maxDistance`, content
   *  smoothly shrinks toward its anchor body. By the time the user reaches
   *  `maxDistance * ascendThreshold` the content is already small enough
   *  that the cross-fade to the next layer reads as a continuation, not a
   *  cut. Layer-local; the Solar `CameraController` defines its own. */
  pullbackStart: number;
  /** Final stuff-scale at the end of the pull-back zone (just before ascend
   *  fires). Lower = more shrinkage. Content interpolates 1 → `pullbackStuffEnd`
   *  as distance goes from `pullbackStart` → `maxDistance`. */
  pullbackStuffEnd: number;
  /** Final anchor-scale at the end of the pull-back zone. The anchor body
   *  (Sun in Solar/Stellar, galactic center in Galaxy) shrinks more slowly
   *  than the rest so it stays the visual focal point as the user pulls
   *  back. Set equal to `pullbackStuffEnd` for uniform shrink. */
  pullbackAnchorEnd: number;
}

export const LAYER_CAMERA_POSES: Record<ViewScale, CameraPose> = {
  solar: {
    cameraPos: [0, 50, 95],
    target: [0, 0, 0],
    // Note: the Solar layer's CameraController owns its own min/max bounds
    // (they depend on isRealisticScale). Defaults here match the stylized
    // mode for cross-layer reference; CameraController extends maxDistance
    // into the pull-back zone itself.
    minDistance: 1.2,
    maxDistance: 1400, // ~4× the old 350; the user keeps wheeling into the pull-back zone
    ascendThreshold: 0.95,
    pullbackStart: 320, // just below the old maxDistance — natural feel
    pullbackStuffEnd: 0.10, // planets nearly vanish into the Sun
    pullbackAnchorEnd: 0.50 // Sun shrinks but stays the visual focus
  },
  stellar: {
    // Stellar Neighborhood — Sun centered, ~15 nearby stars within ~1500 units.
    cameraPos: [0, 400, 700],
    target: [0, 0, 0],
    minDistance: 150,
    maxDistance: 7000, // 3.5× the old 2000
    ascendThreshold: 0.95,
    pullbackStart: 1800, // just inside the old max
    pullbackStuffEnd: 0.10,
    pullbackAnchorEnd: 0.50
  },
  galaxy: {
    // Strong top-down view with a mild tilt — high Y, small Z. The shader-
    // painted disc reads as the NASA face-on painting at this angle.
    cameraPos: [0, 3200, 600],
    target: [0, 0, 0],
    minDistance: 300,
    maxDistance: 14000, // ~3× the old 4500
    ascendThreshold: 0.95,
    pullbackStart: 4200,
    pullbackStuffEnd: 0.10,
    pullbackAnchorEnd: 0.50 // Sgr A* / galactic center shrinks slower than the disc
  },
  universe: {
    cameraPos: [0, 2000, 3500],
    target: [0, 0, 0],
    minDistance: 800,
    maxDistance: 8000,
    ascendThreshold: 1.0, // already at top — no ascend, no pull-back zone
    pullbackStart: 8000,
    pullbackStuffEnd: 1.0,
    pullbackAnchorEnd: 1.0
  }
};

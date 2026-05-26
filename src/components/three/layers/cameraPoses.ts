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
  maxDistance: number;
  ascendThreshold: number; // fraction of maxDistance, e.g. 0.95
}

export const LAYER_CAMERA_POSES: Record<ViewScale, CameraPose> = {
  solar: {
    cameraPos: [0, 50, 95],
    target: [0, 0, 0],
    // Note: the Solar layer's CameraController overrides minDistance/maxDistance
    // based on isRealisticScale. These defaults match the stylized mode and
    // are unused by Solar today; future per-layer controls may consume them.
    minDistance: 1.2,
    maxDistance: 350,
    ascendThreshold: 0.95
  },
  stellar: {
    // Stellar Neighborhood — Sun centered, ~15 nearby stars within ~1500 units.
    // Camera sits back far enough to see several stars but close enough that
    // the Sun reads as the dominant body in the middle.
    cameraPos: [0, 400, 700],
    target: [0, 0, 0],
    minDistance: 150,
    maxDistance: 2000,
    ascendThreshold: 0.95
  },
  galaxy: {
    // Strong 3/4 top-down view — high Y, modest Z — so the spiral arms read
    // clearly from above rather than edge-on. Total distance ~3000 lands
    // inside maxDistance with margin before zoom-out triggers ascend.
    cameraPos: [0, 2700, 1100],
    target: [0, 0, 0],
    minDistance: 300,
    maxDistance: 4500,
    ascendThreshold: 0.95
  },
  universe: {
    cameraPos: [0, 2000, 3500],
    target: [0, 0, 0],
    minDistance: 800,
    maxDistance: 8000,
    ascendThreshold: 1.0 // already at top — no ascend
  }
};

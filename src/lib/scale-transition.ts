// Pure math for moving between scale layers. No React / Three imports, so it
// runs under the node test harness.
//
// Convention: `k` maps inner-layer units to outer-layer units around the
// shared anchor:  outer = anchor + inner × k.
// During a transition everything is expressed in the INCOMING layer's
// coordinates; the outgoing layer is drawn with `outgoingTransform` so the
// frame at t = 0 looks exactly like the last frame before the handoff.

import type { ViewScale } from "../data/scales";
import { anchorBetween } from "../data/scales";
import { LAYER_CAMERA_POSES } from "../components/three/layers/cameraPoses";

export type Vec3 = [number, number, number];
export type TransitionDir = "ascend" | "descend";

/**
 * Wheel-driven pull-back shrink for a layer at a given camera distance.
 * Content ("stuff") shrinks toward the anchor body, which shrinks more slowly.
 */
export function computePullback(layer: ViewScale, cameraDistance: number): { stuffScale: number; anchorScale: number; t: number } {
  const pose = LAYER_CAMERA_POSES[layer];
  if (pose.pullbackStart >= pose.maxDistance) return { stuffScale: 1, anchorScale: 1, t: 0 };
  const raw = (cameraDistance - pose.pullbackStart) / (pose.maxDistance - pose.pullbackStart);
  const t = Math.max(0, Math.min(1, raw));
  const eased = t * t * (3 - 2 * t);
  return {
    stuffScale: 1 + (pose.pullbackStuffEnd - 1) * eased,
    anchorScale: 1 + (pose.pullbackAnchorEnd - 1) * eased,
    t
  };
}

export interface Handoff {
  from: ViewScale;
  to: ViewScale;
  dir: TransitionDir;
  /** inner → outer unit ratio */
  k: number;
  /** anchor position in outer-layer coordinates */
  anchor: Vec3;
}

/**
 * Work out how the outgoing layer maps into the incoming one.
 *  - ascend: `cameraDistance` is the old camera's distance to its target;
 *    it maps to the anchor's ascend handoff distance.
 *  - descend: the incoming layer's overview distance maps to the anchor's
 *    descend handoff distance. `outgoingStuffScale` is the outer layer's
 *    live pull-back (the marker lives in its shrinking content group).
 */
export function planHandoff(
  from: ViewScale,
  to: ViewScale,
  dir: TransitionDir,
  opts: { cameraDistance: number; incomingPoseDistance: number; outgoingStuffScale?: number }
): Handoff | null {
  const a = anchorBetween(from, to);
  if (!a) return null;
  if (dir === "ascend") {
    const k = a.handoff.ascend / Math.max(opts.cameraDistance, 1e-6);
    return { from, to, dir, k, anchor: [...a.positionInOuter] };
  }
  const s = opts.outgoingStuffScale ?? 1;
  const k = a.handoff.descend / Math.max(opts.incomingPoseDistance, 1e-6);
  return { from, to, dir, k, anchor: [a.positionInOuter[0] * s, a.positionInOuter[1] * s, a.positionInOuter[2] * s] };
}

/** Where to draw the outgoing layer inside the incoming layer's space. */
export function outgoingTransform(h: Handoff): { position: Vec3; scale: number } {
  if (h.dir === "ascend") return { position: [...h.anchor], scale: h.k };
  return { position: [-h.anchor[0] / h.k, -h.anchor[1] / h.k, -h.anchor[2] / h.k], scale: 1 / h.k };
}

/** Convert a point from outgoing-layer coordinates to incoming-layer ones. */
export function toIncoming(h: Handoff, p: Vec3): Vec3 {
  const { position, scale } = outgoingTransform(h);
  return [position[0] + p[0] * scale, position[1] + p[1] * scale, position[2] + p[2] * scale];
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const norm = (a: Vec3): Vec3 => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

export const easeInOut = (t: number) => t * t * (3 - 2 * t);

/**
 * How far the orbit target has travelled at transition progress `t` (0..1,
 * un-eased). Descending pans onto the anchor before the zoom dominates, so
 * the camera heads for the clicked marker rather than the old centre;
 * ascending zooms out first and drifts to the new centre afterwards.
 */
export function targetProgress(dir: TransitionDir, t: number): number {
  const w = dir === "descend" ? t / 0.45 : (t - 0.35) / 0.65;
  return easeInOut(Math.max(0, Math.min(1, w)));
}

/**
 * Camera path between two poses. Distance to the target is interpolated in
 * log space (a 10× zoom feels the same at every scale) and the viewing
 * direction swings smoothly, both with `t` (already eased). The target moves
 * with `targetT` (defaults to `t`).
 */
export function interpolateCamera(startPos: Vec3, startTarget: Vec3, endPos: Vec3, endTarget: Vec3, t: number, targetT = t): { position: Vec3; target: Vec3 } {
  const target = lerp(startTarget, endTarget, targetT);
  const so = sub(startPos, startTarget), eo = sub(endPos, endTarget);
  const sd = Math.max(len(so), 1e-9), ed = Math.max(len(eo), 1e-9);
  const d = Math.exp(Math.log(sd) + (Math.log(ed) - Math.log(sd)) * t);
  let dir = lerp(norm(so), norm(eo), t);
  if (len(dir) < 1e-6) dir = norm(eo);
  dir = norm(dir);
  return { position: [target[0] + dir[0] * d, target[1] + dir[1] * d, target[2] + dir[2] * d], target };
}

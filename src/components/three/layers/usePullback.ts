import { useSolarSystemStore, type ViewScale } from "@/store/solarSystemStore";
import { LAYER_CAMERA_POSES } from "./cameraPoses";

/**
 * Pure pull-back math, callable outside React (used by useAscendOnZoomOut
 * to snapshot the scale at the moment ascend fires). Same easing the
 * usePullback hook uses, so the snapshot matches what's on screen.
 */
export function computePullback(layer: ViewScale, cameraDistance: number): {
  stuffScale: number;
  anchorScale: number;
  t: number;
} {
  const pose = LAYER_CAMERA_POSES[layer];
  if (pose.pullbackStart >= pose.maxDistance) {
    return { stuffScale: 1, anchorScale: 1, t: 0 };
  }
  const raw =
    (cameraDistance - pose.pullbackStart) /
    (pose.maxDistance - pose.pullbackStart);
  const t = Math.max(0, Math.min(1, raw));
  const eased = t * t * (3 - 2 * t);
  const stuffScale = 1 + (pose.pullbackStuffEnd - 1) * eased;
  const anchorScale = 1 + (pose.pullbackAnchorEnd - 1) * eased;
  return { stuffScale, anchorScale, t };
}

/**
 * Live distance-driven shrink for the active layer's content. As the user
 * wheels the camera past `pullbackStart`, the layer's "stuff" (planets,
 * neighbor stars, galactic disc) shrinks smoothly toward its anchor (Sun,
 * galactic center). The anchor shrinks more slowly so it stays the visual
 * focal point.
 *
 * This is what makes the wheel keep doing something useful past the
 * comfortable overview distance: every additional tick visibly pulls the
 * user back from the system. When distance reaches `maxDistance × threshold`
 * the existing useAscendOnZoomOut hook triggers ascend; useCrossfade reads
 * the pull-back position at that moment so the 1800 ms transition
 * continues the shrink from where the wheel left it (no snap-back).
 *
 * Math is pure / no state — just reads `cameraDistance` from the store
 * which is published every frame by usePublishDistance. Cheap to call
 * during render.
 */
export function usePullback(layer: ViewScale): {
  stuffScale: number;
  anchorScale: number;
  /** 0 = at or below `pullbackStart`, 1 = at `maxDistance`. Clamped. Useful
   *  for fading other live effects in/out with the wheel (e.g. dimming the
   *  outgoing layer's labels). */
  t: number;
} {
  const cameraDistance = useSolarSystemStore((s) => s.cameraDistance);
  const transitionFrom = useSolarSystemStore((s) => s.transitionFrom);

  // During a transition useCrossfade owns scale. The outgoing layer's
  // pullback contribution is captured into `pullbackAtAscend` (snapshotted
  // by useAscendOnZoomOut at fire-time) and folded into useCrossfade's
  // outgoingScale, so the layer should NOT add a live pullback on top —
  // that would double-count. Returning 1/1/0 here makes the layer apply
  // only the transition scale during the cross-fade window. Steady state
  // (transitionFrom === null) goes through the live distance math below.
  if (transitionFrom !== null) {
    return { stuffScale: 1, anchorScale: 1, t: 0 };
  }

  return computePullback(layer, cameraDistance);
}

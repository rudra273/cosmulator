import { useEffect, useRef } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useSolarSystemStore, type ViewScale } from "@/store/solarSystemStore";
import { computePullback } from "@/lib/scale-transition";

const WHEEL_IDLE_MS = 400;
/** Extra finger spread (px) at minDistance that counts as "zoom in further". */
const PINCH_DESCEND_PX = 60;

/**
 * Watches an OrbitControls instance for zoom-out crossings and triggers
 * `ascendScale` (solar→galaxy→universe) when the camera distance exceeds
 * `maxDistance * threshold`. Debounced so a sustained zoom triggers exactly
 * once per crossing.
 *
 * `enabled` should be false (a) during a transition, (b) when a planet is
 * focused, and (c) when free-mode is on — so a fly-to-planet that ends near
 * max distance doesn't accidentally ascend.
 *
 * IMPORTANT: pass `isActive` so the effect re-runs when the layer's
 * OrbitControls unmounts/remounts. Refs aren't reactive — without `isActive`
 * in the deps, when the layer cross-fades out (controls unmount) and back in
 * (controls remount on a new instance), the listener would stay attached to
 * the old, disposed controls and the new ones would have no listener at all.
 * That's the cause of "zoom-out doesn't ascend after coming back to this
 * layer" bugs.
 *
 * With `minDistance`, the reverse also works: wheeling in while the camera is
 * pinned at the layer's closest distance descends to the next-inner layer
 * (Universe → Galaxy → Solar Neighborhood → Solar System).
 */
export function useAscendOnZoomOut(
  controlsRef: React.RefObject<OrbitControlsImpl | null>,
  opts: {
    maxDistance: number;
    threshold?: number;
    enabled: boolean;
    isActive: boolean;
    /** Which layer this controls instance belongs to — passed so the hook
     *  can snapshot the layer's live pull-back scales at the moment ascend
     *  fires. The snapshot is handed to ascendScale() so the 1800 ms
     *  transition continues the wheel-driven shrink from where it left off,
     *  instead of bouncing back to 1.0 first. */
    layer: ViewScale;
    /** OrbitControls.minDistance; omit to disable zoom-in descend. */
    minDistance?: number;
  }
) {
  const { maxDistance, threshold = 0.95, enabled, isActive, layer, minDistance } = opts;
  const ascendScale = useSolarSystemStore((s) => s.ascendScale);
  const descendScale = useSolarSystemStore((s) => s.descendScale);
  // Re-arms when distance drops back below threshold. We deliberately want
  // this to *also* reset each time the layer becomes active again — if the
  // user ascended once and then came back, the new mount should treat the
  // first zoom-out as a fresh trigger, not as the latched-false state from
  // the prior mount.
  const armedRef = useRef(true);

  useEffect(() => {
    if (!isActive) return;
    const controls = controlsRef.current;
    if (!controls) return;
    const trigger = maxDistance * threshold;

    // Fresh activation → fresh arming. The user just snapped to this layer's
    // entry pose; the next zoom-out crossing is the one we want to honor.
    armedRef.current = true;

    const onChange = () => {
      if (!enabled || !wheelSettled) return;
      const d = controls.getDistance();
      if (armedRef.current && d >= trigger) {
        armedRef.current = false;
        // Snapshot live pull-back scales at this exact distance; the
        // outgoing layer holds them through the transition so the handoff
        // frame matches what is on screen.
        const { stuffScale, anchorScale } = layer === "solar" && useSolarSystemStore.getState().isRealisticScale
          ? { stuffScale: 1, anchorScale: 1 } : computePullback(layer, d);
        ascendScale({ stuff: stuffScale, anchor: anchorScale });
      } else if (!armedRef.current && d < trigger * 0.9) {
        // Re-arm with a little hysteresis so we don't oscillate at the edge.
        armedRef.current = true;
      }
    };

    // Wheel detent: a newly entered layer ignores zoom-out until the wheel
    // has been idle for WHEEL_IDLE_MS, so one fast scroll (plus trackpad
    // momentum) can't chain Solar → Stellar → Galaxy. Once settled, wheel
    // events also run the check: pinned at maxDistance the controls stop
    // emitting "change", so a fresh scroll there must still ascend. Pinned at
    // minDistance, a zoom-in scroll descends.
    let wheelSettled = false;
    let idleTimer = setTimeout(() => { wheelSettled = true; }, WHEEL_IDLE_MS);
    const onWheel = (e: WheelEvent) => {
      if (wheelSettled) {
        if (e.deltaY > 0) onChange();
        else if (e.deltaY < 0 && enabled && minDistance !== undefined && controls.getDistance() <= minDistance * 1.02) descendScale();
        return;
      }
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => { wheelSettled = true; }, WHEEL_IDLE_MS);
    };
    window.addEventListener("wheel", onWheel, { passive: true });

    // Touch: pinching open while already at minDistance descends too (the
    // controls stop zooming there, so the spread is measured directly). One
    // descend per gesture; the layer must have been settled first.
    let pinchStart: number | null = null;
    let pinchDone = false;
    const spread = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) { pinchStart = spread(e.touches); pinchDone = false; }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (pinchStart === null || pinchDone || e.touches.length !== 2 || !wheelSettled || !enabled || minDistance === undefined) return;
      if (controls.getDistance() > minDistance * 1.02) { pinchStart = spread(e.touches); return; }
      if (spread(e.touches) - pinchStart > PINCH_DESCEND_PX) {
        pinchDone = true;
        descendScale();
      }
    };
    const onTouchEnd = (e: TouchEvent) => { if (e.touches.length < 2) pinchStart = null; };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    controls.addEventListener("change", onChange);
    return () => {
      controls.removeEventListener("change", onChange);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      clearTimeout(idleTimer);
    };
  }, [controlsRef, maxDistance, threshold, enabled, isActive, ascendScale, descendScale, layer, minDistance]);
}

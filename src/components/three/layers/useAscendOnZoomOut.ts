import { useEffect, useRef } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useSolarSystemStore, type ViewScale } from "@/store/solarSystemStore";
import { computePullback } from "./usePullback";

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
  }
) {
  const { maxDistance, threshold = 0.95, enabled, isActive, layer } = opts;
  const ascendScale = useSolarSystemStore((s) => s.ascendScale);
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
      if (!enabled) return;
      const d = controls.getDistance();
      if (armedRef.current && d >= trigger) {
        armedRef.current = false;
        // Snapshot live pull-back scales at this exact distance and hand
        // them to ascendScale. useCrossfade uses them as the starting
        // point of the 1800ms staged shrink so the wheel-driven motion
        // continues smoothly into the transition.
        const { stuffScale, anchorScale } = computePullback(layer, d);
        ascendScale({ stuff: stuffScale, anchor: anchorScale });
      } else if (!armedRef.current && d < trigger * 0.9) {
        // Re-arm with a little hysteresis so we don't oscillate at the edge.
        armedRef.current = true;
      }
    };

    controls.addEventListener("change", onChange);
    return () => controls.removeEventListener("change", onChange);
  }, [controlsRef, maxDistance, threshold, enabled, isActive, ascendScale, layer]);
}

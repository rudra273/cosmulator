import { useEffect, useRef } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useSolarSystemStore } from "@/store/solarSystemStore";

/**
 * Watches an OrbitControls instance for zoom-out crossings and triggers
 * `ascendScale` (solar→galaxy→universe) when the camera distance exceeds
 * `maxDistance * threshold`. Debounced so a sustained zoom triggers exactly
 * once per crossing.
 *
 * `enabled` should be false (a) during a transition, (b) when a planet is
 * focused, and (c) when free-mode is on — so a fly-to-planet that ends near
 * max distance doesn't accidentally ascend.
 */
export function useAscendOnZoomOut(
  controlsRef: React.RefObject<OrbitControlsImpl | null>,
  opts: { maxDistance: number; threshold?: number; enabled: boolean }
) {
  const { maxDistance, threshold = 0.95, enabled } = opts;
  const ascendScale = useSolarSystemStore((s) => s.ascendScale);
  const armedRef = useRef(true); // re-arms when distance drops back below threshold

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const trigger = maxDistance * threshold;

    const onChange = () => {
      if (!enabled) return;
      const d = controls.getDistance();
      if (armedRef.current && d >= trigger) {
        armedRef.current = false;
        ascendScale();
      } else if (!armedRef.current && d < trigger * 0.9) {
        // Re-arm with a little hysteresis so we don't oscillate at the edge.
        armedRef.current = true;
      }
    };

    controls.addEventListener("change", onChange);
    return () => controls.removeEventListener("change", onChange);
  }, [controlsRef, maxDistance, threshold, enabled, ascendScale]);
}

import { useEffect } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useSolarSystemStore } from "@/store/solarSystemStore";

/**
 * Publishes the active layer's OrbitControls distance into the store so the
 * HUD can render a scale-aware "X LIGHT-YEARS" readout. Each layer wires this
 * in alongside its existing controls — only the active layer's controls
 * actually emit `change` events (per Phase 0's isActive gating), so the store
 * value tracks whichever layer is currently in view.
 *
 * `enabled` lets layers gate publishing during transitions if needed; default
 * is "publish whenever events fire."
 */
export function usePublishDistance(
  controlsRef: React.RefObject<OrbitControlsImpl | null>,
  enabled: boolean = true
) {
  const setCameraDistance = useSolarSystemStore((s) => s.setCameraDistance);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls || !enabled) return;

    // Publish once on mount so the HUD has a value immediately (the controls
    // don't fire `change` until the user interacts).
    setCameraDistance(controls.getDistance());

    const onChange = () => setCameraDistance(controls.getDistance());
    controls.addEventListener("change", onChange);
    return () => controls.removeEventListener("change", onChange);
  }, [controlsRef, enabled, setCameraDistance]);
}

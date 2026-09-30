import { useEffect } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useSolarSystemStore, type ViewScale } from "@/store/solarSystemStore";
import { LAYER_CAMERA_POSES } from "./cameraPoses";

/**
 * When a scale transition settles on this layer, hand the pose's orbit target
 * to its OrbitControls. useScaleTransition leaves the camera at the pose
 * looking at that target; without this the controls would re-aim at their
 * default (the origin) on the next update and jerk the view.
 */
export function useSettleTarget(controlsRef: React.RefObject<OrbitControlsImpl | null>, layer: ViewScale, isActive: boolean) {
  const settled = useSolarSystemStore((s) => s.transitionFrom === null);
  useEffect(() => {
    const controls = controlsRef.current;
    if (!isActive || !settled || !controls) return;
    controls.target.set(...LAYER_CAMERA_POSES[layer].target);
    controls.update();
  }, [controlsRef, layer, isActive, settled]);
}

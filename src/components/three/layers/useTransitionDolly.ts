import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useSolarSystemStore } from "@/store/solarSystemStore";
import { LAYER_CAMERA_POSES } from "./cameraPoses";

/**
 * During an ascend transition, smoothly dolly the camera from wherever it
 * was (typically near the previous layer's maxDistance) to the incoming
 * layer's overview pose. Coordinated with useCrossfade's `outgoingScale`
 * and opacity ramps for a NASA-Eyes-style continuous zoom-out.
 *
 * `cameraDollyT` comes from useCrossfade: null in steady state and during
 * descend (so the layers' normal snap behaviour runs instead), and 0→1
 * during ascend. We capture the camera position on the first ascend frame
 * and lerp toward the incoming layer's pose each frame after.
 *
 * Mounted once inside the Canvas tree alongside LayerSwitcher.
 */
export function useTransitionDolly(cameraDollyT: number | null) {
  const { camera } = useThree();
  const startPosRef = useRef<THREE.Vector3 | null>(null);

  // Reset the captured start pos as soon as the ascend ends (cameraDollyT
  // goes back to null). Without this, a subsequent ascend would reuse the
  // stale start position from the previous one.
  useEffect(() => {
    if (cameraDollyT === null) startPosRef.current = null;
  }, [cameraDollyT]);

  useFrame(() => {
    if (cameraDollyT === null) return;

    if (startPosRef.current === null) {
      startPosRef.current = camera.position.clone();
    }

    // Read viewScale fresh each frame — it was already updated by ascendScale
    // before this hook fires, so it points at the incoming layer.
    const viewScale = useSolarSystemStore.getState().viewScale;
    const targetPos = LAYER_CAMERA_POSES[viewScale].cameraPos;
    camera.position.lerpVectors(
      startPosRef.current,
      new THREE.Vector3(targetPos[0], targetPos[1], targetPos[2]),
      cameraDollyT
    );
  });
}

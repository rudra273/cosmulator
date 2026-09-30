import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "three";
import type * as THREE from "three";
import { useSolarSystemStore, type ViewScale } from "@/store/solarSystemStore";
import { getLayerPose } from "./cameraPoses";
import { lastControlsTarget } from "./usePublishDistance";
import { TRANSITION_MS } from "./useCrossfade";
import { easeInOut, interpolateCamera, outgoingTransform, planHandoff, targetProgress, toIncoming, type TransitionDir, type Vec3 } from "@/lib/scale-transition";

interface Flight {
  from: ViewScale;
  to: ViewScale;
  dir: TransitionDir;
  elapsed: number;
  startPos: Vec3;
  startTarget: Vec3;
  endPos: Vec3;
  endTarget: Vec3;
}

const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/**
 * Anchor-matched scale transitions. When the store starts an ascend or
 * descend, everything switches to the incoming layer's coordinates: the
 * outgoing layer's wrapper group is placed at the shared anchor (the Sun, the
 * Orion Spur marker, the Milky Way) and scaled so the first frame looks
 * identical to the last steady one. The camera then flies to the incoming
 * layer's overview in log-distance space. Layer OrbitControls are disabled
 * for the duration (they would clamp the camera to their own limits).
 */
const BASE_FOV = 45;

/** Portrait screens see only a sliver horizontally at 45° vertical FOV; above
 *  the Solar System, widen it so a phone shows roughly what a laptop does. */
export function overviewFov(aspect: number): number {
  if (aspect >= 1) return BASE_FOV;
  const half = Math.atan((Math.tan(((BASE_FOV / 2) * Math.PI) / 180) * 0.8) / aspect);
  return Math.min(75, Math.max(BASE_FOV, (2 * half * 180) / Math.PI));
}

export function useScaleTransition(groups: React.RefObject<Partial<Record<ViewScale, THREE.Group | null>>>) {
  const flight = useRef<Flight | null>(null);

  useFrame(({ camera, size }, delta) => {
    const s = useSolarSystemStore.getState();

    // Ease the field of view: 45° in the Solar layer (its framing code relies
    // on it), wider on portrait screens everywhere above it.
    if (camera instanceof PerspectiveCamera) {
      const targetFov = s.viewScale === "solar" ? BASE_FOV : overviewFov(size.width / size.height);
      if (Math.abs(camera.fov - targetFov) > 0.01) {
        camera.fov += (targetFov - camera.fov) * Math.min(1, delta * 3);
        camera.updateProjectionMatrix();
      }
    }

    const running = s.transitionFrom !== null && s.transitionDir !== null;

    // Only the outgoing layer of a running transition is ever displaced;
    // every other wrapper stays at identity, whatever happened before.
    const outgoing = running && flight.current?.from === s.transitionFrom ? s.transitionFrom : null;
    for (const [layer, g] of Object.entries(groups.current)) {
      if (g && layer !== outgoing && (g.scale.x !== 1 || g.position.lengthSq() !== 0)) {
        g.position.set(0, 0, 0);
        g.scale.setScalar(1);
      }
    }

    if (!running) {
      if (flight.current) {
        // Settle exactly on the destination and hand the camera back.
        const f = flight.current;
        camera.position.set(...f.endPos);
        camera.lookAt(...f.endTarget);
        const g = groups.current[f.from];
        if (g) { g.position.set(0, 0, 0); g.scale.setScalar(1); }
        flight.current = null;
      }
      return;
    }

    if (!flight.current || flight.current.from !== s.transitionFrom || flight.current.to !== s.viewScale) {
      const from = s.transitionFrom!, to = s.viewScale;
      const pose = getLayerPose(to, s.isRealisticScale);
      const camPos = camera.position.toArray() as Vec3;
      const target = lastControlsTarget.toArray() as Vec3;
      const handoff = planHandoff(from, to, s.transitionDir!, {
        cameraDistance: dist(camPos, target),
        incomingPoseDistance: dist(pose.cameraPos, pose.target),
        outgoingStuffScale: s.pullbackSnapshot?.stuff
      });
      if (!handoff) return;
      const g = groups.current[from];
      if (g) {
        const { position, scale } = outgoingTransform(handoff);
        g.position.set(...position);
        g.scale.setScalar(scale);
      }
      flight.current = {
        from, to, dir: handoff.dir, elapsed: 0,
        startPos: toIncoming(handoff, camPos),
        startTarget: toIncoming(handoff, target),
        endPos: pose.cameraPos,
        endTarget: pose.target
      };
    }

    const f = flight.current;
    f.elapsed += Math.min(delta, 0.1) * 1000;
    const raw = Math.min(1, f.elapsed / TRANSITION_MS);
    const { position, target } = interpolateCamera(f.startPos, f.startTarget, f.endPos, f.endTarget, easeInOut(raw), targetProgress(f.dir, raw));
    camera.position.set(...position);
    camera.lookAt(...target);
    lastControlsTarget.set(...target);
  }, -2);
}

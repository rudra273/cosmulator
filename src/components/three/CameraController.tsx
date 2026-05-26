import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useSolarSystemStore } from "@/store/solarSystemStore";
import { getBodyById } from "@/data/bodies";
import {
  computeOrbitalPosition,
  applyOrbitalRotation,
  solveKeplerEquation,
  getScaledRadius
} from "@/lib/orbital-mechanics";
import { useAscendOnZoomOut } from "./layers/useAscendOnZoomOut";
import { usePublishDistance } from "./layers/usePublishDistance";
import * as THREE from "three";

// Moon-distance compression — must match the constants in CelestialBody so the
// camera flies to where the moon actually renders.
const STYLIZED_MOON_DISTANCE_COMPRESSION = 0.05;
const REALISTIC_MOON_DISTANCE_COMPRESSION = 0.5;

/**
 * Resolve the current world position + visual radius of any selected body
 * (planet or moon). Returns null if the id doesn't resolve to a focusable
 * body. For a moon, position = parent's heliocentric position + moon's
 * relative offset (same Kepler math MoonBodyView uses).
 */
function getSelectedBodyWorldPose(
  selectedId: string,
  elapsedTime: number,
  isRealisticScale: boolean
): { worldPos: [number, number, number]; radius: number } | null {
  const body = getBodyById(selectedId);
  if (!body) return null;

  if (body.type === "planet") {
    const r = getScaledRadius(body.radius, isRealisticScale);
    const pos = computeOrbitalPosition(
      body.distance,
      body.eccentricity,
      body.orbitalPeriod,
      elapsedTime,
      isRealisticScale
    );
    return { worldPos: pos, radius: r };
  }

  if (body.type === "moon") {
    const parent = getBodyById(body.parentId);
    if (!parent || parent.type !== "planet") return null;
    // Parent's heliocentric position (legacy sweep — matches what fly-to
    // already does for planets).
    const [px, py, pz] = computeOrbitalPosition(
      parent.distance,
      parent.eccentricity,
      parent.orbitalPeriod,
      elapsedTime,
      isRealisticScale
    );
    // Moon's local offset from parent (mirrors MoonBodyView's inline math).
    const parentScaledRadius = getScaledRadius(parent.radius, isRealisticScale);
    const compression = isRealisticScale
      ? REALISTIC_MOON_DISTANCE_COMPRESSION
      : STYLIZED_MOON_DISTANCE_COMPRESSION;
    const a = parentScaledRadius * body.distance * compression;
    const M = (2 * Math.PI * elapsedTime) / body.orbitalPeriod;
    const E = solveKeplerEquation(M, body.eccentricity);
    const trueAnomaly = 2 * Math.atan2(
      Math.sqrt(1 + body.eccentricity) * Math.sin(E / 2),
      Math.sqrt(1 - body.eccentricity) * Math.cos(E / 2)
    );
    const r = a * (1 - body.eccentricity * Math.cos(E));
    const flat: [number, number, number] = [
      r * Math.cos(trueAnomaly),
      0,
      r * Math.sin(trueAnomaly)
    ];
    const [lx, ly, lz] = applyOrbitalRotation(flat, {
      inclinationRad: (body.inclinationDeg * Math.PI) / 180,
      longitudeAscendingNodeRad: 0,
      argumentOfPeriapsisRad: 0
    });
    const moonRadius = getScaledRadius(body.radius, isRealisticScale);
    return {
      worldPos: [px + lx, py + ly, pz + lz],
      radius: moonRadius
    };
  }

  // Stars or unknown — not directly focusable via fly-to.
  return null;
}

export default function CameraController() {
  const { selectedPlanetId, elapsedTime, isRealisticScale, freeMode, transitionFrom } =
    useSolarSystemStore();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const { camera } = useThree();

  // When the user zooms out past ~95% of the Solar layer's maxDistance AND is
  // in overview (no planet, not free), trigger ascendScale() → Galaxy. The
  // hook debounces so a sustained drag triggers exactly once per crossing.
  const solarMaxDistance = isRealisticScale ? 8000 : 350;
  useAscendOnZoomOut(controlsRef, {
    maxDistance: solarMaxDistance,
    threshold: 0.95,
    enabled: !selectedPlanetId && !freeMode && transitionFrom === null
  });

  // Publish camera distance to the store so HUD's scale readout updates.
  usePublishDistance(controlsRef);

  const prevSelectedIdRef = useRef<string | null>(null);
  const prevFreeModeRef = useRef<boolean>(false);

  // When this component mounts (Solar layer became active again — e.g. user
  // descended from Galaxy), snap camera + target to the Solar overview pose
  // so we don't inherit wherever the outer-layer camera happened to be.
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    camera.position.set(0, 50, 95);
    camera.updateProjectionMatrix();
    controls.target.set(0, 0, 0);
    controls.update();
    // Run only once when this controller mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Whether the camera is currently following the selected planet. Set true
  // when a planet is focused; released the moment the user manually moves the
  // camera (drag/zoom/pinch), so closing the popup keeps the camera locked on
  // the planet until the user decides to explore on their own.
  const followLockRef = useRef<boolean>(false);

  // Release the follow-lock on any manual camera interaction.
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const releaseLock = () => { followLockRef.current = false; };
    controls.addEventListener("start", releaseLock);
    return () => controls.removeEventListener("start", releaseLock);
  }, []);

  // Focus and Zoom trigger when the selected planet changes
  useEffect(() => {
    if (!controlsRef.current) return;

    const controls = controlsRef.current;

    const selectionChanged = selectedPlanetId !== prevSelectedIdRef.current;
    const freeModeJustTurnedOff = prevFreeModeRef.current && !freeMode;

    // Decide what camera move (if any) this state change implies.
    // - Focus a planet: fly in.
    // - Return to overview: fly home — unless we're entering free mode (then we
    //   just unlock in place), and also when free mode is turned off via the
    //   Solar System button while selection is already null.
    const shouldFlyToPlanet = selectionChanged && !!selectedPlanetId;
    const shouldFlyHome =
      (selectionChanged && !selectedPlanetId && !freeMode) ||
      (freeModeJustTurnedOff && !selectedPlanetId);

    if (shouldFlyToPlanet || shouldFlyHome) {
      if (shouldFlyToPlanet) {
        // A body was focused — engage follow-lock for the fly-in + tracking.
        followLockRef.current = true;
        // Resolve the body's world position + radius (works for planets AND
        // moons — moons are parent.worldPos + relative offset).
        const pose = getSelectedBodyWorldPose(
          selectedPlanetId!,
          elapsedTime,
          isRealisticScale
        );
        if (pose) {
          const r = pose.radius;
          const [px, py, pz] = pose.worldPos;

          // Position camera slightly offset from the body, sized appropriately
          const zoomDistance = r * 3.5;
          const targetCamPos = new THREE.Vector3(
            px + zoomDistance,
            py + zoomDistance * 0.4,
            pz + zoomDistance
          );

          // Animate the camera transition
          let t = 0;
          const startPos = camera.position.clone();
          const startTarget = controls.target.clone();

          const animateTransition = () => {
            if (t >= 1) {
              camera.position.copy(targetCamPos);
              controls.target.set(px, py, pz);
              controls.update();
              return;
            }
            t += 0.08; // speed of fly-to animation

            // Re-evaluate current body position each frame (parent + moon
            // both move).
            const cur = getSelectedBodyWorldPose(
              selectedPlanetId!,
              elapsedTime,
              isRealisticScale
            );
            if (!cur) return; // shouldn't happen mid-animation
            const [currentPx, currentPy, currentPz] = cur.worldPos;

            const currentZoomDistance = cur.radius * 3.5;
            const currentTargetCamPos = new THREE.Vector3(
              currentPx + currentZoomDistance,
              currentPy + currentZoomDistance * 0.4,
              currentPz + currentZoomDistance
            );

            camera.position.lerpVectors(startPos, currentTargetCamPos, t);
            controls.target.lerpVectors(startTarget, new THREE.Vector3(currentPx, currentPy, currentPz), t);
            controls.update();

            requestAnimationFrame(animateTransition);
          };

          animateTransition();
        }
      } else {
        // Returning to solar overview
        const startPos = camera.position.clone();
        const startTarget = controls.target.clone();
        const targetCamPos = new THREE.Vector3(0, 50, 95);
        const targetTarget = new THREE.Vector3(0, 0, 0);
        
        let t = 0;
        const animateReturn = () => {
          if (t >= 1) {
            camera.position.copy(targetCamPos);
            controls.target.copy(targetTarget);
            controls.update();
            return;
          }
          t += 0.08;
          camera.position.lerpVectors(startPos, targetCamPos, t);
          controls.target.lerpVectors(startTarget, targetTarget, t);
          controls.update();
          requestAnimationFrame(animateReturn);
        };
        
        animateReturn();
      }
    }

    // Always keep the trackers in sync so transitions are detected correctly.
    prevSelectedIdRef.current = selectedPlanetId;
    prevFreeModeRef.current = freeMode;
  }, [selectedPlanetId, freeMode, isRealisticScale, camera, elapsedTime]);

  // Keep camera locked to moving planet inside the render loop
  useFrame(() => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;

    // Follow the body only while the lock is engaged. Once the user moves
    // the camera (lock released) we stop tracking and leave the camera put,
    // even though a body is still selected and its popup may be closed.
    if (selectedPlanetId && followLockRef.current) {
      const pose = getSelectedBodyWorldPose(
        selectedPlanetId,
        elapsedTime,
        isRealisticScale
      );
      if (pose) {
        const [px, py, pz] = pose.worldPos;

        const currentTarget = new THREE.Vector3().copy(controls.target);
        const nextTarget = new THREE.Vector3(px, py, pz);
        
        // Difference in target position
        const diff = new THREE.Vector3().subVectors(nextTarget, currentTarget);
        
        // Lock camera focus by shifting both target and camera position together
        controls.target.copy(nextTarget);
        camera.position.add(diff);
      }
    } else if (!selectedPlanetId && !freeMode) {
      // True overview mode (no planet selected, not free-roaming): if the orbit
      // target drifted, ease it back to origin. Skipped when a planet is still
      // selected but the camera was freed, and skipped entirely in free mode so
      // the user can pan and zoom anywhere without being pulled back to the sun.
      if (controls.target.lengthSq() > 0.001) {
        controls.target.lerp(new THREE.Vector3(0, 0, 0), 0.05);
      }
    }

    controls.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      enablePan
      screenSpacePanning // pan moves the target across the screen plane — intuitive for free roaming
      maxDistance={isRealisticScale ? 8000 : 350}
      minDistance={isRealisticScale ? 0.1 : 1.2}
      // Free mode lets the camera dip below the orbital plane to view from any
      // angle; otherwise keep it above the plane (looks better).
      maxPolarAngle={freeMode ? Math.PI : Math.PI / 2 - 0.01}
      // In free mode the primary drag PANS (move through space) — the intuitive
      // "fly around" gesture — with rotate on right-drag/two-finger. Normal mode
      // keeps the classic rotate-on-drag for orbiting the sun/planet.
      mouseButtons={
        freeMode
          ? { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }
          : { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }
      }
      touches={
        freeMode
          ? { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE }
          : { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }
      }
    />
  );
}

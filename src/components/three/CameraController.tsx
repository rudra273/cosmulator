import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useSolarSystemStore } from "@/store/solarSystemStore";
import { getBodyById } from "@/data/bodies";
import type { PlanetBody } from "@/data/bodies/types";
import {
  computeOrbitalPosition,
  computeMeanAnomalyAndAngles,
  J2000_EPOCH_MS,
  MS_PER_DAY,
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

// Match the rendered ephemeris, including the present-day orbital plane.
// The legacy time sweep pointed the camera at empty space on selection.
function planetPosition(body: PlanetBody, elapsedTime: number, realistic: boolean) {
  if (!body.ephemeris) {
    return computeOrbitalPosition(body.distance, body.eccentricity, body.orbitalPeriod, elapsedTime, realistic);
  }
  const today = (Date.now() - J2000_EPOCH_MS) / MS_PER_DAY;
  const plane = computeMeanAnomalyAndAngles(body.ephemeris, today, realistic);
  const { meanAnomalyAtEpochRad } = computeMeanAnomalyAndAngles(body.ephemeris, today + elapsedTime, realistic);
  return computeOrbitalPosition(body.distance, body.eccentricity, body.orbitalPeriod, 0, realistic, plane, meanAnomalyAtEpochRad);
}

/**
 * Resolve the current world position + visual radius of any selected body
 * (planet or moon). Returns null if the id doesn't resolve to a focusable
 * body. For a moon, position = parent's heliocentric position + moon's
 * relative offset (same Kepler math MoonBodyView uses).
 */
// Per-body multiplier on the planet radius for the post-fly-to camera offset.
// Lower = camera ends up closer to the body. Tuned so the subject planet
// fills roughly one-third of the vertical viewport at default FOV — big
// enough to read as the portrait subject, small enough that the
// background bodies (shrunk by useFocusEmphasis) still provide a sense of
// place. Moons stay slightly wider so the parent planet remains visible.
function offsetFactor(bodyType: "planet" | "moon"): number {
  return bodyType === "moon" ? 2.4 : 1.8;
}

function getSelectedBodyWorldPose(
  selectedId: string,
  elapsedTime: number,
  isRealisticScale: boolean
): { worldPos: [number, number, number]; radius: number; type: "planet" | "moon" } | null {
  const body = getBodyById(selectedId);
  if (!body) return null;

  if (body.type === "planet") {
    const r = getScaledRadius(body.radius, isRealisticScale);
    const pos = planetPosition(body, elapsedTime, isRealisticScale);
    return { worldPos: pos, radius: r, type: "planet" };
  }

  if (body.type === "moon") {
    const parent = getBodyById(body.parentId);
    if (!parent || parent.type !== "planet") return null;
    const [px, py, pz] = planetPosition(parent, elapsedTime, isRealisticScale);
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
      radius: moonRadius,
      type: "moon"
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
  // in overview (no planet, not free), trigger ascendScale() → Stellar. The
  // hook debounces so a sustained drag triggers exactly once per crossing.
  // Stylized maxDistance is the extended pull-back-zone bound from
  // cameraPoses; realistic-scale gets a proportionally larger bound so
  // ascend doesn't fire just because the camera sits naturally far out.
  const solarMaxDistance = isRealisticScale ? 30000 : 1400;
  useAscendOnZoomOut(controlsRef, {
    maxDistance: solarMaxDistance,
    threshold: 0.95,
    enabled: !selectedPlanetId && !freeMode && transitionFrom === null,
    // CameraController is rendered only while Solar is active (gated by
    // {isActive && <CameraController />} in SolarLayer), so while this
    // component exists, the layer is always active.
    isActive: true,
    layer: "solar"
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

  // True while the fly-to-planet rAF animation is in flight. The per-frame
  // follow-lock (in useFrame below) reads this and skips its update so it
  // doesn't fight the lerp — without this gate the follow would write
  // `controls.target = planetPos` mid-lerp, and `camera.position += diff`
  // would teleport the camera past where the lerp expected, leaving the
  // planet off-centre at the settle frame.
  const flyingInRef = useRef<boolean>(false);

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
        // Gate the per-frame follow until the fly-in lerp finishes (see
        // flyingInRef declaration). Cleared on the settle frame.
        flyingInRef.current = true;
        // Resolve the body's world position + radius (works for planets AND
        // moons — moons are parent.worldPos + relative offset).
        const pose = getSelectedBodyWorldPose(
          selectedPlanetId!,
          elapsedTime,
          isRealisticScale
        );
        if (pose) {
          // Animate the camera transition. We re-read the body pose every
          // frame because the body keeps orbiting during the ~200 ms fly-in;
          // anchoring to the stale t=0 pose would leave the planet a few
          // units off-centre by the settle frame.
          let t = 0;
          const startPos = camera.position.clone();
          const startTarget = controls.target.clone();

          // Tight offset per body class — see offsetFactor(). zoomDistance
          // is recomputed against the current pose each frame so the
          // arrival vantage matches the body's *current* size and position,
          // not the snapshot taken when the fly-in started.
          const computeCamPos = (curPx: number, curPy: number, curPz: number, curR: number, type: "planet" | "moon") => {
            const d = curR * offsetFactor(type);
            return new THREE.Vector3(curPx + d, curPy + d * 0.4, curPz + d);
          };

          const animateTransition = () => {
            // Read fresh on every frame including the settle frame, so the
            // final write places the planet dead-centre at controls.target.
            const cur = getSelectedBodyWorldPose(
              selectedPlanetId!,
              elapsedTime,
              isRealisticScale
            );
            if (!cur) {
              // Body vanished mid-animation (shouldn't happen). Release
              // the gate so we don't leave the follow-lock stuck off.
              flyingInRef.current = false;
              return;
            }
            const [currentPx, currentPy, currentPz] = cur.worldPos;
            const currentTargetCamPos = computeCamPos(
              currentPx,
              currentPy,
              currentPz,
              cur.radius,
              cur.type
            );

            if (t >= 1) {
              // Settle frame: write the fresh pose directly. Using the
              // captured t=0 pose here was the root cause of "planet
              // ends up off-centre after fly-in" — those values were
              // a couple of frames stale by the time we settled.
              camera.position.copy(currentTargetCamPos);
              controls.target.set(currentPx, currentPy, currentPz);
              controls.update();
              // Release the per-frame follow gate so the body-tracking
              // useFrame can take over (planet keeps centred as it orbits).
              flyingInRef.current = false;
              return;
            }
            t += 0.08; // speed of fly-to animation

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

    // Follow the body only while the lock is engaged AND we're not in the
    // middle of a fly-in lerp. Mixing the two would let this per-frame
    // shift fight the rAF lerp every frame, leaving the planet off-centre
    // at the settle frame. Once the user moves the camera (lock released)
    // we stop tracking and leave the camera put, even though a body is
    // still selected and its popup may be closed.
    if (selectedPlanetId && followLockRef.current && !flyingInRef.current) {
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
      // Extended max so the wheel keeps moving the camera into the pull-back
      // zone past where the system "fills the view" naturally. usePullback
      // shrinks the planets toward the Sun as we travel through this zone
      // so the wheel feels like it does something instead of stalling.
      maxDistance={isRealisticScale ? 30000 : 1400}
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

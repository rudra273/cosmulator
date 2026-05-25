import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useSolarSystemStore } from "@/store/solarSystemStore";
import { PLANETS } from "@/data/bodies";
import { computeOrbitalPosition, getScaledRadius } from "@/lib/orbital-mechanics";
import * as THREE from "three";

export default function CameraController() {
  const { selectedPlanetId, elapsedTime, isRealisticScale, freeMode } = useSolarSystemStore();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const { camera } = useThree();

  const prevSelectedIdRef = useRef<string | null>(null);
  const prevFreeModeRef = useRef<boolean>(false);

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
        // A planet was focused — engage follow-lock for the fly-in + tracking.
        followLockRef.current = true;
        // Zooming in on a planet
        const planet = PLANETS.find(p => p.id === selectedPlanetId);
        if (planet) {
          const r = getScaledRadius(planet.radius, isRealisticScale);
          const [px, py, pz] = computeOrbitalPosition(
            planet.distance,
            planet.eccentricity,
            planet.orbitalPeriod,
            elapsedTime,
            isRealisticScale
          );
          
          // Position camera slightly offset from the planet, sized appropriately
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
            
            // Re-evaluate current planet position to account for its movement during flight
            const [currentPx, currentPy, currentPz] = computeOrbitalPosition(
              planet.distance,
              planet.eccentricity,
              planet.orbitalPeriod,
              elapsedTime,
              isRealisticScale
            );
            
            const currentZoomDistance = r * 3.5;
            const currentTargetCamPos = new THREE.Vector3(
              currentPx + currentZoomDistance,
              currentPy + currentZoomDistance * 0.4,
              currentPz + currentZoomDistance
            );

            // Interpolate position and target
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

    // Follow the planet only while the lock is engaged. Once the user moves
    // the camera (lock released) we stop tracking and leave the camera put,
    // even though a planet is still selected and its popup may be closed.
    if (selectedPlanetId && followLockRef.current) {
      const planet = PLANETS.find(p => p.id === selectedPlanetId);
      if (planet) {
        // Compute planet's current coordinates
        const [px, py, pz] = computeOrbitalPosition(
          planet.distance,
          planet.eccentricity,
          planet.orbitalPeriod,
          elapsedTime,
          isRealisticScale
        );
        
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

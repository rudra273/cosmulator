import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useSolarSystemStore } from "@/store/solarSystemStore";
import { PLANETS } from "@/data/planets";
import { computeOrbitalPosition, getScaledRadius } from "@/lib/orbital-mechanics";
import * as THREE from "three";

export default function CameraController() {
  const { selectedPlanetId, elapsedTime, isRealisticScale } = useSolarSystemStore();
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();
  
  const prevSelectedIdRef = useRef<string | null>(null);

  // Focus and Zoom trigger when the selected planet changes
  useEffect(() => {
    if (!controlsRef.current) return;
    
    const controls = controlsRef.current;
    
    if (selectedPlanetId !== prevSelectedIdRef.current) {
      if (selectedPlanetId) {
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
      prevSelectedIdRef.current = selectedPlanetId;
    }
  }, [selectedPlanetId, isRealisticScale, camera, elapsedTime]);

  // Keep camera locked to moving planet inside the render loop
  useFrame(() => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;

    if (selectedPlanetId) {
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
    } else {
      // Overview mode: if orbit target is drifted, bring it back to origin
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
      maxDistance={isRealisticScale ? 8000 : 350}
      minDistance={isRealisticScale ? 0.1 : 1.2}
      maxPolarAngle={Math.PI / 2 - 0.01} // Don't allow camera to go below orbital plane (looks better)
    />
  );
}

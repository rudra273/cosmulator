import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";
import { useSolarSystemStore } from "@/store/solarSystemStore";
import { PLANETS } from "@/data/planets";
import Sun from "./Sun";
import Planet from "./Planet";
import CameraController from "./CameraController";

// Dynamic Asteroid Belt Component
function AsteroidBelt() {
  const { isRealisticScale, showAsteroidBelt, elapsedTime } = useSolarSystemStore();
  const pointsRef = useRef<THREE.Points | null>(null);
  
  const count = 1200;

  // Generate random asteroid orbits
  const asteroidData = useMemo(() => {
    const radii: number[] = [];
    const inclinations: number[] = [];
    const initialAngles: number[] = [];
    const speeds: number[] = [];
    const sizes: number[] = [];

    // Inner & outer boundaries in AU
    const minAU = 2.1;
    const maxAU = 3.3;

    for (let i = 0; i < count; i++) {
      // Random distance in AU
      const distanceAU = minAU + Math.random() * (maxAU - minAU);
      radii.push(distanceAU);
      
      // Minor inclinations out of orbital plane
      inclinations.push((Math.random() - 0.5) * 0.08); // radians
      
      // Random starting angle in orbit
      initialAngles.push(Math.random() * Math.PI * 2);
      
      // Speed inversely proportional to distance (Keplerian-ish)
      speeds.push(0.3 / Math.pow(distanceAU, 1.5));
      
      // Variable sizes for particles
      sizes.push(0.04 + Math.random() * 0.08);
    }

    return { radii, inclinations, initialAngles, speeds, sizes };
  }, []);

  // Compute position buffer
  const [positions, initialSizes] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    return [pos, sz];
  }, []);

  useFrame((state) => {
    if (!pointsRef.current || !showAsteroidBelt) return;

    // Retrieve active timeScale
    const timeScale = useSolarSystemStore.getState().timeScale;
    const storeElapsedTime = useSolarSystemStore.getState().elapsedTime;

    const points = pointsRef.current;
    const geometry = points.geometry;
    const posAttr = geometry.getAttribute("position") as THREE.BufferAttribute;

    const { radii, inclinations, initialAngles, speeds } = asteroidData;

    // Stylized scale vs realistic scale dimensions
    const scaleFactor = isRealisticScale ? 150 : 25;
    const baseOffset = isRealisticScale ? 0 : 15;

    for (let i = 0; i < count; i++) {
      // Calculate active angle = starting angle + (speed * elapsed simulated time)
      // Conversion: 1 simulated year = 365.25 days
      const angle = initialAngles[i] + (speeds[i] * storeElapsedTime * 0.02);
      
      // Map radius based on active scale mode
      let r = 0;
      if (isRealisticScale) {
        r = radii[i] * scaleFactor;
      } else {
        r = Math.pow(radii[i], 0.6) * scaleFactor + baseOffset;
      }

      const x = r * Math.cos(angle);
      const z = r * Math.sin(angle);
      // Small vertical oscillation based on inclination
      const y = r * Math.sin(inclinations[i]) * Math.sin(angle * 2);

      posAttr.setXYZ(i, x, y, z);
    }
    
    posAttr.needsUpdate = true;
  });

  if (!showAsteroidBelt) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[new Float32Array(count * 3), 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={isRealisticScale ? 0.4 : 0.18}
        color="#a69480"
        transparent
        opacity={0.65}
        sizeAttenuation={true}
      />
    </points>
  );
}

// Scene Orchestrator clock updater
function ClockUpdater() {
  const updateTime = useSolarSystemStore((state) => state.updateTime);
  useFrame((state, delta) => {
    // Advance simulated time
    // We cap delta at 0.1 seconds to avoid crazy time jumps on heavy frame lags
    updateTime(Math.min(delta, 0.1));
  });
  return null;
}

export default function SolarSystemScene() {
  const { selectPlanet, returnToOverview } = useSolarSystemStore();

  return (
    <div style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }}>
      <Canvas
        camera={{ position: [0, 50, 95], fov: 45, far: 30000 }}
        dpr={[1, 2]} // High DPI optimization
      >
        {/* Star backdrop */}
        <Stars 
          radius={300} 
          depth={60} 
          count={6000} 
          factor={7} 
          saturation={0.8} 
          fade 
          speed={1.5} 
        />

        <ambientLight intensity={0.05} />

        {/* Dynamic Simulation Clock Updater */}
        <ClockUpdater />

        {/* Central Sun component */}
        <Sun onSelect={() => returnToOverview()} />

        {/* Asteroid Belt */}
        <AsteroidBelt />

        {/* Render all 8 planets */}
        {PLANETS.map((planet) => (
          <Planet
            key={planet.id}
            planet={planet}
            onSelect={(id) => selectPlanet(id)}
          />
        ))}

        {/* Smart Camera Controller (handles tracking + zoom interpolation) */}
        <CameraController />
      </Canvas>
    </div>
  );
}

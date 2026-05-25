import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSolarSystemStore } from "@/store/solarSystemStore";
import type { ParticleFieldConfig } from "@/data/bodies/types";

interface ParticleFieldProps {
  config: ParticleFieldConfig;
}

// Generic procedural particle field (asteroid belt, debris ring, etc.).
// Orbits are stylized-Keplerian: speed falls off with distance. Honors the
// realistic/stylized scale modes and the global showAsteroidBelt toggle.
export default function ParticleField({ config }: ParticleFieldProps) {
  const { isRealisticScale, showAsteroidBelt } = useSolarSystemStore();
  const pointsRef = useRef<THREE.Points | null>(null);

  const { count, minAU, maxAU, color, sizeRange, inclination } = config;

  // Generate randomized orbits once.
  const asteroidData = useMemo(() => {
    const radii: number[] = [];
    const inclinations: number[] = [];
    const initialAngles: number[] = [];
    const speeds: number[] = [];
    const sizes: number[] = [];

    for (let i = 0; i < count; i++) {
      const distanceAU = minAU + Math.random() * (maxAU - minAU);
      radii.push(distanceAU);
      inclinations.push((Math.random() - 0.5) * inclination);
      initialAngles.push(Math.random() * Math.PI * 2);
      // Speed inversely proportional to distance (Keplerian-ish)
      speeds.push(0.3 / Math.pow(distanceAU, 1.5));
      sizes.push(sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]));
    }

    return { radii, inclinations, initialAngles, speeds, sizes };
  }, [count, minAU, maxAU, inclination, sizeRange]);

  useFrame(() => {
    if (!pointsRef.current || !showAsteroidBelt) return;

    const storeElapsedTime = useSolarSystemStore.getState().elapsedTime;

    const points = pointsRef.current;
    const geometry = points.geometry;
    const posAttr = geometry.getAttribute("position") as THREE.BufferAttribute;

    const { radii, inclinations, initialAngles, speeds } = asteroidData;

    const scaleFactor = isRealisticScale ? 150 : 25;
    const baseOffset = isRealisticScale ? 0 : 15;

    for (let i = 0; i < count; i++) {
      const angle = initialAngles[i] + speeds[i] * storeElapsedTime * 0.02;

      let r = 0;
      if (isRealisticScale) {
        r = radii[i] * scaleFactor;
      } else {
        r = Math.pow(radii[i], 0.6) * scaleFactor + baseOffset;
      }

      const x = r * Math.cos(angle);
      const z = r * Math.sin(angle);
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
        color={color}
        transparent
        opacity={0.65}
        sizeAttenuation={true}
      />
    </points>
  );
}

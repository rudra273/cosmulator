import { useShallow } from "zustand/react/shallow";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { simulationDays } from "@/lib/simulation-time";
import { getScaledDistance } from "@/lib/orbital-mechanics";
import { focusSpread } from "@/lib/body-position";
import { useSolarSystemStore } from "@/store/solarSystemStore";
import type { ParticleFieldConfig } from "@/data/bodies/types";

interface ParticleFieldProps {
  config: ParticleFieldConfig;
}

interface FieldData {
  radii: number[];
  inclinations: number[];
  initialAngles: number[];
  speeds: number[];
  sizes: number[];
}

// Build the randomized orbits once. Kept out of render (called from a lazy
// useState initializer) so the impurity (Math.random) runs a single time.
function generateFieldData(config: ParticleFieldConfig): FieldData {
  const { count, minAU, maxAU, sizeRange, inclination } = config;
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
    speeds.push(2 * Math.PI / (365.25 * Math.pow(distanceAU, 1.5)));
    sizes.push(sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]));
  }

  return { radii, inclinations, initialAngles, speeds, sizes };
}

// Orbit positions are computed in the vertex shader from the simulation
// date (angle = start + speed · days), so the CPU never touches the points
// after setup: the stock PointsMaterial draws them, with only its position
// swapped for the orbit. Same maths as before, per vertex instead of in JS.
const ORBIT_VERTEX = /* glsl */ `
  float orbitAngle = mod(aOrbit.x + aOrbit.y * uDays, 6.283185307179586);
  float orbitR = aOrbit.z * uSpread;
  vec3 transformed = vec3(orbitR * cos(orbitAngle), orbitR * aOrbit.w * sin(2.0 * orbitAngle), orbitR * sin(orbitAngle));
`;

// Generic procedural particle field (asteroid belt, debris ring, etc.).
// Orbits are stylized-Keplerian: speed falls off with distance. Honors the
// realistic/stylized scale modes and the global showAsteroidBelt toggle.
export default function ParticleField({ config }: ParticleFieldProps) {
  const { isRealisticScale, showAsteroidBelt } = useSolarSystemStore(useShallow(s => ({ isRealisticScale: s.isRealisticScale, showAsteroidBelt: s.showAsteroidBelt })));

  const { count, color } = config;

  // Generate the randomized orbits once (lazy init keeps Math.random out of render).
  const [asteroidData] = useState<FieldData>(() => generateFieldData(config));

  // Per point: start angle, angular speed (rad/day), scene radius before the
  // focus spread (same distance scale as the planets, so belts stay between
  // their orbits), sin(inclination). Rebuilt only when the scale mode flips.
  const geometry = useMemo(() => {
    const { radii, inclinations, initialAngles, speeds } = asteroidData;
    const orbit = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      orbit.set([initialAngles[i], speeds[i], getScaledDistance(radii[i], isRealisticScale), Math.sin(inclinations[i])], i * 4);
    }
    const g = new THREE.BufferGeometry();
    // Unused by the shader; sets the draw count.
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute("aOrbit", new THREE.BufferAttribute(orbit, 4));
    return g;
  }, [asteroidData, count, isRealisticScale]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useRef({ uDays: { value: 0 }, uSpread: { value: 1 } });
  const onBeforeCompile = useMemo(() => (shader: THREE.WebGLProgramParametersWithUniforms) => {
    Object.assign(shader.uniforms, uniforms.current);
    shader.vertexShader = shader.vertexShader
      .replace("void main() {", "attribute vec4 aOrbit;\nuniform float uDays;\nuniform float uSpread;\nvoid main() {")
      .replace("#include <begin_vertex>", ORBIT_VERTEX);
  }, []);

  useFrame(() => {
    if (!showAsteroidBelt) return;
    const clock = useSolarSystemStore.getState();
    uniforms.current.uDays.value = simulationDays(clock.epochMs, clock.elapsedTime);
    uniforms.current.uSpread.value = isRealisticScale ? 1 : focusSpread.value;
  });

  if (!showAsteroidBelt) return null;

  return (
    // Positions live in the shader, so the (zeroed) geometry bounds mean
    // nothing to the frustum test.
    <points geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        size={isRealisticScale ? 0.4 : 0.18}
        color={color}
        transparent
        opacity={0.65}
        sizeAttenuation={true}
        onBeforeCompile={onBeforeCompile}
        customProgramCacheKey={() => "orbitingParticles"}
      />
    </points>
  );
}

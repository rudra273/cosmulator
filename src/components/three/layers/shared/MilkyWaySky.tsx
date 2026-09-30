import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { milkyWaySkyVertexShader, milkyWaySkyFragmentShader } from "@/lib/shaders/milkyWaySky.glsl";
import { GALACTIC_CENTER_DIRECTION } from "@/data/galaxy";

const RADIUS = 40000; // world units; inside the 100,000 far plane

/**
 * The band of the Milky Way on a sky sphere that travels with the camera,
 * so it reads as infinitely far: zooming around the neighbourhood never
 * turns it into a ball. Compensates for any parent scale (the layer wrapper
 * is scaled during transitions).
 */
export default function MilkyWaySky({ opacity = 1 }: { opacity?: number }) {
  const mesh = useRef<THREE.Mesh | null>(null);
  const mat = useRef<THREE.ShaderMaterial | null>(null);
  const tmp = useRef({ scale: new THREE.Vector3(), pos: new THREE.Vector3() });
  const [uniforms] = useState(() => ({
    uOpacity: { value: opacity },
    uGalacticCenter: { value: new THREE.Vector3(...GALACTIC_CENTER_DIRECTION) }
  }));
  useFrame(({ camera }) => {
    const m = mesh.current;
    if (!m || !m.parent) return;
    if (mat.current) mat.current.uniforms.uOpacity.value = opacity;
    const { scale, pos } = tmp.current;
    m.parent.getWorldScale(scale);
    m.position.copy(m.parent.worldToLocal(pos.copy(camera.position)));
    m.scale.setScalar(RADIUS / Math.max(scale.x, 1e-9));
  });
  return (
    <mesh ref={mesh} frustumCulled={false} renderOrder={-10}>
      <sphereGeometry args={[1, 64, 32]} />
      <shaderMaterial
        ref={mat}
        vertexShader={milkyWaySkyVertexShader}
        fragmentShader={milkyWaySkyFragmentShader}
        uniforms={uniforms}
        side={THREE.BackSide}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

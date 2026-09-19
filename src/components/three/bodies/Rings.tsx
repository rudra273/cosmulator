/* eslint-disable react-hooks/immutability -- Three.js material refs are intentionally updated in the render loop. */
import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ringsVertexShader, ringsFragmentShader } from "@/lib/shaders/rings.glsl";

interface RingsProps {
  innerRadius: number;
  outerRadius: number;
  planetRadius: number;
  surfaceMaterial: RefObject<THREE.ShaderMaterial | null>;
}
export default function Rings({ innerRadius, outerRadius, planetRadius, surfaceMaterial }: RingsProps) {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.ShaderMaterial>(null);
  const inverse = useMemo(() => new THREE.Matrix4(), []);
  const uniforms = useMemo(() => ({
    uInnerRadius: { value: innerRadius }, uOuterRadius: { value: outerRadius },
    uPlanetRadius: { value: planetRadius }, uLocalSun: { value: new THREE.Vector3() },
    uRingMap: { value: null }, uHasRingMap: { value: false }
  }), [innerRadius, outerRadius, planetRadius]);

  useFrame(() => {
    if (!mesh.current || !material.current || !surfaceMaterial.current) return;
    mesh.current.updateWorldMatrix(true, false);
    inverse.copy(mesh.current.matrixWorld).invert();
    const surface = surfaceMaterial.current.uniforms;
    const ring = material.current.uniforms;
    ring.uLocalSun.value.set(0, 0, 0).applyMatrix4(inverse);
    ring.uRingMap.value = surface.uRingMap.value;
    ring.uHasRingMap.value = surface.uHasRingMap.value;
    surface.uRingWorldToLocal.value.copy(inverse);
    surface.uInnerRadius.value = innerRadius;
    surface.uOuterRadius.value = outerRadius;
    surface.uHasRings.value = true;
  });

  return <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]}>
    <ringGeometry args={[innerRadius, outerRadius, 192]} />
    <shaderMaterial ref={material} vertexShader={ringsVertexShader} fragmentShader={ringsFragmentShader}
      uniforms={uniforms} transparent side={THREE.DoubleSide} depthWrite={false} />
  </mesh>;
}

import { useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { eclipseGLSL } from '@/lib/shaders/eclipse.glsl';
import { surfaceVertexShader } from '@/lib/shaders/surface.glsl';
import { useSolarSystemStore } from '@/store/solarSystemStore';
import { simulationDays, rotationAtDays } from '@/lib/simulation-time';
// Shared maps, but an independent sphere: clouds silhouette above the limb.
export default function CloudShell({ radius, uniforms, surface, segments }: { radius: number; uniforms: Record<string, THREE.IUniform>; surface: RefObject<THREE.ShaderMaterial | null>; segments: number }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const s = useSolarSystemStore.getState();
    if (material.current) {
      material.current.uniforms.uCloudMap.value = uniforms.uCloudMap.value;
      material.current.uniforms.uHasEarthMaps.value = uniforms.uHasEarthMaps.value;
      material.current.uniforms.uTime.value = simulationDays(s.epochMs, s.elapsedTime);
      if (surface.current) {
        for (const name of ['uOccluderPosition', 'uOccluderRadius', 'uSunRadius']) material.current.uniforms[name].value = surface.current.uniforms[name].value;
      }
    }
    if (ref.current) ref.current.rotation.y = rotationAtDays(simulationDays(s.epochMs, s.elapsedTime), 23.93);
  });
  return <mesh ref={ref}>
    <sphereGeometry args={[radius * 1.008, segments, segments]} />
    <shaderMaterial ref={material} uniforms={uniforms} transparent depthWrite={false} vertexShader={surfaceVertexShader}
      fragmentShader={`varying vec2 vUv; varying vec3 vNormal; varying vec3 vPosition;
        uniform vec3 uSunPosition; ${eclipseGLSL}
        uniform sampler2D uCloudMap; uniform bool uHasEarthMaps; uniform float uTime;
        void main() {
          if (!uHasEarthMaps) discard;
          float a = smoothstep(0.15, 0.85, texture2D(uCloudMap, vec2(vUv.x + uTime * 0.002, vUv.y)).r);
          float light = max(0.025, dot(normalize(vNormal), normalize(-vPosition)) * eclipseTransmission());
          gl_FragColor = vec4(vec3(0.94, 0.97, 1.0) * light, a * 0.88);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`} />
  </mesh>;
}

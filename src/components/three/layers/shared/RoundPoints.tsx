import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

// Round, soft-edged, additively blended points with a per-point `aSize`
// attribute (PointsMaterial can only draw squares of one size).
const vert = /* glsl */ `
  attribute float aSize;
  varying vec3 vColor;
  void main() {
    vColor = color;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    // Perspective size, capped so points right next to the camera don't
    // balloon into screen-filling blobs.
    gl_PointSize = min(aSize * (900.0 / -mv.z), 24.0);
    gl_Position = projectionMatrix * mv;
  }
`;
const frag = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float a = smoothstep(1.0, 0.0, d);
    gl_FragColor = vec4(vColor, a * a * uOpacity);
  }
`;

/** Seeded RNG so procedural fields are identical across remounts and transitions. */
export function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Renders (and disposes) a geometry with position, color and aSize attributes. */
export default function RoundPoints({ geometry, opacity = 1 }: { geometry: THREE.BufferGeometry; opacity?: number }) {
  useEffect(() => () => geometry.dispose(), [geometry]);
  const [uniforms] = useState(() => ({ uOpacity: { value: opacity } }));
  const matRef = useRef<THREE.ShaderMaterial | null>(null);
  useEffect(() => {
    if (matRef.current) matRef.current.uniforms.uOpacity.value = opacity;
  }, [opacity]);
  return (
    <points geometry={geometry}>
      <shaderMaterial
        ref={matRef}
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={uniforms}
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

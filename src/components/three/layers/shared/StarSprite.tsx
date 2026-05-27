import { useEffect, useRef, useState } from "react";
import { Billboard } from "@react-three/drei";
import * as THREE from "three";

// A soft blurry circular sprite — a billboarded plane with a radial gradient
// generated entirely in a tiny inline fragment shader (no external texture).
// Used both as a "galaxy" sprite in the Universe layer and as a "star" sprite
// in the Stellar Neighborhood layer.
const vert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const frag = /* glsl */ `
  varying vec2 vUv;
  uniform vec3 uColor;
  uniform float uIntensity;
  void main() {
    // Radial falloff from center → edge with a soft inner highlight.
    vec2 c = vUv - 0.5;
    float d = length(c) * 2.0; // 0 at center, 1 at edge
    float core = smoothstep(0.5, 0.0, d) * 0.9;
    float halo = smoothstep(1.0, 0.0, d) * 0.35;
    float alpha = clamp(core + halo, 0.0, 1.0) * uIntensity;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

export interface StarSpriteProps {
  position: [number, number, number];
  size: number;
  color: string;
  /** Optional in-plane rotation (purely cosmetic variety). */
  rotation?: number;
  /** Cross-fade / brightness multiplier (1 = full). */
  intensity?: number;
  /** Optional click target — only set when the sprite is meant to be interactive. */
  onClick?: () => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
}

/**
 * Reusable additive blurry-disc sprite. Stable uniforms object built once via
 * useState; uIntensity is updated on the live material through a ref in an
 * effect so the shader doesn't rebuild on every fade tick.
 */
export default function StarSprite({
  position,
  size,
  color,
  rotation = 0,
  intensity = 1.0,
  onClick,
  onPointerOver,
  onPointerOut
}: StarSpriteProps) {
  const initialUniforms = useState(() => ({
    uColor: { value: new THREE.Color(color) },
    uIntensity: { value: intensity }
  }))[0];
  const matRef = useRef<THREE.ShaderMaterial | null>(null);
  useEffect(() => {
    if (matRef.current) {
      matRef.current.uniforms.uIntensity.value = intensity;
    }
  }, [intensity]);

  return (
    <Billboard position={position}>
      <mesh
        rotation={[0, 0, rotation]}
        onClick={onClick ? (e) => { e.stopPropagation(); onClick(); } : undefined}
        onPointerOver={onPointerOver ? (e) => { e.stopPropagation(); onPointerOver(); } : undefined}
        onPointerOut={onPointerOut ? () => onPointerOut() : undefined}
      >
        <planeGeometry args={[size, size]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={vert}
          fragmentShader={frag}
          uniforms={initialUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </Billboard>
  );
}

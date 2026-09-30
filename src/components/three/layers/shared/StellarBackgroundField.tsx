import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { stellarRadius } from "@/data/scales";

interface StellarBackgroundFieldProps {
  /** Cross-fade opacity (1 = fully visible). Tracks the parent layer's fade. */
  opacity?: number;
  count?: number;
}

// Decorative, not a catalog: unnamed stars filling the space between the
// catalog stars. Distances are log-uniform from 3 to 3,000 ly (so they spread
// evenly in the log-compressed layer) and, past a few hundred light-years,
// hug the galactic plane the way the real disc does (scale height ~1,000 ly),
// which reads as a faint Milky Way band.
const MIN_LY = 3;
const MAX_LY = 3000;

// Real stellar-class mix (O/B rare, M dwarfs dominant); M dwarfs are faint,
// so their visible share is lower than their true ~75%.
const STAR_PALETTE: { color: [number, number, number]; weight: number }[] = [
  { color: [0.61, 0.71, 1.0], weight: 0.03 },
  { color: [0.67, 0.75, 1.0], weight: 0.07 },
  { color: [0.79, 0.84, 1.0], weight: 0.1 },
  { color: [0.97, 0.97, 1.0], weight: 0.14 },
  { color: [1.0, 0.96, 0.92], weight: 0.18 },
  { color: [1.0, 0.82, 0.63], weight: 0.24 },
  { color: [1.0, 0.66, 0.46], weight: 0.24 }
];

function sampleColor(rng: () => number): [number, number, number] {
  const r = rng();
  let acc = 0;
  for (const { color, weight } of STAR_PALETTE) {
    acc += weight;
    if (r <= acc) return color;
  }
  return STAR_PALETTE[STAR_PALETTE.length - 1].color;
}

// Seeded RNG so the field is identical across remounts and transitions.
function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Round, soft-edged points with per-point size (PointsMaterial draws squares).
const vert = /* glsl */ `
  attribute float aSize;
  varying vec3 vColor;
  void main() {
    vColor = color;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (900.0 / -mv.z);
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

export default function StellarBackgroundField({ opacity = 1, count = 2500 }: StellarBackgroundFieldProps) {
  const geometry = useMemo(() => {
    const rng = mulberry32(0xc05fa1ed);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const ly = MIN_LY * Math.pow(MAX_LY / MIN_LY, rng());
      // Height above the plane is limited to ~±1,000 ly; nearby stars are
      // effectively isotropic.
      const theta = rng() * Math.PI * 2;
      let sinB = 2 * rng() - 1;
      const maxSin = Math.min(1, 1000 / ly);
      sinB *= maxSin;
      const cosB = Math.sqrt(1 - sinB * sinB);
      const r = stellarRadius(ly);
      positions[i * 3] = r * cosB * Math.cos(theta);
      positions[i * 3 + 1] = r * sinB;
      positions[i * 3 + 2] = r * cosB * Math.sin(theta);
      const [cr, cg, cb] = sampleColor(rng);
      colors[i * 3] = cr;
      colors[i * 3 + 1] = cg;
      colors[i * 3 + 2] = cb;
      const s = rng();
      sizes[i] = 2 + s * s * s * 6;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    return g;
  }, [count]);
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

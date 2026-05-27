import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

interface StellarBackgroundFieldProps {
  /** Cross-fade opacity (1 = fully visible). Tracks the parent layer's fade. */
  opacity?: number;
  /** Number of background stars. Default 200 — dense enough to feel like a
   *  real stellar neighborhood without crowding the named labeled stars. */
  count?: number;
  /** Inner radius — stars inside this radius are skipped so they don't
   *  visually clash with the labeled named stars and the Sun. */
  innerRadius?: number;
  /** Outer radius — should sit just outside the layer's overview camera
   *  distance so the field reads as "deep neighborhood" not "skybox." */
  outerRadius?: number;
}

// Real stellar-class colors (O blue → M red). Frequency roughly mirrors the
// IMF — M dwarfs dominate, O/B are rare — so the field reads as "real."
const STAR_PALETTE: { color: [number, number, number]; weight: number }[] = [
  { color: [0.61, 0.71, 1.0], weight: 0.02 },  // O — hot blue
  { color: [0.67, 0.75, 1.0], weight: 0.05 },  // B — blue-white
  { color: [0.79, 0.84, 1.0], weight: 0.08 },  // A — white
  { color: [0.97, 0.97, 1.0], weight: 0.12 },  // F — pale yellow-white
  { color: [1.0, 0.96, 0.92], weight: 0.18 },  // G — Sun-like
  { color: [1.0, 0.82, 0.63], weight: 0.25 },  // K — orange
  { color: [1.0, 0.62, 0.44], weight: 0.30 },  // M — red (most common)
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

// Tiny seeded RNG so the field is stable across remounts and looks the same
// during a transition.
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

/**
 * Dense colorful background field for the Stellar Neighborhood layer.
 * THREE.Points with per-vertex colors and additive blending — cheap, no
 * sprite mesh per dot. The named NEARBY_STARS stay as labeled sprites on
 * top; this field fills the space between and beyond them so the layer
 * feels populated like a real stellar neighborhood.
 */
export default function StellarBackgroundField({
  opacity = 1,
  count = 200,
  innerRadius = 600,
  outerRadius = 1800
}: StellarBackgroundFieldProps) {
  // Generate positions + colors + sizes once. Memoized on count/radii so
  // tweaking via props doesn't regenerate every render.
  const { positions, colors, sizes } = useMemo(() => {
    const rng = mulberry32(0xc05fa1ed);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Uniform-in-volume spherical distribution between innerRadius and
      // outerRadius. Cube-root of uniform-radius³ would be exactly uniform
      // in volume; we bias slightly toward the outer shell so the field
      // reads as "deep" rather than evenly filled.
      const u = rng();
      const r = Math.cbrt(
        innerRadius ** 3 + u * (outerRadius ** 3 - innerRadius ** 3)
      );
      const theta = rng() * Math.PI * 2;
      const phi = Math.acos(2 * rng() - 1);
      positions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.4; // flatten Y slightly
      positions[i * 3 + 2] = r * Math.cos(phi);

      const [cr, cg, cb] = sampleColor(rng);
      colors[i * 3 + 0] = cr;
      colors[i * 3 + 1] = cg;
      colors[i * 3 + 2] = cb;

      // Size varies 0.6–2.0 (in size-attenuation units). Squared sample so
      // most stars are small with a few brighter standouts.
      const s = rng();
      sizes[i] = 0.6 + s * s * 1.4;
    }
    return { positions, colors, sizes };
  }, [count, innerRadius, outerRadius]);

  const matRef = useRef<THREE.PointsMaterial | null>(null);
  useEffect(() => {
    if (matRef.current) {
      matRef.current.opacity = opacity;
    }
  }, [opacity]);

  // Geometry built imperatively from the typed arrays. We need a custom
  // `size` attribute because PointsMaterial's `size` is a single scalar;
  // for per-point sizes we'd swap to a ShaderMaterial. Skipping that for
  // now — uniform size with random brightness via color reads fine.
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    // Size attribute is unused by PointsMaterial but kept around in case
    // we promote to a ShaderMaterial later.
    g.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    return g;
  }, [positions, colors, sizes]);

  // Dispose the geometry on unmount so the GPU buffer is released. (React
  // doesn't auto-dispose THREE objects.)
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <points geometry={geometry}>
      <pointsMaterial
        ref={matRef}
        size={5.5}
        sizeAttenuation
        vertexColors
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

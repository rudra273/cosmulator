import { useMemo } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { stellarRadius } from "@/data/scales";
import RoundPoints, { mulberry32 } from "./RoundPoints";

// The Oort Cloud: a hypothesised shell of icy bodies from roughly 2,000 AU to
// ~100,000 AU (≈ 0.03–1.6 ly), the outer edge of the Sun's gravitational
// reach. Illustrative distribution — no Oort Cloud object has been observed
// in place.
const INNER_LY = 0.03;
const OUTER_LY = 1.6;

export default function OortCloud({ opacity = 1, showLabel }: { opacity?: number; showLabel: boolean }) {
  const geometry = useMemo(() => {
    const count = 1400;
    const rng = mulberry32(0x0047c1d);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = stellarRadius(INNER_LY * Math.pow(OUTER_LY / INNER_LY, rng()));
      const theta = rng() * Math.PI * 2;
      const cosPhi = 2 * rng() - 1;
      const sinPhi = Math.sqrt(1 - cosPhi * cosPhi);
      positions.set([r * sinPhi * Math.cos(theta), r * cosPhi, r * sinPhi * Math.sin(theta)], i * 3);
      const tint = 0.5 + rng() * 0.3;
      colors.set([0.55 * tint, 0.7 * tint, 0.9 * tint], i * 3);
      sizes[i] = 1.2 + rng() * 1.5;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    return g;
  }, []);

  return (
    <>
      <RoundPoints geometry={geometry} opacity={opacity * 0.7} />
      {showLabel && (
        <Html position={[0, -stellarRadius(OUTER_LY), 0]} center zIndexRange={[2, 0]}>
          <div style={{ color: "rgba(150, 190, 235, 0.8)", fontFamily: "'Orbitron', sans-serif", fontSize: "8px", letterSpacing: "1px", whiteSpace: "nowrap", pointerEvents: "none", opacity, textAlign: "center" }}>
            OORT CLOUD · TO ~1.6 LY
          </div>
        </Html>
      )}
    </>
  );
}

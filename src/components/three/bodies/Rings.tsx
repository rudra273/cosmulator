import * as THREE from "three";
import { ringsVertexShader, ringsFragmentShader } from "@/lib/shaders/rings.glsl";

interface RingsProps {
  innerRadius: number; // absolute world units
  outerRadius: number; // absolute world units
  baseColor: string;
}

// Generic planetary ring system. Inner/outer radii are absolute (the caller
// multiplies the body radius by the per-body ring ratios).
export default function Rings({ innerRadius, outerRadius, baseColor }: RingsProps) {
  // Convert color to THREE.Color for shader uniforms
  const ringColor1 = new THREE.Color(baseColor).multiplyScalar(1.1);
  const ringColor2 = new THREE.Color(baseColor).multiplyScalar(0.5);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      {/* Inner/outer parameters must match the shader boundaries. */}
      <ringGeometry args={[innerRadius, outerRadius, 64]} />
      <shaderMaterial
        vertexShader={ringsVertexShader}
        fragmentShader={ringsFragmentShader}
        uniforms={{
          uColor1: { value: ringColor1 },
          uColor2: { value: ringColor2 },
          uInnerRadius: { value: innerRadius },
          uOuterRadius: { value: outerRadius }
        }}
        transparent={true}
        side={THREE.DoubleSide}
        depthWrite={false} // Avoid ring transparency z-buffer conflicts
      />
    </mesh>
  );
}

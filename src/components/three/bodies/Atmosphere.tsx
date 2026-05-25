import * as THREE from "three";
import {
  atmosphereVertexShader,
  atmosphereFragmentShader
} from "@/lib/shaders/atmosphere.glsl";

interface AtmosphereProps {
  radius: number; // body radius in world units (shell is rendered slightly larger)
  color: string;
}

// Additive Fresnel atmosphere glow shell for bodies with an atmosphere.
export default function Atmosphere({ radius, color }: AtmosphereProps) {
  return (
    <mesh>
      <sphereGeometry args={[radius * 1.08, 32, 32]} />
      <shaderMaterial
        vertexShader={atmosphereVertexShader}
        fragmentShader={atmosphereFragmentShader}
        uniforms={{
          uAtmosphereColor: { value: new THREE.Color(color) }
        }}
        blending={THREE.AdditiveBlending}
        side={THREE.BackSide}
        transparent={true}
        depthWrite={false}
      />
    </mesh>
  );
}

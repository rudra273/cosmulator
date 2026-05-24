import { useRef } from "react";
import * as THREE from "three";

const vertexShader = `
  varying vec3 vLocalPosition;
  varying vec2 vUv;
  void main() {
    vLocalPosition = position;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  varying vec3 vLocalPosition;
  varying vec2 vUv;
  
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform float uInnerRadius;
  uniform float uOuterRadius;

  void main() {
    // Radial distance from local origin (planar)
    float dist = length(vLocalPosition.xy);
    
    // Map distance to a 0.0 -> 1.0 range between boundaries
    float normDist = (dist - uInnerRadius) / (uOuterRadius - uInnerRadius);
    
    // Clip fragments outside geometry boundaries
    if (normDist < 0.0 || normDist > 1.0) {
      discard;
    }
    
    // Multi-octave sine wave superposition to simulate concentric particle bands
    float bands = sin(normDist * 45.0) * 0.5 + 0.5;
    bands += sin(normDist * 110.0) * 0.25;
    bands += sin(normDist * 220.0) * 0.15;
    bands = clamp(bands, 0.0, 1.0);
    
    // Cassini Division gap approximation (located at ~68% - 73% of width)
    float isCassini = step(0.66, normDist) * (1.0 - step(0.71, normDist));
    
    // Encke Gap approximation (located at ~88% - 90% of width)
    float isEncke = step(0.87, normDist) * (1.0 - step(0.89, normDist));
    
    // Interpolate base dust/rock color
    vec3 color = mix(uColor1, uColor2, normDist);
    color += vec3(0.06, 0.03, -0.02) * sin(normDist * 75.0); // color waves
    
    // Derive opacity from particle bands, adding elegant edge fading
    float alpha = mix(0.1, 0.8, bands);
    alpha *= sin(normDist * 3.1415926); // Ring edge feathering
    
    // Apply gap clearings
    if (isCassini > 0.5) {
      alpha *= 0.02;
    }
    if (isEncke > 0.5) {
      alpha *= 0.05;
    }
    
    gl_FragColor = vec4(color, alpha);
  }
`;

interface SaturnRingsProps {
  innerRadius: number;
  outerRadius: number;
  baseColor: string;
}

export default function SaturnRings({
  innerRadius,
  outerRadius,
  baseColor
}: SaturnRingsProps) {
  // Convert color to THREE.Color for shader uniforms
  const ringColor1 = new THREE.Color(baseColor).multiplyScalar(1.1);
  const ringColor2 = new THREE.Color(baseColor).multiplyScalar(0.5);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      {/* 
        We use RingGeometry. Inner and outer parameters must match 
        the shader boundaries. 
      */}
      <ringGeometry args={[innerRadius, outerRadius, 64]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
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

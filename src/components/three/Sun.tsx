import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSolarSystemStore } from "@/store/solarSystemStore";
import { getScaledSunRadius } from "@/lib/orbital-mechanics";

// Sun Surface GLSL Shaders
const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  // Description : Array and textureless GLSL 2D/3D/4D noise functions.
  //      Author : Ian McEwan, Ashima Arts.
  //  Maintainer : ijm
  //     Lastmod : 20110822 (ijm)
  //     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
  //               Distributed under the MIT License. See LICENSE file.
  //               https://github.com/ashima/webgl-noise
  
  vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

  float snoise(vec3 v){
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

    // First corner
    vec3 i  = floor(v + dot(v, D.yyy) );
    vec3 x0 =   v - i + dot(i, D.xxx) ;

    // Other corners
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );

    vec3 x1 = x0 - i1 + 1.0 * D.xxx;
    vec3 x2 = x0 - i2 + 2.0 * D.xxx;
    vec3 x3 = x0 - D.yyy;

    // Permutations
    i = mod(i, 289.0 );
    vec3 p = permute( permute( permute(
               i.z + vec3(0.0, i1.z, i2.z ))
             + i.y + vec3(0.0, i1.y, i2.y ))
             + i.x + vec3(0.0, i1.x, i2.x ));

    float n_ = 0.142857142857; // 1.0/7.0
    vec3  ns = n_ * D.wyz - D.xzx;

    vec4 j = vec4(p.x, p.y, p.z, 0.0) - 49.0 * floor(vec4(p.x, p.y, p.z, 0.0) * ns.z *ns.z);  //  mod(p,N*N)

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);

    // Normalise gradients
    vec4 norm = 1.79284291400159 - 0.85373472095314 *
      vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    // Mix final noise value
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                  dot(p2,x2), dot(p3,x3) ) );
  }

  void main() {
    // Generate multi-frequency turbulence
    vec3 coord = normalize(vPosition) * 2.0;
    float n1 = snoise(coord + vec3(0.0, 0.0, uTime * 0.15)) * 0.5 + 0.5;
    float n2 = snoise(coord * 6.0 + vec3(uTime * 0.35, 0.0, 0.0)) * 0.25;
    float turbulence = n1 + n2;
    
    // Core color gradient mapping
    vec3 darkRed = vec3(0.6, 0.05, 0.0);
    vec3 brightOrange = vec3(1.0, 0.42, 0.0);
    vec3 brightYellow = vec3(1.0, 0.95, 0.45);
    
    vec3 color = mix(darkRed, brightOrange, turbulence);
    color = mix(color, brightYellow, max(0.0, turbulence - 0.45) * 1.6);
    
    // Add elegant Fresnel rim lighting
    float rim = pow(1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0);
    vec3 finalColor = color + vec3(1.0, 0.6, 0.2) * rim * 1.2;
    
    // Boost brightness (toneMapped={false} in Three.js enables bloom highlight)
    gl_FragColor = vec4(finalColor * 2.0, 1.0);
  }
`;

// Soft Corona Glow GLSL Shaders
const coronaVertexShader = `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const coronaFragmentShader = `
  varying vec3 vNormal;
  void main() {
    // Atmospheric glow scattering approximation
    float intensity = pow(0.7 - dot(vNormal, vec3(0, 0, 1.0)), 3.5);
    vec3 color = vec3(1.0, 0.45, 0.05);
    gl_FragColor = vec4(color * intensity * 1.5, intensity * 0.75);
  }
`;

interface SunProps {
  onSelect: () => void;
}

export default function Sun({ onSelect }: SunProps) {
  const { isRealisticScale } = useSolarSystemStore();
  const sunRadius = getScaledSunRadius(isRealisticScale);
  const shaderRef = useRef<THREE.ShaderMaterial | null>(null);

  // Animate the uTime uniform for boiling surface look
  useFrame((state) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  return (
    <group>
      {/* Dynamic central point light emanating from Sun center */}
      <pointLight 
        position={[0, 0, 0]} 
        intensity={isRealisticScale ? 200.0 : 3.5} 
        distance={1000} 
        decay={1.2} 
        castShadow
      />
      
      {/* Ambient scene filling light */}
      <ambientLight intensity={0.15} />

      {/* Sun Core sphere */}
      <mesh 
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "default";
        }}
      >
        <sphereGeometry args={[sunRadius, 64, 64]} />
        <shaderMaterial
          ref={shaderRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={{
            uTime: { value: 0 }
          }}
          toneMapped={false} // Required for postprocessing bloom
        />
      </mesh>

      {/* Sun Corona Outer Glow Sphere */}
      <mesh>
        <sphereGeometry args={[sunRadius * 1.15, 32, 32]} />
        <shaderMaterial
          vertexShader={coronaVertexShader}
          fragmentShader={coronaFragmentShader}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
          transparent={true}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

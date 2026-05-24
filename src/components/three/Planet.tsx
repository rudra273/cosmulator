import { useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useSolarSystemStore } from "@/store/solarSystemStore";
import { PlanetData } from "@/data/planets";
import { computeOrbitalPosition, getScaledRadius } from "@/lib/orbital-mechanics";
import PlanetOrbit from "./PlanetOrbit";
import SaturnRings from "./SaturnRings";

// Custom Procedural Planet Shader
const vertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vLocalPosition;
  varying vec2 vUv;
  
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    vLocalPosition = position;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vLocalPosition;
  varying vec2 vUv;

  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;
  uniform float uNoiseScale;
  uniform float uNoiseFreq;
  uniform int uPlanetType; // 0=Rocky/Cratered, 1=Banded Gas Giant, 2=Water/Earth-like
  uniform vec3 uSunPosition;
  uniform float uTime;
  
  // 3D Simplex Noise algorithm
  vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

  float snoise(vec3 v){
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, D.yyy) );
    vec3 x0 =   v - i + dot(i, D.xxx) ;

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );

    vec3 x1 = x0 - i1 + 1.0 * D.xxx;
    vec3 x2 = x0 - i2 + 2.0 * D.xxx;
    vec3 x3 = x0 - D.yyy;

    i = mod(i, 289.0 );
    vec3 p = permute( permute( permute(
               i.z + vec3(0.0, i1.z, i2.z ))
             + i.y + vec3(0.0, i1.y, i2.y ))
             + i.x + vec3(0.0, i1.x, i2.x ));

    float n_ = 0.142857142857; // 1.0/7.0
    vec3  ns = n_ * D.wyz - D.xzx;

    vec4 j = vec4(p.x, p.y, p.z, 0.0) - 49.0 * floor(vec4(p.x, p.y, p.z, 0.0) * ns.z *ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );

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

    vec4 norm = 1.79284291400159 - 0.85373472095314 *
      vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                  dot(p2,x2), dot(p3,x3) ) );
  }

  void main() {
    // 1. Calculate lighting direction relative to Sun (0, 0, 0)
    vec3 lightDir = normalize(uSunPosition - vPosition);
    
    // 2. Diffuse shading (Lambertian)
    float diffuse = max(0.07, dot(vNormal, lightDir)); // Keep a tiny ambient base light on dark side
    
    // 3. Generate Planet Surface Texturing
    vec3 surfaceColor = vec3(0.0);
    vec3 sphereNorm = normalize(vLocalPosition);

    if (uPlanetType == 0) {
      // Rocky / Cratered Planet (Mercury, Mars)
      float n = snoise(sphereNorm * uNoiseFreq) * 0.5 + 0.5;
      // Add craters
      float craters = snoise(sphereNorm * uNoiseFreq * 4.5);
      craters = step(0.6, craters) * (craters - 0.6) * 1.5;
      
      float finalNoise = clamp(n - craters * 0.35, 0.0, 1.0);
      surfaceColor = mix(uColor1, uColor2, finalNoise);
      surfaceColor = mix(surfaceColor, uColor3, craters);
      
    } else if (uPlanetType == 1) {
      // Banded Gas Giant (Jupiter, Saturn)
      // Skew the noise along latitude lines
      float bandCoord = sphereNorm.y * uNoiseFreq;
      float bandNoise = snoise(vec3(0.0, bandCoord, 0.0)) * 0.5 + 0.5;
      
      // Fine-grained turbulence waves
      float wave = snoise(sphereNorm * 8.0 + vec3(uTime * 0.05, 0.0, 0.0)) * 0.12;
      float finalNoise = clamp(bandNoise + wave, 0.0, 1.0);
      
      surfaceColor = mix(uColor1, uColor2, finalNoise);
      surfaceColor = mix(surfaceColor, uColor3, sin(bandCoord * 3.0) * 0.5 + 0.5);
      
    } else {
      // Water / Earth-like Planet (Earth)
      // Noise determines land vs water
      float continentShape = snoise(sphereNorm * uNoiseFreq) * 0.5 + 0.5;
      
      if (continentShape > 0.46) {
        // Land
        float vegNoise = snoise(sphereNorm * (uNoiseFreq * 2.5)) * 0.5 + 0.5;
        surfaceColor = mix(uColor2, uColor3, vegNoise); // Blend land colors
        
        // Add mountain highlights
        if (continentShape > 0.65) {
          surfaceColor = mix(surfaceColor, vec3(0.9, 0.9, 0.95), (continentShape - 0.65) * 2.5); // Snow peaks
        }
      } else {
        // Water
        float waterNoise = snoise(sphereNorm * 12.0) * 0.5 + 0.5;
        surfaceColor = mix(uColor1, uColor1 * 1.2, waterNoise);
      }
      
      // Floating Cloud layer (slightly animated in fragment space)
      float clouds = snoise(sphereNorm * 4.5 + vec3(uTime * 0.02, uTime * 0.015, uTime * 0.01));
      clouds = smoothstep(0.4, 0.8, clouds) * 0.6; // Cloud intensity
      surfaceColor = mix(surfaceColor, vec3(0.95, 0.95, 0.95), clouds);
    }
    
    // Apply final lighting shading
    gl_FragColor = vec4(surfaceColor * diffuse, 1.0);
  }
`;

// Elegant Additive Fresnel Atmosphere Glow Shader
const atmosphereVertexShader = `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const atmosphereFragmentShader = `
  varying vec3 vNormal;
  uniform vec3 uAtmosphereColor;
  void main() {
    // Edge glow Fresnel scattering formula
    float intensity = pow(0.68 - dot(vNormal, vec3(0, 0, 1.0)), 3.2);
    gl_FragColor = vec4(uAtmosphereColor * intensity * 1.3, intensity * 0.65);
  }
`;

interface PlanetProps {
  planet: PlanetData;
  onSelect: (id: string) => void;
}

export default function Planet({ planet, onSelect }: PlanetProps) {
  const { 
    selectedPlanetId, 
    elapsedTime, 
    isRealisticScale, 
    showLabels 
  } = useSolarSystemStore();

  const [isHovered, setIsHovered] = useState(false);
  
  const orbitGroupRef = useRef<THREE.Group | null>(null);
  const tiltGroupRef = useRef<THREE.Group | null>(null);
  const planetMeshRef = useRef<THREE.Mesh | null>(null);
  const shaderRef = useRef<THREE.ShaderMaterial | null>(null);

  const radius = getScaledRadius(planet.radius, isRealisticScale);
  const isSelected = selectedPlanetId === planet.id;

  // Determine planet category for shader: 0=Rocky, 1=Banded Gas Giant, 2=Water
  let planetType = 0;
  if (planet.id === "jupiter" || planet.id === "saturn" || planet.id === "uranus" || planet.id === "neptune" || planet.id === "venus") {
    planetType = 1; // Banded atmosphere style for Venus & Gas Giants
  } else if (planet.id === "earth") {
    planetType = 2; // Water-land-cloud structure
  }

  // Set noise scaling parameters based on size and planet type
  const noiseScale = planet.id === "earth" ? 0.35 : 0.25;
  const noiseFreq = planet.id === "earth" ? 2.5 : planetType === 1 ? 5.0 : 3.5;

  useFrame((state, delta) => {
    // 1. Compute orbital movement along ellipse
    if (orbitGroupRef.current) {
      const [x, y, z] = computeOrbitalPosition(
        planet.distance,
        planet.eccentricity,
        planet.orbitalPeriod,
        elapsedTime,
        isRealisticScale
      );
      orbitGroupRef.current.position.set(x, y, z);
    }

    // 2. Animate self-spin around planet tilted axis
    if (planetMeshRef.current) {
      // 1 simulated day = 24 hours.
      // Planet rotates once in rotationPeriod hours.
      // Spin delta = (24 / rotationPeriod) * deltaInSeconds * storeTimeScale
      // Negative rotationPeriod rotates clockwise (retrograde).
      const spinSpeed = planet.rotationPeriod !== 0 ? (24 / planet.rotationPeriod) : 0;
      // Convert to radians and advance
      const storeTimeScale = useSolarSystemStore.getState().timeScale;
      // Multiply by 0.05 scaling factor so simulation speed doesn't make spin dizzyingly fast
      const frameSpin = (spinSpeed * delta * storeTimeScale * 0.05);
      planetMeshRef.current.rotation.y += frameSpin;
    }

    // 3. Update uniform uTime for animated components (clouds, gas giant convection waves)
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
      
      // Update sun position in case it shifts (stays at 0, 0, 0 but needs world vector calculation)
      const sunWorldPos = new THREE.Vector3(0, 0, 0);
      shaderRef.current.uniforms.uSunPosition.value = sunWorldPos;
    }
  });

  // Base colors for shader
  const c1 = new THREE.Color(planet.surfaceColors[0]);
  const c2 = new THREE.Color(planet.surfaceColors[1]);
  const c3 = new THREE.Color(planet.surfaceColors[2] || planet.surfaceColors[1]);

  return (
    <group>
      {/* 1. Orbit Line helper (rendered globally around Sun, not as child of planet) */}
      <PlanetOrbit
        distance={planet.distance}
        eccentricity={planet.eccentricity}
        color={planet.baseColor}
        isHovered={isHovered}
        isSelected={isSelected}
      />

      {/* 2. Moving Planet Group */}
      <group ref={orbitGroupRef}>
        
        {/* Tilted local system (aligns rotation axis and rings) */}
        <group 
          ref={tiltGroupRef} 
          rotation={[0, 0, THREE.MathUtils.degToRad(planet.axialTilt)]}
        >
          
          {/* Planet Body sphere */}
          <mesh
            ref={planetMeshRef}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(planet.id);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              setIsHovered(true);
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={(e) => {
              e.stopPropagation();
              setIsHovered(false);
              document.body.style.cursor = "default";
            }}
            scale={isHovered ? 1.05 : 1.0} // Subtly pop on hover
          >
            <sphereGeometry args={[radius, 48, 48]} />
            <shaderMaterial
              ref={shaderRef}
              vertexShader={vertexShader}
              fragmentShader={fragmentShader}
              uniforms={{
                uColor1: { value: c1 },
                uColor2: { value: c2 },
                uColor3: { value: c3 },
                uNoiseScale: { value: noiseScale },
                uNoiseFreq: { value: noiseFreq },
                uPlanetType: { value: planetType },
                uSunPosition: { value: new THREE.Vector3(0, 0, 0) },
                uTime: { value: 0 }
              }}
            />
          </mesh>

          {/* Atmospheric Glow Shell (if planet has atmosphere) */}
          {planet.atmosphereColor && (
            <mesh>
              <sphereGeometry args={[radius * 1.08, 32, 32]} />
              <shaderMaterial
                vertexShader={atmosphereVertexShader}
                fragmentShader={atmosphereFragmentShader}
                uniforms={{
                  uAtmosphereColor: { value: new THREE.Color(planet.atmosphereColor) }
                }}
                blending={THREE.AdditiveBlending}
                side={THREE.BackSide}
                transparent={true}
                depthWrite={false}
              />
            </mesh>
          )}

          {/* Planet Rings System (tilted with planet equator) */}
          {planet.hasRings && planet.ringsConfig && (
            <SaturnRings
              innerRadius={radius * planet.ringsConfig.innerRadius}
              outerRadius={radius * planet.ringsConfig.outerRadius}
              baseColor={planet.baseColor}
            />
          )}
          
        </group>

        {/* Billboarding 3D Label overlay (faces camera) */}
        {showLabels && (
          <Html
            position={[0, radius * 1.5, 0]}
            center
            distanceFactor={isRealisticScale ? 12 : 28}
          >
            <div 
              onClick={() => onSelect(planet.id)}
              style={{
                background: isSelected ? "rgba(0, 102, 204, 0.85)" : isHovered ? "rgba(255,255,255,0.25)" : "rgba(0, 0, 0, 0.55)",
                border: isSelected ? "1px solid #3399ff" : isHovered ? "1px solid rgba(255,255,255,0.5)" : "1px solid rgba(255,255,255,0.15)",
                color: isSelected ? "#ffffff" : isHovered ? "#ffffff" : "#cccccc",
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "10px",
                fontWeight: 600,
                letterSpacing: "1px",
                padding: "3px 8px",
                borderRadius: "10px",
                backdropFilter: "blur(4px)",
                whiteSpace: "nowrap",
                cursor: "pointer",
                transition: "all 0.2s ease-in-out",
                transform: `scale(${isSelected || isHovered ? 1.1 : 1})`,
                boxShadow: isSelected ? "0 0 10px rgba(0, 102, 204, 0.5)" : "none"
              }}
            >
              {planet.name}
            </div>
          </Html>
        )}
        
      </group>
    </group>
  );
}

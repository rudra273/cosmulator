import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useSolarSystemStore } from "@/store/solarSystemStore";
import type { CelestialBody as CelestialBodyData } from "@/data/bodies/types";
import {
  computeOrbitalPosition,
  getScaledRadius,
  getScaledSunRadius
} from "@/lib/orbital-mechanics";
import { SURFACE_SHADERS } from "@/lib/shaders/registry";
import {
  starVertexShader,
  starFragmentShader,
  coronaVertexShader,
  coronaFragmentShader
} from "@/lib/shaders/star.glsl";
import OrbitPath from "./OrbitPath";
import Rings from "./bodies/Rings";
import Atmosphere from "./bodies/Atmosphere";

interface CelestialBodyProps {
  body: CelestialBodyData;
  onSelect: (id: string) => void;
}

const DEFAULT_PLANET_SEGMENTS = 48;
const DEFAULT_STAR_SEGMENTS = 64;

// Generic celestial body — renders the central star or an orbiting planet from
// data, selecting shaders via the registry. Replaces the old Planet/Sun pair.
export default function CelestialBody({ body, onSelect }: CelestialBodyProps) {
  if (body.type === "star") {
    return <StarBodyView body={body} onSelect={onSelect} />;
  }
  return <PlanetBodyView body={body} onSelect={onSelect} />;
}

// ---------- Star ----------

function StarBodyView({
  body,
  onSelect
}: {
  body: Extract<CelestialBodyData, { type: "star" }>;
  onSelect: (id: string) => void;
}) {
  const { isRealisticScale } = useSolarSystemStore();
  const sunRadius = getScaledSunRadius(isRealisticScale);
  const shaderRef = useRef<THREE.ShaderMaterial | null>(null);
  const segments = body.geometrySegments ?? DEFAULT_STAR_SEGMENTS;

  useFrame((state) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  return (
    <group>
      {/* Dynamic central point light emanating from the star center */}
      <pointLight
        position={[0, 0, 0]}
        intensity={isRealisticScale ? 200.0 : 3.5}
        distance={1000}
        decay={1.2}
        castShadow
      />

      {/* Ambient scene-filling light */}
      <ambientLight intensity={0.15} />

      {/* Star core sphere */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect(body.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "default";
        }}
      >
        <sphereGeometry args={[sunRadius, segments, segments]} />
        <shaderMaterial
          ref={shaderRef}
          vertexShader={starVertexShader}
          fragmentShader={starFragmentShader}
          uniforms={{ uTime: { value: 0 } }}
          toneMapped={false} // Required for postprocessing bloom
        />
      </mesh>

      {/* Corona outer glow sphere */}
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

// ---------- Planet ----------

function PlanetBodyView({
  body,
  onSelect
}: {
  body: Extract<CelestialBodyData, { type: "planet" }>;
  onSelect: (id: string) => void;
}) {
  const { selectedPlanetId, elapsedTime, isRealisticScale, showLabels } =
    useSolarSystemStore();

  const [isHovered, setIsHovered] = useState(false);

  const orbitGroupRef = useRef<THREE.Group | null>(null);
  const planetMeshRef = useRef<THREE.Mesh | null>(null);
  const shaderRef = useRef<THREE.ShaderMaterial | null>(null);

  const radius = getScaledRadius(body.radius, isRealisticScale);
  const isSelected = selectedPlanetId === body.id;
  const segments = body.geometrySegments ?? DEFAULT_PLANET_SEGMENTS;

  // Surface shader + uniforms from the registry (keyed by shaderType).
  const shader = SURFACE_SHADERS[body.shaderType as keyof typeof SURFACE_SHADERS];
  const uniforms = useMemo(() => shader.makeUniforms(body), [shader, body]);

  useFrame((state, delta) => {
    // 1. Orbital movement along the ellipse.
    if (orbitGroupRef.current) {
      const [x, y, z] = computeOrbitalPosition(
        body.distance,
        body.eccentricity,
        body.orbitalPeriod,
        elapsedTime,
        isRealisticScale
      );
      orbitGroupRef.current.position.set(x, y, z);
    }

    // 2. Self-spin around the tilted axis (negative rotationPeriod = retrograde).
    if (planetMeshRef.current) {
      const spinSpeed = body.rotationPeriod !== 0 ? 24 / body.rotationPeriod : 0;
      const storeTimeScale = useSolarSystemStore.getState().timeScale;
      const frameSpin = spinSpeed * delta * storeTimeScale * 0.05;
      planetMeshRef.current.rotation.y += frameSpin;
    }

    // 3. Animated shader uniforms (clouds, gas-giant convection).
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
      shaderRef.current.uniforms.uSunPosition.value = new THREE.Vector3(0, 0, 0);
    }
  });

  return (
    <group>
      {/* Orbit line (rendered around the sun, not parented to the planet) */}
      <OrbitPath
        distance={body.distance}
        eccentricity={body.eccentricity}
        color={body.baseColor}
        isHovered={isHovered}
        isSelected={isSelected}
      />

      {/* Moving planet group */}
      <group ref={orbitGroupRef}>
        {/* Tilted local system (aligns rotation axis and rings) */}
        <group rotation={[0, 0, THREE.MathUtils.degToRad(body.axialTilt)]}>
          {/* Planet body sphere */}
          <mesh
            ref={planetMeshRef}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(body.id);
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
            <sphereGeometry args={[radius, segments, segments]} />
            <shaderMaterial
              ref={shaderRef}
              vertexShader={shader.vertex}
              fragmentShader={shader.fragment}
              uniforms={uniforms}
            />
          </mesh>

          {/* Atmospheric glow shell */}
          {body.atmosphereColor && (
            <Atmosphere radius={radius} color={body.atmosphereColor} />
          )}

          {/* Ring system (tilted with the planet equator) */}
          {body.rings && (
            <Rings
              innerRadius={radius * body.rings.innerRadius}
              outerRadius={radius * body.rings.outerRadius}
              baseColor={body.baseColor}
            />
          )}
        </group>

        {/* Billboarded label — constant on-screen size (no distanceFactor) so
            tiny realistic-scale planets stay findable, floated above the body. */}
        {showLabels && (
          <Html
            position={[0, Math.max(radius * 1.5, 1.2), 0]}
            center
            zIndexRange={[20, 0]}
          >
            <div
              onClick={() => onSelect(body.id)}
              style={{
                background: isSelected
                  ? "rgba(0, 102, 204, 0.85)"
                  : isHovered
                    ? "rgba(255,255,255,0.25)"
                    : "rgba(0, 0, 0, 0.55)",
                border: isSelected
                  ? "1px solid #3399ff"
                  : isHovered
                    ? "1px solid rgba(255,255,255,0.5)"
                    : "1px solid rgba(255,255,255,0.15)",
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
              {body.name}
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}

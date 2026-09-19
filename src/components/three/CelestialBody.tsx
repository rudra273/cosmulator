import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import { useSolarSystemStore } from "@/store/solarSystemStore";
import type { CelestialBody as CelestialBodyData } from "@/data/bodies/types";
import { getBodyById, getMoonsOfPlanet } from "@/data/bodies";
import {
  applyOrbitalRotation,
  getScaledRadius,
  getScaledSunRadius,
  type OrbitalPlane
} from "@/lib/orbital-mechanics";
import { planetPlane, planetPosition, moonPosition, moonOrbitRadius } from "@/lib/body-position";
import { simulationDays, rotationAtDays } from "@/lib/simulation-time";
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
import { useFocusEmphasis } from "./useFocusEmphasis";
import { usePlanetTextures } from "./usePlanetTextures";

interface CelestialBodyProps {
  body: CelestialBodyData;
  onSelect: (id: string) => void;
}

const DEFAULT_PLANET_SEGMENTS = 96;
const DEFAULT_STAR_SEGMENTS = 64;

// Generic celestial body — renders the central star or an orbiting planet from
// data, selecting shaders via the registry. Replaces the old Planet/Sun pair.
export default function CelestialBody({ body, onSelect }: CelestialBodyProps) {
  if (body.type === "star") {
    return <StarBodyView body={body} onSelect={onSelect} />;
  }
  if (body.type === "moon") {
    return <MoonBodyView body={body} onSelect={onSelect} />;
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
  // Same focus-emphasis as planets: when the user is focused on some
  // other body, the Sun is "far" — shrink it accordingly. In overview
  // (no selection) and when the Sun itself is somehow the subject, this
  // is 1.0 so the star renders at its natural size.
  const focusScale = useFocusEmphasis(body.id);
  const sunRadius = getScaledSunRadius(isRealisticScale) * focusScale;
  const shaderRef = useRef<THREE.ShaderMaterial | null>(null);
  const segments = body.geometrySegments ?? DEFAULT_STAR_SEGMENTS;
  const sunMesh = useRef<THREE.Mesh>(null);
  const coronaRef = useRef<THREE.ShaderMaterial>(null);
  const solarUniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  useFrame(() => {
    const clock = useSolarSystemStore.getState();
    const days = simulationDays(clock.epochMs, clock.elapsedTime);
    if (shaderRef.current) shaderRef.current.uniforms.uTime.value = days;
    if (coronaRef.current) coronaRef.current.uniforms.uTime.value = days;
    if (sunMesh.current) sunMesh.current.rotation.y = rotationAtDays(days, body.rotationPeriod);
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
      <mesh ref={sunMesh}
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
          uniforms={solarUniforms}
        />
      </mesh>

      {/* Corona outer glow sphere */}
      <mesh>
        <sphereGeometry args={[sunRadius * 1.12, 32, 32]} />
        <shaderMaterial
          ref={coronaRef}
          uniforms={solarUniforms}
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
  const { selectedPlanetId, epochMs, isRealisticScale, showLabels } =
    useSolarSystemStore();

  const [isHovered, setIsHovered] = useState(false);

  const orbitGroupRef = useRef<THREE.Group | null>(null);
  const planetMeshRef = useRef<THREE.Mesh | null>(null);
  const shaderRef = useRef<THREE.ShaderMaterial | null>(null);

  // Focus-emphasis: while a planet is focused, the OTHER planets shrink
  // toward 0.5× so the subject reads as the foreground portrait. Returns
  // 1.0 in steady state and for the currently-selected body. Animated
  // smoothly so the de-emphasis eases in/out with the camera fly-in/home.
  const focusScale = useFocusEmphasis(body.id);
  const radius = getScaledRadius(body.radius, isRealisticScale) * focusScale;
  const isSelected = selectedPlanetId === body.id;
  const segments = body.geometrySegments ?? DEFAULT_PLANET_SEGMENTS;

  // Surface shader + uniforms from the registry (keyed by shaderType).
  const shader = SURFACE_SHADERS[body.shaderType as keyof typeof SURFACE_SHADERS];
  const uniforms = useMemo(() => shader.makeUniforms(body), [shader, body]);
  usePlanetTextures(body.id, uniforms, shaderRef);

  const orbitalPlane = useMemo(() => planetPlane(body, epochMs, isRealisticScale),
    [body, epochMs, isRealisticScale]);

  useFrame(() => {
    const clock = useSolarSystemStore.getState();
    const days = simulationDays(clock.epochMs, clock.elapsedTime);
    if (orbitGroupRef.current) {
      orbitGroupRef.current.position.set(...planetPosition(body, clock.epochMs, clock.elapsedTime, isRealisticScale));
    }
    if (planetMeshRef.current) planetMeshRef.current.rotation.y = rotationAtDays(days, body.rotationPeriod);
    if (shaderRef.current) shaderRef.current.uniforms.uTime.value = days;
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
        orbitalPlane={orbitalPlane}
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
              planetRadius={radius}
              surfaceMaterial={shaderRef}
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

        {/* Natural satellites of this planet — nested INSIDE the orbit group
            so Three.js's scene graph carries them along with the parent. Each
            moon's local position (Kepler-derived offset from this planet)
            becomes world position automatically. */}
        {getMoonsOfPlanet(body.id).map((m) => (
          <CelestialBody key={m.id} body={m} onSelect={onSelect} />
        ))}
      </group>
    </group>
  );
}

// ---------- Moon ----------

function MoonBodyView({
  body,
  onSelect
}: {
  body: Extract<CelestialBodyData, { type: "moon" }>;
  onSelect: (id: string) => void;
}) {
  const { selectedPlanetId, isRealisticScale, showLabels, showOrbits } =
    useSolarSystemStore();

  const [isHovered, setIsHovered] = useState(false);
  const orbitGroupRef = useRef<THREE.Group | null>(null);
  const moonMeshRef = useRef<THREE.Mesh | null>(null);
  const shaderRef = useRef<THREE.ShaderMaterial | null>(null);

  const isSelected = selectedPlanetId === body.id;
  // Same focus-emphasis treatment as planets: when a *different* body is
  // focused, this moon shrinks to 0.5× so background detail recedes.
  const focusScale = useFocusEmphasis(body.id);
  const radius = getScaledRadius(body.radius, isRealisticScale) * focusScale;
  const segments = body.geometrySegments ?? DEFAULT_PLANET_SEGMENTS;

  // The moon's orbital semi-major axis in SCENE UNITS:
  //   parent.radius_km × scaled_radius_factor × body.distance_in_parent_radii
  // We look up the parent's scaled radius so the moon's orbit scales with
  // whatever Realistic-Scale mode is doing to the parent.
  const parent = getBodyById(body.parentId);
  const orbitSceneRadius = parent?.type === "planet" ? moonOrbitRadius(body, parent, isRealisticScale) : 1;

  // Orbital plane: just inclination (Ω, ω = 0 — a stylized moon doesn't need
  // node/perihelion orientation precision).
  const orbitalPlane: OrbitalPlane = useMemo(
    () => ({
      inclinationRad: (body.inclinationDeg * Math.PI) / 180,
      longitudeAscendingNodeRad: 0,
      argumentOfPeriapsisRad: 0
    }),
    [body.inclinationDeg]
  );

  // Surface shader (same registry as planets — moons reuse "rocky" etc.).
  const shader = SURFACE_SHADERS[body.shaderType as keyof typeof SURFACE_SHADERS];
  const uniforms = useMemo(() => shader.makeUniforms(body), [shader, body]);
  usePlanetTextures(body.id, uniforms, shaderRef);

  useFrame(() => {
    const clock = useSolarSystemStore.getState();
    const days = simulationDays(clock.epochMs, clock.elapsedTime);
    if (orbitGroupRef.current) orbitGroupRef.current.position.set(...moonPosition(body, orbitSceneRadius, days));
    if (moonMeshRef.current) moonMeshRef.current.rotation.y = rotationAtDays(days, body.rotationPeriod);
    if (shaderRef.current) shaderRef.current.uniforms.uTime.value = days;
  });

  // Pre-scaled orbit polyline for the moon — computed inline because
  // generateOrbitPath() also pipes its distance through getScaledDistance().
  const moonOrbitPoints = useMemo(() => {
    const a = orbitSceneRadius;
    const e = body.eccentricity;
    const b = a * Math.sqrt(1 - e * e);
    const c = a * e; // focal offset so the parent sits at the focus
    const segments = 96;
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * 2 * Math.PI;
      const flat: [number, number, number] = [
        a * Math.cos(theta) - c,
        0,
        b * Math.sin(theta)
      ];
      pts.push(applyOrbitalRotation(flat, orbitalPlane));
    }
    return pts;
  }, [orbitSceneRadius, body.eccentricity, orbitalPlane]);

  return (
    <group>
      {/* Moon orbit line — rendered LOCALLY around the parent (i.e. inside the
          parent's orbit group, since MoonBodyView is nested there). */}
      {showOrbits && (
        <Line
          points={moonOrbitPoints}
          color={body.baseColor}
          lineWidth={isSelected ? 1.6 : isHovered ? 1.3 : 0.8}
          transparent
          opacity={isSelected ? 0.7 : isHovered ? 0.45 : 0.22}
          dashed={!isSelected && !isHovered}
          dashScale={0.8}
          dashSize={0.5}
          gapSize={0.5}
        />
      )}

      {/* Moving moon group (local to the parent). */}
      <group ref={orbitGroupRef}>
        <group rotation={[0, 0, THREE.MathUtils.degToRad(body.axialTilt)]}>
          <mesh
            ref={moonMeshRef}
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
            scale={isHovered ? 1.1 : 1.0}
          >
            <sphereGeometry args={[radius, segments, segments]} />
            <shaderMaterial
              ref={shaderRef}
              vertexShader={shader.vertex}
              fragmentShader={shader.fragment}
              uniforms={uniforms}
            />
          </mesh>
        </group>

        {showLabels && (
          <Html
            position={[0, Math.max(radius * 1.5, 0.6), 0]}
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
                  : "1px solid rgba(255,255,255,0.15)",
                color: isSelected ? "#ffffff" : "#cccccc",
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "9px",
                fontWeight: 600,
                letterSpacing: "1px",
                padding: "2px 6px",
                borderRadius: "8px",
                whiteSpace: "nowrap",
                cursor: "pointer"
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

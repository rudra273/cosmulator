import { useShallow } from "zustand/react/shallow";
import { memo, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { useSolarSystemStore } from "@/store/solarSystemStore";
import type { CelestialBody as CelestialBodyData } from "@/data/bodies/types";
import { getBodyById, getMoonsOfPlanet } from "@/data/bodies";
import {
  getScaledRadius,
  getScaledSunRadius
} from "@/lib/orbital-mechanics";
import { planetPlane, planetPosition, moonPosition, moonOrbitRadius, moonElements, orientMoon } from "@/lib/body-position";
import { simulationDays, rotationAtDays } from "@/lib/simulation-time";
import { SURFACE_SHADERS } from "@/lib/shaders/registry";
import {
  starVertexShader,
  starFragmentShader,
  coronaVertexShader,
  coronaFragmentShader
} from "@/lib/shaders/star.glsl";
import CometTail from "./bodies/CometTail";
import CloudShell from "./bodies/CloudShell";
import SceneLabel from "./SceneLabel";
import OrbitPath from "./OrbitPath";
import Rings from "./bodies/Rings";
import Atmosphere from "./bodies/Atmosphere";
import { usePlanetTextures } from "./usePlanetTextures";

interface CelestialBodyProps {
  body: CelestialBodyData;
  onSelect: (id: string) => void;
}

const DEFAULT_PLANET_SEGMENTS = 96;
const DEFAULT_STAR_SEGMENTS = 64;

// Generic celestial body — renders the central star or an orbiting planet from
// data, selecting shaders via the registry. Replaces the old Planet/Sun pair.
function CelestialBody({ body, onSelect }: CelestialBodyProps) {
  if (body.type === "star") {
    return <StarBodyView body={body} onSelect={onSelect} />;
  }
  if (body.type === "moon") {
    return <MoonBodyView body={body} onSelect={onSelect} />;
  }
  return <PlanetBodyView body={body} onSelect={onSelect} />;
}

export default memo(CelestialBody);

// ---------- Star ----------

function StarBodyView({
  body,
  onSelect
}: {
  body: Extract<CelestialBodyData, { type: "star" }>;
  onSelect: (id: string) => void;
}) {
  const { isRealisticScale, realSizes } = useSolarSystemStore(useShallow(s => ({ isRealisticScale: s.isRealisticScale, realSizes: s.realSizes })));
  const sunRadius = getScaledSunRadius(realSizes);
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
          toneMapped={false}
        />
      </mesh>

      {/* Corona outer glow sphere */}
      <mesh>
        <sphereGeometry args={[sunRadius * 1.5, 64, 64]} />
        <shaderMaterial
          ref={coronaRef}
          uniforms={solarUniforms}
          toneMapped={false}
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
  const { selectedPlanetId, epochMs, isRealisticScale, realSizes, showLabels } = useSolarSystemStore(useShallow(s => ({ selectedPlanetId: s.selectedPlanetId, epochMs: s.epochMs, isRealisticScale: s.isRealisticScale, realSizes: s.realSizes, showLabels: s.showLabels })));

  const [isHovered, setIsHovered] = useState(false);

  const orbitGroupRef = useRef<THREE.Group | null>(null);
  const planetMeshRef = useRef<THREE.Mesh | null>(null);
  const shaderRef = useRef<THREE.ShaderMaterial | null>(null);

  const radius = getScaledRadius(body.radius, realSizes);
  const isSelected = selectedPlanetId === body.id;
  const segments = isSelected ? (body.geometrySegments ?? DEFAULT_PLANET_SEGMENTS) : 24;
  // Earth's Moon is always shown; other moon systems appear only while the
  // planet (or one of its moons) is selected, keeping the overview uncluttered.
  const selectedBody = getBodyById(selectedPlanetId);
  const showMoons = body.id === "earth" || isSelected ||
    (selectedBody?.type === "moon" && selectedBody.parentId === body.id);

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
    if (body.id === 'earth' && orbitGroupRef.current && shaderRef.current) {
      const m = getMoonsOfPlanet('earth')[0];
      const pos = planetPosition(body, clock.epochMs, clock.elapsedTime, isRealisticScale);
      const offset = moonPosition(m, moonOrbitRadius(m, body, isRealisticScale), days);
      shaderRef.current.uniforms.uOccluderPosition.value.set(...pos).add(new THREE.Vector3(...offset));
      shaderRef.current.uniforms.uOccluderRadius.value = getScaledRadius(m.radius, realSizes);
      shaderRef.current.uniforms.uSunRadius.value = getScaledSunRadius(realSizes);
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
        {body.category === "comet" && <CometTail body={body} radius={radius} />}
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

          {body.id === "earth" && <CloudShell radius={radius} uniforms={uniforms} surface={shaderRef} segments={segments} />}
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
        {showLabels && <SceneLabel id={body.id} name={body.name} radius={radius} onSelect={onSelect} />}

        {/* Natural satellites of this planet — nested INSIDE the orbit group
            so Three.js's scene graph carries them along with the parent. Each
            moon's local position (Kepler-derived offset from this planet)
            becomes world position automatically. */}
        {showMoons && getMoonsOfPlanet(body.id).map((m) => (
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
  const { selectedPlanetId, isRealisticScale, realSizes, showLabels, showOrbits } = useSolarSystemStore(useShallow(s => ({ selectedPlanetId: s.selectedPlanetId, isRealisticScale: s.isRealisticScale, realSizes: s.realSizes, showLabels: s.showLabels, showOrbits: s.showOrbits })));

  const [isHovered, setIsHovered] = useState(false);
  const orbitGroupRef = useRef<THREE.Group | null>(null);
  const moonMeshRef = useRef<THREE.Mesh | null>(null);
  const shaderRef = useRef<THREE.ShaderMaterial | null>(null);

  const isSelected = selectedPlanetId === body.id;
  const radius = getScaledRadius(body.radius, realSizes);
  const segments = isSelected ? (body.geometrySegments ?? DEFAULT_PLANET_SEGMENTS) : 24;

  // The moon's orbital semi-major axis in SCENE UNITS is read every frame:
  // in compressed mode it widens with the focus spread (see moonOrbitRadius).
  const parent = getBodyById(body.parentId);

  const orbitPlaneRef = useRef<THREE.Group>(null);
  const orientation = useMemo(() => ({ matrix: new THREE.Matrix4(), x: new THREE.Vector3(), y: new THREE.Vector3(), z: new THREE.Vector3(), q: new THREE.Quaternion(), spin: new THREE.Quaternion() }), []);

  // Surface shader (same registry as planets — moons reuse "rocky" etc.).
  const shader = SURFACE_SHADERS[body.shaderType as keyof typeof SURFACE_SHADERS];
  const uniforms = useMemo(() => shader.makeUniforms(body), [shader, body]);
  usePlanetTextures(body.id, uniforms, shaderRef);

  useFrame(() => {
    const clock = useSolarSystemStore.getState();
    const days = simulationDays(clock.epochMs, clock.elapsedTime);
    const tilt = parent?.axialTilt ?? 0;
    const orbitSceneRadius = parent?.type === "planet" ? moonOrbitRadius(body, parent, isRealisticScale) : 1;
    if (orbitGroupRef.current) orbitGroupRef.current.position.set(...moonPosition(body, orbitSceneRadius, days, tilt));
    const o = orientation;
    o.x.set(...orientMoon(body, [1, 0, 0], days, tilt));
    o.z.set(...orientMoon(body, [0, 0, 1], days, tilt));
    o.y.crossVectors(o.z, o.x).normalize();
    o.matrix.makeBasis(o.x, o.y, o.z);
    o.q.setFromRotationMatrix(o.matrix);
    orbitPlaneRef.current?.quaternion.copy(o.q);
    orbitPlaneRef.current?.scale.setScalar(orbitSceneRadius);
    if (moonMeshRef.current && body.id === 'moon') {
      const elements = moonElements(body, days);
      // Cassini-state pole: 6.68° from orbit normal, on the opposite side of
      // the ecliptic normal. The pole precesses with the lunar node.
      moonMeshRef.current.quaternion.setFromEuler(new THREE.Euler(elements.inclinationRad - THREE.MathUtils.degToRad(body.axialTilt), elements.longitudeAscendingNodeRad, 0, 'YXZ'));
      o.spin.setFromAxisAngle(new THREE.Vector3(0, 1, 0), elements.argumentOfPeriapsisRad + elements.meanAnomaly + Math.PI);
      moonMeshRef.current.quaternion.multiply(o.spin);
    } else if (moonMeshRef.current) {
      // Uniform mean rotation retains optical libration on eccentric orbits.
      o.spin.setFromAxisAngle(new THREE.Vector3(0, 1, 0), moonElements(body, days).meanAnomaly + Math.PI);
      moonMeshRef.current.quaternion.copy(o.q).multiply(o.spin);
    }
    if (body.id === 'moon' && parent?.type === 'planet' && shaderRef.current) {
      shaderRef.current.uniforms.uOccluderPosition.value.set(...planetPosition(parent, clock.epochMs, clock.elapsedTime, isRealisticScale));
      shaderRef.current.uniforms.uOccluderRadius.value = getScaledRadius(parent.radius, realSizes);
      shaderRef.current.uniforms.uSunRadius.value = getScaledSunRadius(realSizes);
    }
    if (shaderRef.current) shaderRef.current.uniforms.uTime.value = days;
  });

  // Unit-semi-major-axis orbit polyline; the plane group scales it to the
  // live orbit radius each frame.
  const moonOrbitPoints = useMemo(() => {
    const a = 1;
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
        -b * Math.sin(theta)
      ];
      pts.push(flat);
    }
    return pts;
  }, [body.eccentricity]);

  return (
    <group>
      {/* Moon orbit line — rendered LOCALLY around the parent (i.e. inside the
          parent's orbit group, since MoonBodyView is nested there). Only
          Earth's Moon draws one; other satellite orbits would just clutter. */}
      {showOrbits && body.id === "moon" && (
        <group ref={orbitPlaneRef}><Line
          points={moonOrbitPoints}
          color={body.baseColor}
          lineWidth={isSelected ? 1.6 : isHovered ? 1.3 : 0.8}
          transparent
          opacity={isSelected ? 0.7 : isHovered ? 0.45 : 0.22}
          dashed={!isSelected && !isHovered}
          dashScale={1}
          dashSize={0.06}
          gapSize={0.06}
        /></group>
      )}

      {/* Moving moon group (local to the parent). */}
      <group ref={orbitGroupRef}>
        <group>
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

        {showLabels && <SceneLabel id={body.id} name={body.name} radius={radius} onSelect={onSelect} />}
      </group>
    </group>
  );
}

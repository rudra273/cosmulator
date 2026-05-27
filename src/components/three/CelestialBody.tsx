import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import { useSolarSystemStore } from "@/store/solarSystemStore";
import type { CelestialBody as CelestialBodyData } from "@/data/bodies/types";
import { getBodyById, getMoonsOfPlanet } from "@/data/bodies";
import {
  computeOrbitalPosition,
  computeMeanAnomalyAndAngles,
  applyOrbitalRotation,
  solveKeplerEquation,
  getScaledRadius,
  getScaledSunRadius,
  J2000_EPOCH_MS,
  MS_PER_DAY,
  type OrbitalPlane
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
  const sunRadius = getScaledSunRadius(isRealisticScale);
  const shaderRef = useRef<THREE.ShaderMaterial | null>(null);
  const segments = body.geometrySegments ?? DEFAULT_STAR_SEGMENTS;

  useFrame((state) => {
    if (shaderRef.current) {
      // Offset so the star opens mid-animation rather than on the bare uTime=0
      // frame, alongside the clamped color ramp in the shader.
      shaderRef.current.uniforms.uTime.value = state.clock.getElapsedTime() + 100;
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

  // Stable session reference for the orbit-line angles. Lazy-initialized once
  // when the component mounts so `Date.now()` doesn't run during render.
  // Ω/i/ω drift over centuries — using a session-stable reference here is
  // visually indistinguishable while keeping the polyline a pure useMemo.
  const [sessionDaysSinceJ2000] = useState(
    () => (Date.now() - J2000_EPOCH_MS) / MS_PER_DAY
  );

  // Resolve the orbital-plane angles once per (scale, body) — secular drift
  // over a session is negligible, so re-resolving every frame is waste. The
  // same plane object is fed to both the planet's dot AND the orbit-line
  // generator, so they can never visually disagree. Bodies without ephemeris
  // (none of the 8 planets, but defensive) fall back to a flat ring.
  const orbitalPlane: OrbitalPlane | undefined = useMemo(() => {
    if (!body.ephemeris) return undefined;
    const { inclinationRad, longitudeAscendingNodeRad, argumentOfPeriapsisRad } =
      computeMeanAnomalyAndAngles(body.ephemeris, sessionDaysSinceJ2000, isRealisticScale);
    return {
      inclinationRad,
      longitudeAscendingNodeRad,
      argumentOfPeriapsisRad
    };
  }, [isRealisticScale, body.ephemeris, sessionDaysSinceJ2000]);

  useFrame((state, delta) => {
    // 1. Orbital movement along the ellipse.
    if (orbitGroupRef.current) {
      let pos: [number, number, number];
      if (body.ephemeris && orbitalPlane) {
        // Real-positions path (the only path for bodies with ephemeris):
        // anchor against J2000 + offset by elapsedTime, pass Mean Anomaly
        // directly so the Kepler core resolves to "now + scrub".
        const daysSinceJ2000 =
          (Date.now() - J2000_EPOCH_MS) / MS_PER_DAY + elapsedTime;
        const { meanAnomalyAtEpochRad } = computeMeanAnomalyAndAngles(
          body.ephemeris,
          daysSinceJ2000,
          isRealisticScale
        );
        pos = computeOrbitalPosition(
          body.distance,
          body.eccentricity,
          body.orbitalPeriod,
          0, // time absorbed into meanAnomalyAtEpochRad
          isRealisticScale,
          orbitalPlane,
          meanAnomalyAtEpochRad
        );
      } else {
        // Defensive fallback for bodies without ephemeris (flat XZ ring).
        pos = computeOrbitalPosition(
          body.distance,
          body.eccentricity,
          body.orbitalPeriod,
          elapsedTime,
          isRealisticScale
        );
      }
      orbitGroupRef.current.position.set(pos[0], pos[1], pos[2]);
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

// Compression factor for moon orbital distance. Real parent-radii values
// (e.g. 60 for the Earth-Moon system) blow up in our stylized scale because
// PLANET RADII are also power-compressed, so 60 × stylized-Earth-radius ends
// up larger than Earth's heliocentric orbit. We compress moon distance to a
// visually-sensible range while preserving the relative ratios between moons
// of different planets.
//
// Stylized: ~0.05 → Earth-Moon ≈ 3.6 scene units (visible ring just outside Earth)
// Realistic: ~0.5 → preserves more of the real ratio without blowing past Earth's orbit
const STYLIZED_MOON_DISTANCE_COMPRESSION = 0.05;
const REALISTIC_MOON_DISTANCE_COMPRESSION = 0.5;

function MoonBodyView({
  body,
  onSelect
}: {
  body: Extract<CelestialBodyData, { type: "moon" }>;
  onSelect: (id: string) => void;
}) {
  const { selectedPlanetId, elapsedTime, isRealisticScale, showLabels, showOrbits } =
    useSolarSystemStore();

  const [isHovered, setIsHovered] = useState(false);
  const orbitGroupRef = useRef<THREE.Group | null>(null);
  const moonMeshRef = useRef<THREE.Mesh | null>(null);
  const shaderRef = useRef<THREE.ShaderMaterial | null>(null);

  const isSelected = selectedPlanetId === body.id;
  const radius = getScaledRadius(body.radius, isRealisticScale);
  const segments = body.geometrySegments ?? DEFAULT_PLANET_SEGMENTS;

  // The moon's orbital semi-major axis in SCENE UNITS:
  //   parent.radius_km × scaled_radius_factor × body.distance_in_parent_radii
  // We look up the parent's scaled radius so the moon's orbit scales with
  // whatever Realistic-Scale mode is doing to the parent.
  const parent = getBodyById(body.parentId);
  const parentScaledRadius = parent
    ? getScaledRadius(parent.radius, isRealisticScale)
    : 1;
  const distanceCompression = isRealisticScale
    ? REALISTIC_MOON_DISTANCE_COMPRESSION
    : STYLIZED_MOON_DISTANCE_COMPRESSION;
  const orbitSceneRadius = parentScaledRadius * body.distance * distanceCompression;

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

  useFrame((state, delta) => {
    // 1. Orbital movement, local to the parent group. We inline the Kepler
    // sweep instead of calling computeOrbitalPosition because that helper
    // pipes its first arg through getScaledDistance() (designed for AU →
    // scene units). We already have a scene-unit semi-major axis, so we
    // compute directly.
    if (orbitGroupRef.current) {
      const M = (2 * Math.PI * elapsedTime) / body.orbitalPeriod;
      const E = solveKeplerEquation(M, body.eccentricity);
      const trueAnomaly = 2 * Math.atan2(
        Math.sqrt(1 + body.eccentricity) * Math.sin(E / 2),
        Math.sqrt(1 - body.eccentricity) * Math.cos(E / 2)
      );
      const r = orbitSceneRadius * (1 - body.eccentricity * Math.cos(E));
      const flat: [number, number, number] = [
        r * Math.cos(trueAnomaly),
        0,
        r * Math.sin(trueAnomaly)
      ];
      const [x, y, z] = applyOrbitalRotation(flat, orbitalPlane);
      orbitGroupRef.current.position.set(x, y, z);
    }

    // 2. Self-spin.
    if (moonMeshRef.current) {
      const spinSpeed = body.rotationPeriod !== 0 ? 24 / body.rotationPeriod : 0;
      const storeTimeScale = useSolarSystemStore.getState().timeScale;
      moonMeshRef.current.rotation.y += spinSpeed * delta * storeTimeScale * 0.05;
    }

    // 3. Shader uTime + uSunPosition (sun still at world origin; moon is local
    // to the parent group which itself orbits the sun — close enough for
    // stylized lighting).
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
      shaderRef.current.uniforms.uSunPosition.value = new THREE.Vector3(0, 0, 0);
    }
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


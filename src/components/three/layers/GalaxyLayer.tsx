import { useMemo, useRef, useEffect, useState } from "react"; // useMemo used for marker pos
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { useSolarSystemStore } from "@/store/solarSystemStore";
import { LAYER_CAMERA_POSES } from "./cameraPoses";
import { useAscendOnZoomOut } from "./useAscendOnZoomOut";
import { usePublishDistance } from "./usePublishDistance";
import StarSprite from "./shared/StarSprite";

// Stylised 4-arm barred spiral disc. Densities + radii chosen so the galaxy
// lives comfortably inside the galaxy layer's 0–4500-unit zoom budget.
const STAR_COUNT = 30_000; // ~10× the previous placeholder
const DISC_OUTER_RADIUS = 1500;
const DISC_INNER_RADIUS = 100;
const ARM_COUNT = 4; // Milky Way is a 4-major-arm barred spiral
const ARM_TIGHTNESS = 0.9; // log-spiral coefficient; lower = looser winding
// Dust-lane simulation: stars in the interlane regions get darkened. Half
// the angular gap between arms is "in" the arm; the rest is dust.
const ARM_ANGULAR_HALF_WIDTH = 0.18; // radians
const DUST_LANE_DARKENING = 0.35; // multiplier for stars far from arm centers
const DISC_THICKNESS = 45; // base out-of-plane jitter (scales by radius)
const BAR_RADIUS = 250; // central bar dominates inside this radius
const BAR_ASPECT = 2.2; // length/width ratio of the bar (along +X)
const BAR_STAR_FRACTION = 0.06; // ~6% of stars cluster in the bar
// Halo: a thin outer cloud of dimmer stars beyond the main disc.
const HALO_FRACTION = 0.04;

// The "Solar System" marker sits ~58% along one arm — roughly the Sun's
// galactocentric distance (Orion Spur position, very approximate).
const MARKER_ARM_INDEX = 0;
const MARKER_ARM_T = 0.58;
const MARKER_RADIUS = 9;

/**
 * Build the galaxy's position + color buffers. Called once from a lazy
 * useState initializer — keeps Math.random() out of the render path.
 *
 * Three star populations:
 *   1. BAR — ~6% of stars, clustered in an elongated central ellipsoid.
 *   2. ARM-DISC — the bulk, distributed along 4 log-spiral arms with
 *      dust-lane darkening between arms.
 *   3. HALO — ~4% of stars, a dimmer cloud outside the main disc.
 *
 * Star color varies by galactocentric radius (bulge = warm yellow, arms =
 * white/blue, halo = cool blue) and is dimmed in the dust-lane interlanes.
 */
function buildSpiralBuffers(): { positions: Float32Array; colors: Float32Array } {
  const positions = new Float32Array(STAR_COUNT * 3);
  const colors = new Float32Array(STAR_COUNT * 3);

  // Spectral-style population colors.
  const bulgeColor = new THREE.Color("#ffd07a"); // warm yellow center
  const armColor = new THREE.Color("#cfd8ff"); // white-blue arm stars
  const haloColor = new THREE.Color("#7a92cc"); // cool dim halo blue

  // How many of each population.
  const barCount = Math.floor(STAR_COUNT * BAR_STAR_FRACTION);
  const haloCount = Math.floor(STAR_COUNT * HALO_FRACTION);
  const discCount = STAR_COUNT - barCount - haloCount;

  let idx = 0;

  // --- 1. BAR stars (elongated central ellipsoid) ---
  for (let i = 0; i < barCount; i++) {
    // Sample a point in a unit sphere, then squash along Y and stretch along X.
    let x: number, y: number, z: number;
    do {
      x = Math.random() * 2 - 1;
      y = Math.random() * 2 - 1;
      z = Math.random() * 2 - 1;
    } while (x * x + y * y + z * z > 1);
    x *= BAR_RADIUS * BAR_ASPECT;
    z *= BAR_RADIUS / BAR_ASPECT; // narrower across
    y *= BAR_RADIUS * 0.35; // squashed vertically
    positions[idx * 3 + 0] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;
    // Bar stars are warm — same as bulge color, with slight variation.
    const tint = 0.85 + Math.random() * 0.3;
    colors[idx * 3 + 0] = bulgeColor.r * tint;
    colors[idx * 3 + 1] = bulgeColor.g * tint;
    colors[idx * 3 + 2] = bulgeColor.b * tint * 0.9; // slightly redder
    idx++;
  }

  // --- 2. ARM-DISC stars (the bulk; spiral arms + dust lanes) ---
  for (let i = 0; i < discCount; i++) {
    // Radial distance with bias toward smaller r (denser inner regions).
    const tRaw = Math.pow(Math.random(), 0.55);
    const r = DISC_INNER_RADIUS + tRaw * (DISC_OUTER_RADIUS - DISC_INNER_RADIUS);

    // Pick an arm uniformly. The star's IDEAL angular position along its arm.
    const arm = i % ARM_COUNT;
    const armBaseAngle = (arm / ARM_COUNT) * Math.PI * 2;
    const spinAngle = Math.log(r / DISC_INNER_RADIUS + 1) * ARM_TIGHTNESS;
    const armCenterAngle = armBaseAngle + spinAngle;

    // Random angular offset from the arm center — this is what distributes
    // stars across the arm width AND into the dust lanes between arms.
    // We sample a slightly heavy-tailed distribution so most stars cluster
    // near the arm center but some scatter outward (the dust-lane region).
    const angularOffset =
      (Math.random() + Math.random() - 1) * (Math.PI / ARM_COUNT) * 0.85;
    const angle = armCenterAngle + angularOffset;

    // Dust-lane darkening: stars far from the arm center are dimmer.
    // distFromArm goes 0 (on the arm) to 1 (in the interlane).
    const distFromArm = Math.min(
      1,
      Math.abs(angularOffset) / (Math.PI / ARM_COUNT)
    );
    const armEdgeMask = Math.max(0, distFromArm - ARM_ANGULAR_HALF_WIDTH /
      (Math.PI / ARM_COUNT));
    const dustDarken = 1 - armEdgeMask * (1 - DUST_LANE_DARKENING);

    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    // Disc thickness falls off with radius (thin rim, thicker near center).
    const tNorm = (r - DISC_INNER_RADIUS) / (DISC_OUTER_RADIUS - DISC_INNER_RADIUS);
    const thickness = DISC_THICKNESS * Math.pow(1 - tNorm, 1.5) + 4;
    const y = (Math.random() - 0.5) * thickness;

    positions[idx * 3 + 0] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;

    // Color: bulge-warm in inner 25%, arm-white in 25–70%, halo-cool past 70%.
    let c: THREE.Color;
    if (tNorm < 0.25) {
      // Inner: blend bulge → arm
      const localT = tNorm / 0.25;
      c = bulgeColor.clone().lerp(armColor, localT);
    } else if (tNorm < 0.7) {
      // Middle: mostly arm color with slight variation
      const localT = (tNorm - 0.25) / 0.45;
      c = armColor.clone().lerp(haloColor, localT * 0.25);
    } else {
      // Outer: blend toward halo
      const localT = (tNorm - 0.7) / 0.3;
      c = armColor.clone().lerp(haloColor, 0.25 + localT * 0.75);
    }

    colors[idx * 3 + 0] = c.r * dustDarken;
    colors[idx * 3 + 1] = c.g * dustDarken;
    colors[idx * 3 + 2] = c.b * dustDarken;
    idx++;
  }

  // --- 3. HALO stars (sparse cloud beyond the main disc) ---
  for (let i = 0; i < haloCount; i++) {
    // Uniform-ish sphere, biased outward (halo extends past the disc).
    const u = Math.random();
    const r = DISC_OUTER_RADIUS * (0.9 + u * 0.45); // 90%–135% disc radius
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.cos(phi) * 0.6; // slightly flattened halo
    const z = r * Math.sin(phi) * Math.sin(theta);
    positions[idx * 3 + 0] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;
    // Halo stars are dim and cool.
    const dim = 0.45 + Math.random() * 0.25;
    colors[idx * 3 + 0] = haloColor.r * dim;
    colors[idx * 3 + 1] = haloColor.g * dim;
    colors[idx * 3 + 2] = haloColor.b * dim;
    idx++;
  }

  return { positions, colors };
}

/**
 * Bare-bones Milky Way placeholder for Phase 0. Renders a log-spiral particle
 * disc with a yellow bulge and a clickable "Solar System" marker. Real arms,
 * dust lanes, and central bulge come in Phase 1.
 */
interface GalaxyLayerProps {
  /** Cross-fade opacity (1 = fully visible, 0 = fully transparent). */
  opacity?: number;
  /** True only for the currently-active layer; controls camera + OrbitControls
   *  mount so the outgoing layer doesn't fight for the camera during a fade. */
  isActive?: boolean;
}

export default function GalaxyLayer({ opacity = 1, isActive = true }: GalaxyLayerProps) {
  const descendScale = useSolarSystemStore((s) => s.descendScale);
  const transitionFrom = useSolarSystemStore((s) => s.transitionFrom);
  const { camera } = useThree();
  const [hovered, setHovered] = useState(false);
  // The rotating group holds the disc, bulge, marker, and label so they
  // all spin together — keeping the marker visually pinned to its arm.
  const discGroupRef = useRef<THREE.Group | null>(null);
  // Galaxy-layer OrbitControls — exposed so the ascend-on-zoom-out watcher
  // can react to the user dragging past maxDistance → Universe.
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  useAscendOnZoomOut(controlsRef, {
    maxDistance: LAYER_CAMERA_POSES.galaxy.maxDistance,
    threshold: 0.95,
    enabled: transitionFrom === null
  });
  usePublishDistance(controlsRef, isActive);

  // Generate the spiral buffers once. Lazy useState init keeps Math.random
  // off the render path (lint flags impurity inside useMemo).
  const [{ positions, colors }] = useState(() => buildSpiralBuffers());

  // Solar System marker position — pick a point ~60% along arm 0.
  const markerPos = useMemo(() => {
    const r = DISC_INNER_RADIUS + MARKER_ARM_T * (DISC_OUTER_RADIUS - DISC_INNER_RADIUS);
    const armBaseAngle = (MARKER_ARM_INDEX / ARM_COUNT) * Math.PI * 2;
    const spinAngle = Math.log(r / DISC_INNER_RADIUS + 1) * ARM_TIGHTNESS;
    const angle = armBaseAngle + spinAngle;
    return new THREE.Vector3(Math.cos(angle) * r, 0, Math.sin(angle) * r);
  }, []);

  // Snap the camera + controls target to the galaxy overview pose when this
  // layer becomes active. Setting controls.target is essential — the
  // OrbitControls own the target, not the camera. We re-run whenever
  // isActive flips on (the controls only exist while active).
  useEffect(() => {
    if (!isActive) return;
    const pose = LAYER_CAMERA_POSES.galaxy;
    camera.position.set(...pose.cameraPos);
    camera.updateProjectionMatrix();
    const controls = controlsRef.current;
    if (controls) {
      controls.target.set(...pose.target);
      controls.update();
    }
  }, [camera, isActive]);

  // Slow rotation so the galaxy feels alive.
  useFrame((_, delta) => {
    if (discGroupRef.current) discGroupRef.current.rotation.y += delta * 0.02;
  });

  return (
    <>
      <ambientLight intensity={0.4} />

      <group ref={discGroupRef}>
        {/* Spiral disc */}
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[positions, 3]} />
            <bufferAttribute attach="attributes-color" args={[colors, 3]} />
          </bufferGeometry>
          <pointsMaterial
            size={3}
            vertexColors
            transparent
            opacity={0.95 * opacity}
            sizeAttenuation
            depthWrite={false}
          />
        </points>

        {/* Glowing central bulge — billboarded additive sprite. Always faces
            the camera so it reads as a soft bloom regardless of viewing angle,
            and the shader's radial falloff gives a proper "core" gradient
            (bright center, soft halo) without needing real postprocessing. */}
        <StarSprite
          position={[0, 0, 0]}
          size={DISC_INNER_RADIUS * 3.2}
          color="#ffd07a"
          intensity={0.85 * opacity}
        />

        {/* "Solar System" marker — clickable */}
        <mesh
          position={markerPos.toArray()}
          onClick={(e) => {
            e.stopPropagation();
            descendScale();
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            setHovered(false);
            document.body.style.cursor = "default";
          }}
        >
          <sphereGeometry args={[MARKER_RADIUS * (hovered ? 1.4 : 1.0), 16, 16]} />
          <meshBasicMaterial
            color={hovered ? "#ffdd55" : "#ffb700"}
            transparent
            opacity={0.95 * opacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* Marker label — billboarded, always readable. */}
        <Html
          position={[markerPos.x, markerPos.y + 18, markerPos.z]}
          center
          zIndexRange={[20, 0]}
        >
          <div
            onClick={() => descendScale()}
            style={{
              background: "rgba(0, 0, 0, 0.55)",
              border: "1px solid rgba(255, 183, 0, 0.5)",
              color: "#ffd87a",
              fontFamily: "'Orbitron', sans-serif",
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "1px",
              padding: "3px 8px",
              borderRadius: "10px",
              whiteSpace: "nowrap",
              cursor: "pointer",
              textTransform: "uppercase",
              transform: `scale(${hovered ? 1.1 : 1})`,
              transition: "transform 0.15s ease",
              opacity
            }}
          >
            Solar System
          </div>
        </Html>
      </group>

      {/* Galaxy-layer camera controls — only mounted when active so the
          outgoing layer doesn't fight for the camera during a cross-fade. */}
      {isActive && (
        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.08}
          enablePan={false}
          minDistance={LAYER_CAMERA_POSES.galaxy.minDistance}
          maxDistance={LAYER_CAMERA_POSES.galaxy.maxDistance}
          maxPolarAngle={Math.PI / 2 - 0.05} // keep above the disc
        />
      )}
    </>
  );
}

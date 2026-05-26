import { useMemo, useRef, useEffect, useState } from "react"; // useMemo used for marker pos
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { useSolarSystemStore } from "@/store/solarSystemStore";
import { LAYER_CAMERA_POSES } from "./cameraPoses";
import { useAscendOnZoomOut } from "./useAscendOnZoomOut";

// Stylized 2-arm log-spiral, ~3000 points. Numbers chosen so the disc lives
// comfortably inside the galaxy layer's 0–3000-unit zoom budget.
const STAR_COUNT = 3000;
const DISC_OUTER_RADIUS = 1500;
const DISC_INNER_RADIUS = 80; // central bulge
const ARM_COUNT = 2;
const ARM_TIGHTNESS = 1.2; // higher = tighter winding
const ARM_SPREAD = 60; // random offset perpendicular to arm
const DISC_THICKNESS = 35; // out-of-plane jitter

// The "Solar System" marker sits ~60% along one arm.
const MARKER_ARM_INDEX = 0;
const MARKER_ARM_T = 0.6; // 0–1 along the arm
const MARKER_RADIUS = 8;

/**
 * Build the spiral's position + color buffers. Called once from a lazy
 * useState initializer — keeps Math.random() out of the render path.
 */
function buildSpiralBuffers(): { positions: Float32Array; colors: Float32Array } {
  const positions = new Float32Array(STAR_COUNT * 3);
  const colors = new Float32Array(STAR_COUNT * 3);
  const bulgeColor = new THREE.Color("#ffd87a"); // warm yellow center
  const armColor = new THREE.Color("#9bbcff"); // cool blue arms

  for (let i = 0; i < STAR_COUNT; i++) {
    // Radial distance with a bias toward the center (denser bulge).
    const tRaw = Math.pow(Math.random(), 0.6);
    const r = DISC_INNER_RADIUS + tRaw * (DISC_OUTER_RADIUS - DISC_INNER_RADIUS);

    // Which arm this star belongs to, plus its base angle along the arm.
    const arm = i % ARM_COUNT;
    const armBaseAngle = (arm / ARM_COUNT) * Math.PI * 2;
    const spinAngle = Math.log(r / DISC_INNER_RADIUS + 1) * ARM_TIGHTNESS;
    const angle = armBaseAngle + spinAngle;

    // Random perpendicular offset (gives the arm thickness) — biased inward
    // as r grows so arms tighten visually.
    const offsetMag = (Math.random() - 0.5) * ARM_SPREAD * (1 - tRaw * 0.5);
    const tx = -Math.sin(angle);
    const tz = Math.cos(angle);

    const x = Math.cos(angle) * r + tx * offsetMag;
    const z = Math.sin(angle) * r + tz * offsetMag;
    // Vertical jitter — flatter near the rim, thicker in the bulge.
    const y = (Math.random() - 0.5) * DISC_THICKNESS * (1 - tRaw * 0.7);

    positions[i * 3 + 0] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    // Color: blend bulge → arm based on radius.
    const c = bulgeColor.clone().lerp(armColor, tRaw);
    colors[i * 3 + 0] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
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

        {/* Bright central bulge — small additive sphere */}
        <mesh>
          <sphereGeometry args={[DISC_INNER_RADIUS * 0.7, 32, 32]} />
          <meshBasicMaterial
            color="#ffd87a"
            transparent
            opacity={0.35 * opacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

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

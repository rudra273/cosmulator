import { useEffect, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { useSolarSystemStore } from "@/store/solarSystemStore";
import { LAYER_CAMERA_POSES } from "./cameraPoses";
import StarSprite from "./shared/StarSprite";
import { usePublishDistance } from "./usePublishDistance";

// ~50 galaxy sprites distributed in a sphere around origin. Range chosen so
// they comfortably live inside the universe layer's 0–8000-unit zoom budget.
const GALAXY_COUNT = 50;
const INNER_RADIUS = 1500;
const OUTER_RADIUS = 6000;

// The "Milky Way" marker — we anchor it at a fixed position so it's always
// findable, and tint it gold to stand out from the bluish/violet field.
const MILKY_WAY_POS = new THREE.Vector3(0, 200, -1800);
const MARKER_SIZE = 320;
const SPRITE_SIZE_MIN = 120;
const SPRITE_SIZE_MAX = 260;

interface SpriteData {
  position: [number, number, number];
  size: number;
  color: string;
  rotation: number; // visual rotation of the sprite for variety
}

/**
 * Build the ~50 background galaxy sprites once. Called from a lazy useState
 * initializer so Math.random() stays off the render path.
 */
function buildGalaxyField(): SpriteData[] {
  const palette = ["#7e9bd6", "#a17bd6", "#d67ba8", "#7bd6c1", "#d6c47b"];
  const sprites: SpriteData[] = [];
  for (let i = 0; i < GALAXY_COUNT; i++) {
    // Uniform-ish point on a thick spherical shell.
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = INNER_RADIUS + Math.random() * (OUTER_RADIUS - INNER_RADIUS);
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.cos(phi);
    const z = r * Math.sin(phi) * Math.sin(theta);
    sprites.push({
      position: [x, y, z],
      size: SPRITE_SIZE_MIN + Math.random() * (SPRITE_SIZE_MAX - SPRITE_SIZE_MIN),
      color: palette[i % palette.length],
      rotation: Math.random() * Math.PI * 2
    });
  }
  return sprites;
}

interface UniverseLayerProps {
  /** Cross-fade opacity (1 = fully visible, 0 = fully transparent). */
  opacity?: number;
  /** Only the active layer mounts its OrbitControls — see GalaxyLayer. */
  isActive?: boolean;
}

/**
 * Bare-bones Universe placeholder for Phase 0. Renders a field of blurry
 * galaxy sprites with a clickable "Milky Way" marker. Distance text and real
 * cosmology come in Phase 1+.
 */
export default function UniverseLayer({ opacity = 1, isActive = true }: UniverseLayerProps) {
  const descendScale = useSolarSystemStore((s) => s.descendScale);
  const { camera } = useThree();
  const [hovered, setHovered] = useState(false);
  const [galaxies] = useState<SpriteData[]>(() => buildGalaxyField());
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  usePublishDistance(controlsRef, isActive);

  // Snap the camera + controls target to the universe overview pose when
  // this layer becomes active.
  useEffect(() => {
    if (!isActive) return;
    const pose = LAYER_CAMERA_POSES.universe;
    camera.position.set(...pose.cameraPos);
    camera.updateProjectionMatrix();
    const controls = controlsRef.current;
    if (controls) {
      controls.target.set(...pose.target);
      controls.update();
    }
  }, [camera, isActive]);


  return (
    <>
      <ambientLight intensity={0.5} />

      {/* Background galaxy field */}
      {galaxies.map((g, i) => (
        <StarSprite key={i} {...g} intensity={0.7 * opacity} />
      ))}

      {/* Milky Way marker — same blurry sprite, larger + gold + clickable */}
      <StarSprite
        position={MILKY_WAY_POS.toArray() as [number, number, number]}
        size={MARKER_SIZE * (hovered ? 1.15 : 1.0)}
        color={hovered ? "#ffdd55" : "#ffb700"}
        intensity={1.2 * opacity}
        onClick={() => descendScale()}
        onPointerOver={() => {
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "default";
        }}
      />

      {/* Marker label */}
      <Html
        position={[MILKY_WAY_POS.x, MILKY_WAY_POS.y + MARKER_SIZE * 0.55, MILKY_WAY_POS.z]}
        center
        zIndexRange={[20, 0]}
      >
        <div
          onClick={() => descendScale()}
          style={{
            background: "rgba(0, 0, 0, 0.55)",
            border: "1px solid rgba(255, 183, 0, 0.6)",
            color: "#ffd87a",
            fontFamily: "'Orbitron', sans-serif",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "1.5px",
            padding: "4px 10px",
            borderRadius: "10px",
            whiteSpace: "nowrap",
            cursor: "pointer",
            textTransform: "uppercase",
            transform: `scale(${hovered ? 1.1 : 1})`,
            transition: "transform 0.15s ease",
            opacity
          }}
        >
          Milky Way
        </div>
      </Html>

      {isActive && (
        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.08}
          enablePan={false}
          minDistance={LAYER_CAMERA_POSES.universe.minDistance}
          maxDistance={LAYER_CAMERA_POSES.universe.maxDistance}
        />
      )}
    </>
  );
}

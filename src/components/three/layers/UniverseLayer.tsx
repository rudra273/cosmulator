import { useEffect, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { useSolarSystemStore } from "@/store/solarSystemStore";
import { LAYER_CAMERA_POSES } from "./cameraPoses";
import StarSprite from "./shared/StarSprite";
import { usePublishDistance } from "./usePublishDistance";

// Deep-field skybox — a large inside-out sphere with NASA's Hubble Ultra
// Deep Field mapped to its inner surface. Radius sits just inside the
// layer's maxDistance (8000) so the camera can never reach it but the
// deep field still surrounds the camera at every zoom level. Pole
// compression from spherical UV mapping is not visually obvious because
// every patch of the deep field looks like every other patch.
const SKYBOX_RADIUS = 7500;

// The "Milky Way" marker — placed at the origin (which is the OrbitControls
// target). Camera orbits around origin, so the marker stays centred on
// screen no matter what direction the user rotates to. If we placed it at a
// fixed offset from origin, orbiting past it would put it behind the camera
// and it would appear to vanish.
const MILKY_WAY_POS = new THREE.Vector3(0, 0, 0);
const MARKER_SIZE = 320;

interface UniverseLayerProps {
  /** Cross-fade opacity (1 = fully visible, 0 = fully transparent). */
  opacity?: number;
  /** Only the active layer mounts its OrbitControls — see GalaxyLayer. */
  isActive?: boolean;
}

/**
 * Universe layer — a NASA Hubble Ultra Deep Field skybox surrounding the
 * camera with a clickable Milky Way marker in front of it. Same image-on-a-
 * mesh technique as the Galaxy layer's NASA-textured disc.
 */
export default function UniverseLayer({ opacity = 1, isActive = true }: UniverseLayerProps) {
  const descendScale = useSolarSystemStore((s) => s.descendScale);
  const { camera } = useThree();
  const [hovered, setHovered] = useState(false);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  usePublishDistance(controlsRef, isActive);

  // NASA Hubble Ultra Deep Field texture for the skybox. Manual TextureLoader
  // (rather than drei's useTexture) for the same reason as the Galaxy layer:
  // useTexture suspends the whole layer, which tears the OrbitControls /
  // camera plumbing during the cross-fade.
  const [skyTex, setSkyTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load("/textures/hubble-deep-field.webp", (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      tex.needsUpdate = true;
      setSkyTex(tex);
    });
  }, []);

  // The skybox material's opacity needs to track the layer cross-fade. We
  // mutate the live material via a ref in an effect — same pattern as the
  // disc shader and StarSprite.
  const skyMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  useEffect(() => {
    if (skyMatRef.current) {
      skyMatRef.current.opacity = opacity;
    }
  }, [opacity]);

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

      {/* === Hubble Ultra Deep Field skybox — large inside-out sphere with
          the NASA HUDF texture on its inner surface. side=BackSide so we see
          the texture from inside the sphere. depthWrite=false so it doesn't
          occlude anything else. */}
      {skyTex && (
        // Tilt the sphere so its poles (where spherical UV mapping pinches)
        // sit behind the camera at the default Universe pose. Default camera
        // looks down-and-forward toward origin from [0, 2000, 3500]; a
        // ~60° X-axis tilt swings the +Y pole behind the camera, out of view.
        <mesh rotation={[-Math.PI / 3, 0, 0]} renderOrder={-1}>
          <sphereGeometry args={[SKYBOX_RADIUS, 64, 32]} />
          <meshBasicMaterial
            ref={skyMatRef}
            map={skyTex}
            side={THREE.BackSide}
            depthWrite={false}
            transparent
            opacity={opacity}
            toneMapped={false}
          />
        </mesh>
      )}

      {/* Milky Way marker — same blurry sprite as before, larger + gold + clickable */}
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

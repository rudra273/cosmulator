import { useEffect, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useSolarSystemStore } from "@/store/solarSystemStore";
import { LAYER_CAMERA_POSES } from "./cameraPoses";
import { useAscendOnZoomOut } from "./useAscendOnZoomOut";
import { usePublishDistance } from "./usePublishDistance";
import StarSprite from "./shared/StarSprite";
import { NEARBY_STARS, SUN_STELLAR } from "@/data/stars";

interface StellarLayerProps {
  /** Cross-fade opacity (1 = fully visible, 0 = fully transparent). */
  opacity?: number;
  /** Only the active layer mounts its OrbitControls — see GalaxyLayer. */
  isActive?: boolean;
}

/**
 * Stellar Neighborhood — the layer between the solar system and the Milky Way.
 * Renders the Sun as the central anchor and ~15 famous nearby stars with their
 * real spectral-class colors. Clicking the Sun descends to Solar; zooming out
 * past maxDistance ascends to Galaxy.
 */
export default function StellarLayer({ opacity = 1, isActive = true }: StellarLayerProps) {
  const descendScale = useSolarSystemStore((s) => s.descendScale);
  const transitionFrom = useSolarSystemStore((s) => s.transitionFrom);
  const { camera } = useThree();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  useAscendOnZoomOut(controlsRef, {
    maxDistance: LAYER_CAMERA_POSES.stellar.maxDistance,
    threshold: 0.95,
    enabled: transitionFrom === null,
    isActive
  });
  usePublishDistance(controlsRef, isActive);

  // Snap the camera + controls target to the stellar overview pose when this
  // layer becomes active.
  useEffect(() => {
    if (!isActive) return;
    const pose = LAYER_CAMERA_POSES.stellar;
    camera.position.set(...pose.cameraPos);
    camera.updateProjectionMatrix();
    const controls = controlsRef.current;
    if (controls) {
      controls.target.set(...pose.target);
      controls.update();
    }
  }, [camera, isActive]);

  const sunHovered = hoveredId === "sun";

  return (
    <>
      <ambientLight intensity={0.6} />

      {/* The Sun — centered, brightest, clickable to descend to Solar. */}
      <StarSprite
        position={SUN_STELLAR.position}
        size={SUN_STELLAR.size * (sunHovered ? 1.15 : 1.0)}
        color={sunHovered ? "#fff5b0" : SUN_STELLAR.color}
        intensity={1.4 * opacity}
        onClick={() => descendScale()}
        onPointerOver={() => {
          setHoveredId("sun");
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHoveredId(null);
          document.body.style.cursor = "default";
        }}
      />

      {/* Sun label — always visible, gold, with a hint about the click. */}
      <Html
        position={[0, SUN_STELLAR.size * 0.55, 0]}
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
            transform: `scale(${sunHovered ? 1.1 : 1})`,
            transition: "transform 0.15s ease",
            opacity
          }}
        >
          ☉ Sun
        </div>
      </Html>

      {/* Nearby stars — each renders as a colored blurry sprite with a small
          name label below. Hover slightly brightens + scales for feedback. */}
      {NEARBY_STARS.map((star) => {
        const isHovered = hoveredId === star.id;
        return (
          <group key={star.id}>
            <StarSprite
              position={star.position}
              size={star.size * (isHovered ? 1.2 : 1.0)}
              color={star.color}
              intensity={(isHovered ? 1.1 : 0.85) * opacity}
              onPointerOver={() => {
                setHoveredId(star.id);
                document.body.style.cursor = "default"; // not clickable
              }}
              onPointerOut={() => {
                if (hoveredId === star.id) setHoveredId(null);
              }}
            />
            <Html
              position={[
                star.position[0],
                star.position[1] + star.size * 0.55,
                star.position[2]
              ]}
              center
              zIndexRange={[20, 0]}
            >
              <div
                style={{
                  background: isHovered ? "rgba(0, 0, 0, 0.7)" : "rgba(0, 0, 0, 0.45)",
                  border: `1px solid ${isHovered ? "rgba(255, 255, 255, 0.45)" : "rgba(255, 255, 255, 0.15)"}`,
                  color: "#dddddd",
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: "9px",
                  fontWeight: 500,
                  letterSpacing: "1px",
                  padding: "2px 7px",
                  borderRadius: "8px",
                  whiteSpace: "nowrap",
                  textTransform: "uppercase",
                  pointerEvents: "none", // labels are decorative; sprite handles hover
                  opacity: opacity * (isHovered ? 1 : 0.75),
                  transition: "opacity 0.15s ease"
                }}
              >
                {star.name}
              </div>
            </Html>
          </group>
        );
      })}

      {isActive && (
        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.08}
          enablePan={false}
          minDistance={LAYER_CAMERA_POSES.stellar.minDistance}
          maxDistance={LAYER_CAMERA_POSES.stellar.maxDistance}
        />
      )}
    </>
  );
}

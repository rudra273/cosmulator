import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { useSolarSystemStore } from "@/store/solarSystemStore";
import { LAYER_CAMERA_POSES } from "./cameraPoses";
import { useAscendOnZoomOut } from "./useAscendOnZoomOut";
import { usePublishDistance } from "./usePublishDistance";
import { useSettleTarget } from "./useSettleTarget";
import { usePullback } from "./usePullback";
import StarSprite from "./shared/StarSprite";
import { MILKY_WAY_SMALL, useImageTexture } from "./shared/assets";
import { galaxyDiscVertexShader, galaxyDiscFragmentShader } from "@/lib/shaders/galaxyDisc.glsl";
import { GALAXY_IMAGE_CENTER_OFFSET_X, GALAXY_IMAGE_SPAN_UNITS } from "@/data/galaxy";
import { LY_PER_UNIT } from "@/data/scales";
import { PLACED_LOCAL_GROUP, type PlacedMember } from "@/data/localGroup";
import { localGroupCard } from "@/data/infoCards";

// Galaxy-layer units → Local Group units, so the Milky Way here is exactly
// the Galaxy layer's disc at true size (~100,000 ly across).
const GALAXY_TO_LG = LY_PER_UNIT.galaxy / LY_PER_UNIT.localGroup;
const MW_RADIUS = (GALAXY_IMAGE_SPAN_UNITS / 2) * GALAXY_TO_LG;
// In the texture the painted disc fills ~88% of the width.
const VISIBLE_FRACTION = 0.88;

const KIND_COLOR: Record<PlacedMember["kind"], string> = {
  spiral: "#cfd9ff",
  elliptical: "#ffe2b8",
  irregular: "#b8d4ff",
  "dwarf spheroidal": "#c8c2b8"
};

const labelBase: React.CSSProperties = {
  fontFamily: "'Orbitron', sans-serif",
  fontSize: "8px",
  letterSpacing: "1.2px",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
  userSelect: "none",
  textShadow: "0 1px 2px rgba(0,0,0,0.9)"
};

/** A textured galaxy disc; its local +Y is the disc normal. */
function GalaxyDisc({ texture, radius, opacity, offsetX = 0, onClick }: { texture: THREE.Texture; radius: number; opacity: number; offsetX?: number; onClick?: () => void }) {
  // Stable for the disc's lifetime: it only mounts once the texture exists.
  const [uniforms] = useState(() => ({ uMap: { value: texture }, uOpacity: { value: 0 } }));
  const matRef = useRef<THREE.ShaderMaterial | null>(null);
  // Mounted once the texture exists; fade in rather than pop.
  const fade = useRef(0);
  useFrame((_, delta) => {
    if (fade.current < 1) fade.current = Math.min(1, fade.current + delta / 0.7);
    if (matRef.current) matRef.current.uniforms.uOpacity.value = opacity * fade.current;
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[offsetX, 0, 0]} onClick={onClick ? (e) => { e.stopPropagation(); onClick(); } : undefined}>
      <circleGeometry args={[radius, 96]} />
      <shaderMaterial ref={matRef} vertexShader={galaxyDiscVertexShader} fragmentShader={galaxyDiscFragmentShader} uniforms={uniforms} transparent depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

interface LocalGroupLayerProps {
  opacity?: number;
  isActive?: boolean;
}

/**
 * The Local Group: the Milky Way (the Galaxy layer's disc at true size) and
 * its neighbours out to ~3 million light-years at their real positions.
 * Andromeda and Triangulum are tilted to their measured inclinations; they
 * reuse the Milky Way artwork, so their look is illustrative.
 */
export default function LocalGroupLayer({ opacity = 1, isActive = true }: LocalGroupLayerProps) {
  const descendScale = useSolarSystemStore((s) => s.descendScale);
  const openInfoCard = useSolarSystemStore((s) => s.openInfoCard);
  const transitionFrom = useSolarSystemStore((s) => s.transitionFrom);
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const [hovered, setHovered] = useState(false);

  useAscendOnZoomOut(controlsRef, {
    maxDistance: LAYER_CAMERA_POSES.localGroup.maxDistance,
    threshold: 0.95,
    enabled: transitionFrom === null,
    isActive,
    layer: "localGroup",
    minDistance: LAYER_CAMERA_POSES.localGroup.minDistance
  });
  usePublishDistance(controlsRef, isActive);
  useSettleTarget(controlsRef, "localGroup", isActive);
  const { stuffScale, anchorScale, t: pullbackT } = usePullback("localGroup");
  const labelOpacity = transitionFrom !== null ? 0 : opacity * Math.max(0, 1 - pullbackT / 0.35);
  // The Milky Way's satellites crowd together at the overview; name them
  // once the camera is closer.
  const showMinorLabels = useSolarSystemStore((s) => s.cameraDistance < 1800);
  const isMajor = (m: PlacedMember) => m.kind === "spiral" || m.id === "lmc" || m.id === "smc";

  // Same image as the Galaxy layer's phone version (48 KB, cached).
  const texture = useImageTexture(MILKY_WAY_SMALL, (t) => { t.anisotropy = 8; });

  useEffect(() => {
    if (!isActive) return;
    if (useSolarSystemStore.getState().transitionDir !== null) return;
    const pose = LAYER_CAMERA_POSES.localGroup;
    camera.position.set(...pose.cameraPos);
    camera.updateProjectionMatrix();
    const controls = controlsRef.current;
    if (controls) {
      controls.target.set(...pose.target);
      controls.update();
    }
  }, [camera, isActive]);

  const orient = (normal: [number, number, number]) =>
    new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...normal));

  return (
    <>
      <group>
        {/* Milky Way — the anchor. */}
        <group scale={anchorScale}>
          {texture && (
            <GalaxyDisc texture={texture} radius={MW_RADIUS} opacity={opacity} offsetX={GALAXY_IMAGE_CENTER_OFFSET_X * GALAXY_TO_LG} onClick={() => descendScale()} />
          )}
          <Html position={[0, MW_RADIUS * 0.6, 0]} center zIndexRange={[4, 0]}>
            <div
              onClick={() => descendScale()}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
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
                opacity: transitionFrom !== null ? 0 : opacity,
                pointerEvents: transitionFrom !== null ? "none" : "auto"
              }}
            >
              Milky Way
            </div>
          </Html>
        </group>

        <group scale={stuffScale}>
          {PLACED_LOCAL_GROUP.map((m) => (
            <group key={m.id}>
              {m.normal && texture ? (
                <group position={m.position} quaternion={orient(m.normal)}>
                  <GalaxyDisc texture={texture} radius={m.radiusUnits / VISIBLE_FRACTION} opacity={opacity} />
                </group>
              ) : (
                <StarSprite position={m.position} size={Math.max(60, m.radiusUnits * 2.6)} color={KIND_COLOR[m.kind]} intensity={(m.kind === "dwarf spheroidal" ? 0.55 : 0.8) * opacity} />
              )}
              {(isMajor(m) || showMinorLabels) && <Html position={[m.position[0], m.position[1] + Math.max(24, m.radiusUnits * 1.2), m.position[2]]} center zIndexRange={[3, 0]}>
                <div
                  onClick={() => openInfoCard(localGroupCard(m))}
                  title={`${m.note} ${m.distanceMly >= 1 ? `${m.distanceMly} million` : `${Math.round(m.distanceMly * 1000).toLocaleString()} thousand`} light-years away.${m.normal ? " Image illustrative." : ""}`}
                  style={{ ...labelBase, color: m.kind === "spiral" ? "rgba(210, 225, 255, 0.95)" : "rgba(200, 210, 235, 0.7)", fontSize: m.kind === "spiral" ? "10px" : "8px", cursor: "pointer", padding: "6px", pointerEvents: labelOpacity > 0 ? "auto" : "none", opacity: labelOpacity }}
                >
                  {m.name}
                </div>
              </Html>}
            </group>
          ))}
        </group>
      </group>

      {isActive && (
        <OrbitControls
          ref={controlsRef}
          enabled={transitionFrom === null}
          enableDamping
          dampingFactor={0.08}
          enablePan={false}
          minDistance={LAYER_CAMERA_POSES.localGroup.minDistance}
          maxDistance={LAYER_CAMERA_POSES.localGroup.maxDistance}
        />
      )}
    </>
  );
}

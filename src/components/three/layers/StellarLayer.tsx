import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, Billboard } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { useShallow } from "zustand/react/shallow";
import { useSolarSystemStore } from "@/store/solarSystemStore";
import { LAYER_CAMERA_POSES } from "./cameraPoses";
import { useAscendOnZoomOut } from "./useAscendOnZoomOut";
import { usePublishDistance } from "./usePublishDistance";
import { useSettleTarget } from "./useSettleTarget";
import { usePullback } from "./usePullback";
import StarSprite from "./shared/StarSprite";
import HygStarField from "./shared/HygStarField";
import OortCloud from "./shared/OortCloud";
import { CONSTELLATION_LINES, NEARBY_STARS, SUN_STELLAR, getStarById } from "@/data/stars";
import { stellarRadius } from "@/data/scales";

interface StellarLayerProps {
  /** Cross-fade opacity (1 = fully visible, 0 = fully transparent). */
  opacity?: number;
  /** Only the active layer mounts its OrbitControls — see GalaxyLayer. */
  isActive?: boolean;
}

// Reference shells drawn in the galactic plane; distances are log-compressed.
const DISTANCE_RINGS = [10, 100, 1000];
const FLY_SECONDS = 1.1;

const labelStyle = (active: boolean, opacity: number): React.CSSProperties => ({
  background: active ? "rgba(0, 0, 0, 0.75)" : "rgba(0, 0, 0, 0.45)",
  border: `1px solid ${active ? "rgba(0, 240, 255, 0.6)" : "rgba(255, 255, 255, 0.15)"}`,
  color: active ? "#ffffff" : "#dddddd",
  fontFamily: "'Orbitron', sans-serif",
  fontSize: "9px",
  fontWeight: 500,
  letterSpacing: "1px",
  padding: "2px 7px",
  borderRadius: "8px",
  whiteSpace: "nowrap",
  textTransform: "uppercase",
  cursor: "pointer",
  opacity,
  transition: "opacity 0.15s ease"
});

/** Constellation figures as one LineSegments buffer. */
function ConstellationLines({ opacity }: { opacity: number }) {
  const geometry = useMemo(() => {
    const pts: number[] = [];
    for (const c of CONSTELLATION_LINES)
      for (const [a, b] of c.pairs) pts.push(...getStarById(a)!.position, ...getStarById(b)!.position);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#5fd8ff" transparent opacity={0.35 * opacity} depthWrite={false} />
    </lineSegments>
  );
}

/** 10 / 100 / 1,000 ly circles in the galactic plane with labels. */
function DistanceRings({ opacity, showLabels }: { opacity: number; showLabels: boolean }) {
  const rings = useMemo(
    () =>
      DISTANCE_RINGS.map((ly) => {
        const r = stellarRadius(ly);
        const pts: number[] = [];
        for (let i = 0; i <= 128; i++) {
          const a = (i / 128) * Math.PI * 2;
          pts.push(Math.cos(a) * r, 0, Math.sin(a) * r);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
        return { ly, r, g };
      }),
    []
  );
  useEffect(() => () => rings.forEach((x) => x.g.dispose()), [rings]);
  return (
    <>
      {rings.map(({ ly, r, g }) => (
        <group key={ly}>
          <lineLoop geometry={g}>
            <lineBasicMaterial color="#8aa4c8" transparent opacity={0.22 * opacity} depthWrite={false} />
          </lineLoop>
          {showLabels && (
            <Html position={[r, 0, 0]} center zIndexRange={[10, 0]}>
              <div style={{ color: "rgba(160, 190, 230, 0.8)", fontFamily: "'Orbitron', sans-serif", fontSize: "8px", letterSpacing: "1px", whiteSpace: "nowrap", pointerEvents: "none", opacity }}>
                {ly.toLocaleString()} LY
              </div>
            </Html>
          )}
        </group>
      ))}
    </>
  );
}

/**
 * Stellar Neighborhood — the layer between the Solar System and the Milky Way.
 * Real stars at their true sky directions (aligned with the Galaxy layer:
 * galactic north up, toward Sagittarius = toward Sgr A*) with log-compressed
 * distance. Click a star for its card (the camera flies to it); click the Sun
 * or zoom in to descend; zoom out to ascend to the Galaxy.
 */
export default function StellarLayer({ opacity = 1, isActive = true }: StellarLayerProps) {
  const { descendScale, transitionFrom, selectedStarId, selectStar, showConstellations, showDistanceRings } = useSolarSystemStore(
    useShallow((s) => ({
      descendScale: s.descendScale,
      transitionFrom: s.transitionFrom,
      selectedStarId: s.selectedStarId,
      selectStar: s.selectStar,
      showConstellations: s.showConstellations,
      showDistanceRings: s.showDistanceRings
    }))
  );
  const { camera } = useThree();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const inTransition = transitionFrom !== null;

  const { stuffScale: pullbackStuff, anchorScale: pullbackAnchor, t: pullbackT } = usePullback("stellar");
  // Labels fade out while pulling back, before the shrinking field piles them up.
  const labelsVisible = !inTransition && pullbackT < 0.35;

  useAscendOnZoomOut(controlsRef, {
    maxDistance: LAYER_CAMERA_POSES.stellar.maxDistance,
    threshold: 0.95,
    // While a star is focused, zooming works around that star instead.
    enabled: !inTransition && !selectedStarId,
    isActive,
    layer: "stellar",
    minDistance: LAYER_CAMERA_POSES.stellar.minDistance
  });
  usePublishDistance(controlsRef, isActive);
  useSettleTarget(controlsRef, "stellar", isActive);

  // Snap to the overview when this layer becomes active. Skipped during
  // animated transitions — useScaleTransition flies the camera instead.
  useEffect(() => {
    if (!isActive) return;
    if (useSolarSystemStore.getState().transitionDir !== null) return;
    const pose = LAYER_CAMERA_POSES.stellar;
    camera.position.set(...pose.cameraPos);
    camera.updateProjectionMatrix();
    const controls = controlsRef.current;
    if (controls) {
      controls.target.set(...pose.target);
      controls.update();
    }
  }, [camera, isActive]);

  // Fly to the selected star (or back to the Sun overview when deselected).
  const flight = useRef<{ fromPos: THREE.Vector3; fromTarget: THREE.Vector3; toPos: THREE.Vector3; toTarget: THREE.Vector3; t: number } | null>(null);
  useEffect(() => {
    const controls = controlsRef.current;
    if (!isActive || !controls || inTransition) return;
    const star = getStarById(selectedStarId);
    const toTarget = new THREE.Vector3(...(star ? star.position : LAYER_CAMERA_POSES.stellar.target));
    let toPos: THREE.Vector3;
    if (star) {
      const dir = camera.position.clone().sub(toTarget).normalize();
      toPos = toTarget.clone().addScaledVector(dir, Math.max(260, star.size * 4));
    } else {
      toPos = new THREE.Vector3(...LAYER_CAMERA_POSES.stellar.cameraPos);
    }
    flight.current = { fromPos: camera.position.clone(), fromTarget: controls.target.clone(), toPos, toTarget, t: 0 };
  }, [selectedStarId, isActive, inTransition, camera]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const cancel = () => { flight.current = null; };
    controls.addEventListener("start", cancel);
    return () => controls.removeEventListener("start", cancel);
  }, [isActive]);

  useFrame((_, delta) => {
    const f = flight.current, controls = controlsRef.current;
    if (!f || !controls) return;
    f.t = Math.min(1, f.t + delta / FLY_SECONDS);
    const e = f.t * f.t * (3 - 2 * f.t);
    camera.position.lerpVectors(f.fromPos, f.toPos, e);
    controls.target.lerpVectors(f.fromTarget, f.toTarget, e);
    controls.update();
    if (f.t === 1) flight.current = null;
  });

  const sunHovered = hoveredId === "sun";
  const selected = getStarById(selectedStarId);
  const hover = (id: string | null) => {
    setHoveredId(id);
    document.body.style.cursor = id ? "pointer" : "default";
  };

  return (
    <>
      <group>
        <ambientLight intensity={0.6} />

        {/* Sun — the anchor; shrinks slowly under pull-back. */}
        <group scale={pullbackAnchor}>
          <StarSprite
            position={SUN_STELLAR.position}
            size={SUN_STELLAR.size * (sunHovered ? 1.15 : 1.0)}
            color={sunHovered ? "#fff5b0" : SUN_STELLAR.color}
            intensity={1.4 * opacity}
            onClick={() => descendScale()}
            onPointerOver={() => hover("sun")}
            onPointerOut={() => hover(null)}
          />
          <Html position={[0, SUN_STELLAR.size * 0.6, 0]} center zIndexRange={[20, 0]}>
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
                opacity,
                pointerEvents: inTransition ? "none" : "auto"
              }}
            >
              ☉ Sun
            </div>
          </Html>
        </group>

        {/* Everything else shrinks faster under pull-back. */}
        <group scale={pullbackStuff}>
          <HygStarField opacity={opacity} />
          {showDistanceRings && <DistanceRings opacity={opacity} showLabels={labelsVisible} />}
          {showDistanceRings && <OortCloud opacity={opacity} showLabel={labelsVisible} />}
          {showConstellations && <ConstellationLines opacity={opacity} />}

          {NEARBY_STARS.map((star) => {
            const isHovered = hoveredId === star.id;
            const isSelected = selectedStarId === star.id;
            const showLabel = labelsVisible && (star.featured || isHovered || isSelected);
            return (
              <group key={star.id}>
                <StarSprite
                  position={star.position}
                  size={star.size * (isHovered || isSelected ? 1.2 : 1.0)}
                  color={star.color}
                  intensity={(isHovered || isSelected ? 1.15 : 0.9) * opacity}
                  onClick={() => selectStar(star.id)}
                  onPointerOver={() => hover(star.id)}
                  onPointerOut={() => { if (hoveredId === star.id) hover(null); }}
                />
                {showLabel && (
                  <Html position={[star.position[0], star.position[1] + star.size * 0.55, star.position[2]]} center zIndexRange={[20, 0]}>
                    <div onClick={() => selectStar(star.id)} style={labelStyle(isHovered || isSelected, opacity * (isHovered || isSelected ? 1 : 0.75))}>
                      {star.name}
                    </div>
                  </Html>
                )}
              </group>
            );
          })}

          {/* Selection ring around the focused star. */}
          {selected && (
            <Billboard position={selected.position}>
              <mesh>
                <ringGeometry args={[selected.size * 0.42, selected.size * 0.46, 64]} />
                <meshBasicMaterial color="#00f0ff" transparent opacity={0.8 * opacity} depthWrite={false} />
              </mesh>
            </Billboard>
          )}
        </group>
      </group>

      {isActive && (
        <OrbitControls
          ref={controlsRef}
          enabled={!inTransition}
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

import { useEffect, useMemo, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
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
import RoundPoints from "./shared/RoundPoints";
import { LY_PER_UNIT } from "@/data/scales";
import { COSMIC_LANDMARKS } from "@/data/cosmicWeb";
import { surveyPosition } from "@/lib/galaxy-survey";
import { loadSurveyGeometry } from "./shared/surveyGeometry";
import { galacticDirection } from "@/lib/stellar-coords";
import { cosmicLandmarkCard } from "@/data/infoCards";

const LY = LY_PER_UNIT.cosmicWeb;
const RINGS_MLY = [100, 300, 500];

const labelBase: React.CSSProperties = {
  fontFamily: "'Orbitron', sans-serif",
  fontSize: "9px",
  letterSpacing: "1.2px",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
  userSelect: "none",
  textShadow: "0 1px 2px rgba(0,0,0,0.9)"
};

function Rings({ opacity, showLabels }: { opacity: number; showLabels: boolean }) {
  const rings = useMemo(
    () =>
      RINGS_MLY.map((mly) => {
        const r = (mly * 1e6) / LY;
        const pts: number[] = [];
        for (let i = 0; i <= 128; i++) {
          const a = (i / 128) * Math.PI * 2;
          pts.push(Math.cos(a) * r, 0, Math.sin(a) * r);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
        return { mly, r, g };
      }),
    []
  );
  useEffect(() => () => rings.forEach((x) => x.g.dispose()), [rings]);
  return (
    <>
      {rings.map(({ mly, r, g }) => (
        <group key={mly}>
          <lineLoop geometry={g}>
            <lineBasicMaterial color="#8aa4c8" transparent opacity={0.18 * opacity} depthWrite={false} />
          </lineLoop>
          {showLabels && (
            <Html position={[r, 0, 0]} center zIndexRange={[2, 0]}>
              <div style={{ ...labelBase, fontSize: "8px", color: "rgba(160, 190, 230, 0.75)", pointerEvents: "none", opacity }}>{mly} million ly</div>
            </Html>
          )}
        </group>
      ))}
    </>
  );
}

interface CosmicWebLayerProps {
  opacity?: number;
  isActive?: boolean;
}

/**
 * The nearby cosmic web: ~33,500 galaxies from the 2MASS Redshift Survey at
 * their real directions and redshift distances (to ~560 million ly), with
 * the Local Group at the centre. Filaments, clusters and voids are real;
 * the empty band is the Zone of Avoidance behind the Milky Way's disc.
 */
export default function CosmicWebLayer({ opacity = 1, isActive = true }: CosmicWebLayerProps) {
  const descendScale = useSolarSystemStore((s) => s.descendScale);
  const openInfoCard = useSolarSystemStore((s) => s.openInfoCard);
  const transitionFrom = useSolarSystemStore((s) => s.transitionFrom);
  const { camera } = useThree();
  // Phones: the centre is crowded at the overview, so the notes and ring
  // labels wait until the camera is closer.
  const narrow = useThree((st) => st.size.width < 600);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  useAscendOnZoomOut(controlsRef, {
    maxDistance: LAYER_CAMERA_POSES.cosmicWeb.maxDistance,
    threshold: 0.95,
    enabled: transitionFrom === null,
    isActive,
    layer: "cosmicWeb",
    minDistance: LAYER_CAMERA_POSES.cosmicWeb.minDistance
  });
  usePublishDistance(controlsRef, isActive);
  useSettleTarget(controlsRef, "cosmicWeb", isActive);
  const { stuffScale, anchorScale, t: pullbackT } = usePullback("cosmicWeb");
  const labelsVisible = transitionFrom === null && pullbackT < 0.35;
  // Nearby clusters crowd around the Local Group at the overview.
  const showMinorLabels = useSolarSystemStore((s) => s.cameraDistance < 3500);

  const [survey, setSurvey] = useState<THREE.BufferGeometry | null>(null);
  useEffect(() => {
    let live = true;
    loadSurveyGeometry()
      .then((g) => { if (live) setSurvey(g.clone()); })
      .catch((err) => console.warn(err));
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!isActive) return;
    if (useSolarSystemStore.getState().transitionDir !== null) return;
    const pose = LAYER_CAMERA_POSES.cosmicWeb;
    camera.position.set(...pose.cameraPos);
    camera.updateProjectionMatrix();
    const controls = controlsRef.current;
    if (controls) {
      controls.target.set(...pose.target);
      controls.update();
    }
  }, [camera, isActive]);

  const landmarks = useMemo(() => COSMIC_LANDMARKS.map((m) => ({ ...m, position: surveyPosition(m, LY) })), []);
  // Zone of Avoidance note: in the Milky Way's plane, ~300 Mly out toward the galactic centre.
  const zonePos = useMemo(() => galacticDirection(0, 0).map((v) => (v * 300e6) / LY) as [number, number, number], []);
  const norma = landmarks.find((m) => m.id === "norma")!.position;

  return (
    <>
      <group>
        {/* Local Group — the anchor. */}
        <group scale={anchorScale}>
          <StarSprite position={[0, 0, 0]} size={70} color="#ffd87a" intensity={1.1 * opacity} onClick={() => descendScale()} />
          <Html position={[0, 60, 0]} center zIndexRange={[4, 0]}>
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
                opacity: transitionFrom !== null ? 0 : opacity,
                pointerEvents: transitionFrom !== null ? "none" : "auto"
              }}
            >
              Local Group · you are here
            </div>
          </Html>
        </group>

        <group scale={stuffScale}>
          {survey && <RoundPoints geometry={survey} opacity={opacity * 0.85} />}
          <Rings opacity={opacity} showLabels={labelsVisible && (!narrow || showMinorLabels)} />

          {landmarks.map((m) => (
            <group key={m.id}>
              <StarSprite position={m.position} size={110} color="#ffe9c8" intensity={0.5 * opacity} />
              {labelsVisible && (m.major || showMinorLabels) && (
                <Html position={[m.position[0], m.position[1] + 70, m.position[2]]} center zIndexRange={[3, 0]}>
                  <div title={m.note} onClick={() => openInfoCard(cosmicLandmarkCard(m))} style={{ ...labelBase, color: "rgba(255, 230, 190, 0.9)", cursor: "pointer", padding: "6px", opacity }}>{m.name}</div>
                </Html>
              )}
            </group>
          ))}

          {labelsVisible && (!narrow || showMinorLabels) && (
            <>
              <Html position={[norma[0], norma[1] - 90, norma[2]]} center zIndexRange={[3, 0]}>
                <div
                  onClick={() => openInfoCard({ title: "Laniakea", kind: "Supercluster", color: "#8cdcc8", body: "Laniakea ('immeasurable heaven' in Hawaiian) is the supercluster whose ~100,000 galaxies all flow toward the Great Attractor; the Milky Way sits near its edge. Its boundary is defined by how galaxies move, so it isn't drawn here.", facts: [["Size", "~500 million light-years across"], ["Mapped by", "Tully et al. 2014, Nature 513, 71"]] })}
                  style={{ ...labelBase, fontSize: "8px", color: "rgba(140, 220, 200, 0.85)", cursor: "pointer", padding: "6px", opacity }}
                >
                  ↓ heart of Laniakea (~500 million ly across)
                </div>
              </Html>
              <Html position={zonePos} center zIndexRange={[2, 0]}>
                <div
                  onClick={() => openInfoCard({ title: "Zone of Avoidance", kind: "Survey gap", body: "Dust and stars in the Milky Way's own disc block the view, so few galaxies are catalogued near its plane. The empty band in this map is our galaxy in the way, not empty space.", facts: [] })}
                  style={{ ...labelBase, fontSize: "8px", color: "rgba(200, 200, 210, 0.7)", cursor: "pointer", padding: "6px", opacity }}
                >
                  Zone of Avoidance (hidden by the Milky Way)
                </div>
              </Html>
            </>
          )}
        </group>
      </group>

      {isActive && (
        <OrbitControls
          ref={controlsRef}
          enabled={transitionFrom === null}
          enableDamping
          dampingFactor={0.08}
          enablePan={false}
          minDistance={LAYER_CAMERA_POSES.cosmicWeb.minDistance}
          maxDistance={LAYER_CAMERA_POSES.cosmicWeb.maxDistance}
        />
      )}
    </>
  );
}

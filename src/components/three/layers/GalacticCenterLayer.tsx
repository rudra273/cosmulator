import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, Billboard } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { useSolarSystemStore } from "@/store/solarSystemStore";
import { LAYER_CAMERA_POSES } from "./cameraPoses";
import { useAscendOnZoomOut } from "./useAscendOnZoomOut";
import { usePublishDistance } from "./usePublishDistance";
import { useSettleTarget } from "./useSettleTarget";
import { usePullback } from "./usePullback";
import StarSprite from "./shared/StarSprite";
import RoundPoints, { mulberry32 } from "./shared/RoundPoints";
import { blackHoleVertexShader, blackHoleFragmentShader } from "@/lib/shaders/blackHole.glsl";
import { S_STARS, orbitPathAu, sStarPositionAu, periodYears, pericentreAu, type SStar } from "@/data/sStars";
import { DAY_MS } from "@/lib/simulation-time";
import { sStarCard, sgrACard } from "@/data/infoCards";
import { decimalYear } from "@/data/sStars";

const POSE = LAYER_CAMERA_POSES.galacticCenter;
// Stars and the Sgr A* symbol keep a constant on-screen size: their world
// size is this fraction of the camera distance.
const STAR_SIZE = 0.022;
const SYMBOL_SIZE = 0.03;
const RINGS_AU: { au: number; label: string }[] = [
  { au: 1000, label: "1,000 AU · 5.8 light-days" },
  { au: 5000, label: "5,000 AU · 29 light-days" }
];
const BACKDROP_COUNT = 2500;

const labelBase: React.CSSProperties = {
  fontFamily: "'Orbitron', sans-serif",
  fontSize: "9px",
  letterSpacing: "1.2px",
  whiteSpace: "nowrap",
  userSelect: "none",
  textShadow: "0 1px 2px rgba(0,0,0,0.9)"
};

function lineGeometry(points: [number, number, number][]): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(points.flat(), 3));
  return g;
}

/** Dense, reddened star field of the nuclear star cluster, far beyond the orbits. */
function buildBackdrop(): THREE.BufferGeometry {
  const rng = mulberry32(0x5a61);
  const positions = new Float32Array(BACKDROP_COUNT * 3), colors = new Float32Array(BACKDROP_COUNT * 3), sizes = new Float32Array(BACKDROP_COUNT);
  for (let i = 0; i < BACKDROP_COUNT; i++) {
    const u = rng() * 2 - 1, phi = rng() * Math.PI * 2, r = 60000 + rng() * 20000;
    const s = Math.sqrt(1 - u * u);
    positions.set([r * s * Math.cos(phi), r * u, r * s * Math.sin(phi)], i * 3);
    const w = 0.55 + rng() * 0.45;
    colors.set([1.0 * w, (0.55 + rng() * 0.25) * w, (0.35 + rng() * 0.2) * w], i * 3);
    sizes[i] = 60 + Math.pow(rng(), 4) * 260;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  g.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  return g;
}

const simMs = () => {
  const s = useSolarSystemStore.getState();
  return s.epochMs + s.elapsedTime * DAY_MS;
};

function OrbitLine({ star, opacity }: { star: SStar; opacity: number }) {
  const geometry = useMemo(() => lineGeometry(orbitPathAu(star)), [star]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const featured = star.id === "s2";
  return (
    <lineLoop geometry={geometry}>
      <lineBasicMaterial color={featured ? "#ffc861" : "#7fb4ff"} transparent opacity={(featured ? 0.75 : 0.32) * opacity} depthWrite={false} />
    </lineLoop>
  );
}

interface GalacticCenterLayerProps {
  opacity?: number;
  isActive?: boolean;
}

/**
 * Sagittarius A*, the Milky Way's 4.3-million-Sun black hole, and the
 * S-stars orbiting it — real orbits (Gillessen et al. 2017) at their real
 * orientation, each star where it is on the simulation date. 1 unit = 1 AU.
 * Entered by clicking Sgr A* in the Galaxy layer; zoom out to go back.
 */
export default function GalacticCenterLayer({ opacity = 1, isActive = true }: GalacticCenterLayerProps) {
  const transitionFrom = useSolarSystemStore((s) => s.transitionFrom);
  const updateTime = useSolarSystemStore((s) => s.updateTime);
  const openInfoCard = useSolarSystemStore((s) => s.openInfoCard);
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  useAscendOnZoomOut(controlsRef, {
    maxDistance: POSE.maxDistance,
    threshold: POSE.ascendThreshold,
    enabled: transitionFrom === null,
    isActive,
    layer: "galacticCenter"
  });
  usePublishDistance(controlsRef, isActive);
  useSettleTarget(controlsRef, "galacticCenter", isActive);
  const { stuffScale, anchorScale, t: pullbackT } = usePullback("galacticCenter");
  const labelOpacity = transitionFrom !== null ? 0 : opacity * Math.max(0, 1 - pullbackT / 0.35);

  const backdrop = useMemo(() => buildBackdrop(), []);
  const rings = useMemo(
    () => RINGS_AU.map(({ au, label }) => {
      const pts: [number, number, number][] = [];
      for (let i = 0; i <= 128; i++) {
        const a = (i / 128) * Math.PI * 2;
        pts.push([Math.cos(a) * au, 0, Math.sin(a) * au]);
      }
      return { au, label, geometry: lineGeometry(pts) };
    }),
    []
  );
  useEffect(() => () => rings.forEach((r) => r.geometry.dispose()), [rings]);

  const [blackHoleUniforms] = useState(() => ({
    uOpacity: { value: 1 },
    uRingColor: { value: new THREE.Color("#ffb060") },
    uGlowColor: { value: new THREE.Color("#ffd07a") }
  }));
  const blackHoleMatRef = useRef<THREE.ShaderMaterial | null>(null);
  useEffect(() => {
    if (blackHoleMatRef.current) blackHoleMatRef.current.uniforms.uOpacity.value = opacity;
  }, [opacity]);

  // Star groups move every frame to where the star is on the simulation date.
  const starRefs = useRef<(THREE.Group | null)[]>([]);
  const symbolRef = useRef<THREE.Group | null>(null);
  const worldPos = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, delta) => {
    // This layer owns the simulation clock while it's on screen (the Solar
    // layer does so the rest of the time).
    if (isActive) updateTime(Math.min(delta, 0.1));
    const ms = simMs();
    S_STARS.forEach((s, i) => {
      const g = starRefs.current[i];
      if (!g) return;
      g.position.set(...sStarPositionAu(s, ms));
      g.getWorldPosition(worldPos);
      const parentScale = g.parent ? g.parent.getWorldScale(worldPos.clone()).x : 1;
      g.scale.setScalar((worldPos.distanceTo(camera.position) * STAR_SIZE) / Math.max(parentScale, 1e-9));
    });
    const sym = symbolRef.current;
    if (sym) {
      sym.getWorldPosition(worldPos);
      const parentScale = sym.parent ? sym.parent.getWorldScale(worldPos.clone()).x : 1;
      sym.scale.setScalar((worldPos.distanceTo(camera.position) * SYMBOL_SIZE) / Math.max(parentScale, 1e-9));
    }
  });

  useEffect(() => {
    if (!isActive) return;
    if (useSolarSystemStore.getState().transitionDir !== null) return;
    camera.position.set(...POSE.cameraPos);
    camera.updateProjectionMatrix();
    const controls = controlsRef.current;
    if (controls) {
      controls.target.set(...POSE.target);
      controls.update();
    }
  }, [camera, isActive]);

  return (
    <>
      <RoundPoints geometry={backdrop} opacity={opacity * 0.7} />

      {/* Sgr A* — a symbol that keeps its screen size. */}
      <group scale={anchorScale}>
        <group ref={symbolRef}>
          <Billboard>
            <mesh>
              <planeGeometry args={[1, 1]} />
              <shaderMaterial
                ref={blackHoleMatRef}
                vertexShader={blackHoleVertexShader}
                fragmentShader={blackHoleFragmentShader}
                uniforms={blackHoleUniforms}
                transparent
                depthWrite={false}
              />
            </mesh>
          </Billboard>
          <Html position={[0, 0.7, 0]} center zIndexRange={[3, 0]}>
            <div
              onClick={() => openInfoCard(sgrACard())}
              title="Symbol, not to scale: the event horizon is ~0.17 AU (25 million km) across — smaller than Mercury's orbit — yet it holds 4.3 million Suns."
              style={{ ...labelBase, fontWeight: 600, color: "rgba(255, 200, 130, 0.95)", cursor: "pointer", padding: "6px", pointerEvents: labelOpacity > 0 ? "auto" : "none", opacity: labelOpacity }}
            >
              SAGITTARIUS A* · 4.3 MILLION SUNS
            </div>
          </Html>
        </group>
      </group>

      <group scale={stuffScale}>
        {rings.map(({ au, label, geometry }) => (
          <group key={au}>
            <lineLoop geometry={geometry}>
              <lineBasicMaterial color="#8aa4c8" transparent opacity={0.16 * opacity} depthWrite={false} />
            </lineLoop>
            <Html position={[au, 0, 0]} center zIndexRange={[2, 0]}>
              <div style={{ ...labelBase, fontSize: "8px", color: "rgba(160, 190, 230, 0.75)", pointerEvents: "none", opacity: labelOpacity }}>{label}</div>
            </Html>
          </group>
        ))}

        {S_STARS.map((s, i) => {
          const featured = s.id === "s2";
          return (
            <group key={s.id}>
              <OrbitLine star={s} opacity={opacity} />
              <group ref={(g) => { starRefs.current[i] = g; }}>
                <StarSprite position={[0, 0, 0]} size={featured ? 1.4 : 1} color={featured ? "#fff1d0" : "#cfe0ff"} intensity={opacity} />
                <Html position={[0, featured ? 1.0 : 0.8, 0]} center zIndexRange={[3, 0]}>
                  <div
                    onClick={() => openInfoCard(sStarCard(s, decimalYear(simMs())))}
                    title={`${s.note ? s.note + " " : ""}Orbit: ${Math.round(periodYears(s))} years; closest approach ${Math.round(pericentreAu(s)).toLocaleString()} AU.`}
                    style={{ ...labelBase, fontSize: featured ? "10px" : "8px", fontWeight: featured ? 600 : 400, color: featured ? "rgba(255, 215, 140, 0.95)" : "rgba(190, 210, 255, 0.8)", cursor: "pointer", padding: "6px", pointerEvents: labelOpacity > 0 ? "auto" : "none", opacity: labelOpacity }}
                  >
                    {s.name}
                  </div>
                </Html>
              </group>
            </group>
          );
        })}
      </group>

      {isActive && (
        <OrbitControls
          ref={controlsRef}
          enabled={transitionFrom === null}
          enableDamping
          dampingFactor={0.08}
          enablePan={false}
          minDistance={POSE.minDistance}
          maxDistance={POSE.maxDistance}
        />
      )}
    </>
  );
}

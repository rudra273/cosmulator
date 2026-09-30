import { useEffect, useMemo, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { useSolarSystemStore } from "@/store/solarSystemStore";
import { LAYER_CAMERA_POSES } from "./cameraPoses";
import StarSprite from "./shared/StarSprite";
import RoundPoints from "./shared/RoundPoints";
import { usePublishDistance } from "./usePublishDistance";
import { useSettleTarget } from "./useSettleTarget";
import { useAscendOnZoomOut } from "./useAscendOnZoomOut";
import { loadSurveyGeometry } from "./shared/surveyGeometry";
import { cmbVertexShader, cmbFragmentShader } from "@/lib/shaders/cmb.glsl";
import { CMB_REDSHIFT, comovingDistanceGly, lookbackTimeGyr } from "@/lib/cosmology";
import { equatorialToGalactic, galacticToScene } from "@/lib/stellar-coords";
import { GALACTIC_CENTER_DIRECTION } from "@/data/galaxy";
import { LY_PER_UNIT } from "@/data/scales";

const LY = LY_PER_UNIT.universe; // 10 million ly per unit
const unitsForGly = (gly: number) => (gly * 1e9) / LY;
const CMB_RADIUS = unitsForGly(comovingDistanceGly(CMB_REDSHIFT));
// WMAP 9-year ILC map, Mollweide, galactic (124 KB; WMAP's ~1° smoothing
// makes a larger texture pointless).
const CMB_TEXTURE = "/textures/cmb-wmap-1024.webp";
const HUDF_TEXTURE = "/textures/hubble-deep-field.webp";

// Look-back ruler toward the Hubble Ultra Deep Field (RA 3h32m39s, Dec −27°47′).
const HUDF_DIR = galacticToScene(equatorialToGalactic(3.5442, -27.79));
const RULER_Z = [0.1, 1, 3, 6, 10];
const HUDF_WINDOW_Z = 3;
const HUDF_WINDOW_SIZE = 380; // enlarged: the real patch is ~1/10 of the Moon's width

const labelBase: React.CSSProperties = {
  fontFamily: "'Orbitron', sans-serif",
  fontSize: "8px",
  letterSpacing: "1px",
  whiteSpace: "nowrap",
  userSelect: "none",
  textShadow: "0 1px 2px rgba(0,0,0,0.9)"
};

const fmt = (n: number) => (n >= 10 ? n.toFixed(0) : n.toFixed(1));

function useTexture(url: string, mipmaps = true) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let live = true;
    new THREE.TextureLoader().load(url, (t) => {
      if (!live) return t.dispose();
      t.colorSpace = THREE.SRGBColorSpace;
      if (!mipmaps) {
        t.generateMipmaps = false;
        t.minFilter = THREE.LinearFilter;
      }
      setTex(t);
    });
    return () => { live = false; };
  }, [url, mipmaps]);
  useEffect(() => () => tex?.dispose(), [tex]);
  return tex;
}

/** The CMB map on a sphere: far side nearly opaque, near side faint so the
 *  interior stays visible from outside. */
function CmbShell({ texture, opacity }: { texture: THREE.Texture; opacity: number }) {
  const [back] = useState(() => ({ uMap: { value: texture }, uOpacity: { value: 0.95 * opacity }, uGalacticCenter: { value: new THREE.Vector3(...GALACTIC_CENTER_DIRECTION) }, uTexWidth: { value: (texture.image as { width: number }).width } }));
  const [front] = useState(() => ({ uMap: { value: texture }, uOpacity: { value: 0.12 * opacity }, uGalacticCenter: { value: new THREE.Vector3(...GALACTIC_CENTER_DIRECTION) }, uTexWidth: { value: (texture.image as { width: number }).width } }));
  const backRef = useRef<THREE.ShaderMaterial | null>(null);
  const frontRef = useRef<THREE.ShaderMaterial | null>(null);
  useEffect(() => {
    if (backRef.current) backRef.current.uniforms.uOpacity.value = 0.95 * opacity;
    if (frontRef.current) frontRef.current.uniforms.uOpacity.value = 0.12 * opacity;
  }, [opacity]);
  return (
    <>
      <mesh renderOrder={-2}>
        <sphereGeometry args={[CMB_RADIUS, 96, 48]} />
        <shaderMaterial ref={backRef} vertexShader={cmbVertexShader} fragmentShader={cmbFragmentShader} uniforms={back} side={THREE.BackSide} transparent depthWrite={false} />
      </mesh>
      <mesh renderOrder={2}>
        <sphereGeometry args={[CMB_RADIUS, 96, 48]} />
        <shaderMaterial ref={frontRef} vertexShader={cmbVertexShader} fragmentShader={cmbFragmentShader} uniforms={front} side={THREE.FrontSide} transparent depthWrite={false} />
      </mesh>
    </>
  );
}

interface UniverseLayerProps {
  opacity?: number;
  isActive?: boolean;
}

/**
 * The observable universe: a sphere ~45 billion light-years in radius (today's
 * distance to the light we see as the cosmic microwave background), with
 * the nearby cosmic web as the small bright region at the centre. A ruler
 * toward the Hubble Ultra Deep Field shows how far and how long ago light
 * from each redshift set out (flat ΛCDM, Planck 2018; src/lib/cosmology.ts).
 */
export default function UniverseLayer({ opacity = 1, isActive = true }: UniverseLayerProps) {
  const descendScale = useSolarSystemStore((s) => s.descendScale);
  const transitionFrom = useSolarSystemStore((s) => s.transitionFrom);
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  usePublishDistance(controlsRef, isActive);
  useSettleTarget(controlsRef, "universe", isActive);
  // Top layer: nothing to ascend to, but zooming in at minDistance descends.
  useAscendOnZoomOut(controlsRef, {
    maxDistance: LAYER_CAMERA_POSES.universe.maxDistance,
    threshold: 1,
    enabled: transitionFrom === null,
    isActive,
    layer: "universe",
    minDistance: LAYER_CAMERA_POSES.universe.minDistance
  });
  const labelsOn = transitionFrom === null;

  // No mipmaps: the Mollweide lookup jumps at l = ±180°, which would make the
  // GPU pick the blurriest mip there and draw a seam.
  const cmbTex = useTexture(CMB_TEXTURE, false);
  const hudfTex = useTexture(HUDF_TEXTURE);
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
    const pose = LAYER_CAMERA_POSES.universe;
    camera.position.set(...pose.cameraPos);
    camera.updateProjectionMatrix();
    const controls = controlsRef.current;
    if (controls) {
      controls.target.set(...pose.target);
      controls.update();
    }
  }, [camera, isActive]);

  const ruler = useMemo(() => {
    const ticks = RULER_Z.map((z) => {
      const r = unitsForGly(comovingDistanceGly(z));
      return { z, gly: comovingDistanceGly(z), gyr: lookbackTimeGyr(z), pos: HUDF_DIR.map((v) => v * r) as [number, number, number] };
    });
    const line = new THREE.BufferGeometry();
    line.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, ...HUDF_DIR.map((v) => v * CMB_RADIUS)], 3));
    return { ticks, line };
  }, []);
  useEffect(() => () => ruler.line.dispose(), [ruler]);

  const hudfPos = useMemo(() => HUDF_DIR.map((v) => v * unitsForGly(comovingDistanceGly(HUDF_WINDOW_Z))) as [number, number, number], []);
  const hudfQuat = useMemo(() => {
    // Face the centre: the window looks back at us along the line of sight.
    const m = new THREE.Matrix4().lookAt(new THREE.Vector3(...hudfPos), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0));
    return new THREE.Quaternion().setFromRotationMatrix(m);
  }, [hudfPos]);

  const lookback = lookbackTimeGyr(CMB_REDSHIFT);

  return (
    <>
      <group>
        {cmbTex && <CmbShell texture={cmbTex} opacity={opacity} />}
        {labelsOn && (
          <Html position={[0, CMB_RADIUS * 1.02, 0]} center zIndexRange={[2, 0]}>
            <div style={{ ...labelBase, fontSize: "9px", color: "rgba(255, 220, 160, 0.9)", textAlign: "center", opacity }}>
              COSMIC MICROWAVE BACKGROUND
              <br />
              <span style={{ color: "rgba(220, 225, 240, 0.75)" }}>light from 380,000 years after the Big Bang · left {fmt(lookback)} billion years ago · now ~{fmt(comovingDistanceGly(CMB_REDSHIFT))} billion ly away</span>
            </div>
          </Html>
        )}

        {/* The nearby cosmic web at the centre (2MRS, ~560 Mly), then us. */}
        {survey && (
          <group scale={LY_PER_UNIT.cosmicWeb / LY}>
            <RoundPoints geometry={survey} opacity={opacity * 0.9} />
          </group>
        )}
        <StarSprite position={[0, 0, 0]} size={90} color="#ffd87a" intensity={1.1 * opacity} onClick={() => descendScale()} />
        <Html position={[0, 80, 0]} center zIndexRange={[4, 0]}>
          <div
            onClick={() => descendScale()}
            style={{
              background: "rgba(0, 0, 0, 0.55)",
              border: "1px solid rgba(255, 183, 0, 0.6)",
              color: "#ffd87a",
              fontFamily: "'Orbitron', sans-serif",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "1.2px",
              padding: "3px 8px",
              borderRadius: "10px",
              whiteSpace: "nowrap",
              cursor: "pointer",
              textTransform: "uppercase",
              opacity: labelsOn ? opacity : 0,
              pointerEvents: labelsOn ? "auto" : "none"
            }}
          >
            Nearby cosmic web · you are here
          </div>
        </Html>

        {/* Look-back ruler toward the Hubble Ultra Deep Field. */}
        <lineSegments geometry={ruler.line}>
          <lineBasicMaterial color="#9fe8ff" transparent opacity={0.45 * opacity} depthWrite={false} />
        </lineSegments>
        {ruler.ticks.map((t) => (
          <group key={t.z}>
            <StarSprite position={t.pos} size={40} color="#9fe8ff" intensity={0.9 * opacity} />
            {labelsOn && (
              <Html position={t.pos} zIndexRange={[2, 0]} style={{ transform: "translate(10px, -50%)" }}>
                <div style={{ ...labelBase, color: "rgba(180, 235, 255, 0.9)", opacity }}>
                  z = {t.z} · light left {fmt(t.gyr)} billion yr ago · now {fmt(t.gly)} billion ly away
                </div>
              </Html>
            )}
          </group>
        ))}

        {hudfTex && (
          <mesh position={hudfPos} quaternion={hudfQuat}>
            <planeGeometry args={[HUDF_WINDOW_SIZE, HUDF_WINDOW_SIZE]} />
            <meshBasicMaterial map={hudfTex} transparent opacity={0.95 * opacity} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
          </mesh>
        )}
        {labelsOn && (
          <Html position={[hudfPos[0], hudfPos[1] - HUDF_WINDOW_SIZE * 0.6, hudfPos[2]]} center zIndexRange={[2, 0]}>
            <div title="A patch of sky about a tenth of the Moon's width, holding ~10,000 galaxies; the faintest are seen as they were over 13 billion years ago. Shown enlarged." style={{ ...labelBase, color: "rgba(220, 225, 255, 0.85)", cursor: "help", opacity }}>
              HUBBLE ULTRA DEEP FIELD (ENLARGED)
            </div>
          </Html>
        )}
      </group>

      {isActive && (
        <OrbitControls
          ref={controlsRef}
          enabled={transitionFrom === null}
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

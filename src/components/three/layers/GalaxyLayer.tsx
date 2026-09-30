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
import { milkyWayTextureUrl, useImageTexture, useLoadFade } from "./shared/assets";
import { galaxyDiscVertexShader, galaxyDiscFragmentShader } from "@/lib/shaders/galaxyDisc.glsl";
import { blackHoleVertexShader, blackHoleFragmentShader } from "@/lib/shaders/blackHole.glsl";
import {
  ARM_LABELS,
  BAR_ANGLE_RAD,
  GALACTIC_OBJECTS,
  GALAXY_IMAGE_CENTER_OFFSET_X,
  GALAXY_IMAGE_SPAN_UNITS,
  SUN_GALAXY_POSITION,
  SUN_ORBIT_RADIUS_UNITS,
  SUN_ORBIT_RADIUS_LY,
  SUN_ORBIT_PERIOD_MYR,
  PATTERN_ANGULAR_SPEED,
  angularSpeedRadPerMyr,
  galaxyUnitsToLy,
  rotationAngle,
  type GalacticObject
} from "@/data/galaxy";
import { LY_PER_UNIT } from "@/data/scales";
import { positionFromSun } from "@/lib/stellar-coords";
import { galacticObjectCard } from "@/data/infoCards";

const SPARKLE_COUNT = 6000;
const BULGE_COUNT = 1800;

// Sagittarius A* is ~0.1 AU across; any visible size is a symbol.
const BLACK_HOLE_SIZE = 18;
const MARKER_RADIUS = 9;

const OBJECT_STYLE: Record<GalacticObject["kind"], { color: string; size: number }> = {
  globular: { color: "#ffe6b0", size: 26 },
  nebula: { color: "#ff7fae", size: 30 },
  "dwarf galaxy": { color: "#c9d6ff", size: 220 }
};

/** Sparkle points sampled from the texture's bright pixels, so they follow
 *  the painted arms. Height above the plane grows toward the centre. */
function sparkleFromImage(image: CanvasImageSource): THREE.BufferGeometry | null {
  const N = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = N;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0, N, N);
  const data = ctx.getImageData(0, 0, N, N).data;
  const rng = mulberry32(0x6a1a55);
  const positions: number[] = [], colors: number[] = [], sizes: number[] = [];
  for (let attempt = 0; positions.length < SPARKLE_COUNT * 3 && attempt < SPARKLE_COUNT * 60; attempt++) {
    const px = Math.floor(rng() * N), py = Math.floor(rng() * N);
    const i = (py * N + px) * 4;
    const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    // Favour bright, bluish arm pixels over the smooth yellow bulge glow.
    const p = Math.pow(luma, 1.6) * (b > r ? 1.3 : 0.5);
    if (rng() > p) continue;
    const x = ((px + rng()) / N - 0.5) * GALAXY_IMAGE_SPAN_UNITS + GALAXY_IMAGE_CENTER_OFFSET_X;
    const z = ((py + rng()) / N - 0.5) * GALAXY_IMAGE_SPAN_UNITS;
    const radius = Math.hypot(x, z);
    const gauss = (rng() + rng() + rng() - 1.5) / 1.5;
    positions.push(x, gauss * (10 + 90 * Math.exp(-radius / 350)), z);
    colors.push(Math.min(1, r * 1.15), Math.min(1, g * 1.15), Math.min(1, b * 1.15));
    sizes.push(3 + Math.pow(rng(), 3) * 7);
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geom.setAttribute("aSize", new THREE.Float32BufferAttribute(sizes, 1));
  return geom;
}

/** Rotates each sparkle star about the axis at its own angular speed (flat
 *  rotation curve), from the positions it had at "now". */
function applyDifferentialRotation(geom: THREE.BufferGeometry, base: Float32Array, myr: number) {
  const attr = geom.getAttribute("position") as THREE.BufferAttribute;
  const out = attr.array as Float32Array;
  for (let i = 0; i < base.length; i += 3) {
    const x = base[i], z = base[i + 2];
    const a = rotationAngle(angularSpeedRadPerMyr(galaxyUnitsToLy(Math.hypot(x, z))), myr);
    const c = Math.cos(a), sn = Math.sin(a);
    out[i] = x * c + z * sn;
    out[i + 2] = -x * sn + z * c;
  }
  attr.needsUpdate = true;
}

const SUN_ANGULAR_SPEED = angularSpeedRadPerMyr(SUN_ORBIT_RADIUS_LY);

/** The central bulge/bar as a 3D cloud, so the galaxy has thickness edge-on. */
function buildBulge(): THREE.BufferGeometry {
  const rng = mulberry32(0xb01ce);
  const gauss = () => (rng() + rng() + rng() + rng() - 2) / 0.577;
  const along: [number, number] = [Math.cos(BAR_ANGLE_RAD), -Math.sin(BAR_ANGLE_RAD)];
  const across: [number, number] = [-along[1], along[0]];
  const positions = new Float32Array(BULGE_COUNT * 3), colors = new Float32Array(BULGE_COUNT * 3), sizes = new Float32Array(BULGE_COUNT);
  for (let i = 0; i < BULGE_COUNT; i++) {
    const a = gauss() * 190, c = gauss() * 80;
    positions.set([a * along[0] + c * across[0], gauss() * 70, a * along[1] + c * across[1]], i * 3);
    const warm = 0.8 + rng() * 0.2;
    colors.set([1.0 * warm, 0.86 * warm, 0.62 * warm], i * 3);
    sizes[i] = 3 + rng() * 4;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  g.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  return g;
}

const labelBase: React.CSSProperties = {
  fontFamily: "'Orbitron', sans-serif",
  fontSize: "9px",
  letterSpacing: "1.2px",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
  pointerEvents: "none",
  userSelect: "none"
};

interface GalaxyLayerProps {
  /** Cross-fade opacity (1 = fully visible, 0 = fully transparent). */
  opacity?: number;
  /** True only for the currently-active layer; controls camera + OrbitControls
   *  mount so the outgoing layer doesn't fight for the camera during a fade. */
  isActive?: boolean;
}

/**
 * The Milky Way: NASA/JPL-Caltech/R. Hurt's face-on illustration on a disc,
 * with every overlay placed from measurements of that same image (see
 * src/data/galaxy.ts) — the Sun on the Orion Spur ~26,000 ly from Sgr A*,
 * arm names on their painted arms. A 3D bulge gives it depth; globular
 * clusters, nebulae and satellite galaxies sit at their real positions.
 */
export default function GalaxyLayer({ opacity = 1, isActive = true }: GalaxyLayerProps) {
  const descendScale = useSolarSystemStore((s) => s.descendScale);
  const openInfoCard = useSolarSystemStore((s) => s.openInfoCard);
  const transitionFrom = useSolarSystemStore((s) => s.transitionFrom);
  const { camera } = useThree();
  const [hovered, setHovered] = useState(false);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  useAscendOnZoomOut(controlsRef, {
    maxDistance: LAYER_CAMERA_POSES.galaxy.maxDistance,
    threshold: 0.95,
    enabled: transitionFrom === null,
    isActive,
    layer: "galaxy",
    minDistance: LAYER_CAMERA_POSES.galaxy.minDistance
  });
  usePublishDistance(controlsRef, isActive);
  useSettleTarget(controlsRef, "galaxy", isActive);

  const { stuffScale: pullbackStuff, anchorScale: pullbackAnchor, t: pullbackT } = usePullback("galaxy");
  // HTML labels don't scale with the scene: hidden mid-transition (when the
  // disc is a speck or huge) and faded while pulling back, before they pile up.
  const labelOpacity = transitionFrom !== null ? 0 : opacity * Math.max(0, 1 - pullbackT / 0.35);

  // Texture (shared image cache, not drei's useTexture: that would suspend
  // the layer and tear the camera plumbing during a cross-fade) and the
  // sparkle sampled from it.
  const [textureUrl] = useState(milkyWayTextureUrl);
  const galaxyTex = useImageTexture(textureUrl, (t) => { t.anisotropy = 8; });
  const sparkle = useMemo(() => galaxyTex ? sparkleFromImage(galaxyTex.image as CanvasImageSource) : null, [galaxyTex]);
  const discFade = useLoadFade(galaxyTex !== null);
  const bulge = useMemo(() => buildBulge(), []);
  const sparkleBase = useMemo(() => sparkle ? new Float32Array(sparkle.getAttribute("position").array) : null, [sparkle]);
  const sunOrbit = useMemo(() => {
    // Dashed: every other segment of a 240-gon.
    const pts: number[] = [];
    const at = (i: number) => {
      const a = (i / 240) * Math.PI * 2;
      return [Math.sin(a) * SUN_ORBIT_RADIUS_UNITS, 0, Math.cos(a) * SUN_ORBIT_RADIUS_UNITS];
    };
    for (let i = 0; i < 240; i += 2) pts.push(...at(i), ...at(i + 1));
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  useEffect(() => () => sunOrbit.dispose(), [sunOrbit]);

  // Galactic clock. The painted arms turn rigidly at the pattern speed, the
  // sparkle stars on the rotation curve, the Sun along its orbit line. It
  // rewinds to "now" whenever this layer hands off to another, since every
  // other layer is drawn as the galaxy is today.
  const patternRef = useRef<THREE.Group | null>(null);
  const sunRef = useRef<THREE.Group | null>(null);
  const appliedMyr = useRef(0);
  useFrame((_, delta) => {
    const s = useSolarSystemStore.getState();
    if (s.transitionFrom !== null) {
      if (s.galacticMyr !== 0) s.setGalacticMyr(Math.abs(s.galacticMyr) < 0.5 ? 0 : s.galacticMyr * Math.exp(-10 * Math.min(delta, 0.1)));
    } else if (isActive) {
      s.advanceGalactic(Math.min(delta, 0.1));
    }
    if (discMatRef.current) discMatRef.current.uniforms.uOpacity.value = opacity * discFade.current;
    const myr = useSolarSystemStore.getState().galacticMyr;
    if (patternRef.current) patternRef.current.rotation.y = rotationAngle(PATTERN_ANGULAR_SPEED, myr);
    if (sunRef.current) sunRef.current.rotation.y = rotationAngle(SUN_ANGULAR_SPEED, myr);
    if (sparkle && sparkleBase && myr !== appliedMyr.current) {
      applyDifferentialRotation(sparkle, sparkleBase, myr);
      appliedMyr.current = myr;
    }
  });

  const discUniforms = useMemo(() => ({ uMap: { value: galaxyTex }, uOpacity: { value: 1 } }), [galaxyTex]);
  const discMatRef = useRef<THREE.ShaderMaterial | null>(null);

  const [blackHoleUniforms] = useState(() => ({
    uOpacity: { value: 1 },
    uRingColor: { value: new THREE.Color("#ffb060") },
    uGlowColor: { value: new THREE.Color("#ffd07a") }
  }));
  const blackHoleMatRef = useRef<THREE.ShaderMaterial | null>(null);
  useEffect(() => {
    if (blackHoleMatRef.current) blackHoleMatRef.current.uniforms.uOpacity.value = opacity;
  }, [opacity]);

  const objects = useMemo(
    () => GALACTIC_OBJECTS.map((o) => ({ ...o, position: positionFromSun(SUN_GALAXY_POSITION, o.lDeg, o.bDeg, o.distanceLy, LY_PER_UNIT.galaxy) })),
    []
  );

  // Snap to the overview pose when this layer becomes active. Skipped during
  // animated transitions — useScaleTransition flies the camera instead.
  useEffect(() => {
    if (!isActive) return;
    if (useSolarSystemStore.getState().transitionDir !== null) return;
    const pose = LAYER_CAMERA_POSES.galaxy;
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
      <group>
        <ambientLight intensity={0.4} />

        {/* Sgr A* — anchor group, shrinks slowly under pull-back. */}
        <group scale={pullbackAnchor}>
          <Billboard position={[0, 0.1, 0]}>
            <mesh
              onClick={(e) => { e.stopPropagation(); descendScale("galacticCenter"); }}
              onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
              onPointerOut={() => { document.body.style.cursor = "default"; }}
            >
              <planeGeometry args={[BLACK_HOLE_SIZE, BLACK_HOLE_SIZE]} />
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
          <Html position={[0, BLACK_HOLE_SIZE, 0]} center zIndexRange={[3, 0]}>
            <div
              onClick={() => descendScale("galacticCenter")}
              title="The Milky Way's central black hole (symbol, not to scale). Click to see the stars orbiting it."
              style={{ ...labelBase, color: "rgba(255, 200, 130, 0.9)", fontWeight: 600, textShadow: "0 0 6px rgba(255, 160, 60, 0.7), 0 1px 2px rgba(0,0,0,0.9)", cursor: "pointer", pointerEvents: labelOpacity > 0 ? "auto" : "none", opacity: labelOpacity * 0.95 }}
            >
              Sagittarius A* ›
            </div>
          </Html>
        </group>

        {/* Everything else shrinks faster under pull-back. */}
        <group scale={pullbackStuff}>
          <group ref={patternRef}>
          {galaxyTex && (
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[GALAXY_IMAGE_CENTER_OFFSET_X, 0, 0]}>
              <circleGeometry args={[GALAXY_IMAGE_SPAN_UNITS / 2, 128]} />
              <shaderMaterial
                ref={discMatRef}
                vertexShader={galaxyDiscVertexShader}
                fragmentShader={galaxyDiscFragmentShader}
                uniforms={discUniforms}
                transparent
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            </mesh>
          )}
          <RoundPoints geometry={bulge} opacity={opacity * 0.55} />

          {/* Arm names, at the annotation's anchors on the painted arms. */}
          {ARM_LABELS.map(({ name, position }) => (
            <Html key={name} position={[position[0], 12, position[2]]} center zIndexRange={[3, 0]}>
              <div style={{ ...labelBase, fontWeight: 500, color: "rgba(180, 220, 255, 0.75)", textShadow: "0 0 6px rgba(0, 240, 255, 0.6), 0 1px 2px rgba(0,0,0,0.9)", opacity: labelOpacity * 0.85 }}>
                {name}
              </div>
            </Html>
          ))}
          </group>
          {sparkle && <RoundPoints geometry={sparkle} opacity={opacity * 0.8} />}

          {/* The Sun's orbit around the centre. */}
          <lineSegments geometry={sunOrbit}>
            <lineBasicMaterial color="#ffc94a" transparent opacity={0.7 * opacity} depthWrite={false} />
          </lineSegments>
          <Html position={[0, 12, -SUN_ORBIT_RADIUS_UNITS]} center zIndexRange={[3, 0]}>
            <div
              onClick={() => openInfoCard({
                title: "The Sun's orbit",
                kind: "Galactic rotation",
                color: "#ffc94a",
                body: "The Sun and its neighbours circle the galaxy at ~230 km/s. The spiral arms are waves of crowding that turn more slowly, so stars drift through them. Press ▶ on the galactic clock to watch.",
                facts: [
                  ["One lap", `~${Math.round(SUN_ORBIT_PERIOD_MYR)} million years`],
                  ["Laps since the Sun formed", "~20"],
                  ["Distance from the centre", `~${Math.round(SUN_ORBIT_RADIUS_LY / 100) * 100} light-years`]
                ]
              })}
              style={{ ...labelBase, fontSize: "8px", color: "rgba(255, 205, 110, 0.85)", textShadow: "0 1px 2px rgba(0,0,0,0.9)", cursor: "pointer", padding: "6px", pointerEvents: labelOpacity > 0 ? "auto" : "none", opacity: labelOpacity * 0.9 }}
            >
              Sun&apos;s orbit · {Math.round(SUN_ORBIT_PERIOD_MYR)} million years
            </div>
          </Html>

          {/* Globular clusters, nebulae and satellite galaxies. */}
          {objects.map((o) => (
            <group key={o.id}>
              <StarSprite position={o.position} size={OBJECT_STYLE[o.kind].size} color={OBJECT_STYLE[o.kind].color} intensity={0.8 * opacity} />
              <Html position={[o.position[0], o.position[1] + OBJECT_STYLE[o.kind].size * 0.5, o.position[2]]} center zIndexRange={[3, 0]}>
                <div title={o.note} onClick={() => openInfoCard(galacticObjectCard(o))} style={{ ...labelBase, fontSize: "8px", color: "rgba(220, 225, 255, 0.75)", textShadow: "0 1px 2px rgba(0,0,0,0.9)", pointerEvents: labelOpacity > 0 ? "auto" : "none", cursor: "pointer", padding: "6px", opacity: labelOpacity * 0.85 }}>
                  {o.name}
                </div>
              </Html>
            </group>
          ))}

          {/* "Solar Neighborhood" marker — the Sun on the Orion Spur. */}
          <group ref={sunRef}>
          <mesh
            position={SUN_GALAXY_POSITION}
            onClick={(e) => { e.stopPropagation(); descendScale(); }}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
            onPointerOut={() => { setHovered(false); document.body.style.cursor = "default"; }}
          >
            <sphereGeometry args={[MARKER_RADIUS * (hovered ? 1.4 : 1.0), 16, 16]} />
            <meshBasicMaterial color={hovered ? "#ffdd55" : "#ffb700"} transparent opacity={0.95 * opacity} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
          <Html position={[SUN_GALAXY_POSITION[0], 18, SUN_GALAXY_POSITION[2]]} center zIndexRange={[4, 0]}>
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
                opacity: labelOpacity,
                pointerEvents: transitionFrom !== null ? "none" : "auto"
              }}
            >
              Solar Neighborhood
            </div>
          </Html>
          </group>

        </group>
      </group>

      {isActive && (
        <OrbitControls
          ref={controlsRef}
          enabled={transitionFrom === null}
          enableDamping
          dampingFactor={0.08}
          enablePan={false}
          minDistance={LAYER_CAMERA_POSES.galaxy.minDistance}
          maxDistance={LAYER_CAMERA_POSES.galaxy.maxDistance}
          // The disc has real thickness now; allow viewing it from below.
          maxPolarAngle={Math.PI - 0.05}
        />
      )}
    </>
  );
}

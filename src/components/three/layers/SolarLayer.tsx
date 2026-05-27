import { useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { useSolarSystemStore } from "@/store/solarSystemStore";
import { STAR, PLANETS, PARTICLE_FIELDS } from "@/data/bodies";
import CelestialBody from "../CelestialBody";
import ParticleField from "../bodies/ParticleField";
import CameraController from "../CameraController";

// Advances simulated time each frame (capped to avoid jumps on frame lag).
// Lives in the Solar layer because elapsedTime only drives Solar-layer planets.
function ClockUpdater() {
  const updateTime = useSolarSystemStore((state) => state.updateTime);
  useFrame((_, delta) => {
    updateTime(Math.min(delta, 0.1));
  });
  return null;
}

interface SolarLayerProps {
  /** Only the active layer mounts its OrbitControls (via CameraController),
   *  so the outgoing layer doesn't fight for the camera during a cross-fade. */
  isActive?: boolean;
  /** Uniform scale applied to the whole layer. While this layer is the
   *  OUTGOING side of an ascend transition, useCrossfade drives this from
   *  1 → SHRINK_FACTOR so the Solar System visibly shrinks toward the
   *  camera. 1 otherwise. */
  transitionScale?: number;
}

/**
 * The original solar system scene as a self-contained layer. Renders inside
 * the shared Canvas managed by LayerSwitcher / SolarSystemScene. Behavior is
 * unchanged from the previous in-Canvas tree.
 */
export default function SolarLayer({ isActive = true, transitionScale = 1 }: SolarLayerProps) {
  const { selectPlanet, returnToOverview, isRealisticScale } = useSolarSystemStore();

  // The Stars backdrop must sit outside the outermost orbit in BOTH scale modes.
  // Stylized: Neptune ~ 200 units → 300 is fine.
  // Realistic: Neptune ~ 4500 units (30 AU × 150) → bump to ~6000 with proportional
  // depth, otherwise stars form a sphere INSIDE the solar system.
  const starsRadius = isRealisticScale ? 6000 : 300;
  const starsDepth = isRealisticScale ? 1200 : 60;
  const starsFactor = isRealisticScale ? 140 : 7; // per-star size scales with radius

  return (
    <>
      {/* Everything that should visibly shrink during an ascend transition
          lives inside this scaled group. OrbitControls / CameraController
          stays OUTSIDE so the camera distance math isn't itself scaled. */}
      <group scale={transitionScale}>
        {/* Star backdrop — sized to stay behind the planets in either scale. */}
        <Stars
          radius={starsRadius}
          depth={starsDepth}
          count={6000}
          factor={starsFactor}
          saturation={0.8}
          fade
          speed={1.5}
        />

        <ambientLight intensity={0.05} />

        {/* Dynamic simulation clock updater */}
        <ClockUpdater />

        {/* Central star — clicking it returns to the overview */}
        <CelestialBody body={STAR} onSelect={() => returnToOverview()} />

        {/* All planets, data-driven */}
        {PLANETS.map((planet) => (
          <CelestialBody key={planet.id} body={planet} onSelect={selectPlanet} />
        ))}

        {/* Procedural particle fields (asteroid belt, etc.) */}
        {PARTICLE_FIELDS.map((field) => (
          <ParticleField key={field.id} config={field} />
        ))}
      </group>

      {/* Smart camera controller — only when active (owns the camera). */}
      {isActive && <CameraController />}
    </>
  );
}

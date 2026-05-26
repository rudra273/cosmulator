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

/**
 * The original solar system scene as a self-contained layer. Renders inside
 * the shared Canvas managed by LayerSwitcher / SolarSystemScene. Behavior is
 * unchanged from the previous in-Canvas tree.
 */
export default function SolarLayer() {
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

      {/* Smart camera controller (handles tracking + zoom interpolation) */}
      <CameraController />
    </>
  );
}

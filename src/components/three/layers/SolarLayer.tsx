import { useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { useSolarSystemStore } from "@/store/solarSystemStore";
import { STAR, PLANETS, PARTICLE_FIELDS } from "@/data/bodies";
import CelestialBody from "../CelestialBody";
import ParticleField from "../bodies/ParticleField";
import CameraController from "../CameraController";
import { usePullback } from "./usePullback";

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
  /** Scale for the planets + orbits + particle-field sub-group. During an
   *  ascend transition this drops 1 → ~0.04 over the first half so the
   *  planets visibly collapse into the Sun before the Sun itself shrinks. */
  planetsScale?: number;
  /** Scale for the Sun + the stylized starry backdrop. Holds at 1 for the
   *  first half of the transition (acting as the visual anchor), then
   *  drops 1 → SHRINK_FACTOR over the second half so the Sun "becomes" one
   *  of the nearby stars as the Stellar layer fades in around it. */
  sunScale?: number;
}

/**
 * Solar System scene as a self-contained layer. Renders inside the shared
 * Canvas managed by LayerSwitcher / SolarSystemScene.
 *
 * Ascend transition out of Solar is staged: planets collapse into the Sun
 * first (over 0–50% of the 1800 ms window), then the Sun itself shrinks
 * down (50–100%) as the Stellar Neighborhood fades in around it. This
 * sells "zoom out until just the Sun, then keep zooming until the Sun is
 * one star among many" instead of a uniform shrink.
 */
export default function SolarLayer({
  isActive = true,
  planetsScale = 1,
  sunScale = 1
}: SolarLayerProps) {
  const { selectPlanet, returnToOverview, isRealisticScale } = useSolarSystemStore();

  // Wheel-driven shrink in the extended max-distance pull-back zone. Returns
  // (1, 1) in steady state inside the comfortable overview distance, and
  // (1, 1) during transitions (useCrossfade owns the scale then). In between,
  // the planets visibly shrink toward the Sun and the Sun shrinks more
  // slowly, so the user feels every wheel tick continue to do something
  // useful past the natural overview distance.
  const { stuffScale: pullbackPlanets, anchorScale: pullbackSun } = usePullback("solar");

  // The Stars backdrop must sit outside the outermost orbit in BOTH scale modes.
  // Stylized: Neptune ~ 200 units → 300 is fine.
  // Realistic: Neptune ~ 4500 units (30 AU × 150) → bump to ~6000 with proportional
  // depth, otherwise stars form a sphere INSIDE the solar system.
  const starsRadius = isRealisticScale ? 6000 : 300;
  const starsDepth = isRealisticScale ? 1200 : 60;
  const starsFactor = isRealisticScale ? 140 : 7; // per-star size scales with radius

  return (
    <>
      {/* Sun + starry backdrop — anchor group. Combines the wheel-driven
          pull-back anchor scale (live) with the staged-shrink sunScale
          (driven by useCrossfade during a transition). usePullback returns 1
          during transitions so these two never double-count. */}
      <group scale={sunScale * pullbackSun}>
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

        <CelestialBody body={STAR} onSelect={() => returnToOverview()} />
      </group>

      {/* Planets + orbits + particle fields. Combines the wheel-driven
          pull-back stuff scale (live) with the staged-shrink planetsScale
          (driven by useCrossfade during a transition). Clock updater lives
          in here since it only matters while the planets are visible. */}
      <group scale={planetsScale * pullbackPlanets}>
        <ClockUpdater />

        {PLANETS.map((planet) => (
          <CelestialBody key={planet.id} body={planet} onSelect={selectPlanet} />
        ))}

        {PARTICLE_FIELDS.map((field) => (
          <ParticleField key={field.id} config={field} />
        ))}
      </group>

      {/* Smart camera controller — only when active (owns the camera).
          Stays outside both scaled groups so distance math isn't itself
          scaled by the ascend animation. */}
      {isActive && <CameraController />}
    </>
  );
}

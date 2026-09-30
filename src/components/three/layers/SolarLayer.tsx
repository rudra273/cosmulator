import { useShallow } from "zustand/react/shallow";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { Stars } from "@react-three/drei";
import { useSolarSystemStore } from "@/store/solarSystemStore";
import { STAR, ORBITING_BODIES, PARTICLE_FIELDS } from "@/data/bodies";
import { LabelLayout } from "../SceneLabel";
import CelestialBody from "../CelestialBody";
import ParticleField from "../bodies/ParticleField";
import Heliosphere from "../bodies/Heliosphere";
import CameraController from "../CameraController";
import { usePullback } from "./usePullback";
import { focusSpread, FOCUS_SPREAD } from "@/lib/body-position";

// Advances simulated time each frame (capped to avoid jumps on frame lag).
// Lives in the Solar layer because elapsedTime only drives Solar-layer planets.
function ClockUpdater() {
  const updateTime = useSolarSystemStore((state) => state.updateTime);
  useFrame((_, delta) => {
    updateTime(Math.min(delta, 0.1));
  }, -2);
  return null;
}

// Eases the compressed-distance focus spread toward its target: spread out
// while a body is selected, back to 1 in the overview. Runs before any body
// reads positions this frame.
function FocusSpreadUpdater({ backdrop }: { backdrop: React.RefObject<Group | null> }) {
  useFrame((_, delta) => {
    const s = useSolarSystemStore.getState();
    const target = s.selectedPlanetId && !s.isRealisticScale ? FOCUS_SPREAD : 1;
    focusSpread.value += (target - focusSpread.value) * (1 - Math.exp(-Math.min(delta, 0.1) * 4));
    if (Math.abs(target - focusSpread.value) < 1e-4) focusSpread.value = target;
    backdrop.current?.scale.setScalar(s.isRealisticScale ? 1 : focusSpread.value);
  }, -2);
  return null;
}

interface SolarLayerProps {
  /** Only the active layer mounts its OrbitControls (via CameraController),
   *  so the outgoing layer doesn't fight for the camera during a cross-fade. */
  isActive?: boolean;
}

/**
 * Solar System scene as a self-contained layer. Renders inside the shared
 * Canvas managed by LayerSwitcher / SolarSystemScene.
 *
 * During a scale transition the whole layer is placed and scaled by
 * useScaleTransition (LayerSwitcher's wrapper group), so the Sun lines up with
 * the Stellar layer's Sun.
 */
export default function SolarLayer({
  isActive = true
}: SolarLayerProps) {
  const { selectPlanet, returnToOverview, isRealisticScale, inTransition } = useSolarSystemStore(useShallow(s => ({ selectPlanet: s.selectPlanet, returnToOverview: s.returnToOverview, isRealisticScale: s.isRealisticScale, inTransition: s.transitionFrom !== null })));

  // Wheel-driven shrink in the extended max-distance pull-back zone. Returns
  // (1, 1) in steady state inside the comfortable overview distance, and
  // (1, 1) during transitions (useCrossfade owns the scale then). In between,
  // the planets visibly shrink toward the Sun and the Sun shrinks more
  // slowly, so the user feels every wheel tick continue to do something
  // useful past the natural overview distance.
  const { stuffScale: pullbackPlanets, anchorScale: pullbackSun } = usePullback("solar");
  const backdropRef = useRef<Group>(null);

  // The Stars backdrop must sit outside the outermost object in BOTH scale
  // modes, now Voyager 1 (~170 AU): stylized ~655 units, realistic ~25,800.
  // Otherwise the stars form a sphere INSIDE the solar system.
  const starsRadius = isRealisticScale ? 45000 : 900;
  const starsDepth = isRealisticScale ? 3000 : 80;
  const starsFactor = isRealisticScale ? 450 : 10; // per-star size scales with radius

  return (
    <>
      {/* Sun + starry backdrop — anchor group, shrinks slowly with pull-back. */}
      <group scale={pullbackSun}>
        <FocusSpreadUpdater backdrop={backdropRef} />
        {/* Decorative backdrop is hidden mid-transition: scaled down it would
            read as a ball of stars around the Sun. */}
        <group ref={backdropRef} visible={!inTransition}>
          <Stars
            radius={starsRadius}
            depth={starsDepth}
            count={6000}
            factor={starsFactor}
            saturation={0.8}
            fade
            speed={0}
          />
        </group>

        <ambientLight intensity={0.05} />

        <CelestialBody body={STAR} onSelect={() => returnToOverview()} />
      </group>

      {/* Planets + orbits + particle fields — shrink faster with pull-back. */}
      <group scale={pullbackPlanets}>
        <ClockUpdater />

        {ORBITING_BODIES.map((planet) => (
          <CelestialBody key={planet.id} body={planet} onSelect={selectPlanet} />
        ))}

        {PARTICLE_FIELDS.map((field) => (
          <ParticleField key={field.id} config={field} />
        ))}

        <Heliosphere />
      </group>

      {/* Smart camera controller — only when active (owns the camera).
          Stays outside both scaled groups so distance math isn't scaled. */}
      {isActive && <><CameraController /><LabelLayout /></>}
    </>
  );
}

import { Canvas, useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { useSolarSystemStore } from "@/store/solarSystemStore";
import { STAR, PLANETS, PARTICLE_FIELDS } from "@/data/bodies";
import CelestialBody from "./CelestialBody";
import ParticleField from "./bodies/ParticleField";
import CameraController from "./CameraController";

// Advances simulated time each frame (capped to avoid jumps on frame lag).
function ClockUpdater() {
  const updateTime = useSolarSystemStore((state) => state.updateTime);
  useFrame((_, delta) => {
    updateTime(Math.min(delta, 0.1));
  });
  return null;
}

export default function SolarSystemScene() {
  const { selectPlanet, returnToOverview, isRealisticScale } = useSolarSystemStore();

  // The Stars backdrop must sit outside the outermost orbit in BOTH scale modes.
  // Stylized: Neptune ~ 200 units → 300 is fine.
  // Realistic: Neptune ~ 4500 units (30 AU × 150) → bump to ~6000 with proportional
  // depth, otherwise stars form a sphere INSIDE the solar system.
  const starsRadius = isRealisticScale ? 6000 : 300;
  const starsDepth = isRealisticScale ? 1200 : 60;
  const starsFactor = isRealisticScale ? 140 : 7; // per-star size scales with radius

  return (
    <div style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }}>
      <Canvas
        camera={{ position: [0, 50, 95], fov: 45, far: 30000 }}
        dpr={[1, 2]} // High DPI optimization
      >
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
      </Canvas>
    </div>
  );
}

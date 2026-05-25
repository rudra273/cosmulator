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
  const { selectPlanet, returnToOverview } = useSolarSystemStore();

  return (
    <div style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }}>
      <Canvas
        camera={{ position: [0, 50, 95], fov: 45, far: 30000 }}
        dpr={[1, 2]} // High DPI optimization
      >
        {/* Star backdrop */}
        <Stars
          radius={300}
          depth={60}
          count={6000}
          factor={7}
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

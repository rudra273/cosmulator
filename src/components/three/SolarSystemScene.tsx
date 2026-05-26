import { Canvas } from "@react-three/fiber";
import LayerSwitcher from "./layers/LayerSwitcher";

/**
 * Owns the shared WebGL Canvas and delegates scene contents to LayerSwitcher,
 * which picks between Solar / Galaxy / Universe layers based on the store's
 * viewScale. One Canvas means the WebGL context (and the camera) persists
 * across layer transitions — no remount hitch.
 */
export default function SolarSystemScene() {
  return (
    <div style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }}>
      <Canvas
        camera={{ position: [0, 50, 95], fov: 45, far: 30000 }}
        dpr={[1, 2]} // High DPI optimization
      >
        <LayerSwitcher />
      </Canvas>
    </div>
  );
}

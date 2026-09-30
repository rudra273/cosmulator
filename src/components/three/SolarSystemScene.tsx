import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import LayerSwitcher from "./layers/LayerSwitcher";

/** How long to wait for the browser to hand the GPU context back before
 *  offering to rebuild the scene. */
const RESTORE_WAIT_MS = 4000;

/**
 * Owns the shared WebGL Canvas and delegates scene contents to LayerSwitcher,
 * which picks the active scale layer from the store's viewScale. One Canvas
 * means the WebGL context (and the camera) persists across layer
 * transitions — no remount hitch.
 *
 * Phones drop WebGL contexts when backgrounded or short on memory. three.js
 * re-uploads everything if the browser restores the context; if it doesn't
 * within a few seconds, the reader can rebuild the Canvas (the store — view,
 * date, selection — survives, so they land where they were).
 */
export default function SolarSystemScene() {
  const [canvasKey, setCanvasKey] = useState(0);
  const [lost, setLost] = useState(false);
  const [stuck, setStuck] = useState(false);
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasEl) return;
    const onLost = () => setLost(true);
    const onRestored = () => { setLost(false); setStuck(false); };
    canvasEl.addEventListener("webglcontextlost", onLost);
    canvasEl.addEventListener("webglcontextrestored", onRestored);
    return () => {
      canvasEl.removeEventListener("webglcontextlost", onLost);
      canvasEl.removeEventListener("webglcontextrestored", onRestored);
    };
  }, [canvasEl]);

  useEffect(() => {
    if (!lost) return;
    const timer = setTimeout(() => setStuck(true), RESTORE_WAIT_MS);
    return () => clearTimeout(timer);
  }, [lost]);

  const rebuild = () => {
    setLost(false);
    setStuck(false);
    setCanvasEl(null);
    setCanvasKey((k) => k + 1);
  };

  return (
    <div style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }}>
      <Canvas
        key={canvasKey}
        camera={{ position: [0, 50, 95], fov: 45, far: 100000 }}
        dpr={[1, 2]} // High DPI optimization
        onCreated={({ gl }) => setCanvasEl(gl.domElement)}
      >
        <LayerSwitcher />
      </Canvas>
      {lost && (
        <div className="context-lost" role="status">
          <p>Graphics paused{stuck ? "" : " — restoring…"}</p>
          {stuck && (
            <button className="hud-btn active" onClick={rebuild}>
              Reload scene
            </button>
          )}
        </div>
      )}
    </div>
  );
}

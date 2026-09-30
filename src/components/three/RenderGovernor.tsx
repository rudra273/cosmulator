import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useSolarSystemStore } from "@/store/solarSystemStore";
import { setRenderWakeListener } from "./renderActivity";

/** How long frames keep coming after the last input or state change: long
 *  enough for every ease, fade and camera flight in the scene to settle. */
const IDLE_MS = 4000;

const INPUT_EVENTS = ["pointerdown", "pointermove", "pointerup", "wheel", "keydown", "keyup", "touchstart", "touchmove"] as const;

type State = ReturnType<typeof useSolarSystemStore.getState>;

/** Something moves on its own every frame, whatever the input. */
function animating(s: State): boolean {
  if (s.transitionFrom !== null || s.navTarget !== null) return true;
  // Only these layers run the date clock; only the Galaxy runs its own.
  if (!s.isPaused && (s.viewScale === "solar" || s.viewScale === "galacticCenter")) return true;
  return s.galacticRate !== 0 && s.viewScale === "galaxy";
}

/**
 * Drives the Canvas's `frameloop="demand"`: renders every frame while the
 * scene can change (a clock running, a transition, recent input or state
 * changes, assets arriving) and stops once it has been still for IDLE_MS.
 * A still frame is left on screen, so nothing looks different; the GPU just
 * stops redrawing it.
 */
export default function RenderGovernor() {
  const get = useThree((s) => s.get);
  const invalidate = useThree((s) => s.invalidate);
  const lastActivity = useRef(0); // set by the first wake, on mount
  const idle = useRef(false);

  useEffect(() => {
    const wake = () => {
      lastActivity.current = performance.now();
      if (idle.current) {
        idle.current = false;
        // Restart the frame clock, or the first frame back would see the
        // whole idle stretch as one delta and snap new animations to the end.
        get().clock.getDelta();
      }
      invalidate();
    };
    setRenderWakeListener(wake);

    const unsubscribe = useSolarSystemStore.subscribe((next, prev) => {
      for (const key in next) {
        if (!Object.is(next[key as keyof State], prev[key as keyof State])) return wake();
      }
    });
    for (const type of INPUT_EVENTS) window.addEventListener(type, wake, { capture: true, passive: true });
    window.addEventListener("resize", wake);
    document.addEventListener("visibilitychange", wake);
    const canvas = get().gl.domElement;
    canvas.addEventListener("webglcontextrestored", wake);

    wake();
    return () => {
      setRenderWakeListener(null);
      unsubscribe();
      for (const type of INPUT_EVENTS) window.removeEventListener(type, wake, { capture: true });
      window.removeEventListener("resize", wake);
      document.removeEventListener("visibilitychange", wake);
      canvas.removeEventListener("webglcontextrestored", wake);
    };
  }, [get, invalidate]);

  useFrame(() => {
    if (animating(useSolarSystemStore.getState()) || performance.now() - lastActivity.current < IDLE_MS) invalidate();
    else idle.current = true;
  });

  return null;
}

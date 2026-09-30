import { useEffect, useState } from "react";
import { useSolarSystemStore, type ViewScale } from "@/store/solarSystemStore";

/** Default length of a scale transition (the store's `transitionMs` may
 *  shorten intermediate hops); useScaleTransition moves the camera over the
 *  same window. */
export const TRANSITION_MS = 1800;

/**
 * Cross-fade clock for the LayerSwitcher: `opacityFor(layer)` gives each
 * rendered layer's opacity, and the transition is cleared in the store when
 * the fade completes. Geometry and camera motion live in useScaleTransition.
 */
export function useCrossfade(): { opacityFor: (layer: ViewScale) => number } {
  const viewScale = useSolarSystemStore((s) => s.viewScale);
  const transitionFrom = useSolarSystemStore((s) => s.transitionFrom);
  const clearTransition = useSolarSystemStore((s) => s.clearTransition);
  const [progress, setProgress] = useState(1);

  useEffect(() => {
    if (transitionFrom === null) return;
    const start = performance.now();
    const duration = useSolarSystemStore.getState().transitionMs;
    let raf = 0;
    const tick = () => {
      const t = Math.min(1, (performance.now() - start) / duration);
      setProgress(t);
      if (t < 1) raf = requestAnimationFrame(tick);
      else clearTransition();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [transitionFrom, clearTransition]);

  // Layers are anchor-matched, so both can be visible at once: incoming
  // fades in over the first 60%, outgoing fades out over the first half.
  const opacityFor = (layer: ViewScale): number => {
    if (transitionFrom === null) return 1;
    if (layer === viewScale) return Math.min(1, progress / 0.6);
    if (layer === transitionFrom) return Math.max(0, 1 - progress / 0.5);
    return 0;
  };

  return { opacityFor };
}

import { useEffect, useState } from "react";
import { useSolarSystemStore, type ViewScale } from "@/store/solarSystemStore";

const FADE_MS = 500;

/**
 * Cross-fade state for the LayerSwitcher. Returns the opacity each rendered
 * layer should be drawn at, plus a clearTransition side-effect once the fade
 * completes.
 *
 *  - When no transition is active, every layer gets opacity 1.
 *  - When a transition starts (transitionFrom set in the store), the outgoing
 *    layer's opacity ramps 1 → 0 over FADE_MS, while the incoming layer ramps
 *    0 → 1. After FADE_MS the store's `clearTransition` is called and only the
 *    incoming layer remains mounted (LayerSwitcher unmounts the outgoing one).
 *
 * Phase 0 caveat: Solar layer uses procedural shaders without a uOpacity
 * uniform, so it does NOT fade — it just mounts/unmounts at the start/end of
 * the transition. Galaxy and Universe layers DO fade (Points/Sprites accept
 * material opacity directly).
 */
export function useCrossfade(): {
  opacityFor: (layer: ViewScale) => number;
} {
  const viewScale = useSolarSystemStore((s) => s.viewScale);
  const transitionFrom = useSolarSystemStore((s) => s.transitionFrom);
  const clearTransition = useSolarSystemStore((s) => s.clearTransition);

  // Local progress: 0 at the moment a transition starts, 1 when it's done.
  // setProgress only runs from inside a rAF callback (asynchronously), which
  // satisfies the react-compiler rule that bans synchronous setState in
  // effects.
  const [progress, setProgress] = useState(1);

  useEffect(() => {
    if (transitionFrom === null) return;
    // Transition just started — animate progress 0 → 1 over FADE_MS, then
    // clear the transition flag so the outgoing layer can unmount.
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const elapsed = performance.now() - start;
      const t = Math.min(1, elapsed / FADE_MS);
      setProgress(t);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        clearTransition();
        setProgress(1); // ensure incoming layer ends at fully visible
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [transitionFrom, clearTransition]);

  const opacityFor = (layer: ViewScale): number => {
    if (transitionFrom === null) return 1; // steady state
    if (layer === viewScale) return progress; // incoming
    if (layer === transitionFrom) return 1 - progress; // outgoing
    return 0; // somebody else — shouldn't happen
  };

  return { opacityFor };
}

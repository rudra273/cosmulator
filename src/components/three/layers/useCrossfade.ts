import { useEffect, useState } from "react";
import { useSolarSystemStore, type ViewScale } from "@/store/solarSystemStore";
import { MathUtils } from "three";

// 700 ms gives the NASA-Eyes-style zoom-out enough time to read as a
// continuous motion (shrink + dolly + fade). The same window is used for
// descend; descend just doesn't drive the dolly/shrink so it feels snappy.
const FADE_MS = 700;
// How small the outgoing layer's geometry scales to by the end of an ascend.
// Approximation of the natural scale ratio between adjacent layers; see plan
// notes for the per-pair refinement option.
const SHRINK_FACTOR = 0.15;

// Smoothstep easing — slow start, accelerated middle, slow finish. Sells the
// "drifting away from the previous scale" feel without a hard linear ramp.
const eased = (t: number) => t * t * (3 - 2 * t);

/**
 * Cross-fade + zoom-out animation state for the LayerSwitcher.
 *
 *  - `opacityFor(layer)` — opacity each rendered layer should draw at.
 *  - `outgoingScale` — scale factor for the OUTGOING layer's top-level group.
 *    On ascend, animates 1 → SHRINK_FACTOR so the previous scale visibly
 *    shrinks toward the camera. On descend (and steady state), stays 1.
 *  - `cameraDollyT` — 0→1 ascend progress for the camera dolly. `null` when
 *    no ascend is in flight; the dolly hook returns early when null.
 *
 * Solar layer doesn't fade opacity (its procedural shaders lack a uOpacity
 * uniform); the shrink + the incoming layer's opacity ramp are enough to
 * sell the transition.
 */
export function useCrossfade(): {
  opacityFor: (layer: ViewScale) => number;
  outgoingScale: number;
  cameraDollyT: number | null;
} {
  const viewScale = useSolarSystemStore((s) => s.viewScale);
  const transitionFrom = useSolarSystemStore((s) => s.transitionFrom);
  const transitionDir = useSolarSystemStore((s) => s.transitionDir);
  const clearTransition = useSolarSystemStore((s) => s.clearTransition);

  // Local progress: 0 at the moment a transition starts, 1 when it's done.
  const [progress, setProgress] = useState(1);

  useEffect(() => {
    if (transitionFrom === null) return;
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
        setProgress(1);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [transitionFrom, clearTransition]);

  const isAscending = transitionDir === "ascend" && transitionFrom !== null;
  const easedProgress = eased(progress);
  const outgoingScale = isAscending
    ? MathUtils.lerp(1.0, SHRINK_FACTOR, easedProgress)
    : 1.0;
  const cameraDollyT = isAscending ? easedProgress : null;

  const opacityFor = (layer: ViewScale): number => {
    if (transitionFrom === null) return 1;
    if (layer === viewScale) return progress;
    if (layer === transitionFrom) return 1 - progress;
    return 0;
  };

  return { opacityFor, outgoingScale, cameraDollyT };
}

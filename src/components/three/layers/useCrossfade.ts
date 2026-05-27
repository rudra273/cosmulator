import { useEffect, useState } from "react";
import { useSolarSystemStore, type ViewScale } from "@/store/solarSystemStore";
import { MathUtils } from "three";

// 1800 ms gives the staged shrink + camera dolly + warp tunnel room to read
// as one continuous "traveling through space" motion. Descend reuses the
// same window but skips the dolly/shrink so a click-down still feels snappy.
const FADE_MS = 1800;

// Outgoing layer shrinks to this fraction of its size by the end of an
// ascend. Approximates the natural scale ratio between adjacent layers.
const SHRINK_FACTOR = 0.15;

// Solar-only: the planets/orbits collapse toward the Sun in the first half
// of the transition, then the Sun itself shrinks down in the second half.
// `solarPlanetsScale` runs 1 → PLANETS_SHRINK over progress 0 → SOLAR_SPLIT,
// then holds. `solarSunScale` holds at 1 until SOLAR_SPLIT, then runs
// 1 → SHRINK_FACTOR over SOLAR_SPLIT → 1.
const SOLAR_SPLIT = 0.5;
const PLANETS_SHRINK = 0.04; // planets nearly vanish into the Sun

// Smoothstep easing — slow start, accelerated middle, slow finish.
const eased = (t: number) => t * t * (3 - 2 * t);

// Map a sub-window of overall progress [a, b] to a 0..1 local progress.
// Outside the window, clamps to 0 (before) or 1 (after).
const window01 = (t: number, a: number, b: number) =>
  Math.max(0, Math.min(1, (t - a) / (b - a)));

/**
 * Cross-fade + zoom-out animation state for the LayerSwitcher.
 *
 *  - `opacityFor(layer)` — opacity each rendered layer should draw at.
 *  - `outgoingScale` — uniform scale for the OUTGOING layer's top-level group
 *    (used by Stellar / Galaxy / Universe). 1 → SHRINK_FACTOR on ascend.
 *  - `solarPlanetsScale` / `solarSunScale` — Solar layer only. The Solar
 *    layer splits its content into a planets-group and a sun-group so the
 *    planets collapse into the Sun first, then the Sun shrinks down.
 *  - `cameraDollyT` — 0→1 ascend progress for the camera dolly. `null` when
 *    no ascend is in flight; the dolly hook returns early when null.
 *  - `warpT` — 0→1 ascend progress for the warp tunnel component. `null`
 *    when no ascend is in flight or transitioning from Solar (no warp on
 *    the first hop — the staged shrink is the visual story there).
 *  - `progress` — raw 0→1 transition progress, exposed so the LayerSwitcher
 *    can hide the WarpField outside its fade window.
 */
export function useCrossfade(): {
  opacityFor: (layer: ViewScale) => number;
  outgoingScale: number;
  solarPlanetsScale: number;
  solarSunScale: number;
  cameraDollyT: number | null;
  warpT: number | null;
  progress: number;
} {
  const viewScale = useSolarSystemStore((s) => s.viewScale);
  const transitionFrom = useSolarSystemStore((s) => s.transitionFrom);
  const transitionDir = useSolarSystemStore((s) => s.transitionDir);
  const pullbackAtAscend = useSolarSystemStore((s) => s.pullbackAtAscend);
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

  // Starting scales for the transition: whatever the live pull-back had
  // shrunk the layer to at the moment ascend fired. Defaults to (1, 1) so
  // tests / programmatic ascends still work without a snapshot.
  const startStuff = pullbackAtAscend?.stuff ?? 1;
  const startAnchor = pullbackAtAscend?.anchor ?? 1;

  // Generic outgoing scale (Stellar, Galaxy, Universe). Interpolates from
  // wherever the wheel left it down to the final SHRINK_FACTOR. Uses the
  // anchor snapshot since these layers shrink uniformly under one group;
  // anchor is the more conservative of the two pull-back values, so the
  // transition doesn't double-shrink visibly.
  const outgoingScale = isAscending
    ? MathUtils.lerp(startAnchor, SHRINK_FACTOR, easedProgress)
    : 1.0;

  // Staged Solar shrink: planets collapse first (from the live pulled-back
  // planets scale → PLANETS_SHRINK), then the Sun shrinks second (from the
  // live pulled-back sun scale → SHRINK_FACTOR). Both ends honor the
  // wheel-driven starting point so there's no snap-back when ascend fires.
  const solarPlanetsScale =
    isAscending && transitionFrom === "solar"
      ? MathUtils.lerp(startStuff, PLANETS_SHRINK, eased(window01(progress, 0, SOLAR_SPLIT)))
      : 1.0;
  const solarSunScale =
    isAscending && transitionFrom === "solar"
      ? MathUtils.lerp(startAnchor, SHRINK_FACTOR, eased(window01(progress, SOLAR_SPLIT, 1)))
      : 1.0;

  const cameraDollyT = isAscending ? easedProgress : null;

  // Warp tunnel: only on stellar→galaxy and galaxy→universe (not on the
  // first hop out of Solar, where the staged shrink + appearing-neighbors
  // already carries the story).
  const warpT =
    isAscending && (transitionFrom === "stellar" || transitionFrom === "galaxy")
      ? progress
      : null;

  const opacityFor = (layer: ViewScale): number => {
    if (transitionFrom === null) return 1;
    if (layer === viewScale) return progress;
    if (layer === transitionFrom) return 1 - progress;
    return 0;
  };

  return {
    opacityFor,
    outgoingScale,
    solarPlanetsScale,
    solarSunScale,
    cameraDollyT,
    warpT,
    progress
  };
}

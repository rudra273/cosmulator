import { useEffect, useState } from "react";
import { useSolarSystemStore } from "@/store/solarSystemStore";

// Final shrink applied to background bodies while a planet is focused.
// 0.5 = half size — enough to read as "I'm not looking at the system any
// more, I'm looking at THIS planet" while keeping the others visible
// enough that the user knows where the focused planet is.
const BACKGROUND_SCALE_FOCUSED = 0.5;

// Duration of the size-shrink animation, in ms. Matched roughly to the
// camera fly-in (~200 ms × 2 for a slightly slower size ease — the
// camera arrival should feel slightly ahead of the de-emphasis settling).
const RAMP_MS = 400;

const eased = (t: number) => t * t * (3 - 2 * t);

/**
 * Returns the scale multiplier this body should apply to its visible size,
 * given whether the camera is currently focused on some other planet.
 *
 *  - `1.0` everywhere when no planet is selected (steady state).
 *  - `1.0` for the currently-selected body (it's the subject; stays
 *    full-size so it dominates the frame after the fly-in).
 *  - Animated 1.0 → BACKGROUND_SCALE_FOCUSED for every other body when
 *    something becomes selected. Eases back to 1.0 on deselect, in sync
 *    with the camera fly-home.
 *
 * The animation is driven by a single shared rAF loop owned by the hook,
 * so all bodies see the same progress value within a frame.
 *
 * Sun gets the same treatment as planets (it shrinks while focused on a
 * planet) which feels right — at the planet vantage the Sun is "far" and
 * the rest of the system should read accordingly. If we ever want the
 * Sun to stay full-size, gate the multiplier on `bodyId !== "sun"` here.
 */
export function useFocusEmphasis(bodyId: string): number {
  const selectedPlanetId = useSolarSystemStore((s) => s.selectedPlanetId);

  // Target progress: 1 when something is focused, 0 in overview.
  const target = selectedPlanetId !== null ? 1 : 0;
  const [progress, setProgress] = useState<number>(target);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = progress;
    const to = target;
    if (from === to) return;

    const tick = () => {
      const elapsed = performance.now() - start;
      const t = Math.min(1, elapsed / RAMP_MS);
      setProgress(from + (to - from) * eased(t));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // We deliberately omit `progress` from the deps — including it would
    // restart the animation every tick. `target` is the trigger; `from`
    // captures the current progress at the moment the target changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  // Subject planet stays at full size; everyone else shrinks toward
  // BACKGROUND_SCALE_FOCUSED.
  const isSubject = bodyId === selectedPlanetId;
  if (isSubject) return 1.0;
  return 1.0 + (BACKGROUND_SCALE_FOCUSED - 1.0) * progress;
}

import { useSolarSystemStore, type ViewScale } from "@/store/solarSystemStore";
import { computePullback } from "@/lib/scale-transition";

export { computePullback };

/**
 * Live distance-driven shrink for the active layer's content. As the user
 * wheels past `pullbackStart`, the layer's "stuff" (planets, neighbor stars,
 * galactic disc) shrinks toward its anchor (Sun, galactic center), which
 * shrinks more slowly so it stays the focal point.
 *
 * During a transition the OUTGOING layer holds the shrink it had when the
 * transition fired (`pullbackSnapshot`), so the handoff frame matches the
 * last steady frame; the incoming layer renders at natural size.
 */
export function usePullback(layer: ViewScale): {
  stuffScale: number;
  anchorScale: number;
  /** 0 = at or below `pullbackStart`, 1 = at `maxDistance`. */
  t: number;
} {
  const cameraDistance = useSolarSystemStore((s) => layer === "solar" && (s.selectedPlanetId || s.isRealisticScale) ? 0 : s.cameraDistance);
  const realDistances = useSolarSystemStore(s => s.isRealisticScale);
  const selected = useSolarSystemStore(s => s.selectedPlanetId);
  const transitionFrom = useSolarSystemStore((s) => s.transitionFrom);
  const snapshot = useSolarSystemStore((s) => s.pullbackSnapshot);

  if (transitionFrom !== null) {
    if (transitionFrom === layer && snapshot) return { stuffScale: snapshot.stuff, anchorScale: snapshot.anchor, t: 0 };
    return { stuffScale: 1, anchorScale: 1, t: 0 };
  }

  if (layer === "solar" && (realDistances || selected)) return { stuffScale: 1, anchorScale: 1, t: 0 };
  return computePullback(layer, cameraDistance);
}

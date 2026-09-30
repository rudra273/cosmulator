import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { useSolarSystemStore } from "@/store/solarSystemStore";
import { KEY_LAYERS, routeBetween } from "@/lib/navigation";
import { LAYER_ORDER, innerOf, outerOf, type ViewScale } from "@/data/scales";

const RUNG_LABEL: Record<ViewScale, string> = {
  universe: "Observable Universe",
  cosmicWeb: "Cosmic Web",
  localGroup: "Local Group",
  galaxy: "Milky Way",
  galacticCenter: "Sgr A*",
  stellar: "Neighborhood",
  solar: "Solar System"
};

// Top (largest) to bottom; the Sgr A* branch hangs off the Milky Way.
type Rung = { layer: ViewScale; branch?: boolean };
const RUNGS: Rung[] = [...LAYER_ORDER].reverse().flatMap((layer): Rung[] =>
  layer === "galaxy" ? [{ layer }, { layer: "galacticCenter", branch: true }] : [{ layer }]);

/** Delay between hops so each handoff settles before the next begins. */
const HOP_GAP_MS = 120;
const FAST_HOP_MS = 1000;
const LAST_HOP_MS = 1800;

/**
 * Walks the store's `navTarget` one anchor-matched transition at a time, so
 * a jump from the Solar System to the Local Group still flies out through
 * the neighbourhood and the galaxy (faster hops on the way).
 */
function useNavigator() {
  const { navTarget, viewScale, transitionFrom } = useSolarSystemStore(useShallow((s) => ({ navTarget: s.navTarget, viewScale: s.viewScale, transitionFrom: s.transitionFrom })));
  useEffect(() => {
    if (!navTarget || transitionFrom !== null) return;
    const route = routeBetween(viewScale, navTarget);
    if (route.length === 0) {
      useSolarSystemStore.getState().navigateTo(null);
      return;
    }
    const timer = setTimeout(() => {
      const s = useSolarSystemStore.getState();
      if (s.transitionFrom !== null || s.navTarget !== navTarget) return;
      s.setTransitionMs(route.length > 1 ? FAST_HOP_MS : LAST_HOP_MS);
      const step = route[0];
      if (step.dir === "ascend") s.ascendScale();
      else s.descendScale(step.to);
    }, HOP_GAP_MS);
    return () => clearTimeout(timer);
  }, [navTarget, viewScale, transitionFrom]);
}

/** 1–7 jump to a layer; − / = step out / in; Esc closes a card. Ignored while typing. */
function useKeyboardNavigation() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
      const s = useSolarSystemStore.getState();
      // Esc closes a card (the Solar layer handles its own Esc).
      if (e.key === "Escape" && s.viewScale !== "solar") {
        s.closeInfoCard();
        s.selectStar(null);
        return;
      }
      const current = s.navTarget ?? s.viewScale;
      let target: ViewScale | null = null;
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= KEY_LAYERS.length) target = KEY_LAYERS[n - 1];
      else if (e.key === "-" || e.key === "_") target = outerOf(current);
      else if (e.key === "=" || e.key === "+") target = innerOf(current);
      if (!target) return;
      e.preventDefault();
      s.navigateTo(target);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

/**
 * Clickable ladder of every scale, left edge. The current layer is lit; a
 * pending destination pulses while the camera hops toward it.
 */
export default function ScaleLadder() {
  useNavigator();
  useKeyboardNavigation();
  const { viewScale, navTarget, navigateTo } = useSolarSystemStore(useShallow((s) => ({ viewScale: s.viewScale, navTarget: s.navTarget, navigateTo: s.navigateTo })));

  return (
    <nav className="scale-ladder" aria-label="Zoom level">
      {RUNGS.map(({ layer, branch }) => {
        const active = layer === viewScale;
        const pending = layer === navTarget && !active;
        const key = KEY_LAYERS.indexOf(layer) + 1;
        return (
          <button
            key={layer}
            className={`ladder-rung ${active ? "active" : ""} ${pending ? "pending" : ""} ${branch ? "branch" : ""}`}
            onClick={() => navigateTo(layer)}
            aria-current={active ? "true" : undefined}
            title={`${RUNG_LABEL[layer]} (key ${key})`}
          >
            <span className="ladder-dot" aria-hidden="true" />
            <span className="ladder-label">{RUNG_LABEL[layer]}</span>
          </button>
        );
      })}
    </nav>
  );
}

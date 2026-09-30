import { useEffect } from "react";
import { useSolarSystemStore } from "@/store/solarSystemStore";
import { parseViewParam, viewQuery } from "@/lib/navigation";
import { getStarById } from "@/data/stars";
import { ORBITING_BODIES } from "@/data/bodies";

/**
 * Shareable links: `?view=galaxy`, `?view=stellar&star=sirius`,
 * `?planet=mars`. Read once on load (opening straight at that layer, no
 * fly-in), then kept in step with the view via history.replaceState so the
 * address bar can be copied at any time.
 */
export function useUrlSync() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = parseViewParam(params.get("view"));
    const store = useSolarSystemStore.getState();
    if (view && view !== "solar") useSolarSystemStore.setState({ viewScale: view, transitionFrom: null, transitionDir: null });
    const star = params.get("star");
    if (view === "stellar" && star && getStarById(star)) store.selectStar(star);
    const planet = params.get("planet");
    if ((!view || view === "solar") && planet && ORBITING_BODIES.some((p) => p.id === planet)) store.selectPlanet(planet);

    const write = () => {
      const s = useSolarSystemStore.getState();
      if (s.transitionFrom !== null) return;
      const query = viewQuery(s.viewScale, { star: s.selectedStarId, planet: s.infoPanelOpen ? s.selectedPlanetId : null });
      if (query !== window.location.search) window.history.replaceState(window.history.state, "", window.location.pathname + query + window.location.hash);
    };
    write();
    return useSolarSystemStore.subscribe((s, prev) => {
      if (s.viewScale !== prev.viewScale || s.transitionFrom !== prev.transitionFrom || s.selectedStarId !== prev.selectedStarId
        || s.selectedPlanetId !== prev.selectedPlanetId || s.infoPanelOpen !== prev.infoPanelOpen) write();
    });
  }, []);
}

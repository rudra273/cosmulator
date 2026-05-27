import { create } from "zustand";

/**
 * Multi-scale view system. Each layer is rendered in its own coordinate space
 * (0–10k units, anchored at origin) so no layer ever fights float32 jitter.
 * Only one layer is actively rendered at any time; transitions cross-fade.
 */
export type ViewScale = "solar" | "stellar" | "galaxy" | "universe";

interface SolarSystemState {
  selectedPlanetId: string | null; // planet the camera is focused/locked on
  infoPanelOpen: boolean; // whether the detail popup is shown (decoupled from camera)
  freeMode: boolean; // free camera: nothing locked, pan/zoom anywhere
  timeScale: number; // multiplier (e.g. 1, 5, 15, 50)
  previousTimeScale: number; // to restore after pausing
  isPaused: boolean;
  showOrbits: boolean;
  showLabels: boolean;
  isRealisticScale: boolean;
  showAsteroidBelt: boolean;
  // Accumulated simulated time in days, offset from "now" (Date.now()).
  // Planets are rendered at their real positions for `Date.now() + elapsedTime`.
  // RESET snaps this back to 0 (and re-pauses).
  elapsedTime: number;
  // Which scale layer is active. Defaults to "solar" so the deployed
  // experience boots identically.
  viewScale: ViewScale;
  // The layer we are transitioning FROM. Non-null only while a cross-fade is
  // animating; LayerSwitcher reads this to know who to fade out.
  transitionFrom: ViewScale | null;
  // Direction of the in-flight transition. "ascend" = zoom-out (Solar→Stellar→
  // Galaxy→Universe), which runs the NASA-Eyes-style coordinated shrink +
  // camera dolly + fade. "descend" = click-down on a marker, which keeps the
  // crisp snap behaviour. null in steady state.
  transitionDir: "ascend" | "descend" | null;
  // Current camera distance from the active layer's origin (scene units).
  // Each layer's controls publishes this on every change; the HUD reads it
  // to render a friendly "X light-years" readout.
  cameraDistance: number;
  // Pull-back snapshot captured at the moment an ascend fires. usePullback
  // shrinks layer content live with the wheel as the user enters the
  // pull-back zone; when ascend fires, the layer is already partially
  // shrunk. useCrossfade reads these values and animates the transition
  // from THERE to the final SHRINK_FACTOR so the wheel-driven motion
  // continues smoothly into the timed transition (no snap-back to 1.0).
  // null in steady state and during descend.
  pullbackAtAscend: { stuff: number; anchor: number } | null;

  // Actions
  setSelectedPlanetId: (id: string | null) => void;
  selectPlanet: (id: string) => void; // focus camera + open the info popup
  closeInfoPanel: () => void; // hide popup only — camera stays where it is
  returnToOverview: () => void; // explicit "Solar System": fly back to overview
  enterFreeMode: () => void; // "Explore": unlock the camera to roam freely
  setTimeScale: (scale: number) => void;
  setPaused: (paused: boolean) => void;
  togglePaused: () => void;
  toggleOrbits: () => void;
  toggleLabels: () => void;
  toggleScale: () => void;
  toggleAsteroidBelt: () => void;
  updateTime: (deltaTimeSeconds: number) => void;
  resetTime: () => void; // snap to NOW + pause (returns to the boot state)
  // View-scale navigation.
  ascendScale: (pullback?: { stuff: number; anchor: number }) => void; // solar→galaxy, galaxy→universe (no-op at universe)
  descendScale: () => void; // universe→galaxy, galaxy→solar (no-op at solar)
  setViewScale: (s: ViewScale) => void; // direct jump (for breadcrumbs / tests)
  clearTransition: () => void; // LayerSwitcher calls this when fade completes
  setCameraDistance: (d: number) => void; // layers publish controls.getDistance() here
}

export const useSolarSystemStore = create<SolarSystemState>((set) => ({
  selectedPlanetId: null,
  infoPanelOpen: false,
  freeMode: false,
  // Boot paused at "now". Pressing a speed preset (or play) starts the
  // simulation forward; previousTimeScale is the speed play resumes at.
  timeScale: 0,
  previousTimeScale: 15.0,
  isPaused: true,
  showOrbits: true,
  showLabels: true,
  isRealisticScale: false,
  showAsteroidBelt: true,
  elapsedTime: 0.0,
  viewScale: "solar",
  transitionFrom: null,
  transitionDir: null,
  cameraDistance: 0,
  pullbackAtAscend: null,

  setSelectedPlanetId: (id) => set({ selectedPlanetId: id }),

  // Tap a planet (in the 3D scene, on a label, or in the bottom rail): focus
  // the camera on it AND open the detail popup. Always leaves free mode.
  selectPlanet: (id) => set({ selectedPlanetId: id, infoPanelOpen: true, freeMode: false }),

  // Closing the popup (✕) hides it but keeps the camera focused/locked on the
  // planet — it does NOT fly back to the overview.
  closeInfoPanel: () => set({ infoPanelOpen: false }),

  // The explicit "Solar System" action: clear the selection (camera flies back
  // to overview), close the popup, and leave free mode.
  returnToOverview: () => set({ selectedPlanetId: null, infoPanelOpen: false, freeMode: false }),

  // "Explore" / free mode: no planet selected and the camera is fully unlocked
  // so the user can pan and zoom anywhere in space.
  enterFreeMode: () => set({ selectedPlanetId: null, infoPanelOpen: false, freeMode: true }),

  setTimeScale: (scale) => set((state) => {
    const isPaused = scale === 0;
    return {
      timeScale: scale,
      isPaused,
      previousTimeScale: scale > 0 ? scale : state.previousTimeScale
    };
  }),

  setPaused: (paused) => set((state) => {
    if (paused) {
      return {
        isPaused: true,
        previousTimeScale: state.timeScale > 0 ? state.timeScale : state.previousTimeScale,
        timeScale: 0
      };
    } else {
      return {
        isPaused: false,
        timeScale: state.previousTimeScale
      };
    }
  }),

  togglePaused: () => set((state) => {
    if (state.isPaused) {
      return {
        isPaused: false,
        timeScale: state.previousTimeScale
      };
    } else {
      return {
        isPaused: true,
        previousTimeScale: state.timeScale > 0 ? state.timeScale : state.previousTimeScale,
        timeScale: 0
      };
    }
  }),

  toggleOrbits: () => set((state) => ({ showOrbits: !state.showOrbits })),
  
  toggleLabels: () => set((state) => ({ showLabels: !state.showLabels })),
  
  toggleScale: () => set((state) => ({ isRealisticScale: !state.isRealisticScale })),
  
  toggleAsteroidBelt: () => set((state) => ({ showAsteroidBelt: !state.showAsteroidBelt })),

  updateTime: (deltaTimeSeconds) => set((state) => {
    if (state.isPaused) return {};
    
    // deltaTimeSeconds is the actual render frame time (approx 1/60s)
    // We convert it to simulated days. 
    // In our simulation, 1 real second at 1x speed = 1 Earth day.
    // So simulated delta days = deltaTimeSeconds * timeScale
    const deltaDays = deltaTimeSeconds * state.timeScale;
    
    return {
      elapsedTime: state.elapsedTime + deltaDays
    };
  }),

  // RESET: snap back to NOW AND re-pause, so the user returns to the exact
  // boot state. Stash the running speed into previousTimeScale so pressing
  // play next resumes at the speed they were at.
  resetTime: () => set((state) => ({
    elapsedTime: 0.0,
    isPaused: true,
    previousTimeScale: state.timeScale > 0 ? state.timeScale : state.previousTimeScale,
    timeScale: 0
  })),

  // Scale-layer navigation. Setting transitionFrom = current layer arms the
  // cross-fade; LayerSwitcher clears it once the fade completes.
  // Order: solar → stellar → galaxy → universe.
  ascendScale: (pullback) => set((state) => {
    // Default snapshot is "no pre-shrink" — useful when ascend is fired
    // from somewhere without a live pull-back (e.g. tests). The Solar /
    // Stellar / Galaxy layers compute and pass their actual usePullback()
    // values so the 1800ms transition continues from where the wheel left
    // the geometry, instead of bouncing it back to natural size first.
    const snap = pullback ?? { stuff: 1, anchor: 1 };
    if (state.viewScale === "solar")
      return { viewScale: "stellar", transitionFrom: "solar", transitionDir: "ascend", pullbackAtAscend: snap };
    if (state.viewScale === "stellar")
      return { viewScale: "galaxy", transitionFrom: "stellar", transitionDir: "ascend", pullbackAtAscend: snap };
    if (state.viewScale === "galaxy")
      return { viewScale: "universe", transitionFrom: "galaxy", transitionDir: "ascend", pullbackAtAscend: snap };
    return {}; // already at universe — no-op
  }),
  descendScale: () => set((state) => {
    if (state.viewScale === "universe")
      return { viewScale: "galaxy", transitionFrom: "universe", transitionDir: "descend", pullbackAtAscend: null };
    if (state.viewScale === "galaxy")
      return { viewScale: "stellar", transitionFrom: "galaxy", transitionDir: "descend", pullbackAtAscend: null };
    if (state.viewScale === "stellar")
      return { viewScale: "solar", transitionFrom: "stellar", transitionDir: "descend", pullbackAtAscend: null };
    return {}; // already at solar — no-op
  }),
  setViewScale: (s) => set((state) =>
    s === state.viewScale
      ? {}
      : { viewScale: s, transitionFrom: state.viewScale, transitionDir: null, pullbackAtAscend: null }
  ),
  clearTransition: () => set({ transitionFrom: null, transitionDir: null, pullbackAtAscend: null }),
  setCameraDistance: (d) => set({ cameraDistance: d })
}));

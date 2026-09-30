import { create } from "zustand";
import { advanceClock, J2000_MS, MIN_SIMULATION_MS, MAX_SIMULATION_MS } from "../lib/simulation-time";
import { anchorBetween, innerOf, outerOf, type ViewScale } from "../data/scales";
import { computePullback } from "../lib/scale-transition";

/**
 * Multi-scale view system. Each layer is rendered in its own coordinate space
 * (0–10k units, anchored at origin) so no layer ever fights float32 jitter.
 * Only one layer is actively rendered at any time; transitions cross-fade.
 */
export type { ViewScale };

interface SolarSystemState {
  selectedPlanetId: string | null; // planet the camera is focused/locked on
  moonSystemId: string | null;
  outerSystem: boolean;
  exploreOuterSystem: () => void;
  exploreMoonSystem: (id: string) => void;
  realSizes: boolean;
  toggleSizes: () => void;
  infoPanelOpen: boolean; // whether the detail popup is shown (decoupled from camera)
  creditsOpen: boolean; // ABOUT / credits panel — NASA attribution + project info
  freeMode: boolean; // free camera: nothing locked, pan/zoom anywhere
  timeScale: number; // multiplier (e.g. 1, 5, 15, 50)
  previousTimeScale: number; // to restore after pausing
  isPaused: boolean;
  showOrbits: boolean;
  showLabels: boolean;
  isRealisticScale: boolean;
  showAsteroidBelt: boolean;
  // Stable epoch plus an offset; wall time is only read on initialization/reset.
  epochMs: number;
  clockInitialized: boolean;
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
  // The outgoing layer's pull-back shrink at the moment a transition fires.
  // During the transition the outgoing layer keeps exactly this shrink so the
  // handoff frame matches the last steady frame. null in steady state.
  pullbackSnapshot: { stuff: number; anchor: number } | null;
  // Stellar Neighborhood: the star whose info card is open (camera flies to it).
  selectedStarId: string | null;
  showConstellations: boolean;
  showDistanceRings: boolean;

  // Actions
  setSelectedPlanetId: (id: string | null) => void;
  selectPlanet: (id: string) => void; // focus camera + open the info popup
  closeInfoPanel: () => void; // hide popup only — camera stays where it is
  openCredits: () => void; // show the ABOUT / credits panel
  closeCredits: () => void; // hide the ABOUT / credits panel
  returnToOverview: () => void; // explicit "Solar System": fly back to overview
  enterFreeMode: () => void; // "Explore": unlock the camera to roam freely
  initializeClock: () => void;
  setSimulationDate: (timestamp: number) => void;
  reverseTime: () => void;
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
  descendScale: (to?: ViewScale) => void; // one step in (or into a branch such as galacticCenter)
  setViewScale: (s: ViewScale) => void; // direct jump (for breadcrumbs / tests)
  clearTransition: () => void; // LayerSwitcher calls this when fade completes
  setCameraDistance: (d: number) => void; // layers publish controls.getDistance() here
  selectStar: (id: string | null) => void;
  toggleConstellations: () => void;
  toggleDistanceRings: () => void;
}

export const useSolarSystemStore = create<SolarSystemState>((set) => ({
  selectedPlanetId: null,
  moonSystemId: null,
  outerSystem: false,
  exploreOuterSystem: () => set({ selectedPlanetId: null, moonSystemId: null, outerSystem: true, infoPanelOpen: false, freeMode: false }),
  realSizes: false,
  toggleSizes: () => set(s => ({ realSizes: !s.realSizes })),
  exploreMoonSystem: (id) => set({ selectedPlanetId: id, moonSystemId: id, infoPanelOpen: true, freeMode: true }),
  infoPanelOpen: false,
  creditsOpen: false,
  freeMode: false,
  // Boot paused at "now". Pressing a speed preset (or play) starts the
  // simulation forward; previousTimeScale is the speed play resumes at.
  timeScale: 0,
  previousTimeScale: 1 / 24,
  epochMs: J2000_MS,
  clockInitialized: false,
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
  pullbackSnapshot: null,
  selectedStarId: null,
  showConstellations: true,
  showDistanceRings: true,

  setSelectedPlanetId: (id) => set({ selectedPlanetId: id }),

  // Tap a planet (in the 3D scene, on a label, or in the bottom rail): focus
  // the camera on it AND open the detail popup. Enters Explore (free) mode so
  // after the fly-in the user can pan around the planet without OrbitControls
  // trying to recenter on the Sun. The follow-lock in CameraController still
  // keeps the planet centred under its own logic until the user manually
  // interacts with the camera. Also closes the credits panel — only one
  // foreground panel at a time.
  selectPlanet: (id) => set({
    moonSystemId: null,
    selectedPlanetId: id,
    infoPanelOpen: true,
    freeMode: true,
    creditsOpen: false
  }),

  // Closing the popup (✕) hides it but keeps the camera focused/locked on the
  // planet — it does NOT fly back to the overview.
  closeInfoPanel: () => set({ infoPanelOpen: false }),

  // ABOUT / credits panel — opening it closes any open planet info popup so
  // the two never overlap in the top-right card slot.
  openCredits: () => set({ creditsOpen: true, infoPanelOpen: false, selectedStarId: null }),
  closeCredits: () => set({ creditsOpen: false }),

  // The explicit "Solar System" action: clear the selection (camera flies back
  // to overview), close the popup, and leave free mode.
  returnToOverview: () => set({ outerSystem: false, moonSystemId: null, selectedPlanetId: null, infoPanelOpen: false, freeMode: false }),

  // "Explore" / free mode: no planet selected and the camera is fully unlocked
  // so the user can pan and zoom anywhere in space.
  enterFreeMode: () => set({ moonSystemId: null, selectedPlanetId: null, infoPanelOpen: false, freeMode: true }),

  initializeClock: () => set((state) => state.clockInitialized ? {} : {
    epochMs: Date.now(), clockInitialized: true, elapsedTime: 0
  }),
  setSimulationDate: (timestamp) => set((state) => {
    if (!Number.isFinite(timestamp) || timestamp < MIN_SIMULATION_MS || timestamp > MAX_SIMULATION_MS) return {};
    return { epochMs: timestamp, elapsedTime: 0, clockInitialized: true,
      isPaused: true, timeScale: 0,
      previousTimeScale: state.timeScale !== 0 ? state.timeScale : state.previousTimeScale };
  }),
  reverseTime: () => set((state) => ({
    timeScale: -state.timeScale,
    previousTimeScale: -(state.timeScale || state.previousTimeScale)
  })),
  setTimeScale: (scale) => set((state) => {
    const isPaused = scale === 0;
    return {
      timeScale: scale,
      isPaused,
      previousTimeScale: scale !== 0 ? scale : state.previousTimeScale
    };
  }),

  setPaused: (paused) => set((state) => {
    if (paused) {
      return {
        isPaused: true,
        previousTimeScale: state.timeScale !== 0 ? state.timeScale : state.previousTimeScale,
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
        previousTimeScale: state.timeScale !== 0 ? state.timeScale : state.previousTimeScale,
        timeScale: 0
      };
    }
  }),

  toggleOrbits: () => set((state) => ({ showOrbits: !state.showOrbits })),
  
  toggleLabels: () => set((state) => ({ showLabels: !state.showLabels })),
  
  toggleScale: () => set((state) => ({ isRealisticScale: !state.isRealisticScale })),
  
  toggleAsteroidBelt: () => set((state) => ({ showAsteroidBelt: !state.showAsteroidBelt })),

  updateTime: (deltaTimeSeconds) => set((state) => {
    if (state.isPaused || !state.clockInitialized || !Number.isFinite(deltaTimeSeconds) || deltaTimeSeconds < 0) return {};
    const next = advanceClock(state.epochMs, state.elapsedTime, deltaTimeSeconds, state.timeScale);
    return { elapsedTime: next.elapsedTime,
      ...(next.atLimit ? { isPaused: true, timeScale: 0, previousTimeScale: state.timeScale } : {}) };
  }),

  // RESET: snap back to NOW AND re-pause, so the user returns to the exact
  // boot state. Stash the running speed into previousTimeScale so pressing
  // play next resumes at the speed they were at.
  resetTime: () => set((state) => ({
    epochMs: Date.now(),
    clockInitialized: true,
    elapsedTime: 0.0,
    isPaused: true,
    previousTimeScale: state.timeScale !== 0 ? state.timeScale : state.previousTimeScale,
    timeScale: 0
  })),

  // Scale-layer navigation. Setting transitionFrom = current layer arms the
  // cross-fade; LayerSwitcher clears it once the fade completes.
  // Order: solar → stellar → galaxy → universe.
  // Both ignore requests while a transition is in flight: the camera is
  // mid-flight between two coordinate systems, and starting another handoff
  // from there would leave layers mis-scaled.
  ascendScale: (pullback) => set((state) => {
    const next = outerOf(state.viewScale);
    if (!next || state.transitionFrom !== null) return {};
    return { viewScale: next, transitionFrom: state.viewScale, transitionDir: "ascend", pullbackSnapshot: pullback ?? { stuff: 1, anchor: 1 }, selectedStarId: null };
  }),
  descendScale: (to) => set((state) => {
    const next = to ?? innerOf(state.viewScale);
    if (!next || state.transitionFrom !== null || anchorBetween(next, state.viewScale)?.outer !== state.viewScale) return {};
    const p = computePullback(state.viewScale, state.cameraDistance);
    return { viewScale: next, transitionFrom: state.viewScale, transitionDir: "descend", pullbackSnapshot: { stuff: p.stuffScale, anchor: p.anchorScale }, selectedStarId: null };
  }),
  setViewScale: (s) => set((state) =>
    s === state.viewScale
      ? {}
      : { viewScale: s, transitionFrom: state.viewScale, transitionDir: null, pullbackSnapshot: null, selectedStarId: null }
  ),
  clearTransition: () => set({ transitionFrom: null, transitionDir: null, pullbackSnapshot: null }),
  setCameraDistance: (d) => set({ cameraDistance: d }),
  // One foreground card at a time: a star card closes the credits panel.
  selectStar: (id) => set(id ? { selectedStarId: id, creditsOpen: false } : { selectedStarId: null }),
  toggleConstellations: () => set((s) => ({ showConstellations: !s.showConstellations })),
  toggleDistanceRings: () => set((s) => ({ showDistanceRings: !s.showDistanceRings }))
}));

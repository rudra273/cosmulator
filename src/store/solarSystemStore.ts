import { create } from "zustand";

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
  // "Real Positions" mode: planets snap to their actual heliocentric positions
  // for `Date.now() + elapsedTime` and orbits use their real tilts. When OFF,
  // deployed behavior is preserved verbatim. Toggling either direction resets
  // `elapsedTime` to 0 so each mode starts at a clean reference point.
  realPositionsMode: boolean;
  elapsedTime: number;
  // In OFF mode: days since simulation start.
  // In ON mode: days offset from today (0 = now). The TODAY button snaps it
  // back to 0. The store doesn't care which interpretation applies; consumers
  // (UI label, math layer) read `realPositionsMode` to decide.

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
  toggleRealPositions: () => void; // also resets elapsedTime (each mode starts clean)
  updateTime: (deltaTimeSeconds: number) => void;
  resetTime: () => void;
}

export const useSolarSystemStore = create<SolarSystemState>((set) => ({
  selectedPlanetId: null,
  infoPanelOpen: false,
  freeMode: false,
  timeScale: 15.0, // Default to a moderate speed so movement is visible
  previousTimeScale: 15.0,
  isPaused: false,
  showOrbits: true,
  showLabels: true,
  isRealisticScale: false,
  showAsteroidBelt: true,
  realPositionsMode: false,
  elapsedTime: 0.0,

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

  // Flip Real Positions mode AND reset elapsedTime to 0 — each mode starts at
  // a clean reference point (ON → today; OFF → YEAR 0/DAY 0).
  toggleRealPositions: () =>
    set((state) => ({ realPositionsMode: !state.realPositionsMode, elapsedTime: 0.0 })),


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

  resetTime: () => set({ elapsedTime: 0.0 })
}));

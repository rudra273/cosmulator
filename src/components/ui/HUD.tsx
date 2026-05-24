import { useSolarSystemStore } from "@/store/solarSystemStore";
import TimeControls from "./TimeControls";
import PlanetSelector from "./PlanetSelector";
import PlanetInfoPanel from "./PlanetInfoPanel";

export default function HUD() {
  const {
    showOrbits,
    showLabels,
    isRealisticScale,
    showAsteroidBelt,
    toggleOrbits,
    toggleLabels,
    toggleScale,
    toggleAsteroidBelt,
    setSelectedPlanetId
  } = useSolarSystemStore();

  return (
    <div
      className="hud-root"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none", // Allows clicking through HUD onto the WebGL Canvas
        zIndex: 5,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between"
      }}
    >
      {/* ================= TOP SECTION ================= */}
      {/* No pointer-events here — only the brand + toggle group below claim
          clicks, so empty space passes touches through to the 3D scene. */}
      <div className="hud-top">
        {/* Branding header */}
        <div
          onClick={() => setSelectedPlanetId(null)}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            fontFamily: "'Orbitron', sans-serif",
            cursor: "pointer",
            pointerEvents: "auto"
          }}
        >
          <h1
            className="brand-title"
            style={{
              fontWeight: 900,
              letterSpacing: "3px",
              background: "linear-gradient(45deg, #00f0ff, #ffb700)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              margin: 0
            }}
          >
            COSMULATOR
          </h1>
          <span
            className="brand-sub"
            style={{
              fontSize: "8px",
              color: "var(--text-muted)",
              letterSpacing: "2px",
              textTransform: "uppercase"
            }}
          >
            Interactive Space Laboratory
          </span>
        </div>

        {/* View Option Switches */}
        <div className="glass-panel toggle-bar" style={{ pointerEvents: "auto" }}>
          <button
            className={`hud-btn ${showOrbits ? "active" : ""}`}
            onClick={toggleOrbits}
            style={{ fontSize: "9px" }}
          >
            Orbits
          </button>

          <button
            className={`hud-btn ${showLabels ? "active" : ""}`}
            onClick={toggleLabels}
            style={{ fontSize: "9px" }}
          >
            Labels
          </button>

          <button
            className={`hud-btn ${showAsteroidBelt ? "active" : ""}`}
            onClick={toggleAsteroidBelt}
            style={{ fontSize: "9px" }}
          >
            Asteroids
          </button>

          <button
            className={`hud-btn ${isRealisticScale ? "active" : ""}`}
            onClick={toggleScale}
            style={{
              fontSize: "9px",
              borderColor: isRealisticScale ? "var(--neon-gold)" : "rgba(255,255,255,0.08)",
              color: isRealisticScale ? "var(--neon-gold)" : "var(--text-secondary)"
            }}
          >
            Realistic Scale
          </button>
        </div>
      </div>

      {/* ================= INFO PANEL ================= */}
      {/* Positions itself (right card on desktop, bottom sheet on mobile) and
          claims its own pointer-events, so no invisible wrapper blocks touch. */}
      <PlanetInfoPanel />

      {/* ================= BOTTOM BAR SECTION ================= */}
      <div className="hud-bottom">
        {/* Horizontal Planet Navigation */}
        <div style={{ flex: 1, pointerEvents: "auto", minWidth: 0 }}>
          <PlanetSelector />
        </div>

        {/* Time Simulation speed controls */}
        <div className="time-panel" style={{ pointerEvents: "auto" }}>
          <TimeControls />
        </div>
      </div>
    </div>
  );
}

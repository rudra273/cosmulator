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
        justifyContent: "space-between",
        padding: "20px"
      }}
    >
      {/* ================= TOP SECTION ================= */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          width: "100%",
          pointerEvents: "auto" // Re-enable clicks for buttons/menus
        }}
      >
        {/* Branding header */}
        <div
          onClick={() => setSelectedPlanetId(null)}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            fontFamily: "'Orbitron', sans-serif",
            cursor: "pointer"
          }}
        >
          <h1
            style={{
              fontSize: "20px",
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

        {/* View Option Switches Grid */}
        <div
          className="glass-panel"
          style={{
            display: "flex",
            gap: "6px",
            padding: "6px"
          }}
        >
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

      {/* ================= MIDDLE SECTION (INFO PANEL) ================= */}
      {/* Slides in from the right when selected. Content handles pointerEvents. */}
      <div style={{ position: "absolute", top: "80px", right: "20px", pointerEvents: "auto" }}>
        <PlanetInfoPanel />
      </div>

      {/* ================= BOTTOM BAR SECTION ================= */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          width: "100%",
          pointerEvents: "auto",
          gap: "20px",
          flexWrap: "wrap"
        }}
      >
        {/* Horizontal Planet Navigation */}
        <div style={{ flex: 1 }}>
          <PlanetSelector />
        </div>

        {/* Time Simulation speed controls */}
        <div style={{ minWidth: "320px" }}>
          <TimeControls />
        </div>
      </div>
    </div>
  );
}

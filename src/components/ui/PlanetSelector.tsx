import { useSolarSystemStore } from "@/store/solarSystemStore";
import { PLANETS } from "@/data/planets";

export default function PlanetSelector() {
  const { selectedPlanetId, freeMode, selectPlanet, returnToOverview, enterFreeMode } =
    useSolarSystemStore();

  const overviewActive = selectedPlanetId === null && !freeMode;

  return (
    <div
      className="glass-panel planet-rail"
      style={{
        fontFamily: "'Orbitron', sans-serif"
      }}
    >
      {/* Free / Explore mode — unlock the camera to roam anywhere */}
      <button
        onClick={() => enterFreeMode()}
        className={`hud-btn ${freeMode ? "active" : ""}`}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 14px",
          fontSize: "10px",
          flexShrink: 0,
          borderColor: freeMode ? "var(--neon-gold)" : "rgba(255,255,255,0.08)",
          color: freeMode ? "var(--neon-gold)" : "var(--text-secondary)"
        }}
      >
        <span style={{ fontSize: "12px", lineHeight: 1 }}>✷</span>
        EXPLORE
      </button>

      {/* Vertical divider */}
      <div style={{ width: "1px", height: "20px", background: "rgba(255,255,255,0.08)", margin: "0 4px", flexShrink: 0 }} />

      {/* Sun / Overview Selector */}
      <button
        onClick={() => returnToOverview()}
        className={`hud-btn ${overviewActive ? "active" : ""}`}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 14px",
          fontSize: "10px",
          flexShrink: 0,
          color: overviewActive ? "#ffffff" : "var(--text-secondary)"
        }}
      >
        <span
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: "#ffb700",
            boxShadow: "0 0 8px #ffb700"
          }}
        />
        SOLAR SYSTEM
      </button>

      {/* Vertical divider */}
      <div style={{ width: "1px", height: "20px", background: "rgba(255,255,255,0.08)", margin: "0 4px", flexShrink: 0 }} />

      {/* Planets selector */}
      {PLANETS.map((planet) => {
        const isSelected = selectedPlanetId === planet.id;
        return (
          <button
            key={planet.id}
            onClick={() => selectPlanet(planet.id)}
            className={`hud-btn ${isSelected ? "active" : ""}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 14px",
              fontSize: "10px",
              flexShrink: 0,
              color: isSelected ? "#ffffff" : "var(--text-secondary)"
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: planet.baseColor,
                boxShadow: `0 0 6px ${planet.baseColor}`,
                transition: "transform 0.2s ease"
              }}
            />
            {planet.name}
          </button>
        );
      })}
    </div>
  );
}

import { useSolarSystemStore } from "@/store/solarSystemStore";
import { PLANETS } from "@/data/planets";

export default function PlanetSelector() {
  const { selectedPlanetId, setSelectedPlanetId } = useSolarSystemStore();

  return (
    <div
      className="glass-panel planet-rail"
      style={{
        fontFamily: "'Orbitron', sans-serif"
      }}
    >
      {/* Sun / Overview Selector */}
      <button
        onClick={() => setSelectedPlanetId(null)}
        className={`hud-btn ${selectedPlanetId === null ? "active" : ""}`}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 14px",
          fontSize: "10px",
          flexShrink: 0,
          color: selectedPlanetId === null ? "#ffffff" : "var(--text-secondary)"
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
        SYSTEM
      </button>

      {/* Vertical divider */}
      <div style={{ width: "1px", height: "20px", background: "rgba(255,255,255,0.08)", margin: "0 4px", flexShrink: 0 }} />

      {/* Planets selector */}
      {PLANETS.map((planet) => {
        const isSelected = selectedPlanetId === planet.id;
        return (
          <button
            key={planet.id}
            onClick={() => setSelectedPlanetId(planet.id)}
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

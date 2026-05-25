import { useRef, useState } from "react";
import { useSolarSystemStore } from "@/store/solarSystemStore";
import { getBodyById } from "@/data/bodies";

// Drag further than this (px) and the sheet dismisses on release.
const DISMISS_THRESHOLD = 90;

export default function PlanetInfoPanel() {
  const { selectedPlanetId, infoPanelOpen, closeInfoPanel } = useSolarSystemStore();

  // Live vertical drag offset for swipe-to-dismiss (mobile bottom sheet).
  const [dragY, setDragY] = useState(0);
  const dragStartY = useRef<number | null>(null);

  // Retrieve current active body (planet, star, or none).
  const isSun = selectedPlanetId === "sun";
  const data: any = getBodyById(selectedPlanetId);

  // Show only while the popup is open. Dismissing it leaves the camera
  // focused on the planet.
  if (!infoPanelOpen || !selectedPlanetId || !data) return null;

  const onGrabStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
  };

  const onGrabMove = (e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    const delta = e.touches[0].clientY - dragStartY.current;
    // Only allow dragging downward; ignore upward pulls.
    setDragY(Math.max(0, delta));
  };

  const onGrabEnd = () => {
    if (dragY > DISMISS_THRESHOLD) {
      closeInfoPanel();
    }
    setDragY(0);
    dragStartY.current = null;
  };

  const isDragging = dragStartY.current !== null;

  return (
    <div
      className="glass-panel info-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        pointerEvents: "auto",
        borderTop: `2px solid ${data.baseColor}`,
        // While dragging, follow the finger and disable the entry animation so
        // the inline transform takes effect; snap back smoothly on release.
        ...(dragY > 0
          ? { transform: `translateY(${dragY}px)`, animation: "none" }
          : {}),
        transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.16,1,0.3,1)"
      }}
    >
      {/* Header / grab area — swipe down here to dismiss the sheet */}
      <div
        className="info-panel-grab"
        onTouchStart={onGrabStart}
        onTouchMove={onGrabMove}
        onTouchEnd={onGrabEnd}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 24px 16px 24px",
          fontFamily: "'Orbitron', sans-serif",
          cursor: "grab"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              backgroundColor: data.baseColor,
              boxShadow: `0 0 10px ${data.baseColor}`
            }}
          />
          <h2 style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase" }}>
            {data.name}
          </h2>
        </div>

        {/* Close button — desktop only. On mobile the sheet is swiped down. */}
        <button
          className="info-panel-close"
          onClick={() => closeInfoPanel()}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-secondary)",
            fontSize: "16px",
            cursor: "pointer",
            padding: "4px",
            transition: "color 0.2s"
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
        >
          ✕
        </button>
      </div>

      <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "0 24px" }} />

      {/* Main Scrollable Content */}
      <div
        className="info-panel-scroll"
        style={{
          padding: "16px 24px 24px 24px",
          display: "flex",
          flexDirection: "column",
          gap: "20px"
        }}
      >
        {/* Description paragraph */}
        <p 
          style={{ 
            fontSize: "13px", 
            lineHeight: "1.6", 
            color: "var(--text-secondary)", 
            fontWeight: 400 
          }}
        >
          {data.description}
        </p>

        {/* Fact Table */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <h3 
            style={{ 
              fontSize: "10px", 
              fontFamily: "'Orbitron', sans-serif", 
              color: "var(--text-muted)", 
              letterSpacing: "1.5px", 
              textTransform: "uppercase" 
            }}
          >
            ASTRONOMICAL DATA
          </h3>
          
          <div 
            style={{ 
              display: "flex", 
              flexDirection: "column", 
              gap: "8px",
              background: "rgba(0,0,0,0.2)",
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.03)"
            }}
          >
            {/* Fact rows */}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
              <span style={{ color: "var(--text-secondary)" }}>Equatorial Radius</span>
              <span style={{ fontWeight: 600 }}>{Number(data.radius).toLocaleString()} km</span>
            </div>
            
            {"distance" in data && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Distance from Sun</span>
                <span style={{ fontWeight: 600 }}>{data.distance} AU <span style={{fontSize: '9px', color: 'var(--text-muted)'}}>({Math.round(data.distance * 149.6)}M km)</span></span>
              </div>
            )}
            
            {"orbitalPeriod" in data && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Orbital Year</span>
                <span style={{ fontWeight: 600 }}>{data.orbitalPeriod} Earth Days</span>
              </div>
            )}
            
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
              <span style={{ color: "var(--text-secondary)" }}>Rotation Period (Day)</span>
              <span style={{ fontWeight: 600 }}>
                {Math.abs(Number(data.rotationPeriod)) < 24 
                  ? `${Math.abs(Number(data.rotationPeriod))} hours` 
                  : `${Math.round(Math.abs(Number(data.rotationPeriod)) / 2.4) / 10} Earth Days`
                }
                {Number(data.rotationPeriod) < 0 ? " (Retrograde)" : ""}
              </span>
            </div>

            {"axialTilt" in data && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Axial Tilt</span>
                <span style={{ fontWeight: 600 }}>{data.axialTilt}°</span>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
              <span style={{ color: "var(--text-secondary)" }}>Mass (Earth = 1)</span>
              <span style={{ fontWeight: 600 }}>
                {isSun ? "333,000" : `${data.mass} × 10²⁴ kg`}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
              <span style={{ color: "var(--text-secondary)" }}>Surface Temp</span>
              <span style={{ fontWeight: 600, color: "var(--neon-cyan)" }}>{data.temperature}</span>
            </div>
          </div>
        </div>

        {/* Fun Facts section */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <h3 
            style={{ 
              fontSize: "10px", 
              fontFamily: "'Orbitron', sans-serif", 
              color: "var(--text-muted)", 
              letterSpacing: "1.5px", 
              textTransform: "uppercase" 
            }}
          >
            DID YOU KNOW?
          </h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {data.funFacts.map((fact: string, index: number) => (
              <div 
                key={index} 
                style={{ 
                  fontSize: "12px", 
                  lineHeight: "1.5",
                  background: "rgba(0, 240, 255, 0.03)",
                  borderLeft: `2px solid ${data.baseColor}`,
                  padding: "10px 14px",
                  borderRadius: "0 8px 8px 0"
                }}
              >
                {fact}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

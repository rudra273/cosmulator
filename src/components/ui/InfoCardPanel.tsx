import { useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useSolarSystemStore } from "@/store/solarSystemStore";

const DISMISS_THRESHOLD = 90;

/**
 * Fact card for galaxies, clusters, nebulae and S-stars — the things that
 * used to explain themselves only through hover tooltips, which touch
 * screens never show. Same slot as the planet and star panels (right card
 * on desktop, bottom sheet on phones); only one is open at a time.
 */
export default function InfoCardPanel() {
  const { card, close } = useSolarSystemStore(useShallow((s) => ({ card: s.infoCard, close: s.closeInfoCard })));
  const [dragY, setDragY] = useState(0);
  const dragStartY = useRef<number | null>(null);
  if (!card) return null;
  const color = card.color ?? "var(--neon-cyan)";

  return (
    <div
      className="glass-panel info-panel"
      role="dialog"
      aria-label={card.title}
      style={{
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        pointerEvents: "auto",
        borderTop: `2px solid ${color}`,
        ...(dragY > 0 ? { transform: `translateY(${dragY}px)`, animation: "none" } : {})
      }}
    >
      <div
        className="info-panel-grab"
        onTouchStart={(e) => { dragStartY.current = e.touches[0].clientY; }}
        onTouchMove={(e) => { if (dragStartY.current !== null) setDragY(Math.max(0, e.touches[0].clientY - dragStartY.current)); }}
        onTouchEnd={() => { if (dragY > DISMISS_THRESHOLD) close(); setDragY(0); dragStartY.current = null; }}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, padding: "20px 24px 14px 24px", fontFamily: "'Orbitron', sans-serif", cursor: "grab" }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: "9px", letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--text-muted)" }}>{card.kind}</span>
          <h2 style={{ fontSize: "18px", fontWeight: 800, letterSpacing: "1.2px", textTransform: "uppercase" }}>{card.title}</h2>
        </div>
        <button
          aria-label="Close details"
          className="info-panel-close"
          onClick={close}
          style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: "16px", cursor: "pointer", padding: "4px" }}
        >
          ✕
        </button>
      </div>
      <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "0 24px" }} />
      <div className="info-panel-scroll" style={{ padding: "16px 24px 24px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {card.body && <p style={{ fontSize: "13px", lineHeight: "1.6", color: "var(--text-secondary)" }}>{card.body}</p>}
        {card.facts.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", background: "rgba(0,0,0,0.2)", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.03)" }}>
            {card.facts.map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: "12px" }}>
                <span style={{ color: "var(--text-secondary)" }}>{label}</span>
                <span style={{ fontWeight: 600, textAlign: "right" }}>{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

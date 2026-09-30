import { useShallow } from "zustand/react/shallow";
import { useRef, useState } from "react";
import { useSolarSystemStore } from "@/store/solarSystemStore";
import { getStarById } from "@/data/stars";
import { SUN_ABSOLUTE_MAGNITUDE } from "@/lib/stellar-coords";
import { PLANET_SYSTEMS } from "@/data/exoplanets";
import SystemDiagram from "./SystemDiagram";

const DISMISS_THRESHOLD = 90;

const row = (label: string, value: React.ReactNode) => (
  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: "12px" }}>
    <span style={{ color: "var(--text-secondary)" }}>{label}</span>
    <span style={{ fontWeight: 600, textAlign: "right" }}>{value}</span>
  </div>
);

const heading = (text: string) => (
  <h3 style={{ fontSize: "10px", fontFamily: "'Orbitron', sans-serif", color: "var(--text-muted)", letterSpacing: "1.5px", textTransform: "uppercase" }}>
    {text}
  </h3>
);

function formatNumber(n: number): string {
  if (n >= 100) return Math.round(n).toLocaleString();
  if (n >= 10) return n.toFixed(1);
  if (n >= 0.01) return n.toFixed(2);
  return n.toExponential(1);
}

/** Two discs to scale; when the star is huge the Sun becomes a dot. */
function SizeComparison({ radius, color }: { radius: number; color: string }) {
  const max = 54;
  const big = Math.max(radius, 1);
  const sunR = Math.max(1.2, (1 / big) * max);
  const starR = Math.max(1.2, (radius / big) * max);
  return (
    <svg viewBox="0 0 240 120" width="100%" height="120" role="img" aria-label={`Size compared with the Sun: ${formatNumber(radius)} times`}>
      <circle cx={70} cy={60} r={sunR} fill="#ffe28a" />
      <text x={70} y={116} textAnchor="middle" fontSize="9" fill="var(--text-muted)">SUN</text>
      <circle cx={170} cy={60} r={starR} fill={color} />
      <text x={170} y={116} textAnchor="middle" fontSize="9" fill="var(--text-muted)">{formatNumber(radius)}× WIDER</text>
    </svg>
  );
}

/**
 * Detail card for a star in the Stellar Neighborhood. Shares the info-panel
 * placement (right card on desktop, bottom sheet on mobile).
 */
export default function StarInfoPanel() {
  const { viewScale, selectedStarId, selectStar } = useSolarSystemStore(
    useShallow((s) => ({ viewScale: s.viewScale, selectedStarId: s.selectedStarId, selectStar: s.selectStar }))
  );
  const [dragY, setDragY] = useState(0);
  const dragStartY = useRef<number | null>(null);
  const star = getStarById(selectedStarId);
  if (viewScale !== "stellar" || !star) return null;

  const system = PLANET_SYSTEMS[star.id];
  // Visible-light luminosity from magnitudes; the bolometric value is used
  // where known (red dwarfs shine mostly in infrared).
  const visualLuminosity = Math.pow(10, (SUN_ABSOLUTE_MAGNITUDE - star.absoluteMag) / 2.5);
  const lightLeft = new Date().getFullYear() - Math.round(star.distanceLy);
  const close = () => selectStar(null);

  return (
    <div
      className="glass-panel info-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        pointerEvents: "auto",
        borderTop: `2px solid ${star.color}`,
        ...(dragY > 0 ? { transform: `translateY(${dragY}px)`, animation: "none" } : {})
      }}
    >
      <div
        className="info-panel-grab"
        onTouchStart={(e) => { dragStartY.current = e.touches[0].clientY; }}
        onTouchMove={(e) => { if (dragStartY.current !== null) setDragY(Math.max(0, e.touches[0].clientY - dragStartY.current)); }}
        onTouchEnd={() => { if (dragY > DISMISS_THRESHOLD) close(); setDragY(0); dragStartY.current = null; }}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px 16px 24px", fontFamily: "'Orbitron', sans-serif", cursor: "grab" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: star.color, boxShadow: `0 0 10px ${star.color}` }} />
          <h2 style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase" }}>{star.name}</h2>
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

      <div className="info-panel-scroll" style={{ padding: "16px 24px 24px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>
        <p style={{ fontSize: "13px", lineHeight: "1.6", color: "var(--text-secondary)" }}>{star.description}</p>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {heading("Star data")}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", background: "rgba(0,0,0,0.2)", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.03)" }}>
            {row("Distance", `${star.distanceLy.toLocaleString()} light-years`)}
            {row("Light you see left it", lightLeft > 0 ? `around ${lightLeft}` : `around ${-lightLeft + 1} BC`)}
            {row("Constellation", star.constellation)}
            {row("Spectral type", star.spectralClass)}
            {row("Brightness from Earth", `magnitude ${star.apparentMag.toFixed(2)}`)}
            {system
              ? row("Luminosity (all light)", `${formatNumber(system.luminositySolar)} × Sun`)
              : row("Visible luminosity", `${formatNumber(visualLuminosity)} × Sun`)}
            {star.radiusSolar !== undefined && row("Radius", `${formatNumber(star.radiusSolar)} × Sun`)}
          </div>
        </div>

        {star.radiusSolar !== undefined && (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {heading("Size vs the Sun")}
            <SizeComparison radius={star.radiusSolar} color={star.color} />
          </div>
        )}

        {system && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {heading("Planetary system")}
            <SystemDiagram system={system} color={star.color} />
          </div>
        )}

        {star.planets && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {heading("Known planets")}
            {star.planets.map((p) => (
              <div key={p} style={{ fontSize: "12px", lineHeight: "1.5", background: "rgba(0, 240, 255, 0.03)", borderLeft: `2px solid ${star.color}`, padding: "10px 14px", borderRadius: "0 8px 8px 0" }}>
                {p}
              </div>
            ))}
          </div>
        )}

        <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
          Directions are real; distances in this view are log-compressed so near and far stars fit together. Star sizes show luminosity, not physical size.
        </p>
      </div>
    </div>
  );
}

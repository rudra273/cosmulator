import { useEffect, useState } from "react";
import { useSolarSystemStore } from "@/store/solarSystemStore";
import { MS_PER_DAY } from "@/lib/orbital-mechanics";

// "26 MAY 2026  14:32" — concise NASA-Eyes-style date + minute clock.
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
function formatRealDateTime(elapsedDays: number): string {
  const d = new Date(Date.now() + elapsedDays * MS_PER_DAY);
  const day = d.getDate();
  const month = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${year}  ${hh}:${mm}`;
}

export default function TimeControls() {
  const {
    timeScale,
    isPaused,
    elapsedTime,
    setTimeScale,
    togglePaused,
    resetTime
  } = useSolarSystemStore();

  // Keep the displayed clock alive even when the sim is paused. elapsedTime
  // isn't advancing, but Date.now() is — re-render every 30s (well below the
  // minute resolution we're rendering) so HH:MM ticks correctly. Cheap.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const realDateTime = formatRealDateTime(elapsedTime);
  const offsetDays = Math.round(elapsedTime);
  // RESET visually muted when we're already in the boot state (NOW + paused).
  const atBoot = Math.abs(elapsedTime) < 0.001 && isPaused;

  const speedOptions = [
    { value: 1.0, label: "1x" },
    { value: 5.0, label: "5x" },
    { value: 20.0, label: "20x" },
    { value: 100.0, label: "100x" },
    { value: 400.0, label: "400x" }
  ];

  return (
    <div
      className="glass-panel time-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        padding: "16px 20px",
        fontFamily: "'Orbitron', sans-serif"
      }}
    >
      {/* Real-time readout: live calendar + clock, plus +Nd offset when scrubbed. */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "10px", color: "var(--text-secondary)", letterSpacing: "1px" }}>
          REAL TIME
        </span>
        <div
          style={{
            fontSize: "13px",
            fontWeight: 700,
            color: "var(--neon-gold)",
            textShadow: "0 0 8px rgba(255, 183, 0, 0.4)"
          }}
        >
          {realDateTime}
          {offsetDays !== 0 && (
            <span style={{ marginLeft: "8px", opacity: 0.7 }}>+{offsetDays}d</span>
          )}
        </div>
      </div>

      <div style={{ height: "1px", background: "rgba(255,255,255,0.06)" }} />

      {/* Speed Controls Grid */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>

        {/* Play/Pause Button */}
        <button
          className={`hud-btn ${isPaused ? "active" : ""}`}
          onClick={togglePaused}
          style={{
            padding: "8px",
            aspectRatio: "1/1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "36px",
            height: "36px",
            fontSize: "14px",
            borderRadius: "50%",
            background: isPaused ? "rgba(255, 183, 0, 0.15)" : "rgba(27, 32, 53, 0.5)",
            borderColor: isPaused ? "var(--neon-gold)" : "rgba(255,255,255,0.08)",
            color: isPaused ? "var(--neon-gold)" : "var(--text-secondary)"
          }}
        >
          {isPaused ? "▶" : "⏸"}
        </button>

        {/* RESET — snap back to NOW and re-pause (returns to boot state).
            Visually muted while already there. */}
        <button
          onClick={resetTime}
          className="hud-btn"
          disabled={atBoot}
          style={{
            padding: "8px 10px",
            fontSize: "9px",
            minWidth: "52px",
            justifyContent: "center",
            textAlign: "center",
            borderColor: atBoot ? "rgba(255,255,255,0.06)" : "var(--neon-gold)",
            color: atBoot ? "var(--text-muted)" : "var(--neon-gold)",
            cursor: atBoot ? "default" : "pointer",
            opacity: atBoot ? 0.55 : 1
          }}
        >
          RESET
        </button>

        {/* Speed presets — fill remaining width so they distribute evenly
            when the panel is full-width on mobile. */}
        <div style={{ display: "flex", gap: "4px", flex: 1 }}>
          {speedOptions.map((opt) => {
            const isActive = !isPaused && timeScale === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setTimeScale(opt.value)}
                className={`hud-btn ${isActive ? "active" : ""}`}
                style={{
                  padding: "8px 12px",
                  fontSize: "10px",
                  minWidth: "48px",
                  flex: 1,
                  justifyContent: "center",
                  textAlign: "center"
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
}

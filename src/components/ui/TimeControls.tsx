import { useSolarSystemStore } from "@/store/solarSystemStore";
import { MS_PER_DAY } from "@/lib/orbital-mechanics";

// "26 MAY 2026" — concise NASA-Eyes-style real date.
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
function formatRealDate(elapsedDays: number): string {
  const d = new Date(Date.now() + elapsedDays * MS_PER_DAY);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export default function TimeControls() {
  const {
    timeScale,
    isPaused,
    elapsedTime,
    realPositionsMode,
    setTimeScale,
    togglePaused,
    resetTime
  } = useSolarSystemStore();

  // Stylized mode: relative simulation counter (unchanged from deployed app).
  const years = Math.floor(elapsedTime / 365.25);
  const days = Math.floor(elapsedTime % 365.25);

  // Real-positions mode: absolute calendar date + offset hint ("+Nd").
  const realDate = realPositionsMode ? formatRealDate(elapsedTime) : null;
  const offsetDays = Math.round(elapsedTime);
  // Disable visually when scrub is at 0 — "already at today".
  const atToday = Math.abs(elapsedTime) < 0.001;

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
      {/* Calendar / clock readout — swaps between stylized and real-date modes. */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "10px", color: "var(--text-secondary)", letterSpacing: "1px" }}>
          {realPositionsMode ? "REAL TIME" : "SIMULATED TIME"}
        </span>
        <div
          style={{
            fontSize: "13px",
            fontWeight: 700,
            color: realPositionsMode ? "var(--neon-gold)" : "var(--neon-cyan)",
            textShadow: realPositionsMode
              ? "0 0 8px rgba(255, 183, 0, 0.4)"
              : "0 0 8px rgba(0, 240, 255, 0.4)"
          }}
        >
          {realPositionsMode
            ? `${realDate}${offsetDays !== 0 ? `  +${offsetDays}d` : ""}`
            : `${years > 0 ? `YEAR ${years}, ` : ""}DAY ${days}`}
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

        {/* TODAY — visible only in real-positions mode. Snaps elapsedTime to 0
            so the simulation jumps back to right-now. Visually muted when
            already at today. */}
        {realPositionsMode && (
          <button
            onClick={resetTime}
            className="hud-btn"
            disabled={atToday}
            style={{
              padding: "8px 10px",
              fontSize: "9px",
              minWidth: "52px",
              justifyContent: "center",
              textAlign: "center",
              borderColor: atToday ? "rgba(255,255,255,0.06)" : "var(--neon-gold)",
              color: atToday ? "var(--text-muted)" : "var(--neon-gold)",
              cursor: atToday ? "default" : "pointer",
              opacity: atToday ? 0.55 : 1
            }}
          >
            TODAY
          </button>
        )}

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

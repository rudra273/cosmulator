import { useEffect, useState } from "react";
import { useSolarSystemStore } from "@/store/solarSystemStore";
import { DAY_MS, MIN_SIMULATION_MS, MAX_SIMULATION_MS } from "@/lib/simulation-time";

function localInputValue(timestamp: number) {
  const date = new Date(timestamp);
  return new Date(timestamp - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
const speeds = [
  { value: 1 / 24, label: "1h/s" },
  { value: 1, label: "1d/s" },
  { value: 10, label: "10d/s" },
  { value: 100, label: "100d/s" }
];

export default function TimeControls() {
  const { timeScale, previousTimeScale, isPaused, epochMs, elapsedTime, clockInitialized,
    initializeClock, setTimeScale, togglePaused, resetTime, reverseTime, setSimulationDate } = useSolarSystemStore();
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { initializeClock(); }, [initializeClock]);
  const timestamp = epochMs + elapsedTime * DAY_MS;
  const direction = Math.sign(timeScale || previousTimeScale);
  const displayDate = clockInitialized ? new Date(timestamp).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false
  }) : "Loading date…";

  return <div className="glass-panel time-panel simulation-controls">
    <div className="simulation-heading">
      <span>{isPaused ? "PAUSED" : direction < 0 ? "REWINDING" : "SIMULATION"}</span>
      <button className="simulation-date" aria-label="Choose simulation date" aria-expanded={editing}
        onClick={() => { setDate(localInputValue(timestamp)); setError(""); setEditing(!editing); }}>
        {displayDate} <span aria-hidden="true">▾</span>
      </button>
    </div>
    {editing && <form className="simulation-date-form" onSubmit={(event) => {
      event.preventDefault();
      const submittedDate = new FormData(event.currentTarget).get("date");
      const next = new Date(String(submittedDate)).getTime();
      if (!Number.isFinite(next) || next < MIN_SIMULATION_MS || next > MAX_SIMULATION_MS) {
        setError("Choose a date from 1800 through 2050."); return;
      }
      setSimulationDate(next); setEditing(false); setError("");
    }}>
      <label htmlFor="simulation-date">Date and time (your local time)</label>
      <div><input id="simulation-date" name="date" type="datetime-local" defaultValue={date} required />
        <button type="submit" className="hud-btn">GO</button></div>
      <small>Orbital model range: 1800–2050</small>
      {error && <small role="alert">{error}</small>}
    </form>}
    <div className="simulation-buttons">
      <button className={`hud-btn ${isPaused ? "active" : ""}`} onClick={togglePaused}
        aria-label={isPaused ? "Play simulation" : "Pause simulation"}>{isPaused ? "▶" : "⏸"}</button>
      <button className={`hud-btn ${direction < 0 ? "active" : ""}`} onClick={reverseTime}
        aria-label="Reverse time" aria-pressed={direction < 0} title="Reverse playback">↶</button>
      <button className="hud-btn" onClick={resetTime} title="Return to now and pause">NOW</button>
      {speeds.map((speed) => <button key={speed.label}
        className={`hud-btn ${Math.abs(timeScale || previousTimeScale) === speed.value ? "active" : ""}`}
        onClick={() => setTimeScale(speed.value * direction)}
        title={`${speed.value * 24} simulated hours per second`}>{speed.label}</button>)}
    </div>
  </div>;
}

import { useShallow } from "zustand/react/shallow";
import { useSolarSystemStore } from "@/store/solarSystemStore";
import { SUN_ORBIT_PERIOD_MYR } from "@/data/galaxy";

const SPEEDS = [
  { value: 1, label: "1 Myr/s" },
  { value: 10, label: "10 Myr/s" },
  { value: 50, label: "50 Myr/s" }
];

export function formatGalacticTime(myr: number): string {
  const m = Math.round(myr);
  if (m === 0) return "Now";
  return m > 0 ? `+${m.toLocaleString()} million years` : `${(-m).toLocaleString()} million years ago`;
}

/**
 * The Galaxy layer's clock, in millions of years. Separate from the date
 * clock (1800–2050), over which the galaxy doesn't visibly move.
 */
export default function GalaxyTimeControls() {
  const { myr, rate, prevRate, setRate, togglePlay, reverse, setMyr } = useSolarSystemStore(useShallow((s) => ({
    myr: Math.round(s.galacticMyr), rate: s.galacticRate, prevRate: s.galacticPrevRate,
    setRate: s.setGalacticRate, togglePlay: s.toggleGalacticPlay, reverse: s.reverseGalactic, setMyr: s.setGalacticMyr
  })));
  const paused = rate === 0;
  const direction = Math.sign(rate || prevRate);
  const laps = myr / SUN_ORBIT_PERIOD_MYR;

  return <div className="glass-panel time-panel simulation-controls">
    <div className="simulation-heading">
      <span>{paused ? "GALACTIC TIME" : direction < 0 ? "REWINDING" : "ROTATING"}</span>
      <span className="simulation-date" style={{ cursor: "default" }}
        title={`The Sun takes about ${Math.round(SUN_ORBIT_PERIOD_MYR)} million years to circle the galaxy. Stars drift through the spiral arms, which turn more slowly.`}>
        {formatGalacticTime(myr)}{myr !== 0 && ` · Sun ${Math.abs(laps).toFixed(2)} orbit${Math.abs(laps) >= 0.995 && Math.abs(laps) < 1.005 ? "" : "s"}`}
      </span>
    </div>
    <div className="simulation-buttons">
      <button className={`hud-btn ${paused ? "active" : ""}`} onClick={togglePlay}
        aria-label={paused ? "Rotate the galaxy" : "Pause"}>{paused ? "▶" : "⏸"}</button>
      <button className={`hud-btn ${direction < 0 ? "active" : ""}`} onClick={reverse}
        aria-label="Reverse time" aria-pressed={direction < 0} title="Reverse">↶</button>
      <button className="hud-btn" onClick={() => setMyr(0)} title="Back to today">NOW</button>
      {SPEEDS.map((sp) => <button key={sp.label}
        className={`hud-btn ${Math.abs(rate || prevRate) === sp.value ? "active" : ""}`}
        onClick={() => setRate(sp.value * direction)}
        title={`${sp.value} million years per second`}>{sp.label}</button>)}
    </div>
  </div>;
}

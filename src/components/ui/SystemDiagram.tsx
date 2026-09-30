import { useEffect, useRef } from "react";
import { habitableZone, type PlanetSystem } from "@/data/exoplanets";

const SIZE = 240;
const C = SIZE / 2;
const R_MAX = C - 14;
const MERCURY_AU = 0.387;
// The innermost planet completes one orbit in this many seconds; the rest keep
// their true period ratios.
const FASTEST_ORBIT_S = 3;

function scaleFor(system: PlanetSystem) {
  const [hzIn, hzOut] = habitableZone(system.luminositySolar);
  const outer = Math.max(hzOut, ...system.planets.map((p) => p.aAU)) * 1.08;
  return { hzIn, hzOut, outer, r: (au: number) => R_MAX * Math.sqrt(au / outer) };
}

/**
 * Top-down orbit diagram for a star's planets with its habitable zone.
 * Radial scale is square-root so compact red-dwarf systems and the zone both
 * stay readable; Mercury's orbit is drawn for comparison when in range.
 */
export default function SystemDiagram({ system, color }: { system: PlanetSystem; color: string }) {
  const { hzIn, hzOut, outer, r } = scaleFor(system);
  const showMercury = MERCURY_AU < outer;
  const dots = useRef<(SVGCircleElement | null)[]>([]);

  useEffect(() => {
    const { r } = scaleFor(system);
    const minP = Math.min(...system.planets.map((p) => p.periodDays));
    const place = (t: number) =>
      system.planets.forEach((p, i) => {
        const el = dots.current[i];
        if (!el) return;
        const angle = (t / FASTEST_ORBIT_S) * (minP / p.periodDays) * Math.PI * 2 + i * 1.3;
        el.setAttribute("cx", String(C + Math.cos(angle) * r(p.aAU)));
        el.setAttribute("cy", String(C + Math.sin(angle) * r(p.aAU)));
      });
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      place(0);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = () => {
      place((performance.now() - start) / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [system]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="100%" style={{ maxWidth: SIZE, alignSelf: "center" }} role="img"
        aria-label={`Orbits of ${system.planets.length} planet(s) with the habitable zone from ${hzIn.toFixed(3)} to ${hzOut.toFixed(3)} AU`}>
        {/* Habitable zone annulus */}
        <circle cx={C} cy={C} r={(r(hzIn) + r(hzOut)) / 2} fill="none" stroke="rgba(80, 220, 140, 0.18)" strokeWidth={r(hzOut) - r(hzIn)} />
        {showMercury && <circle cx={C} cy={C} r={r(MERCURY_AU)} fill="none" stroke="rgba(255,255,255,0.25)" strokeDasharray="3 4" />}
        {system.planets.map((p) => (
          <circle key={p.name} cx={C} cy={C} r={r(p.aAU)} fill="none" stroke="rgba(255,255,255,0.18)" />
        ))}
        <circle cx={C} cy={C} r={5} fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
        {system.planets.map((p, i) => (
          <circle key={p.name} ref={(el) => { dots.current[i] = el; }} cx={C + r(p.aAU)} cy={C} r={3} fill="#9fe8ff" />
        ))}
      </svg>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", fontSize: 10, color: "var(--text-muted)" }}>
        <span><span style={{ color: "rgba(80, 220, 140, 0.9)" }}>■</span> Habitable zone {hzIn < 0.1 ? hzIn.toFixed(3) : hzIn.toFixed(2)}–{hzOut < 0.1 ? hzOut.toFixed(3) : hzOut.toFixed(2)} AU</span>
        {showMercury && <span>┄ Mercury&apos;s orbit (0.39 AU)</span>}
        <span>Radial scale: square root</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 11 }}>
        {system.planets.map((p) => (
          <div key={p.name} style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-secondary)" }}>{p.name}</span>
            <span>{p.aAU} AU · {p.periodDays < 1000 ? `${p.periodDays} days` : `${(p.periodDays / 365.25).toFixed(1)} years`}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useShallow } from "zustand/react/shallow";
import ScaleControls from "./ScaleControls";
import { useState } from "react";
import { useSolarSystemStore } from "@/store/solarSystemStore";
import { formatSceneDistance } from "@/components/three/layers/scaleHints";
import { getStarById } from "@/data/stars";
import TimeControls from "./TimeControls";
import PlanetSelector from "./PlanetSelector";
import PlanetInfoPanel from "./PlanetInfoPanel";
import CreditsPanel from "./CreditsPanel";
import StarInfoPanel from "./StarInfoPanel";

export default function HUD() {
  const { isRealisticScale, realSizes, showOrbits,
    showLabels,
    showAsteroidBelt,
    viewScale,
    cameraDistance,
    creditsOpen,
    toggleOrbits,
    toggleLabels,
    toggleAsteroidBelt,
    returnToOverview,
    openCredits,
    closeCredits } = useSolarSystemStore(useShallow(s => ({ isRealisticScale: s.isRealisticScale, realSizes: s.realSizes, showOrbits: s.showOrbits, showLabels: s.showLabels, showAsteroidBelt: s.showAsteroidBelt, viewScale: s.viewScale, cameraDistance: s.viewScale === "solar" ? 0 : Math.round(s.cameraDistance), creditsOpen: s.creditsOpen, toggleOrbits: s.toggleOrbits, toggleLabels: s.toggleLabels, toggleAsteroidBelt: s.toggleAsteroidBelt, returnToOverview: s.returnToOverview, openCredits: s.openCredits, closeCredits: s.closeCredits })));

  // Solar-only HUD chrome (toggle bar, planet selector, time panel) hides
  // when we're zoomed out to Galaxy or Universe — those layers have their own
  // affordances (markers + zoom-out gesture) and don't need the planet UI.
  const inSolar = viewScale === "solar";
  const { showConstellations, showDistanceRings, toggleConstellations, toggleDistanceRings } = useSolarSystemStore(useShallow(s => ({ showConstellations: s.showConstellations, showDistanceRings: s.showDistanceRings, toggleConstellations: s.toggleConstellations, toggleDistanceRings: s.toggleDistanceRings })));

  // Breadcrumb shown under the COSMULATOR title. Non-clickable for Phase 0;
  // the gesture (zoom-out / click marker) is the only way to navigate.
  // We label the stellar layer "Solar Neighborhood" in the UI even though
  // the internal ViewScale name remains "stellar".
  const breadcrumb =
    viewScale === "universe"
      ? "UNIVERSE › GALAXY › SOLAR NEIGHBORHOOD › SOLAR"
      : viewScale === "galaxy"
        ? "GALAXY › SOLAR NEIGHBORHOOD › SOLAR"
        : viewScale === "stellar"
          ? "SOLAR NEIGHBORHOOD › SOLAR"
          : "SOLAR";

  // Scale-aware "you are at X light-units" readout. Translates the active
  // layer's camera distance through that layer's calibration. Shows nothing
  // until the layer's controls publish their first reading.
  // The Stellar layer is log-compressed, so a camera distance has no single
  // real-world equivalent there; describe the view (or the focused star).
  const selectedStar = useSolarSystemStore((s) => getStarById(s.selectedStarId));
  const scaleReadout = viewScale === "solar"
    ? `${isRealisticScale ? "Real" : "Compressed"} distances · ${realSizes ? "Real" : "Exaggerated"} sizes`
    : viewScale === "stellar"
      ? selectedStar
        ? `${selectedStar.name} · ${selectedStar.distanceLy.toLocaleString()} light-years away`
        : "Log scale · real directions · stars to ~3,000 light-years"
      : cameraDistance > 0 ? formatSceneDistance(cameraDistance, viewScale) : "";

  // Mobile-only: SYSTEMS popup menu open/closed, and per-bar visibility the
  // user controls from it. All bars visible by default. Ignored on desktop,
  // where every bar always shows.
  const [menuOpen, setMenuOpen] = useState(false);
  const [bars, setBars] = useState({
    toggles: true,
    planets: true,
    time: true
  });

  const toggleBar = (key: keyof typeof bars) =>
    setBars((b) => ({ ...b, [key]: !b[key] }));

  const menuItems: { key: keyof typeof bars; label: string }[] = [
    { key: "toggles", label: "View Options" },
    { key: "planets", label: "Planet Bar" },
    { key: "time", label: "Time Controls" }
  ];

  return (
    <div
      className="hud-root"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none", // Allows clicking through HUD onto the WebGL Canvas
        zIndex: 5,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between"
      }}
    >
      {/* ================= TOP SECTION ================= */}
      {/* No pointer-events here — only the brand + toggle group below claim
          clicks, so empty space passes touches through to the 3D scene. */}
      <div className="hud-top">
        {/* Header row: brand on the left, cockpit-style SYSTEMS panel switch on
            the right (mobile only — hidden on desktop via CSS). */}
        <div className="hud-top-row">
          {/* Branding header */}
          <div
            onClick={() => returnToOverview()}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              fontFamily: "'Orbitron', sans-serif",
              cursor: "pointer",
              pointerEvents: "auto"
            }}
          >
            <h1
              className="brand-title"
              style={{
                fontWeight: 900,
                letterSpacing: "3px",
                background: "linear-gradient(45deg, #00f0ff, #ffb700)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                margin: 0
              }}
            >
              COSMULATOR
            </h1>
            <span
              className="brand-sub"
              style={{
                fontSize: "8px",
                color: "var(--text-muted)",
                letterSpacing: "2px",
                textTransform: "uppercase"
              }}
            >
              Interactive Space Laboratory
            </span>
            {/* Scale-layer breadcrumb — discoverability cue for the zoom-out
                gesture. Non-clickable for Phase 0. */}
            <span
              style={{
                fontSize: "9px",
                color: viewScale === "solar" ? "var(--text-muted)" : "var(--neon-gold)",
                letterSpacing: "1.5px",
                marginTop: "2px",
                textTransform: "uppercase",
                opacity: 0.9
              }}
            >
              {breadcrumb}
            </span>
            {/* Scale-aware light-distance readout. Updates as the user zooms,
                so layer transitions read as honest scale jumps instead of cuts. */}
            {scaleReadout && (
              <span
                style={{
                  fontSize: "10px",
                  color: "var(--neon-cyan)",
                  letterSpacing: "1.5px",
                  marginTop: "1px",
                  textTransform: "uppercase",
                  opacity: 0.85,
                  textShadow: "0 0 6px rgba(0, 240, 255, 0.25)"
                }}
              >
                {scaleReadout}
              </span>
            )}
          </div>

          {/* Cockpit panel switch — opens a popup to show/hide HUD bars */}
          <div className="systems-wrap" style={{ pointerEvents: "auto" }}>
            <button
              className={`hud-btn systems-btn ${menuOpen ? "active" : ""}`}
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
            >
              SYSTEMS {menuOpen ? "▴" : "▾"}
            </button>

            {menuOpen && (
              <div className="glass-panel systems-menu">
                <div className="systems-menu-title">DISPLAY PANELS</div>
                {menuItems.map((item) => (
                  <button
                    key={item.key}
                    className="systems-menu-item"
                    onClick={() => toggleBar(item.key)}
                    role="menuitemcheckbox"
                    aria-checked={bars[item.key]}
                  >
                    <span className={`systems-check ${bars[item.key] ? "on" : ""}`}>
                      {bars[item.key] ? "✓" : ""}
                    </span>
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top-right row: ABOUT button (always visible — NASA attribution
            must reach the user on every layer) sits inline on the LEFT of
            the Solar-only toggle-bar. Sibling rather than child so when
            the toggle-bar hides on Galaxy/Universe layers the ABOUT button
            stays in place, and so the toggle-bar's mobile horizontal-scroll
            doesn't carry ABOUT off-screen. */}
        <div
          className="top-right-row"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <button
            className={`hud-btn about-btn ${creditsOpen ? "active" : ""}`}
            onClick={() => (creditsOpen ? closeCredits() : openCredits())}
            aria-expanded={creditsOpen}
            aria-controls="credits-panel"
            style={{ fontSize: "10px", pointerEvents: "auto" }}
          >
            ABOUT
          </button>

        {/* View Option Switches — Solar-only (orbits, labels, etc. don't apply
            in Galaxy/Universe). */}
        <div
          className={`glass-panel toggle-bar ${bars.toggles && inSolar ? "" : "bar-hidden"}`}
          style={{ pointerEvents: "auto" }}
        >
          <button
            className={`hud-btn ${showOrbits ? "active" : ""}`}
            onClick={toggleOrbits}
            style={{ fontSize: "9px" }}
          >
            Orbits
          </button>

          <button
            className={`hud-btn ${showLabels ? "active" : ""}`}
            onClick={toggleLabels}
            style={{ fontSize: "9px" }}
          >
            Labels
          </button>

          <button
            className={`hud-btn ${showAsteroidBelt ? "active" : ""}`}
            onClick={toggleAsteroidBelt}
            style={{ fontSize: "9px" }}
          >
            Belts
          </button>

          <ScaleControls />
        </div>

        {/* Stellar Neighborhood view options. */}
        {viewScale === "stellar" && (
          <div className="glass-panel toggle-bar" style={{ pointerEvents: "auto" }}>
            <button className={`hud-btn ${showConstellations ? "active" : ""}`} onClick={toggleConstellations} style={{ fontSize: "9px" }}>
              Constellations
            </button>
            <button className={`hud-btn ${showDistanceRings ? "active" : ""}`} onClick={toggleDistanceRings} style={{ fontSize: "9px" }}>
              Distance Rings
            </button>
          </div>
        )}
        </div>{/* /top-right row */}
      </div>

      {/* ================= INFO PANEL ================= */}
      {/* Positions itself (right card on desktop, bottom sheet on mobile) and
          claims its own pointer-events, so no invisible wrapper blocks touch. */}
      <PlanetInfoPanel />
      <StarInfoPanel />

      {/* ================= ABOUT / CREDITS PANEL =================
          Mutually exclusive with PlanetInfoPanel — the store actions clear
          one when the other opens — so they never share the right-card slot
          on desktop. Same glass-panel placement + slide-in animation. */}
      <CreditsPanel />

      {/* ================= BOTTOM BAR SECTION =================
          Planet selector + time controls are Solar-only — hidden in Galaxy
          and Universe layers (where they have no meaning). */}
      <div className="hud-bottom">
        {/* Horizontal Planet Navigation */}
        <div
          className={bars.planets && inSolar ? "" : "bar-hidden"}
          style={{ flex: 1, pointerEvents: "auto", minWidth: 0 }}
        >
          <PlanetSelector />
        </div>

        {/* Time Simulation speed controls */}
        <div
          className={`time-panel ${bars.time && inSolar ? "" : "bar-hidden"}`}
          style={{ pointerEvents: "auto" }}
        >
          <TimeControls />
        </div>
      </div>
    </div>
  );
}

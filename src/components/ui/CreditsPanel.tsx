import { useRef, useState } from "react";
import { useSolarSystemStore } from "@/store/solarSystemStore";

// Drag further than this (px) and the sheet dismisses on release. Mirrors
// PlanetInfoPanel's DISMISS_THRESHOLD so the gesture feels identical.
const DISMISS_THRESHOLD = 90;

/**
 * Credits panel content lives as a typed structure rather than parsed from
 * public/textures/CREDITS.md. The asset count is small (2 images, a couple
 * of data sources) so duplicating the canonical lines here in exchange for
 * exact typography control is the honest trade. Bump it to a generated
 * JSON if the list ever crosses ~15 entries.
 *
 * Each entry pairs a one-line `label` (what the asset is), a `byline`
 * (NASA's required credit text — keep verbatim from CREDITS.md) and an
 * optional `url` to the source page. Sections render in declaration order.
 */
interface CreditItem {
  label: string;
  byline: string;
  url?: string;
}
interface CreditSection {
  title: string;
  items: CreditItem[];
}

const CREDITS: { sections: CreditSection[] } = {
  sections: [
    {
      title: "Image Credits",
      items: [
        {
          label: "Milky Way artist concept — Galaxy layer disc",
          byline: "NASA's Goddard Space Flight Center, Scientific Visualization Studio",
          url: "https://svs.gsfc.nasa.gov/14935/"
        },
        {
          label: "Hubble Ultra Deep Field — Universe layer skybox",
          byline: "NASA, ESA, and the HUDF team (STScI)",
          url: "https://svs.gsfc.nasa.gov/30946/"
        }
      ]
    },
    {
      title: "Data",
      items: [
        {
          label: "Planet orbital elements",
          byline: "NASA JPL Horizons (J2000 epoch)"
        },
        {
          label: "Nearby star positions and spectral data",
          byline: "Hipparcos catalogue / Stellarium"
        },
        {
          label: "Sagittarius A*",
          byline: "Stylized depiction — not a physical lensing simulation"
        }
      ]
    },
    {
      title: "Built With",
      items: [
        { label: "Application framework", byline: "Next.js · React · TypeScript" },
        { label: "3D scene", byline: "React Three Fiber · @react-three/drei · Three.js" },
        { label: "State + styling", byline: "Zustand · Tailwind utility classes" }
      ]
    }
  ]
};

const NASA_GUIDELINES_URL = "https://www.nasa.gov/multimedia/guidelines/index.html";

export default function CreditsPanel() {
  const creditsOpen = useSolarSystemStore((s) => s.creditsOpen);
  const closeCredits = useSolarSystemStore((s) => s.closeCredits);

  // Live vertical drag offset for swipe-to-dismiss (mobile bottom sheet).
  // Identical pattern to PlanetInfoPanel — copy-paste rather than factor
  // until a third panel needs it.
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef<number | null>(null);

  if (!creditsOpen) return null;

  const onGrabStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const onGrabMove = (e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    const delta = e.touches[0].clientY - dragStartY.current;
    setDragY(Math.max(0, delta));
  };

  const onGrabEnd = () => {
    if (dragY > DISMISS_THRESHOLD) {
      closeCredits();
    }
    setDragY(0);
    setIsDragging(false);
    dragStartY.current = null;
  };

  return (
    <div
      id="credits-panel"
      className="glass-panel info-panel credits-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        pointerEvents: "auto",
        // Gold border-top distinguishes the meta/chrome panel from the
        // planet-info card's per-planet color. Keeps the cockpit language
        // consistent ("gold = ABOUT / TIME / metadata, cyan = data").
        borderTop: "2px solid var(--neon-gold)",
        ...(dragY > 0
          ? { transform: `translateY(${dragY}px)`, animation: "none" }
          : {}),
        transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.16,1,0.3,1)"
      }}
    >
      {/* Header / grab area — swipe down to dismiss on mobile. */}
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
              backgroundColor: "var(--neon-gold)",
              boxShadow: "0 0 10px var(--neon-gold)"
            }}
          />
          <h2
            style={{
              fontSize: "16px",
              fontWeight: 800,
              letterSpacing: "1.5px",
              textTransform: "uppercase"
            }}
          >
            About Cosmulator
          </h2>
        </div>

        {/* Close button — desktop only. On mobile the sheet is swiped down. */}
        <button
          className="info-panel-close"
          onClick={() => closeCredits()}
          aria-label="Close about panel"
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

      {/* Scrollable body — blurb, then each credit section as a card. */}
      <div
        className="info-panel-scroll"
        style={{
          padding: "16px 24px 24px 24px",
          display: "flex",
          flexDirection: "column",
          gap: "20px"
        }}
      >
        {/* Project blurb */}
        <p
          style={{
            fontSize: "13px",
            lineHeight: "1.6",
            color: "var(--text-secondary)",
            fontWeight: 400
          }}
        >
          Cosmulator is an interactive multi-scale visualization of the
          universe — from Earth&apos;s neighborhood to the Hubble Ultra Deep
          Field. Built as a stylized real-time WebGL experience, not a
          photoreal simulation.
        </p>

        {CREDITS.sections.map((section) => (
          <div
            key={section.title}
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            <h3
              style={{
                fontSize: "10px",
                fontFamily: "'Orbitron', sans-serif",
                color: "var(--text-muted)",
                letterSpacing: "1.5px",
                textTransform: "uppercase"
              }}
            >
              {section.title}
            </h3>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                background: "rgba(0,0,0,0.2)",
                padding: "12px",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.03)"
              }}
            >
              {section.items.map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                    fontSize: "12px",
                    lineHeight: "1.45"
                  }}
                >
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                    {item.label}
                  </span>
                  <span style={{ color: "var(--text-secondary)" }}>
                    {item.byline}
                  </span>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: "10px",
                        color: "var(--neon-cyan)",
                        textDecoration: "none",
                        letterSpacing: "0.5px",
                        wordBreak: "break-all"
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                      onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                    >
                      {item.url.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* License / use note. The visible NASA-attribution requirement is
            satisfied above; this paragraph points back to NASA's media
            guidelines so curious users can verify usage themselves. */}
        <div
          style={{
            fontSize: "11px",
            lineHeight: "1.5",
            color: "var(--text-muted)",
            borderLeft: "2px solid var(--neon-gold)",
            background: "rgba(255, 183, 0, 0.04)",
            padding: "10px 14px",
            borderRadius: "0 8px 8px 0"
          }}
        >
          Educational visualization. NASA imagery used per{" "}
          <a
            href={NASA_GUIDELINES_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--neon-gold)", textDecoration: "none" }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
          >
            NASA&apos;s media usage guidelines
          </a>
          .
        </div>

        <div
          style={{
            fontSize: "10px",
            color: "var(--text-muted)",
            textAlign: "center",
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            fontFamily: "'Orbitron', sans-serif",
            opacity: 0.7
          }}
        >
          © 2026 · Cosmulator
        </div>
      </div>
    </div>
  );
}

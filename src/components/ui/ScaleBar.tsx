import { useEffect, useState } from "react";
import { useSolarSystemStore } from "@/store/solarSystemStore";
import { LY_PER_UNIT, type ViewScale } from "@/data/scales";
import { computePullback } from "@/lib/scale-transition";
import { niceLength } from "@/lib/navigation";
import { overviewFov } from "@/components/three/layers/useScaleTransition";

const MAX_PX = 110;
const AU_PER_LY = 63_241.077;

function formatLy(ly: number): string {
  if (ly >= 1e9) return `${ly / 1e9} billion ly`;
  if (ly >= 1e6) return `${ly / 1e6} million ly`;
  return `${ly.toLocaleString()} ly`;
}

// Linear layers only: the Solar System's distances are compressed and the
// neighbourhood's are logarithmic, so a bar would lie there.
const LINEAR: ViewScale[] = ["galaxy", "galacticCenter", "localGroup", "cosmicWeb", "universe"];

/**
 * A live scale bar for the linear layers, measured at the orbit target's
 * depth and corrected for the pull-back shrink.
 */
export default function ScaleBar() {
  const viewScale = useSolarSystemStore((s) => s.viewScale);
  const distance = useSolarSystemStore((s) => s.cameraDistance);
  const transitioning = useSolarSystemStore((s) => s.transitionFrom !== null);
  const [viewport, setViewport] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const update = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  if (!viewport || transitioning || !LINEAR.includes(viewScale) || !(distance > 0)) return null;

  const fov = (overviewFov(viewport.w / viewport.h) * Math.PI) / 180;
  const unitsPerPx = (2 * distance * Math.tan(fov / 2)) / viewport.h;
  const shrink = computePullback(viewScale, distance).stuffScale;
  const lyPerPx = (unitsPerPx * LY_PER_UNIT[viewScale]) / shrink;
  const au = viewScale === "galacticCenter";
  const perPx = au ? lyPerPx * AU_PER_LY : lyPerPx;
  const length = niceLength(perPx * MAX_PX);
  if (!length) return null;
  const px = length / perPx;

  return (
    <div className="scale-bar" aria-label={`Scale: ${Math.round(px)} pixels is ${au ? `${length} AU` : formatLy(length)}`}>
      <span className="scale-bar-line" style={{ width: `${px}px` }} />
      <span className="scale-bar-text">{au ? `${length.toLocaleString()} AU` : formatLy(length)}</span>
    </div>
  );
}

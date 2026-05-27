import { useSolarSystemStore } from "@/store/solarSystemStore";
import SolarLayer from "./SolarLayer";
import StellarLayer from "./StellarLayer";
import GalaxyLayer from "./GalaxyLayer";
import UniverseLayer from "./UniverseLayer";
import { useCrossfade } from "./useCrossfade";
import { useTransitionDolly } from "./useTransitionDolly";

/**
 * Mounts the active scale layer (and, during a transition, briefly mounts the
 * outgoing layer too so the cross-fade can blend them). Reads `viewScale`,
 * `transitionFrom`, and `transitionDir` from the store.
 *
 * Asymmetric transitions:
 *  - Ascend (zoom-out): the outgoing layer's geometry shrinks via
 *    `transitionScale`, opacities cross-fade, and the camera dollies
 *    smoothly from its current pos to the incoming layer's overview pose
 *    via useTransitionDolly. NASA-Eyes-style continuous zoom-out.
 *  - Descend (click-down): each incoming layer's snap effect runs as
 *    before (crisp instant pose), opacities cross-fade. `transitionScale`
 *    stays 1, the dolly hook returns null.
 *
 * The Solar layer does a hard mount/unmount (its procedural shaders don't
 * expose a uOpacity uniform — Phase 0 limitation). Galaxy / Universe fade
 * via material opacity, Stellar fades via the StarSprite intensity prop.
 */
export default function LayerSwitcher() {
  const { viewScale, transitionFrom } = useSolarSystemStore();
  const { opacityFor, outgoingScale, cameraDollyT } = useCrossfade();

  // Drives the camera position lerp during an ascend transition. No-op on
  // descend or steady state (cameraDollyT === null).
  useTransitionDolly(cameraDollyT);

  // The set of layers that need to render this frame: the active one plus,
  // during a transition, the outgoing one (its opacity fades out).
  const active = new Set<typeof viewScale>([viewScale]);
  if (transitionFrom) active.add(transitionFrom);

  // A layer's transitionScale only deviates from 1 while it's the OUTGOING
  // side of an ascend; useCrossfade's outgoingScale is the live animated
  // value. Incoming layers stay at their natural scale.
  const scaleFor = (layer: typeof viewScale) =>
    transitionFrom === layer ? outgoingScale : 1;

  return (
    <>
      {active.has("solar") && (
        <SolarLayer
          isActive={viewScale === "solar"}
          transitionScale={scaleFor("solar")}
        />
      )}
      {active.has("stellar") && (
        <StellarLayer
          opacity={opacityFor("stellar")}
          isActive={viewScale === "stellar"}
          transitionScale={scaleFor("stellar")}
        />
      )}
      {active.has("galaxy") && (
        <GalaxyLayer
          opacity={opacityFor("galaxy")}
          isActive={viewScale === "galaxy"}
          transitionScale={scaleFor("galaxy")}
        />
      )}
      {active.has("universe") && (
        <UniverseLayer
          opacity={opacityFor("universe")}
          isActive={viewScale === "universe"}
          transitionScale={scaleFor("universe")}
        />
      )}
    </>
  );
}

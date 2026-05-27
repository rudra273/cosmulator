import { useSolarSystemStore } from "@/store/solarSystemStore";
import SolarLayer from "./SolarLayer";
import StellarLayer from "./StellarLayer";
import GalaxyLayer from "./GalaxyLayer";
import UniverseLayer from "./UniverseLayer";
import { useCrossfade } from "./useCrossfade";
import { useTransitionDolly } from "./useTransitionDolly";
import WarpField from "./shared/WarpField";

/**
 * Mounts the active scale layer (and, during a transition, briefly mounts the
 * outgoing layer too so the cross-fade can blend them). Reads `viewScale`,
 * `transitionFrom`, and `transitionDir` from the store.
 *
 * Ascend (zoom-out) transitions are NASA-Eyes-style — they last 1800 ms and
 * combine four coordinated effects:
 *
 *  - Outgoing layer's geometry shrinks via `transitionScale` (or, for the
 *    Solar layer, a staged planets-then-sun shrink via two separate scales).
 *  - Camera smoothly dollies to the incoming layer's overview pose via
 *    `useTransitionDolly`.
 *  - Layer opacities cross-fade.
 *  - When transitioning out of Stellar or Galaxy, a WarpField streams
 *    colorful star streaks past the camera so the user feels they are
 *    traveling through the space between scales rather than cutting to it.
 *
 * Descend (click marker) skips the dolly / shrink / warp and keeps the
 * crisp snap behaviour. Markers should feel like instant teleports.
 *
 * The Solar layer does a hard mount/unmount of its opacity (its procedural
 * shaders don't expose a uOpacity uniform); the staged shrink + the
 * incoming Stellar opacity ramp carry the visual transition out of Solar.
 */
export default function LayerSwitcher() {
  const { viewScale, transitionFrom } = useSolarSystemStore();
  const {
    opacityFor,
    outgoingScale,
    solarPlanetsScale,
    solarSunScale,
    cameraDollyT,
    warpT
  } = useCrossfade();

  // Drives the camera position lerp during an ascend transition. No-op on
  // descend or steady state (cameraDollyT === null).
  useTransitionDolly(cameraDollyT);

  // The set of layers that need to render this frame: the active one plus,
  // during a transition, the outgoing one (its opacity fades out).
  const active = new Set<typeof viewScale>([viewScale]);
  if (transitionFrom) active.add(transitionFrom);

  // Generic outgoing scale — used by Stellar / Galaxy / Universe. Solar
  // ignores this in favor of the two staged scales below.
  const scaleFor = (layer: typeof viewScale) =>
    transitionFrom === layer ? outgoingScale : 1;

  return (
    <>
      {active.has("solar") && (
        <SolarLayer
          isActive={viewScale === "solar"}
          planetsScale={transitionFrom === "solar" ? solarPlanetsScale : 1}
          sunScale={transitionFrom === "solar" ? solarSunScale : 1}
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

      {/* Warp tunnel — only mounted while an ascend transition from Stellar
          or Galaxy is in flight. Attached internally to the camera so it
          surrounds the viewer in camera-local space regardless of which
          layer coordinate system we're crossing. */}
      {warpT !== null && <WarpField progress={warpT} />}
    </>
  );
}

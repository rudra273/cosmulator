import { useSolarSystemStore } from "@/store/solarSystemStore";
import SolarLayer from "./SolarLayer";
import StellarLayer from "./StellarLayer";
import GalaxyLayer from "./GalaxyLayer";
import UniverseLayer from "./UniverseLayer";
import { useCrossfade } from "./useCrossfade";

/**
 * Mounts the active scale layer (and, during a transition, briefly mounts the
 * outgoing layer too so the cross-fade can blend them). Reads `viewScale` and
 * `transitionFrom` from the store.
 *
 * The Solar layer does a hard mount/unmount (its procedural shaders don't
 * expose a uOpacity uniform — Phase 0 limitation, documented). Galaxy and
 * Universe layers fade smoothly via their material opacity.
 */
export default function LayerSwitcher() {
  const { viewScale, transitionFrom } = useSolarSystemStore();
  const { opacityFor } = useCrossfade();

  // The set of layers that need to render this frame: the active one plus,
  // during a transition, the outgoing one (its opacity fades out).
  const active = new Set<typeof viewScale>([viewScale]);
  if (transitionFrom) active.add(transitionFrom);

  return (
    <>
      {active.has("solar") && <SolarLayer isActive={viewScale === "solar"} />}
      {active.has("stellar") && (
        <StellarLayer opacity={opacityFor("stellar")} isActive={viewScale === "stellar"} />
      )}
      {active.has("galaxy") && (
        <GalaxyLayer opacity={opacityFor("galaxy")} isActive={viewScale === "galaxy"} />
      )}
      {active.has("universe") && (
        <UniverseLayer opacity={opacityFor("universe")} isActive={viewScale === "universe"} />
      )}
    </>
  );
}

import { useSolarSystemStore } from "@/store/solarSystemStore";
import SolarLayer from "./SolarLayer";

/**
 * Mounts the active scale layer (and, during a transition, briefly mounts the
 * outgoing layer too so the cross-fade can blend them). Reads `viewScale` and
 * `transitionFrom` from the store.
 *
 * Step 2 of the layer-system migration: only Solar exists as a real layer;
 * Galaxy and Universe slot in via further steps.
 */
export default function LayerSwitcher() {
  const { viewScale, transitionFrom } = useSolarSystemStore();

  // The set of layers that need to render this frame: the active one plus,
  // during a transition, the outgoing one (its opacity fades out).
  const active = new Set<typeof viewScale>([viewScale]);
  if (transitionFrom) active.add(transitionFrom);

  return (
    <>
      {active.has("solar") && <SolarLayer />}
      {/* Galaxy and Universe layers are introduced in later migration steps. */}
    </>
  );
}

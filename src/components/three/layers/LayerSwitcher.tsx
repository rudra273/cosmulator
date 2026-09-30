import { useEffect, useRef } from "react";
import type * as THREE from "three";
import { useSolarSystemStore, type ViewScale } from "@/store/solarSystemStore";
import SolarLayer from "./SolarLayer";
import StellarLayer from "./StellarLayer";
import GalaxyLayer from "./GalaxyLayer";
import LocalGroupLayer from "./LocalGroupLayer";
import CosmicWebLayer from "./CosmicWebLayer";
import UniverseLayer from "./UniverseLayer";
import GalacticCenterLayer from "./GalacticCenterLayer";
import { useCrossfade } from "./useCrossfade";
import { useScaleTransition } from "./useScaleTransition";
import { prefetchLayer } from "./shared/assets";
import { innerOf, outerOf } from "@/data/scales";

/**
 * Mounts the active scale layer and, during a transition, the outgoing one.
 * Each layer sits in a wrapper group that useScaleTransition moves so the
 * outgoing layer appears at the shared anchor inside the incoming layer
 * (Sun → Orion Spur marker, galaxy → Milky Way marker); the camera flies
 * continuously between them. Opacities cross-fade via useCrossfade.
 */
export default function LayerSwitcher() {
  const viewScale = useSolarSystemStore(s => s.viewScale);
  const transitionFrom = useSolarSystemStore(s => s.transitionFrom);
  const { opacityFor } = useCrossfade();
  const groups = useRef<Partial<Record<ViewScale, THREE.Group | null>>>({});
  useScaleTransition(groups);

  // Once a layer settles, fetch its neighbours' assets in the background so
  // the next zoom doesn't reveal an empty disc. On first load, wait until
  // the Solar System has had the network to itself.
  const settled = transitionFrom === null;
  const firstPrefetch = useRef(true);
  useEffect(() => {
    if (!settled) return;
    const delay = firstPrefetch.current ? 4000 : 300;
    firstPrefetch.current = false;
    const timer = setTimeout(() => {
      prefetchLayer(outerOf(viewScale));
      prefetchLayer(innerOf(viewScale));
    }, delay);
    return () => clearTimeout(timer);
  }, [viewScale, settled]);

  const active = new Set<ViewScale>([viewScale]);
  if (transitionFrom) active.add(transitionFrom);

  const wrap = (layer: ViewScale, node: React.ReactNode) =>
    active.has(layer) && (
      <group key={layer} ref={(g) => { groups.current[layer] = g; }}>
        {node}
      </group>
    );

  return (
    <>
      {wrap("solar", <SolarLayer opacity={opacityFor("solar")} isActive={viewScale === "solar"} />)}
      {wrap("stellar", <StellarLayer opacity={opacityFor("stellar")} isActive={viewScale === "stellar"} />)}
      {wrap("galaxy", <GalaxyLayer opacity={opacityFor("galaxy")} isActive={viewScale === "galaxy"} />)}
      {wrap("localGroup", <LocalGroupLayer opacity={opacityFor("localGroup")} isActive={viewScale === "localGroup"} />)}
      {wrap("cosmicWeb", <CosmicWebLayer opacity={opacityFor("cosmicWeb")} isActive={viewScale === "cosmicWeb"} />)}
      {wrap("galacticCenter", <GalacticCenterLayer opacity={opacityFor("galacticCenter")} isActive={viewScale === "galacticCenter"} />)}
      {wrap("universe", <UniverseLayer opacity={opacityFor("universe")} isActive={viewScale === "universe"} />)}
    </>
  );
}

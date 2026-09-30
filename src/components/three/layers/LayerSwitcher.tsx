import { useRef } from "react";
import type * as THREE from "three";
import { useSolarSystemStore, type ViewScale } from "@/store/solarSystemStore";
import SolarLayer from "./SolarLayer";
import StellarLayer from "./StellarLayer";
import GalaxyLayer from "./GalaxyLayer";
import LocalGroupLayer from "./LocalGroupLayer";
import UniverseLayer from "./UniverseLayer";
import { useCrossfade } from "./useCrossfade";
import { useScaleTransition } from "./useScaleTransition";

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
      {wrap("solar", <SolarLayer isActive={viewScale === "solar"} />)}
      {wrap("stellar", <StellarLayer opacity={opacityFor("stellar")} isActive={viewScale === "stellar"} />)}
      {wrap("galaxy", <GalaxyLayer opacity={opacityFor("galaxy")} isActive={viewScale === "galaxy"} />)}
      {wrap("localGroup", <LocalGroupLayer opacity={opacityFor("localGroup")} isActive={viewScale === "localGroup"} />)}
      {wrap("universe", <UniverseLayer opacity={opacityFor("universe")} isActive={viewScale === "universe"} />)}
    </>
  );
}

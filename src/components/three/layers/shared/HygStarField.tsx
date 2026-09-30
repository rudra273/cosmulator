import { useEffect, useState } from "react";
import * as THREE from "three";
import RoundPoints from "./RoundPoints";
import { wakeRenderer } from "../../renderActivity";
import { STAR_CATALOG_URL, buildStarField, decodeStarRecords } from "@/lib/star-catalog";
import { NEARBY_STARS } from "@/data/stars";

// Parsed once per page load and shared across remounts (layer transitions).
let cached: Promise<THREE.BufferGeometry> | null = null;

export function loadStarGeometry(): Promise<THREE.BufferGeometry> {
  cached ??= fetch(STAR_CATALOG_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`star catalog: HTTP ${r.status}`);
      return r.arrayBuffer();
    })
    .then((buf) => {
      const { positions, colors, sizes } = buildStarField(decodeStarRecords(buf), NEARBY_STARS);
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      g.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
      wakeRenderer(); // it fades in over the next frames
      return g;
    })
    .catch((err) => {
      cached = null; // allow a retry on the next mount
      throw err;
    });
  return cached;
}

/**
 * Every naked-eye star (~8.7k, HYG database, ~70 KB) at its real direction,
 * spread in depth so the field surrounds the camera (see backgroundRadius). The named catalog stars are drawn on top as
 * labelled sprites. Renders nothing until the file arrives, or if it fails.
 */
export default function HygStarField({ opacity = 1 }: { opacity?: number }) {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  useEffect(() => {
    let live = true;
    loadStarGeometry()
      .then((g) => { if (live) setGeometry(g.clone()); })
      .catch((err) => console.warn(err));
    return () => { live = false; };
  }, []);
  return geometry ? <RoundPoints geometry={geometry} opacity={opacity} /> : null;
}

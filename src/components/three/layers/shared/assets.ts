import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { ViewScale } from "@/data/scales";
import { loadSurveyGeometry } from "./surveyGeometry";
import { loadStarGeometry } from "./HygStarField";

// Every per-layer asset, loaded only when needed. Decoded images are cached
// per URL for the page's lifetime; each layer builds (and disposes) its own
// GPU texture from them, so two layers sharing an image during a transition
// never pull it out from under each other.

// Phones get the 1024 px galaxy (48 KB, ~5 MB GPU); larger screens 2048 px
// (215 KB, ~21 MB GPU with mipmaps).
export const MILKY_WAY_SMALL = "/textures/milky-way-1024.webp";
export const MILKY_WAY_LARGE = "/textures/milky-way-2048.webp";
export const CMB_TEXTURE = "/textures/cmb-wmap-1024.webp";
export const HUDF_TEXTURE = "/textures/hubble-deep-field.webp";
const SMALL_SCREEN_PX = 900;

export function milkyWayTextureUrl(): string {
  if (typeof window === "undefined") return MILKY_WAY_SMALL;
  return Math.max(window.innerWidth, window.innerHeight) <= SMALL_SCREEN_PX ? MILKY_WAY_SMALL : MILKY_WAY_LARGE;
}

const images = new Map<string, Promise<HTMLImageElement>>();

export function loadImage(url: string): Promise<HTMLImageElement> {
  let p = images.get(url);
  if (!p) {
    p = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`image: ${url}`));
      img.src = url;
    }).catch((err) => {
      images.delete(url); // allow a retry
      throw err;
    });
    images.set(url, p);
  }
  return p;
}

/** A texture for `url`, built once its image is decoded; disposed on unmount. */
export function useImageTexture(url: string, configure?: (t: THREE.Texture) => void): THREE.Texture | null {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const configureRef = useRef(configure);
  useEffect(() => {
    let live = true;
    let made: THREE.Texture | null = null;
    loadImage(url)
      .then((img) => {
        if (!live) return;
        made = new THREE.Texture(img);
        made.colorSpace = THREE.SRGBColorSpace;
        configureRef.current?.(made);
        made.needsUpdate = true;
        setTex(made);
      })
      .catch((err) => console.warn(err));
    return () => {
      live = false;
      made?.dispose();
    };
  }, [url]);
  return tex;
}

/** 0 → 1 over `ms` once `ready`, so late-arriving assets fade in instead of
 *  popping. Read `.current` inside useFrame. */
export function useLoadFade(ready: boolean, ms = 700): React.RefObject<number> {
  const fade = useRef(0);
  useFrame((_, delta) => {
    if (!ready) fade.current = 0;
    else if (fade.current < 1) fade.current = Math.min(1, fade.current + (delta * 1000) / ms);
  });
  return fade;
}

const ASSETS: Partial<Record<ViewScale, () => Promise<unknown>[]>> = {
  stellar: () => [loadStarGeometry()],
  galaxy: () => [loadImage(milkyWayTextureUrl())],
  localGroup: () => [loadImage(MILKY_WAY_SMALL)],
  cosmicWeb: () => [loadSurveyGeometry()],
  universe: () => [loadImage(CMB_TEXTURE), loadImage(HUDF_TEXTURE), loadSurveyGeometry()]
};

/** Start fetching a layer's assets (errors are left for the layer to report). */
export function prefetchLayer(layer: ViewScale | null) {
  if (!layer) return;
  for (const p of ASSETS[layer]?.() ?? []) p.catch(() => {});
}

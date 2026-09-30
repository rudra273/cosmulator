import { useEffect, useRef, type RefObject } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useSolarSystemStore } from "@/store/solarSystemStore";

const SURFACE_MAPS: Record<string, string> = {
  mercury: "2k_mercury.jpg",
  venus: "2k_venus_atmosphere.jpg",
  earth: "4k_earth_daymap.jpg",
  mars: "2k_mars.jpg",
  jupiter: "2k_jupiter.jpg",
  saturn: "2k_saturn.jpg",
  uranus: "2k_uranus.jpg",
  neptune: "2k_neptune.jpg",
  moon: "2k_moon.jpg"
};

interface MapSpec {
  uniform: string;
  file: string;
  color: boolean;
  // Loaded once at full size and kept for both tiers (small enough already).
  shared?: boolean;
}

function mapsFor(id: string): MapSpec[] {
  const surface = SURFACE_MAPS[id];
  if (!surface) return [];
  const maps: MapSpec[] = [{ uniform: "uSurfaceMap", file: surface, color: true }];
  if (id === "saturn") maps.push({ uniform: "uRingMap", file: "2k_saturn_ring_alpha.png", color: true, shared: true });
  if (id === "earth") maps.push(
    { uniform: "uNightMap", file: "2k_earth_nightmap.jpg", color: true },
    { uniform: "uCloudMap", file: "2k_earth_clouds.jpg", color: false },
    { uniform: "uOceanMap", file: "2k_earth_specular_map.png", color: false }
  );
  return maps;
}

// Fiber copies uniform wrappers; update the mounted material as well as the
// source values so subsequent React renders preserve loaded maps. The has-map
// flags are derived from whatever is currently bound.
function setMap(uniforms: Record<string, THREE.IUniform>, material: RefObject<THREE.ShaderMaterial | null>, name: string, texture: THREE.Texture | null) {
  const set = (key: string, value: unknown) => {
    uniforms[key].value = value;
    if (material.current) material.current.uniforms[key].value = value;
  };
  set(name, texture);
  set("uHasSurfaceMap", !!uniforms.uSurfaceMap.value);
  set("uHasRingMap", !!uniforms.uRingMap.value);
  set("uHasEarthMaps", !!(uniforms.uNightMap.value && uniforms.uCloudMap.value && uniforms.uOceanMap.value));
}

// Loads each map on its own, so a missing file leaves that map's procedural
// fallback visible instead of suspending the solar system. Textures are owned
// by the calling effect and disposed with it.
function loadMaps(specs: MapSpec[], dir: string, gl: THREE.WebGLRenderer, isCancelled: () => boolean,
  owned: THREE.Texture[], onLoad: (spec: MapSpec, texture: THREE.Texture) => void) {
  const loader = new THREE.TextureLoader();
  for (const spec of specs) {
    const path = spec.shared ? `/textures/planets/${spec.file}` : `/textures/planets/${dir}${spec.file}`;
    loader.loadAsync(path).then((texture) => {
      if (isCancelled()) {
        texture.dispose();
        return;
      }
      texture.colorSpace = spec.color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      texture.wrapS = spec.uniform === "uRingMap" ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
      texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
      owned.push(texture);
      onLoad(spec, texture);
    }).catch(() => console.warn(`${path} unavailable; using fallback.`));
  }
}

// Two tiers keep GPU memory low enough for phones: every mounted body shows
// 512 × 256 previews (~0.7 MB of GPU memory each), and only the selected body
// swaps in its full-size maps (up to ~43 MB for Earth's day map). Leaving the
// solar view disposes everything.
export function usePlanetTextures(id: string, uniforms: Record<string, THREE.IUniform>, material: RefObject<THREE.ShaderMaterial | null>) {
  const gl = useThree((state) => state.gl);
  const inspected = useSolarSystemStore((s) => s.selectedPlanetId === id);
  const preview = useRef<Record<string, THREE.Texture>>({});
  const detailed = useRef(false);

  useEffect(() => {
    const specs = mapsFor(id);
    let cancelled = false;
    const owned: THREE.Texture[] = [];
    const cache = preview.current;
    loadMaps(specs, "small/", gl, () => cancelled, owned, (spec, texture) => {
      cache[spec.uniform] = texture;
      if (!detailed.current || spec.shared) setMap(uniforms, material, spec.uniform, texture);
    });
    return () => {
      cancelled = true;
      specs.forEach((spec) => {
        delete cache[spec.uniform];
        setMap(uniforms, material, spec.uniform, null);
      });
      owned.forEach((texture) => texture.dispose());
    };
  }, [id, uniforms, gl, material]);

  useEffect(() => {
    if (!inspected) return;
    const specs = mapsFor(id).filter((spec) => !spec.shared);
    let cancelled = false;
    const owned: THREE.Texture[] = [];
    const cache = preview.current;
    detailed.current = true;
    loadMaps(specs, "", gl, () => cancelled, owned, (spec, texture) => setMap(uniforms, material, spec.uniform, texture));
    return () => {
      cancelled = true;
      detailed.current = false;
      specs.forEach((spec) => setMap(uniforms, material, spec.uniform, cache[spec.uniform] ?? null));
      owned.forEach((texture) => texture.dispose());
    };
  }, [id, uniforms, gl, material, inspected]);
}

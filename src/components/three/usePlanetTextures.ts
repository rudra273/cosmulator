import { useEffect, type RefObject } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

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

// Load each body independently: a missing map leaves its procedural fallback
// visible instead of suspending the entire solar system. Own/dispose textures
// per mount so switching between solar and galaxy views releases GPU memory.
export function usePlanetTextures(id: string, uniforms: Record<string, THREE.IUniform>, material: RefObject<THREE.ShaderMaterial | null>) {
  const gl = useThree((state) => state.gl);

  useEffect(() => {
    const surface = SURFACE_MAPS[id];
    if (!surface) return;
    // Fiber copies uniform wrappers; update the mounted material as well as
    // the source values so subsequent React renders preserve loaded maps.
    const setUniform = (name: string, value: unknown) => {
      uniforms[name].value = value;
      if (material.current) material.current.uniforms[name].value = value;
    };
    let cancelled = false;
    const owned: THREE.Texture[] = [];
    const loader = new THREE.TextureLoader();
    const load = async (filename: string, color: boolean) => {
      const texture = await loader.loadAsync(`/textures/planets/${filename}`);
      if (cancelled) {
        texture.dispose();
        return null;
      }
      texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
      owned.push(texture);
      return texture;
    };
    void load(surface, true).then((texture) => {
      if (!texture) return;
      setUniform("uSurfaceMap", texture);
      setUniform("uHasSurfaceMap", true);
    }).catch(() => console.warn(`Surface map unavailable for ${id}; using fallback.`));

    if (id === "earth") {
      void Promise.all([
        load("2k_earth_nightmap.jpg", true),
        load("2k_earth_clouds.jpg", false),
        load("2k_earth_specular_map.png", false)
      ]).then(([night, clouds, ocean]) => {
        if (cancelled || !night || !clouds || !ocean) return;
        setUniform("uNightMap", night);
        setUniform("uCloudMap", clouds);
        setUniform("uOceanMap", ocean);
        setUniform("uHasEarthMaps", true);
      }).catch(() => console.warn("Earth detail maps unavailable; using day map only."));
    }
    return () => {
      cancelled = true;
      setUniform("uHasSurfaceMap", false);
      setUniform("uHasEarthMaps", false);
      owned.forEach((texture) => texture.dispose());
    };
  }, [id, uniforms, gl, material]);
}

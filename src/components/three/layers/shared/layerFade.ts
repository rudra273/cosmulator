import * as THREE from "three";

// Fades a whole subtree whose materials were never written to fade (the
// Solar layer: opaque planet shaders, drei Lines and Stars, points).
//  - ShaderMaterials get their fragment `main` wrapped once so every exit
//    path multiplies alpha by a `uLayerFade` uniform.
//  - Other materials fade through `opacity`.
// At fade 1 everything is restored to how it was authored.

const MAIN = /void\s+main\s*\(\s*(?:void)?\s*\)/;

type Base = { opacity: number; transparent: boolean; depthWrite: boolean };

function patch(m: THREE.ShaderMaterial) {
  if (m.userData.layerFade || !MAIN.test(m.fragmentShader)) return;
  m.userData.layerFade = true;
  m.uniforms.uLayerFade = { value: 1 };
  m.fragmentShader =
    "uniform float uLayerFade;\n" +
    m.fragmentShader.replace(MAIN, "void layerFadeMain()") +
    "\nvoid main() {\n  layerFadeMain();\n  gl_FragColor.a *= uLayerFade;\n}\n";
  m.needsUpdate = true;
}

function fadeMaterial(m: THREE.Material, f: number) {
  if (f >= 1) {
    // Fade finished: restore the authored state and forget the snapshot, so
    // later prop changes (hover opacity etc.) are never overwritten.
    const base = m.userData.layerFadeBase as Base | undefined;
    if (base) {
      if (!(m instanceof THREE.ShaderMaterial)) m.opacity = base.opacity;
      m.transparent = base.transparent;
      m.depthWrite = base.depthWrite;
      delete m.userData.layerFadeBase;
    }
    if (m instanceof THREE.ShaderMaterial && m.uniforms.uLayerFade) m.uniforms.uLayerFade.value = 1;
    return;
  }
  const base: Base = (m.userData.layerFadeBase ??= { opacity: m.opacity, transparent: m.transparent, depthWrite: m.depthWrite });
  if (m instanceof THREE.ShaderMaterial) {
    if (m.uniforms.uLayerFade) m.uniforms.uLayerFade.value = f;
  } else {
    m.opacity = base.opacity * f;
  }
  // Opaque surfaces need blending while fading.
  m.transparent = true;
  m.depthWrite = false;
}

/** Apply fade `f` (0..1) to every material under `root`; call every frame
 *  before render. Shaders are patched as soon as they appear (before their
 *  first compile), but materials are only touched while fading. */
export function applyLayerFade(root: THREE.Object3D, f: number) {
  const fading = f < 1 || (root.userData.layerFadeLast ?? 1) < 1;
  root.userData.layerFadeLast = f;
  root.traverse((o) => {
    const mat = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    if (!mat) return;
    for (const m of Array.isArray(mat) ? mat : [mat]) {
      if (m instanceof THREE.ShaderMaterial) patch(m);
      if (fading) fadeMaterial(m, f);
    }
  });
}

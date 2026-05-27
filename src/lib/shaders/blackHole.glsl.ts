// Stylised black hole — Sagittarius A* at the galactic center. A billboarded
// plane (always faces camera) with a fragment shader that paints:
//   1. A pure-black event horizon disc in the center
//   2. A thin bright photon ring (the EHT M87 silhouette look)
//   3. A soft accretion-disc glow fading outward
//
// No actual gravitational lensing — that needs screen-space refraction with
// a render target, which is overkill here. The radial mask + photon ring +
// glow combination reads as a black hole at a glance and matches the EHT
// imagery's family of look.
export const blackHoleVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const blackHoleFragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uOpacity;
  uniform vec3 uRingColor;
  uniform vec3 uGlowColor;
  void main() {
    // Radial distance from center: 0 at center → 1 at edge of plane.
    float d = length(vUv - 0.5) * 2.0;

    // Event horizon — solid black inside r=0.32.
    float horizon = 1.0 - smoothstep(0.32, 0.36, d);

    // Photon ring — narrow bright band just outside the horizon, peaks at
    // r≈0.38. Multiplied to make it pop against the bright bar behind it.
    float ringPeak = exp(-pow((d - 0.38) * 24.0, 2.0)) * 2.2;

    // Accretion glow — broader falloff past the photon ring.
    float glow = smoothstep(1.0, 0.38, d) * 0.85;
    // Kill the glow inside the horizon so it doesn't bleed into the black.
    glow *= smoothstep(0.32, 0.42, d);

    // Composite: horizon is pure black with full alpha (occludes whatever's
    // behind via normal-blend), ring + glow add bright color on top.
    vec3 color = uRingColor * ringPeak + uGlowColor * glow;
    float alpha = clamp(horizon + ringPeak + glow * 0.8, 0.0, 1.0) * uOpacity;

    // Outside the plane's effective radius (d > 1.0): fully transparent.
    if (d > 1.05) discard;

    gl_FragColor = vec4(color, alpha);
  }
`;

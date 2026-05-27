// NASA Milky Way disc — texture sampled with its own baked alpha channel.
// The asset (a NASA artist concept face-on view, sourced from MW_Anatomy.gif
// at NASA Goddard SVS) has alpha pre-baked from luminance via ffmpeg's geq
// filter: bright painted-galaxy pixels stay opaque, dark sky pixels go
// transparent. That means the shader doesn't need its own radial mask —
// the texture itself is shaped like a galaxy, not a square.
//
// Approach borrowed from the Chrome Experiments "100,000 Stars" project
// (Google), which uses the same image-on-a-plane technique for its galaxy
// view (web.dev/100000stars). Texture credit: NASA Goddard SVS.
export const galaxyDiscVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const galaxyDiscFragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uMap;
  uniform float uOpacity;
  void main() {
    vec4 tex = texture2D(uMap, vUv);
    gl_FragColor = vec4(tex.rgb, tex.a * uOpacity);
  }
`;

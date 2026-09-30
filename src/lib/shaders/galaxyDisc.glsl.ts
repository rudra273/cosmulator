// Milky Way disc — NASA/JPL-Caltech/R. Hurt face-on illustration on a flat
// disc. The image has a black background and no alpha channel, so the shader
// derives opacity from brightness (dark sky → transparent, disc → opaque)
// and fades the circular edge, letting the scene behind show through.
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
    // Luminance in linear space (the texture is decoded from sRGB).
    float luma = dot(tex.rgb, vec3(0.2126, 0.7152, 0.0722));
    float alpha = smoothstep(0.002, 0.06, luma);
    float edge = 1.0 - smoothstep(0.44, 0.5, length(vUv - 0.5));
    gl_FragColor = vec4(tex.rgb, alpha * edge * uOpacity);
    // Linear → sRGB for the canvas; without it the image renders too dark.
    #include <colorspace_fragment>
  }
`;

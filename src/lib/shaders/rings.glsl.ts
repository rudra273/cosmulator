// Shared radial sampling keeps the visible rings and their planet shadow aligned.
export const ringSampling = /* glsl */ `
  uniform sampler2D uRingMap;
  uniform bool uHasRingMap;
  uniform float uInnerRadius;
  uniform float uOuterRadius;
  vec4 ringSample(float radius) {
    float u = (radius - uInnerRadius) / (uOuterRadius - uInnerRadius);
    if (u < 0.0 || u > 1.0) return vec4(0.0);
    if (uHasRingMap) return texture2D(uRingMap, vec2(u, 0.5));
    float bands = 0.4 + 0.2 * sin(u * 180.0);
    float gap = 1.0 - smoothstep(0.63, 0.64, u) * (1.0 - smoothstep(0.69, 0.70, u));
    return vec4(vec3(0.55, 0.46, 0.33), bands * gap);
  }
`;
export const ringsVertexShader = /* glsl */ `
  varying vec3 vLocalPosition;
  void main() {
    vLocalPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
export const ringsFragmentShader = /* glsl */ `
  varying vec3 vLocalPosition;
  uniform vec3 uLocalSun;
  uniform float uPlanetRadius;
  ${ringSampling}
  void main() {
    vec4 ring = ringSample(length(vLocalPosition.xy));
    vec3 toSun = normalize(uLocalSun - vLocalPosition);
    // Analytic sphere occlusion: the ray from a ring point towards the Sun
    // must pass in front of the planet and within its radius to be shadowed.
    float along = dot(-vLocalPosition, toSun);
    float closest = length(vLocalPosition + toSun * max(along, 0.0));
    float shadow = (1.0 - smoothstep(uPlanetRadius * 0.97, uPlanetRadius * 1.03, closest)) * step(0.0, along);
    float light = 0.28 + 0.72 * sqrt(abs(toSun.z));
    gl_FragColor = vec4(ring.rgb * light * (1.0 - shadow * 0.94), ring.a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

import { SIMPLEX_NOISE_GLSL } from "./noise.glsl";

export const starVertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  void main() {
    vNormal = normalize(mat3(modelMatrix) * normal);
    vPosition = position;
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
// Illustrative photosphere: granulation and active regions, not live solar data.
export const starFragmentShader = /* glsl */ `
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  ${SIMPLEX_NOISE_GLSL}
  void main() {
    vec3 p = normalize(vPosition);
    vec3 drift = vec3(0.0, uTime * 0.025, uTime * 0.018);
    float broad = snoise(p * 7.0 + drift) * 0.5 + 0.5;
    float cells = snoise(p * 95.0 + drift * 3.0) * 0.5 + 0.5;
    float fine = snoise(p * 210.0 + drift * 5.0) * 0.5 + 0.5;
    // Dark intergranular lanes survive at close range; fade the finest octave
    // below pixel size to avoid crawling/aliasing in the overview.
    float detail = 1.0 - smoothstep(0.003, 0.025, length(fwidth(p)));
    float grain = mix(0.5, cells * 0.8 + fine * 0.2, detail);
    // High exposure: a luminous warm-white disc, with quiet granulation.
    // A few localized active regions replace noise-threshold speckles.
    float spotA = 1.0 - smoothstep(0.012, 0.032, distance(p, normalize(vec3(0.8, 0.22, 0.55))));
    float spotB = 1.0 - smoothstep(0.008, 0.022, distance(p, normalize(vec3(0.84, 0.24, 0.50))));
    float spotC = 1.0 - smoothstep(0.010, 0.026, distance(p, normalize(vec3(-0.65, -0.18, -0.74))));
    float mu = max(dot(normalize(vNormal), normalize(cameraPosition - vWorldPosition)), 0.0);
    float limb = pow(1.0 - mu, 2.5);
    vec3 color = mix(vec3(1.3, 1.06, 0.68), vec3(1.12, 0.64, 0.22), limb * 0.65);
    color *= 0.96 + grain * 0.07 + broad * 0.035;
    color *= 1.0 - max(max(spotA, spotB), spotC) * 0.18;
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
export const coronaVertexShader = starVertexShader;
export const coronaFragmentShader = /* glsl */ `
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  ${SIMPLEX_NOISE_GLSL}
  void main() {
    vec3 view = normalize(cameraPosition - vWorldPosition);
    // Projected distance from the disc center, in photosphere radii.
    // Fade OUT toward the shell edge; a Fresnel rim would outline the shell.
    float radius = length(cross(normalize(vNormal), view)) * 1.5;
    float height = max(radius - 1.0, 0.0);
    float filaments = snoise(normalize(vPosition) * 8.0 + vec3(0.0, uTime * 0.04, 0.0)) * 0.5 + 0.5;
    float alpha = exp(-height * 11.0) * (1.0 - smoothstep(1.25, 1.5, radius));
    alpha *= 0.32 + filaments * 0.06;
    gl_FragColor = vec4(vec3(1.0, 0.64, 0.23), alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

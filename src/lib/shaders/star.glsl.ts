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
    vec3 color = mix(vec3(0.65, 0.19, 0.025), vec3(1.35, 0.83, 0.3), grain);
    color *= 0.85 + 0.28 * broad;
    float belt = 1.0 - smoothstep(0.48, 0.7, abs(p.y));
    float activity = snoise(p * 12.0 + vec3(3.1, 1.7, 0.4));
    float penumbra = smoothstep(0.57, 0.72, activity) * belt;
    float umbra = smoothstep(0.72, 0.81, activity) * belt;
    color *= 1.0 - penumbra * 0.48;
    color = mix(color, vec3(0.055, 0.019, 0.009), umbra * 0.94);
    // Limb darkening instead of a bright opaque rim around the solar disc.
    float mu = max(dot(normalize(vNormal), normalize(cameraPosition - vWorldPosition)), 0.0);
    color *= 0.5 + 0.5 * pow(mu, 0.45);
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
    float facing = abs(dot(normalize(vNormal), normalize(cameraPosition - vWorldPosition)));
    float rim = pow(1.0 - facing, 4.0);
    float filaments = snoise(normalize(vPosition) * 14.0 + vec3(0.0, uTime * 0.04, 0.0)) * 0.5 + 0.5;
    float alpha = rim * (0.12 + filaments * 0.17);
    gl_FragColor = vec4(vec3(1.0, 0.52, 0.16), alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

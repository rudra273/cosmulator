import { SIMPLEX_NOISE_GLSL } from "./noise.glsl";

// Star surface shader — multi-frequency turbulence with a hot color ramp and
// Fresnel rim. Rendered with toneMapped=false so postprocessing bloom catches
// the highlights.
export const starVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const starFragmentShader = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  ${SIMPLEX_NOISE_GLSL}

  void main() {
    // Generate multi-frequency turbulence
    vec3 coord = normalize(vPosition) * 2.0;
    float n1 = snoise(coord + vec3(0.0, 0.0, uTime * 0.15)) * 0.5 + 0.5;
    float n2 = snoise(coord * 6.0 + vec3(uTime * 0.35, 0.0, 0.0)) * 0.25;
    // Clamp to [0,1]: without this, low-noise regions push turbulence negative,
    // and mix() extrapolates past darkRed toward black — the harsh dark facets
    // that appeared on the camera-facing side at cold start (uTime ~ 0).
    float turbulence = clamp(n1 + n2, 0.0, 1.0);

    // Core color gradient mapping (raised the dark floor so low regions read as
    // deep ember, never near-black).
    vec3 darkRed = vec3(0.7, 0.12, 0.0);
    vec3 brightOrange = vec3(1.0, 0.42, 0.0);
    vec3 brightYellow = vec3(1.0, 0.95, 0.45);

    vec3 color = mix(darkRed, brightOrange, turbulence);
    color = mix(color, brightYellow, max(0.0, turbulence - 0.45) * 1.6);

    // Add elegant Fresnel rim lighting
    float rim = pow(1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0);
    vec3 finalColor = color + vec3(1.0, 0.6, 0.2) * rim * 1.2;

    // Boost brightness (toneMapped={false} in Three.js enables bloom highlight)
    gl_FragColor = vec4(finalColor * 2.0, 1.0);
  }
`;

// Soft corona glow shell rendered on the backside.
export const coronaVertexShader = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const coronaFragmentShader = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    // Atmospheric glow scattering approximation
    float intensity = pow(0.7 - dot(vNormal, vec3(0, 0, 1.0)), 3.5);
    vec3 color = vec3(1.0, 0.45, 0.05);
    gl_FragColor = vec4(color * intensity * 1.5, intensity * 0.75);
  }
`;

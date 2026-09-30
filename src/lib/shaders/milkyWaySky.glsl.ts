// The Milky Way as seen from inside it: a glowing band along the galactic
// plane, thicker and warmer toward the centre (the bulge, toward Sgr A*),
// fainter toward the anticentre, broken by dust lanes that hug the plane.
// Procedural (value-noise clouds), so it costs no download. Drawn on a
// sphere centred on the camera, so it stays "at infinity" while zooming.
export const milkyWaySkyVertexShader = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const milkyWaySkyFragmentShader = /* glsl */ `
  precision highp float;
  varying vec3 vDir;
  uniform float uOpacity;
  uniform vec3 uGalacticCenter; // scene direction of l = 0 (XZ plane)

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise(vec3 x) {
    vec3 i = floor(x), f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
      f.z);
  }
  float fbm(vec3 p) {
    float a = 0.5, s = 0.0;
    for (int i = 0; i < 5; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; }
    return s;
  }

  void main() {
    vec3 d = normalize(vDir);
    vec3 u = uGalacticCenter;
    vec3 v = vec3(u.z, 0.0, -u.x);
    float l = atan(dot(d, v), dot(d, u)); // radians, 0 toward Sgr A*
    float b = asin(clamp(d.y, -1.0, 1.0));

    // Disc: ~6° half-width, puffing up toward the centre.
    float width = 0.09 + 0.08 * exp(-l * l / 0.4);
    float band = exp(-(b * b) / (width * width));
    float along = 0.35 + 0.65 * (0.5 + 0.5 * cos(l));
    float bulge = exp(-(l * l) / 0.16 - (b * b) / 0.03);

    float clouds = fbm(d * 7.0);
    float grain = fbm(d * 34.0);
    // Dark dust lanes (like the Great Rift) close to the plane.
    float dust = smoothstep(0.48, 0.72, fbm(d * 10.0 + 3.1)) * exp(-(b * b) / 0.0025);

    float glow = band * along * (0.35 + 0.9 * clouds) * (0.6 + 0.6 * grain) + 0.8 * bulge * (0.7 + 0.5 * clouds);
    glow *= 1.0 - 0.8 * dust;

    vec3 cool = vec3(0.62, 0.70, 0.92);
    vec3 warm = vec3(1.0, 0.85, 0.62);
    vec3 col = mix(cool, warm, clamp(1.6 * bulge + 0.25 * along, 0.0, 1.0));

    gl_FragColor = vec4(col * glow * 0.16 * uOpacity, 1.0);
    #include <colorspace_fragment>
  }
`;

// Cosmic microwave background shell. The texture is the WMAP 9-year map in
// Mollweide projection, galactic coordinates (l = 0 at the centre, l
// increasing to the left). Instead of reprojecting the image, the fragment
// shader turns each point's direction into galactic l/b — using the same
// scene basis as the Stellar and Galaxy layers — and solves the Mollweide
// equations to find the pixel.
export const cmbVertexShader = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const cmbFragmentShader = /* glsl */ `
  precision highp float;
  varying vec3 vDir;
  uniform sampler2D uMap;
  uniform float uOpacity;
  uniform vec3 uGalacticCenter; // scene direction of l = 0, in the XZ plane
  uniform float uTexWidth;
  const float PI = 3.14159265359;

  void main() {
    vec3 d = normalize(vDir);
    // Scene → galactic: x toward l = 0, y toward l = 90° (Y × u), z = north pole.
    vec3 u = uGalacticCenter;
    vec3 v = vec3(u.z, 0.0, -u.x);
    float l = atan(dot(d, v), dot(d, u));
    float b = asin(clamp(d.y, -1.0, 1.0));

    // Mollweide: solve 2θ + sin 2θ = π sin b (Newton; θ = b near the poles).
    float theta = b;
    if (abs(b) < 1.5707) {
      for (int i = 0; i < 6; i++) {
        float f = 2.0 * theta + sin(2.0 * theta) - PI * sin(b);
        theta -= f / (2.0 + 2.0 * cos(2.0 * theta));
      }
    }
    // Keep samples ≥ 4 texels inside the ellipse edge (x = ±cos θ), which
    // is anti-aliased to white; near the poles the edge is only a few texels
    // from l = ±180°, so the margin is set in texels, not as a fraction.
    float halfWidthTexels = 0.5 * uTexWidth * max(cos(theta), 0.02);
    float lMax = PI * max(0.0, 1.0 - 4.0 / halfWidthTexels);
    l = clamp(l, -lMax, lMax);

    // Normalised projection coordinates in [-1, 1]; l grows to the left.
    float x = -l * cos(theta) / PI;
    float y = sin(theta);
    vec2 uv = vec2(0.5 + 0.5 * x, 0.5 + 0.497 * y);

    gl_FragColor = vec4(texture2D(uMap, uv).rgb, uOpacity);
    #include <colorspace_fragment>
  }
`;

// NASA Milky Way disc — texture-sampled with a circular alpha mask. The
// texture itself (a NASA artist concept face-on view) does all the heavy
// visual work: spiral arms, dust lanes, bulge, color zones, asymmetric arm
// thickness — none of that is procedural here. The shader's only job is to
// sample the texture and fade the square's corners to transparent so the
// rendered shape reads as a disc instead of a square.
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
    vec3 tex = texture2D(uMap, vUv).rgb;
    // Radial alpha mask — kills the square corners (and any annotation text
    // baked into them) so the texture composites as a circular disc.
    float d = length(vUv - 0.5) * 2.0; // 0 at center → 1 at edge midpoint
    // Aggressive fade — the NASA source has annotation labels and leader
    // lines ~80% of the way out from the disc center. Fading from d=0.62 to
    // d=0.82 keeps the spiral structure (which fits inside ~0.7) visible but
    // kills the "Sun" / "Spiral arms" text and the leader lines entirely.
    float mask = 1.0 - smoothstep(0.62, 0.82, d);
    gl_FragColor = vec4(tex, mask * uOpacity);
  }
`;

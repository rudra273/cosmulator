// Planetary ring shader — concentric particle bands with Cassini/Encke gap
// approximations. Used by the generic Rings component for any ringed body.
export const ringsVertexShader = /* glsl */ `
  varying vec3 vLocalPosition;
  varying vec2 vUv;
  void main() {
    vLocalPosition = position;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const ringsFragmentShader = /* glsl */ `
  varying vec3 vLocalPosition;
  varying vec2 vUv;

  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform float uInnerRadius;
  uniform float uOuterRadius;

  void main() {
    // Radial distance from local origin (planar)
    float dist = length(vLocalPosition.xy);

    // Map distance to a 0.0 -> 1.0 range between boundaries
    float normDist = (dist - uInnerRadius) / (uOuterRadius - uInnerRadius);

    // Clip fragments outside geometry boundaries
    if (normDist < 0.0 || normDist > 1.0) {
      discard;
    }

    // Multi-octave sine wave superposition to simulate concentric particle bands
    float bands = sin(normDist * 45.0) * 0.5 + 0.5;
    bands += sin(normDist * 110.0) * 0.25;
    bands += sin(normDist * 220.0) * 0.15;
    bands = clamp(bands, 0.0, 1.0);

    // Cassini Division gap approximation (located at ~68% - 73% of width)
    float isCassini = step(0.66, normDist) * (1.0 - step(0.71, normDist));

    // Encke Gap approximation (located at ~88% - 90% of width)
    float isEncke = step(0.87, normDist) * (1.0 - step(0.89, normDist));

    // Interpolate base dust/rock color
    vec3 color = mix(uColor1, uColor2, normDist);
    color += vec3(0.06, 0.03, -0.02) * sin(normDist * 75.0); // color waves

    // Derive opacity from particle bands, adding elegant edge fading
    float alpha = mix(0.1, 0.8, bands);
    alpha *= sin(normDist * 3.1415926); // Ring edge feathering

    // Apply gap clearings
    if (isCassini > 0.5) {
      alpha *= 0.02;
    }
    if (isEncke > 0.5) {
      alpha *= 0.05;
    }

    gl_FragColor = vec4(color, alpha);
  }
`;

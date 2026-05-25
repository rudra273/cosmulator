// Additive Fresnel atmosphere glow shell. Rendered on the backside, slightly
// larger than the planet body, with additive blending.
export const atmosphereVertexShader = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const atmosphereFragmentShader = /* glsl */ `
  varying vec3 vNormal;
  uniform vec3 uAtmosphereColor;
  void main() {
    // Edge glow Fresnel scattering formula
    float intensity = pow(0.68 - dot(vNormal, vec3(0, 0, 1.0)), 3.2);
    gl_FragColor = vec4(uAtmosphereColor * intensity * 1.3, intensity * 0.65);
  }
`;

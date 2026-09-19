// Additive Fresnel atmosphere glow shell. Rendered on the backside, slightly
// larger than the planet body, with additive blending.
export const atmosphereVertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  void main() {
    vNormal = normalize(mat3(modelMatrix) * normal);
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const atmosphereFragmentShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  uniform vec3 uAtmosphereColor;
  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float rim = pow(1.0 - abs(dot(normal, viewDir)), 3.0);
    float sunlight = smoothstep(-0.25, 0.5, dot(normal, normalize(-vWorldPosition)));
    float intensity = rim * sunlight * 0.45;
    gl_FragColor = vec4(uAtmosphereColor, intensity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

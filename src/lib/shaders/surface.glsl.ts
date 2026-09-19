import { ringSampling } from "./rings.glsl";
import { SIMPLEX_NOISE_GLSL } from "./noise.glsl";

// Procedural planet surface shader.
// uPlanetType selects the surface style: 0 = Rocky/Cratered, 1 = Banded Gas
// Giant, 2 = Water/Earth-like. The shaderType in body data maps to this int.
export const surfaceVertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vLocalPosition;
  varying vec2 vUv;

  void main() {
    // Sun, camera and positions all use world space (body scale is uniform).
    vNormal = normalize(mat3(modelMatrix) * normal);
    vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    vLocalPosition = position;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const surfaceFragmentShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vLocalPosition;
  varying vec2 vUv;

  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;
  uniform float uNoiseScale;
  uniform float uNoiseFreq;
  uniform int uPlanetType; // 0=Rocky/Cratered, 1=Banded Gas Giant, 2=Water/Earth-like
  uniform vec3 uSunPosition;
  uniform float uTime;
  uniform sampler2D uSurfaceMap;
  uniform sampler2D uNightMap;
  uniform sampler2D uCloudMap;
  uniform sampler2D uOceanMap;
  uniform bool uHasSurfaceMap;
  uniform bool uHasEarthMaps;

  uniform bool uHasRings;
  uniform mat4 uRingWorldToLocal;
  ${ringSampling}
  float ringTransmission() {
    if (!uHasRings) return 1.0;
    vec3 p = (uRingWorldToLocal * vec4(vPosition, 1.0)).xyz;
    vec3 sun = (uRingWorldToLocal * vec4(uSunPosition, 1.0)).xyz;
    vec3 ray = normalize(sun - p);
    if (abs(ray.z) < 0.0001) return 1.0;
    float t = -p.z / ray.z;
    if (t <= 0.0) return 1.0;
    float opacity = ringSample(length((p + t * ray).xy)).a;
    return 1.0 - opacity * 0.9;
  }
  ${SIMPLEX_NOISE_GLSL}

  void main() {
    // 1. Calculate lighting direction relative to Sun (0, 0, 0)
    vec3 lightDir = normalize(uSunPosition - vPosition);
    vec3 normal = normalize(vNormal);
    float sunHeight = dot(normal, lightDir);

    if (uHasSurfaceMap) {
      vec3 albedo = texture2D(uSurfaceMap, vUv).rgb;
      float daylight = max(sunHeight, 0.0) * ringTransmission();
      vec3 color = albedo * (0.025 + daylight * 1.15);

      if (uHasEarthMaps) {
        // Equirectangular imagery preserves actual coastlines and geography.
        // Cloud motion follows simulated time, including pause/reverse.
        vec2 cloudUv = vec2(vUv.x + uTime * 0.002, vUv.y);
        float clouds = smoothstep(0.15, 0.85, texture2D(uCloudMap, cloudUv).r);
        float shadow = smoothstep(0.15, 0.85,
          texture2D(uCloudMap, cloudUv + vec2(0.0015, 0.0)).r);
        color *= 1.0 - shadow * 0.22;
        vec3 viewDir = normalize(cameraPosition - vPosition);
        vec3 halfDir = normalize(lightDir + viewDir);
        float ocean = texture2D(uOceanMap, vUv).r;
        float glint = pow(max(dot(normal, halfDir), 0.0), 75.0);
        color += vec3(0.65, 0.78, 1.0) * glint * ocean * daylight * (1.0 - clouds) * 0.65;
        float night = 1.0 - smoothstep(-0.2, 0.08, sunHeight);
        color += texture2D(uNightMap, vUv).rgb * night * (1.0 - clouds * 0.85) * 0.8;
        color = mix(color, vec3(0.94, 0.97, 1.0) * (0.025 + daylight * 1.1), clouds * 0.85);
        float rim = pow(1.0 - max(dot(normal, viewDir), 0.0), 4.0);
        color += vec3(0.12, 0.35, 0.65) * rim * smoothstep(-0.12, 0.35, sunHeight) * 0.23;
      }
      gl_FragColor = vec4(color, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      return;
    }

    // 2. Diffuse shading (Lambertian)
    float diffuse = max(0.07, sunHeight * ringTransmission()); // Keep a tiny ambient base light on dark side

    // 3. Generate Planet Surface Texturing
    vec3 surfaceColor = vec3(0.0);
    vec3 sphereNorm = normalize(vLocalPosition);

    if (uPlanetType == 0) {
      // Rocky / Cratered Planet (Mercury, Mars)
      float n = snoise(sphereNorm * uNoiseFreq) * 0.5 + 0.5;
      // Add craters
      float craters = snoise(sphereNorm * uNoiseFreq * 4.5);
      craters = step(0.6, craters) * (craters - 0.6) * 1.5;

      float finalNoise = clamp(n - craters * 0.35, 0.0, 1.0);
      surfaceColor = mix(uColor1, uColor2, finalNoise);
      surfaceColor = mix(surfaceColor, uColor3, craters);

    } else if (uPlanetType == 1) {
      // Banded Gas Giant (Jupiter, Saturn)
      // Skew the noise along latitude lines
      float bandCoord = sphereNorm.y * uNoiseFreq;
      float bandNoise = snoise(vec3(0.0, bandCoord, 0.0)) * 0.5 + 0.5;

      // Fine-grained turbulence waves
      float wave = snoise(sphereNorm * 8.0 + vec3(uTime * 0.05, 0.0, 0.0)) * 0.12;
      float finalNoise = clamp(bandNoise + wave, 0.0, 1.0);

      surfaceColor = mix(uColor1, uColor2, finalNoise);
      surfaceColor = mix(surfaceColor, uColor3, sin(bandCoord * 3.0) * 0.5 + 0.5);

    } else {
      // Water / Earth-like Planet (Earth)
      // Noise determines land vs water
      float continentShape = snoise(sphereNorm * uNoiseFreq) * 0.5 + 0.5;

      if (continentShape > 0.46) {
        // Land
        float vegNoise = snoise(sphereNorm * (uNoiseFreq * 2.5)) * 0.5 + 0.5;
        surfaceColor = mix(uColor2, uColor3, vegNoise); // Blend land colors

        // Add mountain highlights
        if (continentShape > 0.65) {
          surfaceColor = mix(surfaceColor, vec3(0.9, 0.9, 0.95), (continentShape - 0.65) * 2.5); // Snow peaks
        }
      } else {
        // Water
        float waterNoise = snoise(sphereNorm * 12.0) * 0.5 + 0.5;
        surfaceColor = mix(uColor1, uColor1 * 1.2, waterNoise);
      }

      // Floating Cloud layer (slightly animated in fragment space)
      float clouds = snoise(sphereNorm * 4.5 + vec3(uTime * 0.02, uTime * 0.015, uTime * 0.01));
      clouds = smoothstep(0.4, 0.8, clouds) * 0.6; // Cloud intensity
      surfaceColor = mix(surfaceColor, vec3(0.95, 0.95, 0.95), clouds);
    }

    // Apply final lighting shading
    gl_FragColor = vec4(surfaceColor * diffuse, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

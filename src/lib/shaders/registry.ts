import * as THREE from "three";
import { surfaceVertexShader, surfaceFragmentShader } from "./surface.glsl";
import type { ShaderType } from "@/data/bodies/types";

// Minimal structural shape the surface uniforms need — avoids coupling the
// shader registry to the full body data type.
interface SurfaceUniformInput {
  surfaceColors: string[];
  noiseScale?: number;
  noiseFreq?: number;
}

// Default noise params if a body doesn't specify them (the old code used these
// fallbacks for non-Earth rocky/banded planets).
const DEFAULT_NOISE_SCALE = 0.25;

interface SurfaceShaderEntry {
  vertex: string;
  fragment: string;
  planetType: number; // uPlanetType int branch in the surface fragment shader
  defaultNoiseFreq: number; // used when a body omits noiseFreq
  makeUniforms: (body: SurfaceUniformInput) => Record<string, THREE.IUniform>;
}

function makeSurfaceUniforms(
  body: SurfaceUniformInput,
  planetType: number,
  defaultNoiseFreq: number
): Record<string, THREE.IUniform> {
  const c1 = new THREE.Color(body.surfaceColors[0]);
  const c2 = new THREE.Color(body.surfaceColors[1]);
  const c3 = new THREE.Color(body.surfaceColors[2] || body.surfaceColors[1]);
  return {
    uColor1: { value: c1 },
    uColor2: { value: c2 },
    uColor3: { value: c3 },
    uNoiseScale: { value: body.noiseScale ?? DEFAULT_NOISE_SCALE },
    uNoiseFreq: { value: body.noiseFreq ?? defaultNoiseFreq },
    uPlanetType: { value: planetType },
    uSunPosition: { value: new THREE.Vector3(0, 0, 0) },
    uTime: { value: 0 }
  };
}

// Surface shader registry, keyed by the body's shaderType. "star" is handled
// by a dedicated component path (its own shaders/uniforms), so it is not here.
export const SURFACE_SHADERS: Record<
  Exclude<ShaderType, "star">,
  SurfaceShaderEntry
> = {
  rocky: {
    vertex: surfaceVertexShader,
    fragment: surfaceFragmentShader,
    planetType: 0,
    defaultNoiseFreq: 3.5,
    makeUniforms: (b) => makeSurfaceUniforms(b, 0, 3.5)
  },
  banded: {
    vertex: surfaceVertexShader,
    fragment: surfaceFragmentShader,
    planetType: 1,
    defaultNoiseFreq: 5.0,
    makeUniforms: (b) => makeSurfaceUniforms(b, 1, 5.0)
  },
  water: {
    vertex: surfaceVertexShader,
    fragment: surfaceFragmentShader,
    planetType: 2,
    defaultNoiseFreq: 2.5,
    makeUniforms: (b) => makeSurfaceUniforms(b, 2, 2.5)
  }
};

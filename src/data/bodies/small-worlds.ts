import type { PlanetBody, ParticleFieldConfig, J2000Elements } from './types';
// Rounded two-body elements for exploration, not navigational ephemerides.
function elements(a: number, e: number, i: number, node: number, peri: number, mean: number, period: number): J2000Elements {
  return { semiMajorAxisAU: a, eccentricity: e, inclinationDeg: i, longitudeAscendingNodeDeg: node,
    longitudePerihelionDeg: node + peri, meanLongitudeDeg: node + peri + mean,
    ratesPerCentury: { semiMajorAxisAU: 0, eccentricity: 0, inclinationDeg: 0,
      longitudeAscendingNodeDeg: 0, longitudePerihelionDeg: 0, meanLongitudeDeg: 360 * 36525 / period } };
}
function world(id: string, name: string, category: 'dwarf planet' | 'comet', radius: number, a: number,
  e: number, period: number, rotation: number, tilt: number, color: string, description: string,
  mass: string, temperature: string, i: number, node: number, peri: number, mean: number): PlanetBody {
  return { type: 'planet', category, id, name, radius, distance: a, eccentricity: e,
    orbitalPeriod: period, rotationPeriod: rotation, axialTilt: tilt, baseColor: color,
    surfaceColors: ['#302c2a', color, '#e1d6c3'], shaderType: 'rocky', description, mass, temperature,
    ephemeris: elements(a, e, i, node, peri, mean, period),
    funFacts: ['Shown with an approximate two-body orbit and a procedural surface.'] };
}
export const SMALL_WORLDS: PlanetBody[] = [
  world('ceres', 'Ceres', 'dwarf planet', 469.7, 2.7675, 0.0758, 1681.63, 9.074, 4, '#aaa599', 'The largest body in the asteroid belt, explored by NASA’s Dawn mission.', '0.000938', '−105 °C', 10.594, 80.305, 73.597, 77.37),
  world('pluto', 'Pluto', 'dwarf planet', 1188.3, 39.482, 0.2488, 90560, -153.2935, 119.6, '#c9aa91', 'An icy dwarf planet in the Kuiper Belt, accompanied by its large moon Charon. The pair is shown with a simplified parent-centered orbit.', '0.01303', '−229 °C', 17.14, 110.30, 113.76, 14.53),
  world('halley', '1P/Halley', 'comet', 5.5, 17.834, 0.9671, 27509, 52.8, 0, '#a5cbd0', 'A periodic comet on a steep retrograde orbit. Its activity and tail increase near the Sun. The orbit here is illustrative, not a prediction of its next return.', '0.00000000022', 'Variable', 162.26, 58.42, 111.33, 66.3),
  world('67p', '67P/Churyumov–Gerasimenko', 'comet', 1.65, 3.463, 0.64, 2352, 12.4, 52, '#859caa', 'The small comet explored by ESA’s Rosetta spacecraft. This spherical rendering represents its mean size rather than its bilobed shape.', '0.00000000001', 'Variable', 7.04, 50.18, 12.78, 0),
];
export const kuiperBelt: ParticleFieldConfig = {
  id: 'kuiper-belt', count: 1800, minAU: 30, maxAU: 50, color: '#92a8c7', sizeRange: [0.06, 0.18], inclination: 0.3
};

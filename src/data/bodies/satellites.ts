import type { MoonBody } from './types';
// Rounded mean dimensions/periods: https://ssd.jpl.nasa.gov/sats/phys_par/
// Illustrative phases and equatorial planes, not precision satellite ephemerides.
function satellite(id: string, name: string, parentId: string, radius: number, distanceKm: number,
  parentRadius: number, period: number, eccentricity: number, inclinationDeg: number,
  color: string, description: string, mass: string, temperature: string, phase: number): MoonBody {
  return { type: 'moon', id, name, parentId, radius, distance: distanceKm / parentRadius,
    orbitalPeriod: period, rotationPeriod: period * 24, axialTilt: 0, eccentricity,
    inclinationDeg, referencePlane: 'equator', meanAnomalyDeg: phase, tidallyLocked: true,
    baseColor: color, surfaceColors: ['#343137', color, '#eee4d6'], shaderType: 'rocky',
    description, mass, temperature, funFacts: ['Rotation is synchronized with its orbit. Satellite phases are illustrative.'] };
}
export const satellites: MoonBody[] = [
  satellite('io', 'Io', 'jupiter', 1821.6, 421800, 69911, 1.769138, 0.0041, 0.04, '#d8bd61', 'A sulfur-colored volcanic world orbiting Jupiter.', '0.0893', '−143 °C', 20),
  satellite('europa', 'Europa', 'jupiter', 1560.8, 671100, 69911, 3.551181, 0.0094, 0.47, '#c9bba0', 'A fractured ice shell covers a global ocean beneath the surface.', '0.048', '−163 °C', 120),
  satellite('ganymede', 'Ganymede', 'jupiter', 2634.1, 1070400, 69911, 7.154553, 0.0013, 0.20, '#9b9180', 'The largest moon in the Solar System, larger in diameter than Mercury.', '0.1482', '−163 °C', 210),
  satellite('callisto', 'Callisto', 'jupiter', 2410.3, 1882700, 69911, 16.689018, 0.0074, 0.28, '#807568', 'An ancient, heavily cratered moon on the outside of the Galilean system.', '0.1076', '−139 °C', 300),
  satellite('enceladus', 'Enceladus', 'saturn', 252.1, 238400, 58232, 1.370218, 0.0047, 0.02, '#dce9ee', 'A small icy moon with south-polar plumes fed by a subsurface ocean.', '0.000108', '−201 °C', 45),
  satellite('titan', 'Titan', 'saturn', 2574.7, 1221900, 58232, 15.945421, 0.0288, 0.33, '#d2a452', 'Saturn’s largest moon has a thick nitrogen atmosphere and lakes of liquid hydrocarbons.', '0.1345', '−179 °C', 180),
  satellite('triton', 'Triton', 'neptune', 1353.4, 354800, 24622, 5.876854, 0.000016, 156.865, '#cbbbbb', 'Neptune’s largest moon travels in a retrograde orbit, probably after being captured.', '0.0214', '−235 °C', 80),
];
export const charon = satellite('charon', 'Charon', 'pluto', 606, 19596, 1188.3, 6.38723, 0.0002, 0, '#ada29c', 'Charon is about half Pluto’s diameter. Both worlds keep the same face toward each other.', '0.001586', '−220 °C', 0);

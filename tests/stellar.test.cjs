/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS test harness installs a TypeScript loader. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  module._compile(ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020
  }}).outputText, filename);
};
const { equatorialToGalactic, galacticToScene, absoluteMagnitude } = require('../src/lib/stellar-coords.ts');
const { stellarRadius, stellarDistanceLy, sceneDistanceToLy } = require('../src/data/scales.ts');
const { GALACTIC_CENTER_DIRECTION } = require('../src/data/galaxy.ts');
const { NEARBY_STARS, CONSTELLATION_LINES, getStarById } = require('../src/data/stars.ts');

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a) => Math.hypot(...a);

test('Sgr A* lies toward the galactic centre (l ≈ 0, b ≈ 0)', () => {
  const g = equatorialToGalactic(17.7611, -29.0078);
  assert.ok(g[0] > 0.9999, `x=${g[0]}`);
});

test('north galactic pole maps to +Y and the galactic centre to the Galaxy layer direction', () => {
  const pole = galacticToScene(equatorialToGalactic(12.8573, 27.128));
  assert.ok(pole[1] > 0.9999, `y=${pole[1]}`);
  const gc = galacticToScene(equatorialToGalactic(17.7611, -29.0078));
  assert.ok(dot(gc, GALACTIC_CENTER_DIRECTION) > 0.9999);
});

test('scene mapping is a rotation (keeps lengths, right-handed)', () => {
  const x = galacticToScene([1, 0, 0]), y = galacticToScene([0, 1, 0]), z = galacticToScene([0, 0, 1]);
  const cross = [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]];
  [x, y, z].forEach((v) => assert.ok(Math.abs(len(v) - 1) < 1e-9));
  assert.ok(dot(cross, z) > 0.9999);
});

test('log compression is monotonic and invertible, and the HUD uses it', () => {
  for (const ly of [1, 4.37, 100, 2600]) assert.ok(Math.abs(stellarDistanceLy(stellarRadius(ly)) - ly) < 1e-9 * ly + 1e-9);
  assert.ok(stellarRadius(4.37) < stellarRadius(25) && stellarRadius(25) < stellarRadius(2600));
  assert.ok(Math.abs(sceneDistanceToLy('stellar', stellarRadius(8.6)) - 8.6) < 1e-9);
});

test('catalog stars keep real distance order in the scene', () => {
  const r = (id) => len(getStarById(id).position);
  assert.ok(r('alpha-centauri') < r('vega'), 'α Cen nearer than Vega');
  assert.ok(r('sirius') < r('betelgeuse') && r('betelgeuse') < r('deneb'));
  for (const s of NEARBY_STARS) assert.ok(Math.abs(stellarDistanceLy(len(s.position)) - s.distanceLy) < 1e-6 * s.distanceLy);
});

test('Sirius is absolute magnitude ≈ 1.4', () => {
  assert.ok(Math.abs(absoluteMagnitude(-1.46, 8.6) - 1.43) < 0.05);
});

test('catalog ids are unique and every constellation line resolves', () => {
  const ids = new Set(NEARBY_STARS.map((s) => s.id));
  assert.equal(ids.size, NEARBY_STARS.length);
  for (const c of CONSTELLATION_LINES) for (const [a, b] of c.pairs) assert.ok(ids.has(a) && ids.has(b), `${c.name}: ${a}-${b}`);
});

test('Orion belt stars sit close together on the sky as seen from the Sun', () => {
  const dir = (id) => { const p = getStarById(id).position; const l = len(p); return p.map((v) => v / l); };
  const ang = (a, b) => Math.acos(Math.min(1, dot(dir(a), dir(b)))) * 180 / Math.PI;
  assert.ok(ang('mintaka', 'alnitak') < 3.5, 'belt spans ~2.7°');
  assert.ok(ang('betelgeuse', 'rigel') > 15 && ang('betelgeuse', 'rigel') < 22, 'Betelgeuse–Rigel ~18.5°');
});

const { PLANET_SYSTEMS, habitableZone } = require('../src/data/exoplanets.ts');

test('every planet system belongs to a catalog star', () => {
  for (const id of Object.keys(PLANET_SYSTEMS)) assert.ok(getStarById(id), id);
});

test("the Sun's habitable zone brackets Earth", () => {
  const [inner, outer] = habitableZone(1);
  assert.ok(inner < 1 && outer > 1.2);
});

test("orbits obey Kepler's third law with a plausible stellar mass", () => {
  for (const [id, sys] of Object.entries(PLANET_SYSTEMS)) {
    const masses = sys.planets.map((p) => p.aAU ** 3 / (p.periodDays / 365.25) ** 2);
    for (const m of masses) assert.ok(m > 0.05 && m < 3, `${id}: implied mass ${m.toFixed(3)} M☉`);
    // All planets of one star must imply the same mass (within 15%).
    assert.ok(Math.max(...masses) / Math.min(...masses) < 1.15, `${id}: ${masses.map((m) => m.toFixed(3))}`);
  }
});

const { decodeStarRecords, bvToKelvin, kelvinToRgb, buildStarField } = require('../src/lib/star-catalog.ts');

test('the shipped HYG file decodes: ~8.7k naked-eye stars, Sirius where it should be', () => {
  const buf = fs.readFileSync(require('node:path').join(__dirname, '../public/data/hyg-naked-eye.bin'));
  assert.ok(buf.length < 100_000, `catalog is ${buf.length} bytes`);
  const stars = decodeStarRecords(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length));
  assert.ok(stars.length > 8000 && stars.length < 10000);
  assert.ok(stars.every((s) => s.mag <= 6.5 && s.distanceLy > 4 && s.distanceLy < 5000));
  const sirius = stars.reduce((a, b) => (b.mag < a.mag ? b : a));
  assert.ok(Math.abs(sirius.raHours - 6.7525) < 0.01 && Math.abs(sirius.decDeg + 16.716) < 0.05);
  assert.ok(Math.abs(sirius.distanceLy - 8.6) < 0.1);
  const field = buildStarField(stars.slice(0, 10));
  assert.equal(field.positions.length, 30);
  assert.ok(field.colors.every((c) => c >= 0 && c <= 1));
});

test('B−V colours: the Sun ~5,800 K and yellow-white, hot stars blue, cool stars red', () => {
  assert.ok(Math.abs(bvToKelvin(0.65) - 5800) < 200);
  const [r1, , b1] = kelvinToRgb(bvToKelvin(-0.2));
  const [r2, , b2] = kelvinToRgb(bvToKelvin(1.8));
  assert.ok(b1 > r1 && r2 > b2);
});

const { GALACTIC_OBJECTS, SUN_GALAXY_POSITION: SUN_G, ARM_LABELS } = require('../src/data/galaxy.ts');
const { positionFromSun } = require('../src/lib/stellar-coords.ts');
const { LY_PER_UNIT } = require('../src/data/scales.ts');

test('galaxy scale: Sun ~26,000 ly from Sgr A*, directly toward +Z (below the centre in the image)', () => {
  const ly = Math.hypot(...SUN_G) * LY_PER_UNIT.galaxy;
  assert.ok(Math.abs(ly - 26_150) < 300, `${ly}`);
  assert.ok(Math.abs(SUN_G[0]) < 1e-9 && SUN_G[2] > 0);
});

test('galactic objects: Sgr dwarf lies beyond the centre, globulars off the plane, Magellanic Clouds south', () => {
  const pos = (id) => { const o = GALACTIC_OBJECTS.find((x) => x.id === id); return positionFromSun(SUN_G, o.lDeg, o.bDeg, o.distanceLy, LY_PER_UNIT.galaxy); };
  assert.ok(pos('sgr-dsph')[2] < 0, 'Sagittarius dwarf is on the far side of the centre');
  assert.ok(pos('m13')[1] > 0 && pos('47-tuc')[1] < 0);
  assert.ok(pos('lmc')[1] < 0 && pos('smc')[1] < 0);
  const lmcLy = Math.hypot(...pos('lmc').map((v, i) => v - SUN_G[i])) * LY_PER_UNIT.galaxy;
  assert.ok(Math.abs(lmcLy - 163_000) < 1);
});

test('arm labels sit inside the painted disc', () => {
  for (const a of ARM_LABELS) assert.ok(Math.hypot(...a.position) < 2025, a.name);
});

const { PLACED_LOCAL_GROUP, LOCAL_GROUP_LY_PER_UNIT } = require('../src/data/localGroup.ts');
const { equatorialToLB } = require('../src/lib/stellar-coords.ts');

test('Local Group: disc orientations agree with the catalog positions and inclinations', () => {
  for (const m of PLACED_LOCAL_GROUP.filter((x) => x.disc)) {
    const [l, b] = equatorialToLB(m.disc.raHours, m.disc.decDeg);
    assert.ok(Math.abs(l - m.lDeg) < 0.1 && Math.abs(b - m.bDeg) < 0.1, `${m.id}: l=${l.toFixed(2)} b=${b.toFixed(2)}`);
    const los = m.position.map((v) => v / len(m.position));
    assert.ok(Math.abs(len(m.normal) - 1) < 1e-9);
    // Angle between the disc normal and our line of sight = inclination
    // (line of sight from the rounded catalog l/b, hence 0.2°).
    const tilt = Math.acos(Math.abs(dot(m.normal, los))) * 180 / Math.PI;
    assert.ok(Math.abs(tilt - m.disc.inclinationDeg) < 0.2, `${m.id} tilt ${tilt}`);
  }
});

test('Local Group: Andromeda 2.54 Mly away, below the Milky Way plane; all members within ~3.1 Mly', () => {
  const m31 = PLACED_LOCAL_GROUP.find((m) => m.id === 'm31');
  assert.ok(Math.abs(len(m31.position) * LOCAL_GROUP_LY_PER_UNIT - 2.54e6) < 1);
  assert.ok(m31.position[1] < 0);
  for (const m of PLACED_LOCAL_GROUP) assert.ok(len(m.position) * LOCAL_GROUP_LY_PER_UNIT < 3.1e6, m.id);
});

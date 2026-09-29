/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS test harness installs a TypeScript loader. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
// Compile the small pure simulation modules without a browser or extra runner.
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  module._compile(ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020
  }}).outputText, filename);
};
const { useSolarSystemStore: store } = require('../src/store/solarSystemStore.ts');
const { rotationAtDays, simulationDays, DAY_MS, MAX_SIMULATION_MS } = require('../src/lib/simulation-time.ts');
const { planetPosition, moonPosition, moonOrbitRadius } = require('../src/lib/body-position.ts');
const { earth } = require('../src/data/bodies/earth.ts');
const { venus } = require('../src/data/bodies/venus.ts');
const { moon } = require('../src/data/bodies/moon.ts');
const epoch = Date.UTC(2026, 8, 19, 12);

function reset() { store.getState().setSimulationDate(epoch); }

test('pause freezes the complete simulation date even if wall time changes', () => {
  reset();
  const before = store.getState();
  const now = Date.now;
  try {
    Date.now = () => epoch + 10 * DAY_MS;
    store.getState().updateTime(60);
    assert.equal(store.getState().epochMs, before.epochMs);
    assert.equal(store.getState().elapsedTime, before.elapsedTime);
  } finally { Date.now = now; }
});
test('one day/second advances one day; reverse and pause preserve the chosen direction', () => {
  reset();
  store.getState().setTimeScale(1);
  store.getState().updateTime(1);
  assert.equal(store.getState().elapsedTime, 1);
  store.getState().reverseTime();
  store.getState().togglePaused();
  store.getState().updateTime(20);
  assert.equal(store.getState().elapsedTime, 1);
  store.getState().togglePaused();
  assert.equal(store.getState().timeScale, -1);
  store.getState().updateTime(1);
  assert.equal(store.getState().elapsedTime, 0);
});
test('planet rotation is deterministic, completes a turn per period, and supports retrograde', () => {
  const hours = earth.rotationPeriod;
  assert.ok(Math.abs(rotationAtDays(hours / 24, hours)) < 1e-10);
  assert.ok(Math.abs(rotationAtDays(hours / 48, hours) - Math.PI) < 1e-10);
  assert.ok(rotationAtDays(1, venus.rotationPeriod) < 0);
});
test('date changes pause playback and reproduce the same planet and Moon pose', () => {
  reset();
  const first = planetPosition(earth, epoch, 0, false);
  const lunar = moonPosition(moon, moonOrbitRadius(moon, earth, false), simulationDays(epoch, 0));
  store.getState().setTimeScale(100);
  store.getState().updateTime(5);
  assert.notDeepEqual(planetPosition(earth, epoch, store.getState().elapsedTime, false), first);
  reset();
  assert.equal(store.getState().isPaused, true);
  assert.deepEqual(planetPosition(earth, store.getState().epochMs, store.getState().elapsedTime, false), first);
  assert.deepEqual(moonPosition(moon, moonOrbitRadius(moon, earth, false), simulationDays(store.getState().epochMs, 0)), lunar);
});
test('playback stops at the orbital model boundary and rejects invalid dates', () => {
  store.getState().setSimulationDate(MAX_SIMULATION_MS - DAY_MS / 2);
  store.getState().setTimeScale(1);
  store.getState().updateTime(1);
  const state = store.getState();
  assert.equal(state.isPaused, true);
  assert.equal(state.epochMs + state.elapsedTime * DAY_MS, MAX_SIMULATION_MS);
  state.setSimulationDate(NaN);
  assert.equal(store.getState().epochMs, state.epochMs);
});
test('NOW selects the current wall date once and pauses', () => {
  reset();
  const now = Date.now;
  try {
    Date.now = () => epoch + DAY_MS;
    store.getState().resetTime();
    assert.equal(store.getState().epochMs, epoch + DAY_MS);
    assert.equal(store.getState().elapsedTime, 0);
    assert.equal(store.getState().isPaused, true);
  } finally { Date.now = now; }
});

const { BODIES, MOONS, getBodyById, getMoonsOfPlanet } = require('../src/data/bodies/index.ts');
const { KM_TO_SCENE, moonElements, orientMoon } = require('../src/lib/body-position.ts');
const { getScaledRadius, getScaledSunRadius, solveKeplerEquation, computeOrbitalPosition, applyOrbitalRotation } = require('../src/lib/orbital-mechanics.ts');

test('every satellite has a valid parent and requested systems are complete', () => {
  assert.equal(new Set(BODIES.map(b => b.id)).size, BODIES.length);
  assert.deepEqual(getMoonsOfPlanet('jupiter').map(b => b.id), ['io', 'europa', 'ganymede', 'callisto']);
  for (const m of MOONS) {
    assert.equal(getBodyById(m.parentId).type, 'planet');
    assert.ok(m.distance > 1);
    assert.ok(Math.abs(m.rotationPeriod) === m.orbitalPeriod * 24);
  }
  for (const id of ['titan', 'enceladus', 'triton', 'pluto', 'charon', 'ceres', 'halley', '67p']) assert.ok(getBodyById(id));
});
test('real sizes and real distances share a single km conversion', () => {
  assert.equal(getScaledRadius(earth.radius, true), earth.radius * KM_TO_SCENE);
  assert.ok(Math.abs(getScaledSunRadius(true) / getScaledRadius(earth.radius, true) - 695700 / earth.radius) < 1e-10);
  assert.ok(Math.abs(moonOrbitRadius(moon, earth, true) / getScaledRadius(earth.radius, true) - moon.distance) < 1e-10);
});
test('size and distance toggles are independent and system selection resets on individual focus', () => {
  store.setState({ realSizes: false, isRealisticScale: false });
  store.getState().toggleSizes();
  assert.equal(store.getState().isRealisticScale, false);
  store.getState().toggleScale();
  assert.equal(store.getState().realSizes, true);
  store.getState().exploreMoonSystem('jupiter');
  assert.equal(store.getState().moonSystemId, 'jupiter');
  store.getState().selectPlanet('io');
  assert.equal(store.getState().moonSystemId, null);
  store.getState().returnToOverview();
  assert.equal(store.getState().selectedPlanetId, null);
});
test('lunar plane precesses and orbit obeys its tilted plane', () => {
  const first = moonElements(moon, 0), later = moonElements(moon, 365.25);
  const nodeDrift = (later.longitudeAscendingNodeRad - first.longitudeAscendingNodeRad) * 180 / Math.PI;
  assert.ok(Math.abs(nodeDrift + 19.34136) < 0.001);
  const p = moonPosition(moon, 100, 120);
  const x = orientMoon(moon, [1, 0, 0], 120), z = orientMoon(moon, [0, 0, 1], 120);
  const normal = [z[1]*x[2]-z[2]*x[1], z[2]*x[0]-z[0]*x[2], z[0]*x[1]-z[1]*x[0]];
  assert.ok(Math.abs(p.reduce((sum, v, i) => sum + v * normal[i], 0)) < 1e-10);
});
test('Triton moves retrograde and satellite radius stays within periapsis/apoapsis bounds', () => {
  const m = getBodyById('triton');
  const p = moonPosition(m, 100, 0), q = moonPosition(m, 100, 0.001);
  assert.ok(p[2]*q[0] - p[0]*q[2] < 0);
  for (const m of MOONS) for (const day of [-1000, 0, 2000]) {
    const r = Math.hypot(...moonPosition(m, 100, day, getBodyById(m.parentId).axialTilt));
    assert.ok(r >= 100 * (1-m.eccentricity) - 1e-8 && r <= 100 * (1+m.eccentricity) + 1e-8);
  }
});
test('high-eccentricity comets converge near perihelion and across negative dates', () => {
  for (const M of [-100, -0.1, -0.001, 0, 0.001, 0.1, 100]) {
    const E = solveKeplerEquation(M, 0.9671);
    const wrapped = ((M + Math.PI) % (2*Math.PI) + 2*Math.PI) % (2*Math.PI) - Math.PI;
    assert.ok(Math.abs(E - 0.9671 * Math.sin(E) - wrapped) < 1e-9);
  }
});
test('positive orbital motion uses the same Y-up convention as orbital rotations', () => {
  const p = computeOrbitalPosition(1, 0, 4, 1, true);
  assert.ok(Math.abs(p[0]) < 1e-10 && Math.abs(p[2] + 150) < 1e-10);
  const q = applyOrbitalRotation([150,0,0], { inclinationRad: 0, longitudeAscendingNodeRad: Math.PI/2, argumentOfPeriapsisRad: 0 });
  assert.ok(Math.abs(q[2] - p[2]) < 1e-10);
});

test('lunar rotation follows sidereal mean longitude and retains small optical libration', () => {
  const a = moonElements(moon, 0), b = moonElements(moon, 1);
  const longitude = e => e.longitudeAscendingNodeRad + e.argumentOfPeriapsisRad + e.meanAnomaly;
  const advance = ((longitude(b) - longitude(a)) % (2*Math.PI) + 2*Math.PI) % (2*Math.PI);
  assert.ok(Math.abs(advance * moon.orbitalPeriod - 2*Math.PI) < 5e-5);
  for (const day of [0, 7, 14, 21, 1000, -1000]) {
    const e = moonElements(moon, day);
    const spin = e.meanAnomaly + Math.PI;
    const face = applyOrbitalRotation([Math.cos(spin), 0, -Math.sin(spin)], {
      ...e, inclinationRad: e.inclinationRad - moon.axialTilt * Math.PI / 180
    });
    const offset = moonPosition(moon, 1, day);
    const facingParent = -face.reduce((sum, value, i) => sum + value*offset[i], 0)/Math.hypot(...offset);
    assert.ok(facingParent > 0.98, `near side drifted from Earth at day ${day}`);
  }
});

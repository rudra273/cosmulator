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

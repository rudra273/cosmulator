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
const { ANCHORS, LAYER_ORDER, LY_PER_UNIT, anchorBetween, outerOf, innerOf } = require('../src/data/scales.ts');
const { SUN_GALAXY_POSITION } = require('../src/data/galaxy.ts');
const { planHandoff, outgoingTransform, toIncoming, interpolateCamera } = require('../src/lib/scale-transition.ts');
const { useSolarSystemStore: store } = require('../src/store/solarSystemStore.ts');

const close = (a, b, eps = 1e-6) => a.forEach((v, i) => assert.ok(Math.abs(v - b[i]) < eps * Math.max(1, Math.abs(b[i])), `${a} ≉ ${b}`));

test('every adjacent pair of layers shares exactly one anchor', () => {
  for (let i = 0; i < LAYER_ORDER.length - 1; i++) {
    const a = anchorBetween(LAYER_ORDER[i], LAYER_ORDER[i + 1]);
    assert.ok(a, `${LAYER_ORDER[i]}→${LAYER_ORDER[i + 1]}`);
    assert.equal(outerOf(a.inner), a.outer);
    assert.equal(innerOf(a.outer), a.inner);
  }
  assert.equal(ANCHORS.filter((a) => LAYER_ORDER.includes(a.inner)).length, LAYER_ORDER.length - 1);
});

test('the Sun anchor in the galaxy is the Orion Spur marker at a realistic radius', () => {
  const a = anchorBetween('stellar', 'galaxy');
  assert.deepEqual(a.positionInOuter, SUN_GALAXY_POSITION);
  const ly = Math.hypot(SUN_GALAXY_POSITION[0], SUN_GALAXY_POSITION[2]) * LY_PER_UNIT.galaxy;
  assert.ok(ly > 20_000 && ly < 30_000, `Sun at ${ly} ly`);
});

test('layer units grow outward', () => {
  for (let i = 0; i < LAYER_ORDER.length - 1; i++)
    assert.ok(LY_PER_UNIT[LAYER_ORDER[i + 1]] > LY_PER_UNIT[LAYER_ORDER[i]]);
});

for (const dir of ['ascend', 'descend']) {
  test(`${dir}: first transition frame matches the last steady frame`, () => {
    const [from, to] = dir === 'ascend' ? ['stellar', 'galaxy'] : ['galaxy', 'stellar'];
    const h = planHandoff(from, to, dir, { cameraDistance: 6650, incomingPoseDistance: 806, outgoingStuffScale: 0.8 });
    // A point of the outgoing layer, drawn with outgoingTransform, and the
    // camera converted with toIncoming keep the same relative geometry.
    const cam = [100, 2000, 300], p = [40, -10, 25];
    const { position, scale } = outgoingTransform(h);
    const drawn = p.map((v, i) => position[i] + v * scale);
    const camIn = toIncoming(h, cam);
    const before = p.map((v, i) => v - cam[i]), after = drawn.map((v, i) => v - camIn[i]);
    close(after.map(v => v / scale), before);
  });
}

test('ascend maps the Sun onto the Orion Spur marker, descend maps the marker onto the Sun', () => {
  const up = planHandoff('stellar', 'galaxy', 'ascend', { cameraDistance: 5000, incomingPoseDistance: 0 });
  close(toIncoming(up, [0, 0, 0]), SUN_GALAXY_POSITION);
  const down = planHandoff('galaxy', 'stellar', 'descend', { cameraDistance: 0, incomingPoseDistance: 806 });
  close(toIncoming(down, SUN_GALAXY_POSITION), [0, 0, 0]);
});

test('ascend handoff distance equals the anchor handoff', () => {
  const h = planHandoff('solar', 'stellar', 'ascend', { cameraDistance: 1330, incomingPoseDistance: 0 });
  const cam = toIncoming(h, [0, 0, 1330]);
  assert.ok(Math.abs(Math.hypot(...cam) - anchorBetween('solar', 'stellar').handoff.ascend) < 1e-6);
});

test('camera interpolation hits both endpoints and zooms geometrically', () => {
  const s = [0, 0, 10], e = [0, 0, 1000], o = [0, 0, 0];
  close(interpolateCamera(s, o, e, o, 0).position, s);
  close(interpolateCamera(s, o, e, o, 1).position, e);
  close(interpolateCamera(s, o, e, o, 0.5).position, [0, 0, 100]);
});

test('descend snapshots the outgoing pull-back; ascend chain runs through every layer to universe', () => {
  store.setState({ viewScale: 'galaxy', transitionFrom: null, cameraDistance: 13000 });
  store.getState().descendScale();
  const st = store.getState();
  assert.equal(st.viewScale, 'stellar');
  assert.equal(st.transitionDir, 'descend');
  assert.ok(st.pullbackSnapshot.stuff < 1);
  store.setState({ viewScale: 'solar', transitionFrom: null });
  const seen = [];
  for (let i = 0; i < 6; i++) { store.getState().ascendScale(); seen.push(store.getState().viewScale); store.getState().clearTransition(); }
  assert.deepEqual(seen, ['stellar', 'galaxy', 'localGroup', 'cosmicWeb', 'universe', 'universe']);
});

test('a transition cannot start while another is in flight', () => {
  store.setState({ viewScale: 'stellar', transitionFrom: null, transitionDir: null });
  store.getState().ascendScale();
  store.getState().descendScale(); // e.g. a marker click mid-flight
  assert.equal(store.getState().viewScale, 'galaxy');
  assert.equal(store.getState().transitionFrom, 'stellar');
  store.getState().ascendScale();
  assert.equal(store.getState().viewScale, 'galaxy');
  store.getState().clearTransition();
});

const nav = require('../src/lib/navigation.ts');

test('routes pass through every layer in between, including the Sgr A* branch', () => {
  const r = (a, b) => nav.routeBetween(a, b).map((s) => `${s.dir[0]}:${s.to}`).join(' ');
  assert.equal(r('solar', 'galaxy'), 'a:stellar a:galaxy');
  assert.equal(r('universe', 'solar'), 'd:cosmicWeb d:localGroup d:galaxy d:stellar d:solar');
  assert.equal(r('solar', 'galacticCenter'), 'a:stellar a:galaxy d:galacticCenter');
  assert.equal(r('galacticCenter', 'localGroup'), 'a:galaxy a:localGroup');
  assert.equal(r('galacticCenter', 'stellar'), 'a:galaxy d:stellar');
  assert.equal(r('galaxy', 'galaxy'), '');
});

test('URL params round-trip and reject unknown views', () => {
  assert.equal(nav.parseViewParam('GALACTICCENTER'), 'galacticCenter');
  assert.equal(nav.parseViewParam('localGroup'), 'localGroup');
  assert.equal(nav.parseViewParam('mordor'), null);
  assert.equal(nav.viewQuery('solar'), '');
  assert.equal(nav.viewQuery('stellar', { star: 'sirius' }), '?view=stellar&star=sirius');
  assert.equal(nav.viewQuery('galaxy', { star: 'sirius' }), '?view=galaxy');
});

test('scale bar lengths are 1, 2 or 5 × 10^n', () => {
  assert.equal(nav.niceLength(7300), 5000);
  assert.equal(nav.niceLength(19.9), 10);
  assert.equal(nav.niceLength(2.5e9), 2e9);
});

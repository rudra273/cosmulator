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
const { S_STARS, periodYears, pericentreAu, semiMajorAu, sStarPositionAu, orbitPathAu, speedKmS } = require('../src/data/sStars.ts');
const { J2000_MS } = require('../src/lib/simulation-time.ts');

const len = (a) => Math.hypot(...a);
const s2 = S_STARS.find((s) => s.id === 's2');
const yearMs = (y) => J2000_MS + (y - 2000) * 365.25 * 86400000;

test('S2: 16-year orbit reaching ~120 AU at ~7,700 km/s', () => {
  assert.ok(Math.abs(periodYears(s2) - 16.0) < 0.4, `P=${periodYears(s2)}`);
  assert.ok(Math.abs(pericentreAu(s2) - 121) < 5, `peri=${pericentreAu(s2)}`);
  const v = speedKmS(s2, pericentreAu(s2));
  assert.ok(v > 7400 && v < 7900, `v=${v}`);
});

test('S2 is at pericentre in May 2018 and near apocentre eight years later', () => {
  assert.ok(Math.abs(len(sStarPositionAu(s2, yearMs(2018.38))) - pericentreAu(s2)) < 1);
  const apo = semiMajorAu(s2) * (1 + s2.e);
  assert.ok(len(sStarPositionAu(s2, yearMs(2026.38))) > apo * 0.98);
});

test('positions follow the orbit and repeat after one period', () => {
  for (const s of S_STARS) {
    const t = yearMs(2024.7);
    const p = sStarPositionAu(s, t);
    const q = sStarPositionAu(s, t + periodYears(s) * 365.25 * 86400000);
    assert.ok(len([p[0] - q[0], p[1] - q[1], p[2] - q[2]]) < 1e-6 * semiMajorAu(s), s.id);
    const path = orbitPathAu(s);
    const nearest = Math.min(...path.map((x) => len([x[0] - p[0], x[1] - p[1], x[2] - p[2]])));
    assert.ok(nearest < semiMajorAu(s) * 0.05, `${s.id} ${nearest}`);
    // Published periods agree with Kepler's law for the black hole's mass.
    const { keplerPeriodYears } = require('../src/data/sStars.ts');
    assert.ok(Math.abs(keplerPeriodYears(s) / periodYears(s) - 1) < 0.04, `${s.id} P=${periodYears(s)} vs ${keplerPeriodYears(s)}`);
  }
});

const G = require('../src/data/galaxy.ts');
const { galacticDirection } = require('../src/lib/stellar-coords.ts');

test('the Sun laps the galaxy in ~210–230 million years at ~230 km/s', () => {
  assert.ok(G.SUN_ORBIT_PERIOD_MYR > 200 && G.SUN_ORBIT_PERIOD_MYR < 235, `P=${G.SUN_ORBIT_PERIOD_MYR}`);
  assert.ok(Math.abs(G.SUN_ORBIT_RADIUS_LY - 26150) < 300);
});

test('the Sun moves toward galactic longitude 90° (clockwise from the north pole)', () => {
  const now = G.SUN_GALAXY_POSITION;
  const later = G.rotateAboutAxis(now, G.rotationAngle(G.angularSpeedRadPerMyr(G.SUN_ORBIT_RADIUS_LY), 1));
  const v = [later[0] - now[0], later[1] - now[1], later[2] - now[2]];
  const l90 = galacticDirection(90, 0);
  const cos = (v[0] * l90[0] + v[2] * l90[2]) / Math.hypot(...v);
  assert.ok(cos > 0.999, `cos=${cos}`);
});

test('inner stars lap outer ones; the spiral pattern is slower than the Sun', () => {
  assert.ok(G.angularSpeedRadPerMyr(10000) > G.angularSpeedRadPerMyr(26000));
  assert.ok(G.PATTERN_ANGULAR_SPEED < G.angularSpeedRadPerMyr(G.SUN_ORBIT_RADIUS_LY));
  // Pattern period ~240 Myr for 25 km/s/kpc.
  const P = (2 * Math.PI) / G.PATTERN_ANGULAR_SPEED;
  assert.ok(P > 230 && P < 250, `P=${P}`);
});

test('S2 next closest approach after 2026 is ~2034', () => {
  const { nextPericentreYear } = require('../src/data/infoCards.ts');
  assert.equal(nextPericentreYear(s2, 2026), 2034);
  assert.equal(nextPericentreYear(s2, 2018.38), 2018);
});

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
    // Periods from Kepler's law stay within the published range (13–200 yr).
    assert.ok(periodYears(s) > 12 && periodYears(s) < 200, `${s.id} P=${periodYears(s)}`);
  }
});

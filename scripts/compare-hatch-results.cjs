'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const [baselinePath, candidatePath] = process.argv.slice(2);
if (!baselinePath || !candidatePath) {
  throw new Error('Usage: node scripts/compare-hatch-results.cjs <baseline.json> <candidate.json>');
}

function readReport(file, label) {
  const report = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(report.status, 'PASS', label + ' browser report must pass');
  assert.deepEqual(report.errors, [], label + ' browser report must contain no page errors');
  assert.deepEqual(report.glErrors, [], label + ' browser report must contain no WebGL errors');
  assert.ok(Array.isArray(report.hatchObservations), label + ' hatch observations must be present');
  return report;
}

const cases = [
  { mode: 'mouse', grade: 'perfect' },
  { mode: 'mouse', grade: 'good' },
  { mode: 'touch', grade: 'perfect' },
];
const comparedFields = [
  'material', 'trait', 'cycles', 'grades', 'pristineDelta',
  'alliesBefore', 'alliesAfter', 'deployedDelta', 'reinforcedDelta', 'unitsGenerated',
];

function observationsByCase(report, label, baseline) {
  assert.equal(report.hatchObservations.length, cases.length, label + ' must record every hatch comparison case');
  const indexed = new Map();
  for (const observation of report.hatchObservations) {
    const key = observation.mode + ':' + observation.grade;
    assert.ok(cases.some(item => item.mode + ':' + item.grade === key), label + ' has an unexpected hatch case: ' + key);
    assert.equal(indexed.has(key), false, label + ' repeats hatch case ' + key);
    assert.equal(observation.baseline, baseline, label + ' marks baseline mode correctly for ' + key);
    const expectedGrades = { perfect: 0, good: 0, assist: 0 };
    expectedGrades[observation.grade] = observation.cycles;
    assert.deepEqual(observation.grades, expectedGrades, label + ' actual grade counts must match requested ' + key);
    indexed.set(key, observation);
  }
  for (const item of cases) {
    const key = item.mode + ':' + item.grade;
    assert.ok(indexed.has(key), label + ' is missing hatch case ' + key);
  }
  return indexed;
}

const baseline = readReport(baselinePath, 'Deployed baseline');
const candidate = readReport(candidatePath, 'PR candidate');
assert.equal(baseline.browser, candidate.browser, 'Baseline and candidate must use the same browser version');
const baselineCases = observationsByCase(baseline, 'Deployed baseline', true);
const candidateCases = observationsByCase(candidate, 'PR candidate', false);

for (const item of cases) {
  const key = item.mode + ':' + item.grade;
  const selectComparable = observation => Object.fromEntries(comparedFields.map(field => [field, observation[field]]));
  assert.deepEqual(
    selectComparable(candidateCases.get(key)),
    selectComparable(baselineCases.get(key)),
    'PR candidate gameplay result must match deployed baseline for ' + key,
  );
  console.log('PASS baseline/candidate actual hatch result matches: ' + key);
}

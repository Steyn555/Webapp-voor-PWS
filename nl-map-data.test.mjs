import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PROVINCES,
  LAYERS,
  getProvinceMetric,
  getNationalSummary,
  getRadarBlobs,
  getLayerConfig,
} from './nl-map-data.js';

test('all 12 Dutch provinces exist with valid paths and markers', () => {
  assert.equal(PROVINCES.length, 12);
  for (const province of PROVINCES) {
    assert.ok(province.id.length > 0);
    assert.ok(province.name.length > 0);
    assert.ok(province.paths.length >= 1);
    assert.ok(province.marker.x > 80 && province.marker.x < 340);
    assert.ok(province.marker.y > 40 && province.marker.y < 340);
  }
});

test('getProvinceMetric returns current numeric metrics without /100k suffix', () => {
  const utrecht = getProvinceMetric('utrecht', 'besmettingen');
  assert.equal(utrecht.value, 176);
  assert.equal(utrecht.formatted, '176');

  const rNumber = getProvinceMetric('noord-holland', 'rgetal');
  assert.equal(rNumber.formatted, 'R = 1,28');

  const vax = getProvinceMetric('drenthe', 'vaccin');
  assert.equal(vax.value, 82);
  assert.equal(vax.formatted, '82%');

  const unknown = getProvinceMetric('atlantis', 'besmettingen');
  assert.equal(unknown, null);
});

test('getNationalSummary computes population-weighted national number without /100k', () => {
  const summary = getNationalSummary('besmettingen');
  assert.equal(summary.label, 'Nederland');
  assert.ok(summary.value > 100 && summary.value < 220);
  assert.equal(summary.formatted, String(summary.value));

  const rSummary = getNationalSummary('rgetal');
  assert.ok(rSummary.formatted.startsWith('R = '));
});

test('getRadarBlobs returns 12 static current-state blobs matching layer', () => {
  const blobs = getRadarBlobs('rioolwater');
  assert.equal(blobs.length, 12);
  assert.equal(blobs[0].layerId, 'rioolwater');
});

test('getLayerConfig falls back to besmettingen when unknown layer requested', () => {
  assert.equal(LAYERS.length, 4);
  assert.equal(getLayerConfig('unknown').id, 'besmettingen');
  assert.equal(getLayerConfig('vaccin').label, 'Vaccinatiegraad');
});

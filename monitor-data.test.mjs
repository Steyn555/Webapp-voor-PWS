import test from 'node:test';
import assert from 'node:assert/strict';
import { PROVINCES, getNationalSummary } from './nl-map-data.js';
import {
  HISTORY_DAYS,
  NATIONAL_ID,
  getSeries,
  getCurrentStats,
  getTopRisers,
  getWeekly,
  getProvinceRows,
  getAgeDistribution,
  getForecast,
  SCENARIOS,
  HORIZONS,
} from './monitor-data.js';

test('elke regio heeft een reeks van 120 dagen die deterministisch is', () => {
  for (const p of PROVINCES) {
    const a = getSeries(p.id);
    const b = getSeries(p.id);
    assert.equal(a.cases.length, HISTORY_DAYS);
    assert.deepEqual(a.cases, b.cases, 'twee keer opvragen geeft dezelfde reeks voor ' + p.id);
    assert.ok(a.cases.every((v) => v > 0));
  }
  assert.equal(getSeries(NATIONAL_ID).cases.length, HISTORY_DAYS);
  assert.equal(getSeries('bestaat-niet'), null);
});

test('de laatste week besmettingen klopt exact met de kaartwaarde', () => {
  for (const p of PROVINCES) {
    const s = getSeries(p.id);
    let som = 0;
    for (let t = HISTORY_DAYS - 7; t < HISTORY_DAYS; t++) som += s.cases[t];
    assert.ok(
      Math.abs(som - p.base.besmettingen) < 0.01,
      `${p.name}: week som ${som.toFixed(2)} != kaart ${p.base.besmettingen}`
    );
  }
});

test('R-getal, vaccinatiegraad en rioolwater eindigen op de kaartwaarden', () => {
  for (const p of PROVINCES) {
    const s = getSeries(p.id);
    const laatste = HISTORY_DAYS - 1;
    assert.equal(s.r[laatste], p.base.rgetal, 'R-getal ' + p.name);
    assert.equal(s.vacc[laatste], p.base.vaccin, 'vaccinatiegraad ' + p.name);
    assert.equal(s.sewage[laatste], p.base.rioolwater, 'rioolwater ' + p.name);
  }
});

test('nationale cijfers zijn bevolkingsgewogen en kloppen met de kaart', () => {
  const st = getCurrentStats(NATIONAL_ID);
  const kaart = getNationalSummary('besmettingen');
  assert.equal(Math.round(st.cases7), kaart.value);
  assert.ok(st.populatie > 17000000);

  const rKaart = getNationalSummary('rgetal');
  assert.ok(Math.abs(st.r - rKaart.value) < 0.005, `R ${st.r} vs kaart ${rKaart.value}`);
});

test('actuele cijfers bevatten delta’s en afgeleide waarden', () => {
  const st = getCurrentStats('utrecht');
  assert.ok(typeof st.casesDeltaPct === 'number');
  assert.ok(st.hersteld > 0 && st.overleden >= 0);
  assert.ok(st.hosp > 0);
  assert.ok(st.hersteldDezeWeek > 0);
  assert.equal(getCurrentStats('atlantis'), null);
});

test('stijgers zijn aflopend gesorteerd en bevatten provincies', () => {
  const stijgers = getTopRisers(3);
  assert.equal(stijgers.length, 3);
  assert.ok(stijgers[0].deltaPct >= stijgers[1].deltaPct);
  assert.ok(stijgers[1].deltaPct >= stijgers[2].deltaPct);
  assert.ok(stijgers.every((s) => PROVINCES.some((p) => p.id === s.id)));
});

test('wekelijkse reeks heeft 12 positieve weken', () => {
  const weken = getWeekly(NATIONAL_ID, 12);
  assert.equal(weken.length, 12);
  assert.ok(weken.every((w) => w.waarde > 0 && w.label.length > 0));
});

test('provincietabel bevat Nederland en alle 12 provincies', () => {
  const { land, rijen } = getProvinceRows();
  assert.equal(land.naam, 'Nederland');
  assert.equal(rijen.length, 12);
  assert.ok(rijen.every((r) => r.inwoners > 0 && r.r > 0 && r.vaccin > 0));
});

test('leeftijdsverdeling telt op tot 100 procent', () => {
  for (const regio of [NATIONAL_ID, 'utrecht', 'limburg']) {
    const verdeling = getAgeDistribution(regio);
    assert.equal(verdeling.reduce((a, b) => a + b, 0), 100);
  }
});

test('voorspelling: band rondom de lijn en scenario’s in de juiste volgorde', () => {
  const trend = getForecast(NATIONAL_ID, 'trend', 14);
  const maatregelen = getForecast(NATIONAL_ID, 'maatregelen', 14);
  const variant = getForecast(NATIONAL_ID, 'variant', 14);

  for (const f of [trend, maatregelen, variant]) {
    assert.equal(f.punten.length, 14);
    for (const punt of f.punten) {
      assert.ok(punt.laag <= punt.waarde && punt.waarde <= punt.hoog, 'band rondom de lijn');
    }
    // onzekerheid wordt breder verder vooruit
    const eerste = f.punten[0];
    const laatste = f.punten[f.punten.length - 1];
    assert.ok(
      laatste.hoog - laatste.laag > eerste.hoog - eerste.laag,
      'band verbreedt zich'
    );
  }

  assert.ok(maatregelen.rEff < trend.rEff && trend.rEff < variant.rEff);
  assert.ok(maatregelen.weekEinde < trend.weekEinde);
  assert.ok(trend.weekEinde < variant.weekEinde);
});

test('voorspelling: langere vooruitblik, grotere band', () => {
  for (const h of HORIZONS) {
    const f = getForecast('noord-holland', 'trend', h.days);
    assert.equal(f.punten.length, h.days);
    const laatstePunt = f.punten[f.punten.length - 1];
    assert.ok(laatstePunt.laag < f.weekHoog);
    assert.ok(f.weekLaag < f.weekEinde && f.weekEinde < f.weekHoog);
  }
});

test('scenario’s en vooruitblikken zijn compleet gedefinieerd', () => {
  assert.deepEqual(SCENARIOS.map((s) => s.id), ['trend', 'maatregelen', 'variant']);
  assert.deepEqual(HORIZONS.map((h) => h.days), [7, 14, 28]);
  assert.ok(SCENARIOS.every((s) => s.label && s.uitleg));
});

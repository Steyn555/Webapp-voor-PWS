/* ============================================================
 * VirusMonitor – demo-databron
 * ------------------------------------------------------------
 * Alle cijfers uit deze module zijn VERZONNEN demo-data voor het
 * profielwerkstuk. Er wordt geen enkele externe API gebruikt.
 *
 * De reeksen worden deterministisch berekend (vaste seed per
 * provincie), zodat de cijfers overal in de app consistent zijn:
 *   - de som van de laatste 7 dagen besmettingen is gelijk aan de
 *     waarde op de kaart (province.base.besmettingen)
 *   - het R-getal, de vaccinatiegraad en het rioolwater eindigen
 *     precies op de kaartwaarden
 * ============================================================ */

import { PROVINCES, getProvinceById } from './nl-map-data.js';

export const HISTORY_DAYS = 120;
export const NATIONAL_ID = 'nederland';

/* ---------- Deterministische toevalsgenerator (mulberry32) ---------- */

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

/* Zachte ruis: dagwaarden die een beetje om het patroon heen zwieren */
function smoothNoise(rand, n, amp) {
  const raw = [];
  for (let i = 0; i < n; i++) raw.push((rand() * 2 - 1) * amp);

  const out = [];
  for (let i = 0; i < n; i++) {
    const a = raw[Math.max(0, i - 1)];
    const b = raw[i];
    const c = raw[Math.min(n - 1, i + 1)];
    out.push((a + b + c) / 3);
  }
  return out;
}

/* Groeicurve: langzame start, stijging, en de piek ligt nog vooruit */
function ramp(t, k, t0) {
  return 0.5 * (1 + Math.tanh(k * (t - t0)));
}

/* ---------- Reeksen per provincie ---------- */

const seriesCache = new Map();

function buildProvinceSeries(p) {
  const rand = mulberry32(hashString('virusmonitor:' + p.id));
  const laatste = HISTORY_DAYS - 1;

  const C = p.base.besmettingen / 7;          // huidig dagniveau per 100.000
  const vloer = C * (0.14 + rand() * 0.08);   // basisniveau aan het begin
  const k = 0.032 + Math.max(0, p.base.rgetal - 0.85) * 0.07;
  const t0 = laatste - 0.523 / k;             // zorgt dat ramp(laatste) ≈ 0,74
  const ruis = smoothNoise(rand, HISTORY_DAYS, 0.035);
  const eindRamp = ramp(laatste, k, t0);

  /* Nieuwe besmettingen per dag (per 100.000) */
  const cases = [];
  for (let t = 0; t < HISTORY_DAYS; t++) {
    const niveau = vloer + (C - vloer) * (ramp(t, k, t0) / eindRamp);
    cases.push(Math.max(0.4, niveau * (1 + ruis[t])));
  }

  /* Schalen zodat de laatste week exact gelijk is aan de kaartwaarde */
  let som = 0;
  for (let t = laatste - 6; t <= laatste; t++) som += cases[t];
  const factor = p.base.besmettingen / som;
  for (let t = 0; t < HISTORY_DAYS; t++) cases[t] *= factor;

  /* R-getal: volgt de groei van de besmettingen,
     en eindigt precies op de waarde van de kaart */
  const r = [];
  for (let t = 0; t < HISTORY_DAYS; t++) {
    const toekomst = cases[Math.min(t + 4, laatste)];
    const rRuW = clamp(toekomst / Math.max(cases[t], 0.2), 0.8, 2.5);
    const trek = Math.pow(t / laatste, 3);
    r.push(
      clamp(
        rRuW * (1 - trek) + p.base.rgetal * trek + ruis[t] * 0.35 * (1 - trek),
        0.8,
        2.6
      )
    );
  }
  r[laatste] = p.base.rgetal;

  /* Vaccinatiegraad: loopt langzaam op naar de kaartwaarde */
  const vaccDelta = 2.5 + rand() * 2;
  const vaccRuis = smoothNoise(rand, HISTORY_DAYS, 0.14);
  const vacc = [];
  for (let t = 0; t < HISTORY_DAYS; t++) {
    const x = t / laatste;
    vacc.push(
      clamp(p.base.vaccin - vaccDelta * (1 - x) + vaccRuis[t] * Math.sin(Math.PI * x), 40, 96)
    );
  }
  vacc[laatste] = p.base.vaccin;

  /* Rioolwater: volgt de besmettingen, eindigt op de kaartwaarde */
  const waterRuis = smoothNoise(rand, HISTORY_DAYS, 0.05);
  const sewage = cases.map(
    (c, t) => p.base.rioolwater * (c / C) * (1 + waterRuis[t])
  );
  sewage[laatste] = p.base.rioolwater;

  /* Afgeleide reeksen (per 100.000) */
  const hosp = cases.map((c) => c * 0.017);
  const recovered = [];
  const deceased = [];
  let cum = 0;
  for (let t = 0; t < HISTORY_DAYS; t++) {
    cum += cases[t];
    recovered.push(cum * 0.985);
    deceased.push(cum * 0.004);
  }

  return { cases, r, vacc, sewage, hosp, recovered, deceased };
}

function buildNationalSeries() {
  const totPop = PROVINCES.reduce((a, p) => a + p.population, 0);
  const dagen = HISTORY_DAYS;
  const som = {
    cases: new Array(dagen).fill(0),
    r: new Array(dagen).fill(0),
    vacc: new Array(dagen).fill(0),
    sewage: new Array(dagen).fill(0),
    hosp: new Array(dagen).fill(0),
  };

  for (const p of PROVINCES) {
    const s = getSeries(p.id);
    for (let t = 0; t < dagen; t++) {
      som.cases[t] += s.cases[t] * p.population;
      som.r[t] += s.r[t] * p.population;
      som.vacc[t] += s.vacc[t] * p.population;
      som.sewage[t] += s.sewage[t] * p.population;
      som.hosp[t] += s.hosp[t] * p.population;
    }
  }

  const laatste = dagen - 1;
  const national = {
    cases: som.cases.map((v) => v / totPop),
    r: som.r.map((v) => v / totPop),
    vacc: som.vacc.map((v) => v / totPop),
    sewage: som.sewage.map((v) => v / totPop),
    hosp: som.hosp.map((v) => v / totPop),
  };

  /* Herstelden en overleden: cumulatief optellen per dag */
  const recovered = [];
  const deceased = [];
  let cum = 0;
  for (let t = 0; t < dagen; t++) {
    cum += national.cases[t];
    recovered.push(cum * 0.985);
    deceased.push(cum * 0.004);
  }
  national.recovered = recovered;
  national.deceased = deceased;

  /* Laatste week exact gelijk laten zijn aan het nationale kaartgetal */
  let week = 0;
  for (let t = laatste - 6; t <= laatste; t++) week += national.cases[t];

  return national;
}

/* Publieke functie: reeks voor 'nederland' of een provincie-id */
export function getSeries(regionId) {
  const id = !regionId || regionId === NATIONAL_ID ? NATIONAL_ID : regionId;

  if (seriesCache.has(id)) return seriesCache.get(id);

  let reeks;
  if (id === NATIONAL_ID) {
    reeks = buildNationalSeries();
  } else {
    const p = getProvinceById(id);
    if (!p) return null;
    reeks = buildProvinceSeries(p);
  }

  seriesCache.set(id, reeks);
  return reeks;
}

/* ---------- Datums ---------- */

const MAANDEN = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

export function dayDate(t) {
  const nu = new Date();
  return new Date(nu.getTime() - (HISTORY_DAYS - 1 - t) * 86400000);
}

export function fmtDate(d) {
  return d.getDate() + ' ' + MAANDEN[d.getMonth()];
}

/* ---------- Getallen (Nederlands formaat) ---------- */

export function fmtInt(v) {
  return Math.round(v).toLocaleString('nl-NL');
}

export function fmt1(v) {
  return v.toLocaleString('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function fmtR(v) {
  return v.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtSigned(v, decimalen = 0) {
  const afgerond = decimalen ? v.toFixed(decimalen) : String(Math.round(v));
  const nl = decimalen ? afgerond.replace('.', ',') : Number(afgerond).toLocaleString('nl-NL');
  return (v >= 0 ? '+' : '\u2212') + nl.replace('-', '');
}

/* ---------- Actuele cijfers ---------- */

export function getCurrentStats(regionId) {
  const s = getSeries(regionId);
  if (!s) return null;

  const laatste = HISTORY_DAYS - 1;

  const weekSom = (arr) => {
    let a = 0;
    for (let t = laatste - 6; t <= laatste; t++) a += arr[t];
    return a;
  };
  const vorigeWeekSom = (arr) => {
    let a = 0;
    for (let t = laatste - 13; t <= laatste - 7; t++) a += arr[t];
    return a;
  };

  const cases7 = weekSom(s.cases);
  const cases7Vorig = vorigeWeekSom(s.cases);
  const vacc = s.vacc[laatste];
  const vaccVorig = s.vacc[laatste - 7];
  const sewage = s.sewage[laatste];
  const sewageVorig = s.sewage[laatste - 7];
  const hosp = s.hosp[laatste];
  const hospVorig = s.hosp[laatste - 7];

  let populatie;
  if (!regionId || regionId === NATIONAL_ID) {
    populatie = PROVINCES.reduce((a, p) => a + p.population, 0);
  } else {
    const p = getProvinceById(regionId);
    populatie = p ? p.population : 0;
  }

  return {
    id: !regionId || regionId === NATIONAL_ID ? NATIONAL_ID : regionId,
    populatie,
    cases7,
    cases7Vorig,
    casesDeltaPct: (cases7 / cases7Vorig - 1) * 100,
    r: s.r[laatste],
    rVorig: s.r[laatste - 7],
    vacc,
    vaccVorig,
    sewage,
    sewageVorig,
    sewageDeltaPct: (sewage / sewageVorig - 1) * 100,
    hosp,
    hospVorig,
    hospDeltaPct: (hosp / hospVorig - 1) * 100,
    hersteld: s.recovered[laatste],
    hersteldDezeWeek: s.recovered[laatste] - s.recovered[laatste - 7],
    overleden: s.deceased[laatste],
  };
}

/* ---------- Stijgers van deze week ---------- */

export function getTopRisers(n = 3) {
  return PROVINCES
    .map((p) => {
      const st = getCurrentStats(p.id);
      return { id: p.id, naam: p.name, deltaPct: st.casesDeltaPct, cases7: st.cases7 };
    })
    .sort((a, b) => b.deltaPct - a.deltaPct)
    .slice(0, n);
}

/* ---------- Wekelijkse cijfers ---------- */

export function getWeekly(regionId, weken = 12) {
  const s = getSeries(regionId);
  if (!s) return [];

  const laatste = HISTORY_DAYS - 1;
  const out = [];

  for (let w = weken - 1; w >= 0; w--) {
    let som = 0;
    const einde = laatste - w * 7;
    for (let t = einde - 6; t <= einde; t++) som += s.cases[t];
    out.push({ label: fmtDate(dayDate(einde - 6)), waarde: som });
  }
  return out;
}

/* ---------- Provincietabel ---------- */

export function getProvinceRows() {
  const rows = PROVINCES.map((p) => {
    const st = getCurrentStats(p.id);
    return {
      id: p.id,
      naam: p.name,
      inwoners: p.population,
      cases7: st.cases7,
      deltaPct: st.casesDeltaPct,
      r: st.r,
      vaccin: st.vacc,
      rioolwater: st.sewage,
    };
  });

  const nl = getCurrentStats(NATIONAL_ID);
  const land = {
    id: NATIONAL_ID,
    naam: 'Nederland',
    inwoners: nl.populatie,
    cases7: nl.cases7,
    deltaPct: nl.casesDeltaPct,
    r: nl.r,
    vaccin: nl.vacc,
    rioolwater: nl.sewage,
  };

  return { land, rijen: rows };
}

/* ---------- Leeftijdsverdeling (demo) ---------- */

export const AGE_GROUPS = ['0\u201312', '13\u201324', '25\u201359', '60+'];

export function getAgeDistribution(regionId) {
  const id = !regionId || regionId === NATIONAL_ID ? NATIONAL_ID : regionId;
  const rand = mulberry32(hashString('leeftijd:' + id));
  const basis = [11, 21, 42, 26];
  const waarden = basis.map((b) => b * (0.85 + rand() * 0.3));

  const totaal = waarden.reduce((a, b) => a + b, 0);
  const afgerond = waarden.map((w) => Math.round((w / totaal) * 100));
  const verschil = 100 - afgerond.reduce((a, b) => a + b, 0);
  afgerond[afgerond.length - 1] += verschil;
  return afgerond;
}

/* ---------- Voorspelling (demo-model) ---------- */

export const SCENARIOS = [
  {
    id: 'trend',
    label: 'Huidige trend',
    uitleg: 'Het R-getal blijft zoals het nu is.',
  },
  {
    id: 'maatregelen',
    label: 'Maatregelen',
    uitleg: 'Het R-getal daalt met 0,3 door maatregelen.',
  },
  {
    id: 'variant',
    label: 'Nieuwe variant',
    uitleg: 'Het R-getal stijgt met 0,4 door een nieuwe variant.',
  },
];

export const HORIZONS = [
  { days: 7, label: '1 week' },
  { days: 14, label: '2 weken' },
  { days: 28, label: '4 weken' },
];

export function getForecast(regionId, scenarioId, horizonDays) {
  const s = getSeries(regionId);
  if (!s) return null;

  const laatste = HISTORY_DAYS - 1;
  const C = s.cases[laatste];
  const R = s.r[laatste];

  const rEff =
    scenarioId === 'maatregelen'
      ? Math.max(0.85, R - 0.3)
      : scenarioId === 'variant'
      ? Math.min(2.5, R + 0.4)
      : R;

  const g = Math.pow(rEff, 1 / 4); // groeifactor per dag (generatietijd 4 dagen)

  const punten = [];
  for (let i = 1; i <= horizonDays; i++) {
    const waarde = C * Math.pow(g, i);
    const onzekerheid = 0.08 + 0.012 * i; // marge wordt breder verder vooruit
    punten.push({
      i,
      waarde,
      laag: waarde * (1 - onzekerheid),
      hoog: waarde * (1 + onzekerheid),
    });
  }

  const laatsteWeek = punten.slice(-7);
  const weekEinde = laatsteWeek.reduce((a, p) => a + p.waarde, 0);
  const weekLaag = laatsteWeek.reduce((a, p) => a + p.laag, 0);
  const weekHoog = laatsteWeek.reduce((a, p) => a + p.hoog, 0);

  let cases7 = 0;
  for (let t = laatste - 6; t <= laatste; t++) cases7 += s.cases[t];

  return {
    scenarioId,
    horizonDays,
    rEff,
    rHuidig: R,
    groeiPerWeek: Math.pow(g, 7),
    punten,
    weekEinde,
    weekLaag,
    weekHoog,
    huidigeWeek: cases7,
  };
}

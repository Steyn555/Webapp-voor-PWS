/* ============================================================
 * VirusMonitor – pagina's voor dashboard, statistieken en
 * voorspelling. Alles frontend, alles demo-data.
 * ============================================================ */

import { PROVINCES, LAYERS, LAYER_STYLES, getProvinceMetric } from './nl-map-data.js';
import {
  NATIONAL_ID,
  HISTORY_DAYS,
  getCurrentStats,
  getSeries,
  getTopRisers,
  getWeekly,
  getProvinceRows,
  getAgeDistribution,
  AGE_GROUPS,
  getForecast,
  SCENARIOS,
  HORIZONS,
  dayDate,
  fmtDate,
  fmtInt,
  fmt1,
  fmtR,
  fmtSigned,
} from './monitor-data.js';

(function initMonitor() {
  const $ = (id) => document.getElementById(id);

  const dashRegio = $('dash-regio');
  const vspRegio = $('vsp-regio');

  if (!dashRegio && !vspRegio) return;

  /* Gedeelde staat: de geselecteerde regio van de hele app */
  const state = {
    regio: NATIONAL_ID,
    dagen: 30,
    metric: 'besmettingen',
    scenario: 'trend',
    horizon: 7,
    pagina: 'p-menu',
    tabelSort: { key: 'cases7', dir: 'desc' },
  };

  /* ---------- Iconen (inline, Lucide-stijl) ---------- */
  const ICON = {
    activity:
      '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M3 12h4l3-8 4 16 3-8h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    repeat:
      '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="m17 2 4 4-4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 11v-1a4 4 0 0 1 4-4h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="m7 22-4-4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 13v1a4 4 0 0 1-4 4H3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    heart:
      '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    hospital:
      '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    shield:
      '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="m9 11.5 2 2 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    droplet:
      '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 2.7s6.5 7 6.5 11.3a6.5 6.5 0 0 1-13 0C5.5 9.7 12 2.7 12 2.7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    up: '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path d="m6 15 6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    down: '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    dash: '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path d="M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  };

  /* ---------- Kleuren uit de CSS-variabelen lezen ---------- */
  function cssKleur(naam) {
    const waarde = getComputedStyle(document.documentElement).getPropertyValue(naam).trim();
    return waarde || '#888888';
  }

  /* ============================================================
   * Grafieken (canvas): lijn + vlak + onzekerheidsband + tooltip
   * ============================================================ */
  function createLineChart(canvas) {
    const ctx = canvas.getContext('2d');
    let cfg = null;
    let hoverIndex = null;

    function render() {
      if (!cfg) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(rect.width * dpr)) {
        canvas.width = Math.round(rect.width * dpr);
      }
      if (canvas.height !== Math.round(rect.height * dpr)) {
        canvas.height = Math.round(rect.height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const W = rect.width;
      const H = rect.height;
      const padLinks = 38;
      const padRechts = 12;
      const padBoven = 14;
      const padOnder = 22;
      const plotB = W - padLinks - padRechts;
      const plotH = H - padBoven - padOnder;

      const n = cfg.labels.length;
      const x = (i) => padLinks + (n <= 1 ? plotB / 2 : (i / (n - 1)) * plotB);

      /* Hoogste waarde bepalen (inclusief band) */
      let maxVal = 0;
      for (const s of cfg.series) {
        for (const v of s.values) if (v != null && v > maxVal) maxVal = v;
      }
      if (cfg.band) {
        for (const v of cfg.band.high) if (v != null && v > maxVal) maxVal = v;
      }
      const yMax = niceMax(maxVal * 1.05);
      const y = (v) => padBoven + plotH - (v / yMax) * plotH;

      ctx.clearRect(0, 0, W, H);

      /* Raster + y-as labels */
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillStyle = cssKleur('--mute');
      ctx.strokeStyle = cssKleur('--line');
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const v = (yMax / 4) * i;
        const yy = Math.round(y(v)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(padLinks, yy);
        ctx.lineTo(W - padRechts, yy);
        ctx.stroke();
        if (i > 0) {
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.fillText(cfg.fmtY(v), padLinks - 6, yy);
        }
      }

      /* X-as labels (max 4), eerste en laatste binnen de rand houden */
      ctx.textBaseline = 'top';
      const stappen = [0, Math.round((n - 1) / 3), Math.round((2 * (n - 1)) / 3), n - 1];
      for (const idx of new Set(stappen)) {
        if (idx === 0) {
          ctx.textAlign = 'left';
          ctx.fillText(cfg.labels[idx], padLinks, padBoven + plotH + 6);
        } else if (idx === n - 1) {
          ctx.textAlign = 'right';
          ctx.fillText(cfg.labels[idx], W - padRechts, padBoven + plotH + 6);
        } else {
          ctx.textAlign = 'center';
          ctx.fillText(cfg.labels[idx], x(idx), padBoven + plotH + 6);
        }
      }

      /* Onzekerheidsband */
      if (cfg.band) {
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = cfg.band.kleur || cssKleur('--mute');
        ctx.beginPath();
        let gestart = false;
        for (let i = 0; i < n; i++) {
          const v = cfg.band.high[i];
          if (v == null) continue;
          if (!gestart) {
            ctx.moveTo(x(i), y(v));
            gestart = true;
          } else ctx.lineTo(x(i), y(v));
        }
        for (let i = n - 1; i >= 0; i--) {
          const v = cfg.band.low[i];
          if (v == null) continue;
          ctx.lineTo(x(i), y(v));
        }
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      /* Vlakvulling en lijnen */
      for (const s of cfg.series) {
        if (s.fill) {
          ctx.globalAlpha = 0.16;
          ctx.fillStyle = s.kleur;
          ctx.beginPath();
          let eerste = -1;
          for (let i = 0; i < n; i++) {
            if (s.values[i] == null) continue;
            if (eerste < 0) {
              ctx.moveTo(x(i), y(s.values[i]));
              eerste = i;
            } else ctx.lineTo(x(i), y(s.values[i]));
          }
          if (eerste >= 0) {
            ctx.lineTo(x(laatsteIndex(s.values)), padBoven + plotH);
            ctx.lineTo(x(eerste), padBoven + plotH);
            ctx.closePath();
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }

        ctx.strokeStyle = s.kleur;
        ctx.lineWidth = 2.2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.setLineDash(s.gestippeld ? [6, 5] : []);
        ctx.beginPath();
        let penNeer = false;
        for (let i = 0; i < n; i++) {
          if (s.values[i] == null) {
            penNeer = false;
            continue;
          }
          if (!penNeer) {
            ctx.moveTo(x(i), y(s.values[i]));
            penNeer = true;
          } else ctx.lineTo(x(i), y(s.values[i]));
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      /* Scheiding "vandaag" */
      if (cfg.scheiding != null) {
        const xs = x(cfg.scheiding.index);
        ctx.strokeStyle = cssKleur('--mute');
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(xs, padBoven);
        ctx.lineTo(xs, padBoven + plotH);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = '600 11px system-ui, sans-serif';
        ctx.fillStyle = cssKleur('--mute');
        ctx.textAlign = xs > padLinks + plotB / 2 ? 'right' : 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(cfg.scheiding.label, xs + (xs > padLinks + plotB / 2 ? -5 : 5), padBoven - 2);
      }

      /* Tooltip bij hover */
      if (hoverIndex != null && cfg.tooltip) {
        const hx = x(hoverIndex);
        ctx.strokeStyle = cssKleur('--mute');
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(hx, padBoven);
        ctx.lineTo(hx, padBoven + plotH);
        ctx.stroke();
        ctx.setLineDash([]);

        for (const s of cfg.series) {
          const v = s.values[hoverIndex];
          if (v == null) continue;
          ctx.fillStyle = s.kleur;
          ctx.beginPath();
          ctx.arc(hx, y(v), 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = cssKleur('--panel');
          ctx.lineWidth = 1.6;
          ctx.stroke();
        }

        const regels = cfg.tooltip(hoverIndex);
        tekenTooltip(ctx, hx, padBoven, W, regels, cssKleur('--panel'), cssKleur('--ink'), cssKleur('--line'));
      }
    }

    function laatsteIndex(values) {
      for (let i = values.length - 1; i >= 0; i--) {
        if (values[i] != null) return i;
      }
      return 0;
    }

    canvas.addEventListener('pointermove', (e) => {
      if (!cfg) return;
      const rect = canvas.getBoundingClientRect();
      const n = cfg.labels.length;
      const padLinks = 38;
      const padRechts = 12;
      const plotB = rect.width - padLinks - padRechts;
      const relX = (e.clientX - rect.left - padLinks) / plotB;
      const idx = Math.round(relX * (n - 1));
      const nieuw = Math.max(0, Math.min(n - 1, idx));
      if (nieuw !== hoverIndex) {
        hoverIndex = nieuw;
        render();
      }
    });

    canvas.addEventListener('pointerleave', () => {
      if (hoverIndex !== null) {
        hoverIndex = null;
        render();
      }
    });

    return {
      zet(cfgNieuw) {
        cfg = cfgNieuw;
        hoverIndex = null;
        render();
      },
      render,
    };
  }

  function niceMax(v) {
    if (v <= 0) return 1;
    const exp = Math.pow(10, Math.floor(Math.log10(v)));
    const f = v / exp;
    const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
    return nice * exp;
  }

  function tekenTooltip(ctx, hx, padBoven, W, regels, bgKleur, tekstKleur, lijnKleur) {
    ctx.font = '600 12px system-ui, sans-serif';
    let breedte = 0;
    for (const r of regels) {
      breedte = Math.max(breedte, ctx.measureText(r).width);
    }
    const boxB = 10 + regels.length * 15;
    const boxW = breedte + 18;
    let bx = hx - boxW / 2;
    bx = Math.max(4, Math.min(W - boxW - 4, bx));
    const by = padBoven + 4;

    ctx.fillStyle = bgKleur;
    ctx.strokeStyle = lijnKleur;
    ctx.lineWidth = 1;
    rondeRechthoek(ctx, bx, by, boxW, boxB, 7);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = tekstKleur;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    regels.forEach((r, i) => {
      ctx.fillText(r, bx + 9, by + 6 + i * 15);
    });
  }

  function rondeRechthoek(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  const dashChart = $('dash-chart') ? createLineChart($('dash-chart')) : null;
  const vspChart = $('vsp-chart') ? createLineChart($('vsp-chart')) : null;

  /* ============================================================
   * Regio-selecties en synchronisatie met de kaart
   * ============================================================ */
  function vulRegioSelects() {
    const opties = [
      { value: NATIONAL_ID, text: 'Nederland' },
      ...PROVINCES.map((p) => ({ value: p.id, text: p.name })),
    ];
    for (const select of [dashRegio, vspRegio]) {
      if (!select) continue;
      select.innerHTML = '';
      for (const o of opties) {
        const opt = document.createElement('option');
        opt.value = o.value;
        opt.textContent = o.text;
        select.appendChild(opt);
      }
      select.value = state.regio;
    }
  }

  function zetRegio(id, meldKaart) {
    state.regio = id && id !== NATIONAL_ID ? id : NATIONAL_ID;
    if (dashRegio) dashRegio.value = state.regio;
    if (vspRegio) vspRegio.value = state.regio;
    renderZichtbareMonitorPagina();
    if (meldKaart) {
      document.dispatchEvent(
        new CustomEvent('monitor-regio', {
          detail: { id: state.regio === NATIONAL_ID ? null : state.regio },
        })
      );
    }
  }

  if (dashRegio) {
    dashRegio.addEventListener('change', () => zetRegio(dashRegio.value, true));
  }
  if (vspRegio) {
    vspRegio.addEventListener('change', () => zetRegio(vspRegio.value, true));
  }

  document.addEventListener('kaart-regio', (e) => {
    const id = e.detail && e.detail.id ? e.detail.id : NATIONAL_ID;
    if (id !== state.regio) {
      zetRegio(id, false);
    }
  });

  /* ============================================================
   * Dashboard
   * ============================================================ */
  function deltaBadge(waarde, isGoed, drempel, tekst) {
    const klasse = Math.abs(waarde) < drempel ? 'neutraal' : isGoed === (waarde >= 0) || isGoed == null ? 'goed' : 'slecht';
    const icoon =
      Math.abs(waarde) < drempel ? ICON.dash : waarde >= 0 ? ICON.up : ICON.down;
    return '<span class="delta ' + klasse + '">' + icoon + tekst + '</span>';
  }

  function statKaart(titel, waarde, sub, deltaHtml, kleur, icoon) {
    return (
      '<article class="statcard" style="--pc:' + kleur + '">' +
      '<header class="statcard-kop">' +
      '<span class="statcard-icoon">' + icoon + '</span>' +
      '<span class="statcard-label">' + titel + '</span>' +
      '</header>' +
      '<span class="statcard-waarde">' + waarde + '</span>' +
      '<span class="statcard-sub">' + sub + '</span>' +
      deltaHtml +
      '</article>'
    );
  }

  function renderDashboard() {
    const container = $('dash-cards');
    if (!container) return;

    const st = getCurrentStats(state.regio);
    if (!st) return;

    container.innerHTML =
      statKaart(
        'Besmettingen',
        fmtInt(st.cases7),
        'per 100.000, deze week',
        deltaBadge(st.casesDeltaPct, false, 0.5, fmtSigned(st.casesDeltaPct) + '% t.o.v. vorige\u00a0week'),
        'var(--besmet)', ICON.activity
      ) +
      statKaart(
        'R-getal',
        fmtR(st.r),
        'recente schatting',
        deltaBadge(st.r - st.rVorig, false, 0.05, fmtSigned(st.r - st.rVorig, 2) + ' t.o.v. vorige\u00a0week'),
        'var(--accent)', ICON.repeat
      ) +
      statKaart(
        'Herstelden',
        fmtInt(st.hersteld),
        'per 100.000, totaal',
        deltaBadge(st.hersteldDezeWeek, true, 1, '+' + fmtInt(st.hersteldDezeWeek) + ' deze week'),
        'var(--hersteld)', ICON.heart
      ) +
      statKaart(
        'Ziekenhuis',
        fmt1(st.hosp),
        'opnames per 100.000, nu',
        deltaBadge(st.hospDeltaPct, false, 0.5, fmtSigned(st.hospDeltaPct) + '% t.o.v. vorige\u00a0week'),
        'var(--vaccin)', ICON.hospital
      ) +
      statKaart(
        'Vaccinatiegraad',
        fmtInt(st.vacc) + '%',
        'van de bevolking',
        deltaBadge(st.vacc - st.vaccVorig, true, 0.1, fmtSigned(st.vacc - st.vaccVorig, 1) + ' pp t.o.v. vorige\u00a0week'),
        'var(--vaccin)', ICON.shield
      ) +
      statKaart(
        'Rioolwater',
        fmt1(st.sewage) + ' \u00d710\u00b9\u00b2',
        'virusdeeltjes',
        deltaBadge(st.sewageDeltaPct, false, 0.5, fmtSigned(st.sewageDeltaPct) + '% t.o.v. vorige\u00a0week'),
        'var(--accent)', ICON.droplet
      );

    /* Grafiek: 7-daags gemiddelde per dag */
    if (dashChart) {
      const s = getSeries(state.regio);
      const start = HISTORY_DAYS - state.dagen;
      const labels = [];
      const waarden = [];

      for (let t = start; t < HISTORY_DAYS; t++) {
        let som = 0;
        let n = 0;
        for (let k = Math.max(0, t - 6); k <= t; k++) {
          som += s.cases[k];
          n++;
        }
        waarden.push(som / n);
        labels.push(fmtDate(dayDate(t)));
      }

      const regioNaam = regioNaamVoor(state.regio);
      dashChart.zet({
        labels,
        series: [{ values: waarden, kleur: cssKleur('--besmet'), fill: true }],
        fmtY: (v) => (v >= 10 ? fmtInt(v) : fmt1(v)),
        tooltip: (i) => [
          labels[i],
          fmt1(waarden[i]) + ' per 100.000 \u00b7 ' + regioNaam,
        ],
      });
    }

    /* Stijgers van deze week */
    const risersContainer = $('dash-risers');
    if (risersContainer) {
      risersContainer.innerHTML = '';
      const stijgers = getTopRisers(3);
      stijgers.forEach((r, i) => {
        const knop = document.createElement('button');
        knop.type = 'button';
        knop.className = 'riser';
        knop.innerHTML =
          '<span class="riser-rang">' + (i + 1) + '</span>' +
          '<span class="riser-naam">' + r.naam + '</span>' +
          '<span class="riser-cijfer">' + fmtInt(r.cases7) + ' /100k</span>' +
          '<span class="delta slecht">' + ICON.up + fmtSigned(r.deltaPct) + '%</span>';
        knop.addEventListener('click', () => zetRegio(r.id, true));
        risersContainer.appendChild(knop);
      });
    }
  }

  function regioNaamVoor(id) {
    if (!id || id === NATIONAL_ID) return 'Nederland';
    const p = PROVINCES.find((x) => x.id === id);
    return p ? p.name : id;
  }

  /* Periode-pillen van het dashboard */
  const dashPeriode = $('dash-periode');
  if (dashPeriode) {
    dashPeriode.addEventListener('click', (e) => {
      const knop = e.target.closest('button[data-days]');
      if (!knop) return;
      state.dagen = Number(knop.dataset.days);
      zetPilGroep(dashPeriode, knop);
      renderDashboard();
    });
  }

  function zetPilGroep(groep, actief) {
    groep.querySelectorAll('button').forEach((b) => {
      const isActief = b === actief;
      b.classList.toggle('is-actief', isActief);
      b.setAttribute('aria-pressed', isActief ? 'true' : 'false');
    });
  }

  /* ============================================================
   * Statistieken
   * ============================================================ */
  const METRIC_LABELS = {
    besmettingen: { titel: 'Besmettingen per 100.000 inwoners, afgelopen week', fmt: fmtInt },
    rgetal: { titel: 'R-getal per provincie', fmt: fmtR },
    vaccin: { titel: 'Vaccinatiegraad per provincie', fmt: (v) => fmtInt(v) + '%' },
    rioolwater: { titel: 'Rioolwaterwaarde per provincie (×10¹²)', fmt: fmt1 },
  };

  function barRij(label, valueText, breedtePct, kleur, gemPct, titel, opacity) {
    const opaciteit = opacity != null ? '; opacity:' + opacity.toFixed(2) : '';
    return (
      '<div class="barrow"' + (titel ? ' title="' + titel + '"' : '') + '>' +
      '<span class="barlabel">' + label + '</span>' +
      '<div class="bartrack">' +
      '<div class="barfill" style="width:' + breedtePct + '%; background:' + kleur + opaciteit + '"></div>' +
      (gemPct != null ? '<i class="baravg" style="left:' + gemPct + '%"></i>' : '') +
      '</div>' +
      '<span class="barvalue">' + valueText + '</span>' +
      '</div>'
    );
  }

  function renderStatistics() {
    /* Staafdiagram: provincies vergeleken */
    const barsContainer = $('stat-bars');
    const sub = $('stat-bars-sub');
    const { land, rijen } = getProvinceRows();

    const metric = state.metric;
    const sleutel =
      metric === 'besmettingen' ? 'cases7' :
      metric === 'rgetal' ? 'r' :
      metric === 'vaccin' ? 'vaccin' : 'rioolwater';

    const maxVal = Math.max(...rijen.map((r) => r[sleutel]), land[sleutel]);
    const gemPct = (land[sleutel] / maxVal) * 100;

    if (sub) {
      sub.textContent = METRIC_LABELS[metric].titel + ' \u00b7 streepje = Nederland';
    }

    if (barsContainer) {
      const gesorteerd = [...rijen].sort((a, b) => b[sleutel] - a[sleutel]);
      barsContainer.innerHTML = gesorteerd
        .map((r) => {
          const metricInfo = getProvinceMetric(r.id, metric);
          const kleur = LAYER_STYLES[metric].colors[metricInfo.level];
          const breedte = Math.max(2, (r[sleutel] / maxVal) * 100);
          return barRij(
            r.naam,
            METRIC_LABELS[metric].fmt(r[sleutel]),
            breedte,
            kleur,
            gemPct,
            metricInfo.formatted
          );
        })
        .join('');
    }

    /* Verloop per week (Nederland) */
    const weeksContainer = $('stat-weeks');
    if (weeksContainer) {
      const weken = getWeekly(NATIONAL_ID, 12);
      const maxWeek = Math.max(...weken.map((w) => w.waarde));
      weeksContainer.innerHTML = weken
        .map((w) => {
          const breedte = Math.max(2, (w.waarde / maxWeek) * 100);
          const opacity = 0.45 + 0.55 * (w.waarde / maxWeek);
          return barRij(
            w.label,
            fmtInt(w.waarde),
            breedte,
            'var(--accent)',
            null,
            'Week van ' + w.label,
            opacity
          );
        })
        .join('');
    }

    /* Gegevenstabel */
    renderTabel();

    /* Leeftijdsverdeling */
    const ageContainer = $('stat-age');
    if (ageContainer) {
      const verdeling = getAgeDistribution(state.regio === NATIONAL_ID ? NATIONAL_ID : state.regio);
      const kleuren = ['var(--gezond)', 'var(--accent)', 'var(--vaccin)', 'var(--besmet)'];
      ageContainer.innerHTML = AGE_GROUPS
        .map((g, i) =>
          barRij(g, verdeling[i] + '%', verdeling[i] * 2.2, kleuren[i], null, verdeling[i] + '% van de besmettingen')
        )
        .join('');
    }
  }

  function renderTabel() {
    const tbody = document.querySelector('#stat-table tbody');
    const table = $('stat-table');
    if (!tbody || !table) return;

    const { land, rijen } = getProvinceRows();
    const { key, dir } = state.tabelSort;
    const factor = dir === 'asc' ? 1 : -1;

    const gesorteerd = [...rijen].sort((a, b) => {
      if (key === 'naam') return a.naam.localeCompare(b.naam, 'nl') * factor;
      return (a[key] - b[key]) * factor;
    });

    function rijHtml(r, isNl) {
      const deltaKlas = r.deltaPct >= 0.5 ? 'slecht' : r.deltaPct <= -0.5 ? 'goed' : 'neutraal';
      return (
        '<tr' + (isNl ? ' class="rij-nl"' : '') + '>' +
        '<td class="naam">' + r.naam + '</td>' +
        '<td class="num">' + fmtInt(r.inwoners) + '</td>' +
        '<td class="num">' + fmtInt(r.cases7) + ' <small class="' + deltaKlas + '">' + fmtSigned(r.deltaPct) + '%</small></td>' +
        '<td class="num">' + fmtR(r.r) + '</td>' +
        '<td class="num">' + fmtInt(r.vaccin) + '%</td>' +
        '<td class="num">' + fmt1(r.rioolwater) + '</td>' +
        '</tr>'
      );
    }

    tbody.innerHTML = rijHtml(land, true) + gesorteerd.map((r) => rijHtml(r, false)).join('');

    /* Sorteer-indicatoren */
    table.querySelectorAll('th').forEach((th) => {
      th.classList.toggle('sort-asc', th.dataset.key === key && dir === 'asc');
      th.classList.toggle('sort-desc', th.dataset.key === key && dir === 'desc');
      th.setAttribute('aria-sort', th.dataset.key === key ? (dir === 'asc' ? 'ascending' : 'descending') : 'none');
    });
  }

  const statTable = $('stat-table');
  if (statTable) {
    const sorteer = (th) => {
      const key = th.dataset.key;
      if (!key) return;
      if (state.tabelSort.key === key) {
        state.tabelSort.dir = state.tabelSort.dir === 'asc' ? 'desc' : 'asc';
      } else {
        state.tabelSort = { key, dir: key === 'naam' ? 'asc' : 'desc' };
      }
      renderTabel();
    };
    statTable.querySelectorAll('th').forEach((th) => {
      th.addEventListener('click', () => sorteer(th));
      th.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          sorteer(th);
        }
      });
    });
  }

  const statMetric = $('stat-metric');
  if (statMetric) {
    statMetric.addEventListener('click', (e) => {
      const knop = e.target.closest('button[data-metric]');
      if (!knop) return;
      state.metric = knop.dataset.metric;
      zetPilGroep(statMetric, knop);
      renderStatistics();
    });
  }

  /* ============================================================
   * Voorspelling
   * ============================================================ */
  function renderPrediction() {
    const uitleg = $('vsp-scenario-uitleg');
    const scenario = SCENARIOS.find((s) => s.id === state.scenario) || SCENARIOS[0];
    const horizonLabel =
      (HORIZONS.find((h) => h.days === state.horizon) || HORIZONS[0]).label;

    if (uitleg) uitleg.textContent = scenario.uitleg;

    const f = getForecast(state.regio, state.scenario, state.horizon);
    if (!f) return;

    /* Grafiek: geschiedenis (30 dagen) + voorspelling + band */
    if (vspChart) {
      const s = getSeries(state.regio);
      const histDagen = 30;
      const start = HISTORY_DAYS - histDagen;
      const n = histDagen + f.horizonDays;

      const labels = [];
      const historie = new Array(n).fill(null);
      const voorspeld = new Array(n).fill(null);
      const laag = new Array(n).fill(null);
      const hoog = new Array(n).fill(null);

      for (let t = start; t < HISTORY_DAYS; t++) {
        let som = 0;
        let tel = 0;
        for (let k = Math.max(0, t - 6); k <= t; k++) {
          som += s.cases[k];
          tel++;
        }
        historie[t - start] = som / tel;
        labels.push(fmtDate(dayDate(t)));
      }
      const nu = new Date();
      for (let i = 1; i <= f.horizonDays; i++) {
        const p = f.punten[i - 1];
        voorspeld[histDagen - 1 + i] = p.waarde;
        laag[histDagen - 1 + i] = p.laag;
        hoog[histDagen - 1 + i] = p.hoog;
        const d = new Date(nu.getTime() + i * 86400000);
        labels.push(fmtDate(d));
      }

      vspChart.zet({
        labels,
        series: [
          { values: historie, kleur: cssKleur('--accent'), fill: true },
          { values: voorspeld, kleur: cssKleur('--besmet'), gestippeld: true },
        ],
        band: { low: laag, high: hoog, kleur: cssKleur('--besmet') },
        scheiding: { index: histDagen - 1, label: 'vandaag' },
        fmtY: (v) => (v >= 10 ? fmtInt(v) : fmt1(v)),
        tooltip: (i) => {
          const regels = [labels[i]];
          if (historie[i] != null) {
            regels.push('gehad: ' + fmt1(historie[i]) + ' per 100.000');
          }
          if (voorspeld[i] != null) {
            regels.push('verwacht: ' + fmt1(voorspeld[i]) + ' (marge ' + fmt1(laag[i]) + ' \u2013 ' + fmt1(hoog[i]) + ')');
          }
          return regels;
        },
      });
    }

    /* Kaarten met kerncijfers */
    const cards = $('vsp-cards');
    if (cards) {
      cards.innerHTML =
        statKaart(
          'Verwacht in ' + horizonLabel,
          fmtInt(f.weekEinde),
          'per 100.000, slotweek',
          '<span class="delta neutraal">' + ICON.dash + 'marge ' + fmtInt(f.weekLaag) + ' \u2013 ' + fmtInt(f.weekHoog) + '</span>',
          'var(--besmet)', ICON.activity
        ) +
        statKaart(
          'Nu deze week',
          fmtInt(f.huidigeWeek),
          'per 100.000, deze week',
          '<span class="delta neutraal">' + ICON.dash + 'startpunt model</span>',
          'var(--accent)', ICON.repeat
        ) +
        statKaart(
          'R-getal in model',
          fmtR(f.rEff),
          scenario.label.toLowerCase(),
          Math.abs(f.rEff - f.rHuidig) < 0.01
            ? '<span class="delta neutraal">' + ICON.dash + 'gelijk aan nu</span>'
            : '<span class="delta ' + (f.rEff < f.rHuidig ? 'goed' : 'slecht') + '">' +
              (f.rEff < f.rHuidig ? ICON.down : ICON.up) +
              fmtSigned(f.rEff - f.rHuidig, 2) + ' t.o.v. nu</span>',
          'var(--vaccin)', ICON.repeat
        ) +
        statKaart(
          'Groei per week',
          '\u00d7' + f.groeiPerWeek.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          'bij gelijkblijvend R',
          '<span class="delta neutraal">' + ICON.dash + (f.groeiPerWeek >= 1 ? 'groeiend' : 'dalend') + '</span>',
          'var(--hersteld)', ICON.up
        );
    }

    /* Conclusie in gewone taal */
    const conclusie = $('vsp-conclusie');
    if (conclusie) {
      const verhouding = f.weekEinde / f.huidigeWeek;
      let tekst;
      if (verhouding < 0.95) {
        tekst = 'In dit scenario daalt het aantal besmettingen van ongeveer ' + fmtInt(f.huidigeWeek) +
          ' naar ' + fmtInt(f.weekEinde) + ' per 100.000 in de laatste week van de vooruitblik.';
      } else if (verhouding > 1.05) {
        tekst = 'In dit scenario stijgt het aantal besmettingen van ongeveer ' + fmtInt(f.huidigeWeek) +
          ' naar ' + fmtInt(f.weekEinde) + ' per 100.000 in de laatste week van de vooruitblik.';
      } else {
        tekst = 'In dit scenario blijft het aantal besmettingen ongeveer gelijk, rond ' + fmtInt(f.weekEinde) +
          ' per 100.000 per week.';
      }
      conclusie.textContent =
        tekst + ' (onzekerheidsmarge: ' + fmtInt(f.weekLaag) + ' \u2013 ' + fmtInt(f.weekHoog) + ').';
    }
  }

  const vspScenario = $('vsp-scenario');
  if (vspScenario) {
    vspScenario.addEventListener('click', (e) => {
      const knop = e.target.closest('button[data-scenario]');
      if (!knop) return;
      state.scenario = knop.dataset.scenario;
      zetPilGroep(vspScenario, knop);
      renderPrediction();
    });
  }

  const vspHorizon = $('vsp-horizon');
  if (vspHorizon) {
    vspHorizon.addEventListener('click', (e) => {
      const knop = e.target.closest('button[data-days]');
      if (!knop) return;
      state.horizon = Number(knop.dataset.days);
      zetPilGroep(vspHorizon, knop);
      renderPrediction();
    });
  }

  /* ============================================================
   * Pagina-wissel en formaat-wijziging
   * ============================================================ */
  function renderZichtbareMonitorPagina() {
    if (state.pagina === 'p-dashboard') renderDashboard();
    else if (state.pagina === 'p-statistiek') renderStatistics();
    else if (state.pagina === 'p-voorspelling') renderPrediction();
  }

  document.addEventListener('pagina-gewijzigd', (e) => {
    const id = e.detail && e.detail.id;
    if (!id) return;
    state.pagina = id;
    renderZichtbareMonitorPagina();
  });

  window.addEventListener('resize', () => {
    renderZichtbareMonitorPagina();
  });

  /* Kleurthema kan meebewegen met licht/donker */
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', renderZichtbareMonitorPagina);

  vulRegioSelects();
})();

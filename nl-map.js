import {
  MAP_VIEWBOX,
  SURROUNDING_PATHS,
  PROVINCES,
  LAYERS,
  LAYER_STYLES,
  PROJECTION,
  projectLngLat,
  GEOJSON_FALLBACK_PATHS,
  getProvinceById,
  getProvinceMetric,
  getNationalSummary,
  getRadarBlobs,
} from './nl-map-data.js';

(function initNetherlandsMap() {
  const svg = document.getElementById('nl-map-svg');
  const canvas = document.getElementById('nl-map-radar');
  const stage = document.getElementById('nl-map-stage');
  const mapShell = document.getElementById('nl-map-shell');
  const app = document.getElementById('app-virus');
  const statusbar = document.getElementById('statusbar');
  const regionBtn = document.getElementById('map-region-reset');
  const regionNameEl = document.getElementById('map-region-name');
  const topMetricEl = document.getElementById('map-top-metric');
  const layerSelect = document.getElementById('map-layer');
  const legendEl = document.getElementById('map-legend');
  const sheetToggle = document.getElementById('sheet-toggle');
  const appbar = document.getElementById('appbar');

  // Nieuwe bedieningselementen voor vergroting en zoom
  const magnifierBtn = document.getElementById('map-magnifier');
  const fullscreenCloseBtn = document.getElementById('map-fullscreen-close');
  const zoomInBtn = document.getElementById('map-zoom-in');
  const zoomOutBtn = document.getElementById('map-zoom-out');
  const zoomResetBtn = document.getElementById('map-zoom-reset');
  const zoomIndicator = document.getElementById('map-zoom-indicator');

  if (!svg || !canvas || !stage) return;

  const ctx = canvas.getContext('2d');
  const SVG_NS = 'http://www.w3.org/2000/svg';

  /* ============================================================
   * Staat
   * ============================================================ */
  const state = {
    selectedProvinceId: null,
    layerId: 'besmettingen',
    sheetFull: false,
    isFullscreen: false,
  };

  // Zoom/pan-staat, gebaseerd op het SVG-viewBox
  const DEFAULT_VIEW = {
    x: 0,
    y: 0,
    w: MAP_VIEWBOX.width,
    h: MAP_VIEWBOX.height,
  };
  const view = { ...DEFAULT_VIEW };

  // Minimale breedte = maximale zoom in (6x); maximale breedte = maximale zoom uit (0.83x)
  const MIN_W = MAP_VIEWBOX.width / 6;
  const MAX_W = MAP_VIEWBOX.width * 1.15;
  const ASPECT = MAP_VIEWBOX.height / MAP_VIEWBOX.width;

  // Actieve pad-data. Begint met ingebedde fallback; wordt vervangen
  // zodra fetch van public/geo/nl-provincies.geo.json slaagt.
  let activePaths = GEOJSON_FALLBACK_PATHS;
  let geojsonLoaded = false;

  /* ============================================================
   * Selectie voor layer
   * ============================================================ */
  if (layerSelect) {
    layerSelect.innerHTML = '';
    for (const layer of LAYERS) {
      const opt = document.createElement('option');
      opt.value = layer.id;
      opt.textContent = layer.label;
      layerSelect.appendChild(opt);
    }
    layerSelect.value = state.layerId;
  }

  /* ============================================================
   * SVG-helpers
   * ============================================================ */
  function createSvgEl(tag, attrs = {}) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, String(v));
    }
    return el;
  }

  // Achtergrond: België en Duitsland als context
  const bgGroup = createSvgEl('g', { class: 'nl-surrounding' });
  bgGroup.appendChild(createSvgEl('path', { d: SURROUNDING_PATHS.belgium, class: 'nl-neighbor' }));
  bgGroup.appendChild(createSvgEl('path', { d: SURROUNDING_PATHS.germany, class: 'nl-neighbor' }));
  svg.appendChild(bgGroup);

  // Subtiele water-achtergrond (Noordzee, IJsselmeer-context)
  const waterGroup = createSvgEl('g', { class: 'nl-water', 'aria-hidden': 'true' });
  waterGroup.appendChild(createSvgEl('rect', {
    x: 0, y: 0,
    width: MAP_VIEWBOX.width, height: MAP_VIEWBOX.height,
    class: 'nl-water-bg',
  }));
  svg.appendChild(waterGroup);

  // Provinciegroepen aanmaken
  const provincesGroup = createSvgEl('g', { class: 'nl-provinces' });
  const provinceElements = new Map();

  for (const province of PROVINCES) {
    const group = createSvgEl('g', {
      class: 'nl-province',
      role: 'button',
      tabindex: '0',
      'data-province': province.id,
      'aria-label': `${province.name} (${province.city})`,
      'aria-pressed': 'false',
    });

    // Eerste pad plaatsen; wordt later (na GeoJSON-load) vervangen.
    const initialD = activePaths[province.id] || (province.paths && province.paths[0]) || '';
    group.appendChild(createSvgEl('path', {
      d: initialD,
      class: 'nl-province-shape',
      'fill-rule': 'evenodd',
    }));

    const selectHandler = () => {
      state.selectedProvinceId =
        state.selectedProvinceId === province.id ? null : province.id;
      updateUI();
    };

    group.addEventListener('click', (e) => {
      if (pointerMoved) {
        // Sleepbeweging: niet als klik op provincie behandelen
        return;
      }
      e.stopPropagation();
      selectHandler();
    });

    group.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectHandler();
      }
    });

    provincesGroup.appendChild(group);
    provinceElements.set(province.id, group);
  }
  svg.appendChild(provincesGroup);

  // Markeerpunt (actieve pin)
  const pinGroup = createSvgEl('g', { class: 'nl-dots', 'aria-hidden': 'true' });
  const activePin = createSvgEl('g', { class: 'nl-active-pin' });
  activePin.appendChild(createSvgEl('circle', { cx: 0, cy: 0, r: 8, class: 'nl-pin-halo' }));
  activePin.appendChild(createSvgEl('circle', { cx: 0, cy: 0, r: 4, class: 'nl-pin-core' }));
  pinGroup.appendChild(activePin);
  svg.appendChild(pinGroup);

  // Klik op het water deselecteert (terug naar heel Nederland)
  svg.addEventListener('click', () => {
    if (pointerMoved) return;
    if (state.selectedProvinceId !== null) {
      state.selectedProvinceId = null;
      updateUI();
    }
  });

  // Andere onderdelen (dashboard/voorspelling) mogen de regio instellen
  document.addEventListener('monitor-regio', (e) => {
    const id = e.detail && e.detail.id ? e.detail.id : null;
    if (id !== state.selectedProvinceId) {
      state.selectedProvinceId = id && getProvinceById(id) ? id : null;
      updateUI();
    }
  });

  /* ============================================================
   * GeoJSON inladen (echte geografische data)
   * ============================================================ */
  function ringToSvgPath(ring) {
    if (!ring || ring.length < 4) return '';
    let d = '';
    for (let i = 0; i < ring.length; i++) {
      const [lng, lat] = ring[i];
      const p = projectLngLat(lng, lat);
      d += (i === 0 ? 'M ' : 'L ') + p.x.toFixed(2) + ' ' + p.y.toFixed(2) + ' ';
    }
    return d + 'Z';
  }

  function featureToSvgPath(feat) {
    const geom = feat.geometry;
    if (!geom || geom.type !== 'MultiPolygon') return '';
    const parts = [];
    for (const polygon of geom.coordinates) {
      if (!polygon || !polygon.length) continue;
      const outer = ringToSvgPath(polygon[0]);
      if (outer) parts.push(outer);
      for (let i = 1; i < polygon.length; i++) {
        const hole = ringToSvgPath(polygon[i]);
        if (hole) parts.push(hole);
      }
    }
    return parts.join(' ');
  }

  async function loadGeoJSON() {
    try {
      const res = await fetch('public/geo/nl-provincies.geo.json', { cache: 'force-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data || !Array.isArray(data.features)) {
        throw new Error('GeoJSON bevat geen features');
      }
      const paths = {};
      let count = 0;
      for (const feat of data.features) {
        const pid = feat.properties && (feat.properties.id || feat.properties.statcode);
        const mapped = mapFeatureIdToProvinceId(feat);
        if (!mapped) continue;
        paths[mapped] = featureToSvgPath(feat);
        count++;
      }
      if (count !== 12) {
        console.warn('[nl-map] Verwachtte 12 provincies in GeoJSON, kreeg ' + count);
      }
      activePaths = paths;
      geojsonLoaded = true;
      rebuildProvinceShapes();
      updateUI();
    } catch (err) {
      console.warn('[nl-map] GeoJSON-laden mislukt, ingebedde fallback wordt gebruikt:', err.message);
    }
  }

  function mapFeatureIdToProvinceId(feat) {
    if (!feat.properties) return null;
    const name = feat.properties.name || feat.properties.statnaam;
    const id = feat.properties.id;
    if (id && PROVINCES.some((p) => p.id === id)) return id;
    const nameToId = {
      Groningen: 'groningen',
      'Fryslân': 'friesland',
      Friesland: 'friesland',
      Drenthe: 'drenthe',
      Overijssel: 'overijssel',
      Flevoland: 'flevoland',
      Gelderland: 'gelderland',
      Utrecht: 'utrecht',
      'Noord-Holland': 'noord-holland',
      'Zuid-Holland': 'zuid-holland',
      Zeeland: 'zeeland',
      'Noord-Brabant': 'noord-brabant',
      Limburg: 'limburg',
    };
    if (name && nameToId[name]) return nameToId[name];
    return null;
  }

  function rebuildProvinceShapes() {
    for (const province of PROVINCES) {
      const group = provinceElements.get(province.id);
      if (!group) continue;
      const d = activePaths[province.id] || (province.paths && province.paths[0]) || '';
      const shape = group.querySelector('.nl-province-shape');
      if (shape) {
        shape.setAttribute('d', d);
        shape.setAttribute('fill-rule', 'evenodd');
      }
    }
  }

  /* ============================================================
   * UI updaten (selectie, kleuren, legenda, radar)
   * ============================================================ */
  function getProvinceTint(metric, layerId) {
    const stijl = LAYER_STYLES[layerId] || LAYER_STYLES.besmettingen;
    if (!metric) return stijl.colors.laag;
    return stijl.colors[metric.level] || stijl.colors.laag;
  }

  function updateUI() {
    const selected = getProvinceById(state.selectedProvinceId);

    document.dispatchEvent(
      new CustomEvent('kaart-regio', {
        detail: { id: selected ? selected.id : null },
      })
    );

    if (selected) {
      const metric = getProvinceMetric(selected.id, state.layerId);
      regionNameEl.textContent = `${selected.name} · ${selected.city}`;
      topMetricEl.textContent = metric.formatted;
      regionBtn.setAttribute(
        'aria-label',
        `Geselecteerde regio: ${selected.name}. Klik om heel Nederland te tonen.`
      );
    } else {
      const national = getNationalSummary(state.layerId);
      regionNameEl.textContent = national.label;
      topMetricEl.textContent = national.formatted;
      regionBtn.setAttribute('aria-label', 'Regio: Nederland');
    }

    for (const province of PROVINCES) {
      const el = provinceElements.get(province.id);
      const metric = getProvinceMetric(province.id, state.layerId);
      const isSelected = province.id === state.selectedProvinceId;

      el.classList.toggle('is-selected', isSelected);
      el.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
      el.setAttribute('aria-label', `${province.name} (${province.city}): ${metric.formatted}`);

      const fill = getProvinceTint(metric, state.layerId);
      el.querySelectorAll('.nl-province-shape').forEach((shape) => {
        shape.style.fill = fill;
      });
    }

    const pinTarget = selected || getProvinceById('utrecht');
    if (pinTarget) {
      activePin.setAttribute('transform', `translate(${pinTarget.marker.x}, ${pinTarget.marker.y})`);
    }

    if (app) {
      app.dataset.mapRegion = selected ? selected.id : 'nederland';
      app.dataset.mapLayer = state.layerId;
    }

    renderLegenda();
    drawRadar();
  }

  /* ---------- Legenda ---------- */
  function renderLegenda() {
    if (!legendEl) return;
    const stijl = LAYER_STYLES[state.layerId] || LAYER_STYLES.besmettingen;
    const niveaus = ['laag', 'matig', 'hoog'];

    legendEl.innerHTML = '';
    const header = document.createElement('span');
    header.className = 'map-legend-title';
    header.textContent = stijl.unit || 'Niveau';
    legendEl.appendChild(header);

    for (const niveau of niveaus) {
      const item = document.createElement('span');
      item.className = 'map-legend-item';

      const swatch = document.createElement('i');
      swatch.className = 'map-legend-swatch';
      swatch.style.background = stijl.colors[niveau];

      const naam = document.createElement('b');
      naam.textContent = niveau.charAt(0).toUpperCase() + niveau.slice(1);

      const bereik = document.createElement('em');
      bereik.textContent = stijl.labels[niveau];

      item.appendChild(swatch);
      item.appendChild(naam);
      item.appendChild(bereik);
      legendEl.appendChild(item);
    }

    const demoTag = document.createElement('span');
    demoTag.className = 'map-legend-demo';
    demoTag.textContent = 'demo-data';
    legendEl.appendChild(demoTag);
  }

  /* ---------- Radar (canvas-overlay) ---------- */
  function resizeCanvas() {
    const rect = stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    return { w, h, dpr };
  }

  function drawRadar() {
    const { w, h, dpr } = resizeCanvas();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    if (w < 10 || h < 10) return;

    // Pas de schaal aan op de huidige viewBox (zodat radar meezoomt/pannt)
    const scale = Math.min(w / view.w, h / view.h);
    const offsetX = (w - MAP_VIEWBOX.width * scale) / 2 - view.x * scale;
    const offsetY = (h - MAP_VIEWBOX.height * scale) / 2 - view.y * scale;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    const blobs = getRadarBlobs(state.layerId);

    for (const blob of blobs) {
      const grad = ctx.createRadialGradient(
        blob.x, blob.y, 2,
        blob.x, blob.y, blob.radius
      );

      if (state.layerId === 'vaccin') {
        grad.addColorStop(0, `rgba(165, 139, 240, ${0.42 * blob.intensity})`);
        grad.addColorStop(0.55, `rgba(123, 97, 201, ${0.24 * blob.intensity})`);
        grad.addColorStop(1, 'rgba(123, 97, 201, 0)');
      } else if (state.layerId === 'rioolwater') {
        grad.addColorStop(0, `rgba(255, 198, 72, ${0.45 * blob.intensity})`);
        grad.addColorStop(0.5, `rgba(102, 187, 255, ${0.32 * blob.intensity})`);
        grad.addColorStop(1, 'rgba(102, 187, 255, 0)');
      } else if (state.layerId === 'rgetal') {
        grad.addColorStop(0, `rgba(255, 112, 67, ${0.48 * blob.intensity})`);
        grad.addColorStop(0.5, `rgba(255, 183, 77, ${0.28 * blob.intensity})`);
        grad.addColorStop(1, 'rgba(255, 183, 77, 0)');
      } else {
        grad.addColorStop(0, `rgba(240, 248, 255, ${0.58 * blob.intensity})`);
        grad.addColorStop(0.45, `rgba(118, 178, 245, ${0.48 * blob.intensity})`);
        grad.addColorStop(0.8, `rgba(60, 128, 224, ${0.22 * blob.intensity})`);
        grad.addColorStop(1, 'rgba(60, 128, 224, 0)');
      }

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /* ============================================================
   * Zoom en pan (viewBox-manipulatie)
   * ============================================================ */
  function applyViewBox() {
    svg.setAttribute('viewBox', `${view.x.toFixed(2)} ${view.y.toFixed(2)} ${view.w.toFixed(2)} ${view.h.toFixed(2)}`);
    updateZoomIndicator();
    drawRadar();
  }

  function updateZoomIndicator() {
    if (!zoomIndicator) return;
    const factor = DEFAULT_VIEW.w / view.w;
    zoomIndicator.textContent = `${factor.toFixed(1)}×`;
  }

  function clampView() {
    // Voorkom dat de kaart buiten beeld raakt; minimaal 25% zichtbaar
    const mapLeft = 0, mapRight = MAP_VIEWBOX.width;
    const mapTop = 0, mapBottom = MAP_VIEWBOX.height;
    const minVisible = 0.25;

    if (view.w < MAP_VIEWBOX.width) {
      const minX = mapLeft - view.w * (1 - minVisible);
      const maxX = mapRight - view.w * minVisible;
      view.x = Math.max(minX, Math.min(maxX, view.x));
    } else {
      view.x = (mapLeft + mapRight - view.w) / 2;
    }
    if (view.h < MAP_VIEWBOX.height) {
      const minY = mapTop - view.h * (1 - minVisible);
      const maxY = mapBottom - view.h * minVisible;
      view.y = Math.max(minY, Math.min(maxY, view.y));
    } else {
      view.y = (mapTop + mapBottom - view.h) / 2;
    }
  }

  function zoomBy(factor, centerSvgX, centerSvgY) {
    const newW = Math.max(MIN_W, Math.min(MAX_W, view.w / factor));
    const actualFactor = view.w / newW;
    const cx = centerSvgX != null ? centerSvgX : view.x + view.w / 2;
    const cy = centerSvgY != null ? centerSvgY : view.y + view.h / 2;
    view.x = cx - (cx - view.x) * actualFactor;
    view.y = cy - (cy - view.y) * actualFactor;
    view.w = newW;
    view.h = newW * ASPECT;
    clampView();
    applyViewBox();
  }

  function resetView() {
    view.x = DEFAULT_VIEW.x;
    view.y = DEFAULT_VIEW.y;
    view.w = DEFAULT_VIEW.w;
    view.h = DEFAULT_VIEW.h;
    clampView();
    applyViewBox();
  }

  function screenToSvg(clientX, clientY) {
    const rect = svg.getBoundingClientRect();
    const sx = (clientX - rect.left) / rect.width;
    const sy = (clientY - rect.top) / rect.height;
    return {
      x: view.x + sx * view.w,
      y: view.y + sy * view.h,
    };
  }

  /* ---------- Wieltje zoomen (desktop) ---------- */
  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const pt = screenToSvg(e.clientX, e.clientY);
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    zoomBy(factor, pt.x, pt.y);
  }, { passive: false });

  /* ---------- Pinch-to-zoom en slepen (mobiel + desktop) ---------- */
  const pointers = new Map();
  let pinch = null;
  let drag = null;
  let pointerMoved = false; // flag om sleep van klik te onderscheiden

  svg.addEventListener('pointerdown', (e) => {
    // Laat toetsenbordinteractie met de provincies onaangetast
    if (e.target.closest('.nl-province')) {
      // Provincie-aanklikken blijft werken; we tracken wel beweging
    }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    pointerMoved = false;

    if (pointers.size === 2) {
      // Start pinch
      const pts = [...pointers.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const mid = {
        x: (pts[0].x + pts[1].x) / 2,
        y: (pts[0].y + pts[1].y) / 2,
      };
      const svgMid = screenToSvg(mid.x, mid.y);
      pinch = {
        dist,
        svgX: svgMid.x,
        svgY: svgMid.y,
        startW: view.w,
        startH: view.h,
      };
      drag = null;
      try { svg.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    } else if (pointers.size === 1 && view.w < DEFAULT_VIEW.w * 0.98) {
      // Start sleep alleen wanneer we ingezoomd zijn
      drag = {
        startX: e.clientX,
        startY: e.clientY,
        startViewX: view.x,
        startViewY: view.y,
      };
      try { svg.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    }
  });

  svg.addEventListener('pointermove', (e) => {
    if (pointers.has(e.pointerId)) {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    if (pinch && pointers.size >= 2) {
      const pts = [...pointers.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (pinch.dist > 0 && dist > 0) {
        const factor = dist / pinch.dist;
        const newW = Math.max(MIN_W, Math.min(MAX_W, pinch.startW / factor));
        view.w = newW;
        view.h = newW * ASPECT;
        // Hou het startpunt onder de vingers vast
        const mid = {
          x: (pts[0].x + pts[1].x) / 2,
          y: (pts[0].y + pts[1].y) / 2,
        };
        const rect = svg.getBoundingClientRect();
        const sxNorm = (mid.x - rect.left) / rect.width;
        const syNorm = (mid.y - rect.top) / rect.height;
        view.x = pinch.svgX - sxNorm * view.w;
        view.y = pinch.svgY - syNorm * view.h;
        clampView();
        applyViewBox();
        pointerMoved = true;
      }
      return;
    }

    if (drag) {
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        pointerMoved = true;
      }
      const rect = svg.getBoundingClientRect();
      const dxSvg = (dx / rect.width) * view.w;
      const dySvg = (dy / rect.height) * view.h;
      view.x = drag.startViewX - dxSvg;
      view.y = drag.startViewY - dySvg;
      clampView();
      applyViewBox();
    }
  });

  function endPointer(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (pointers.size === 0) {
      drag = null;
    }
    try { svg.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    // Reset de pointerMoved-flag na een korte vertraging,
    // zodat een volgende klik weer normaal werkt.
    setTimeout(() => { pointerMoved = false; }, 60);
  }

  svg.addEventListener('pointerup', endPointer);
  svg.addEventListener('pointercancel', endPointer);
  svg.addEventListener('pointerleave', (e) => {
    // pointerleave betekent niet altijd end; laat capture het afhandelen
  });

  /* ---------- Zoomknoppen ---------- */
  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      zoomBy(1.4);
    });
  }
  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      zoomBy(1 / 1.4);
    });
  }
  if (zoomResetBtn) {
    zoomResetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      resetView();
    });
  }

  /* ============================================================
   * Vergrootglas / grote kaartweergave (fullscreen modal)
   * ============================================================ */
  function setFullscreen(fs) {
    state.isFullscreen = Boolean(fs);
    document.body.classList.toggle('map-fullscreen-open', state.isFullscreen);
    stage.classList.toggle('is-fullscreen', state.isFullscreen);
    if (magnifierBtn) {
      magnifierBtn.setAttribute('aria-expanded', state.isFullscreen ? 'true' : 'false');
      magnifierBtn.setAttribute('aria-label',
        state.isFullscreen ? 'Kaart verkleinen naar normale weergave' : 'Kaart vergroten');
    }
    // Huidige selectie en kaartlaag blijven behouden (state veranderd niet)
    // Pas canvas en viewBox aan nadat de layout is veranderd
    setTimeout(() => {
      drawRadar();
      applyViewBox();
    }, 120);
  }

  if (magnifierBtn) {
    magnifierBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setFullscreen(!state.isFullscreen);
    });
  }
  if (fullscreenCloseBtn) {
    fullscreenCloseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setFullscreen(false);
    });
  }

  // ESC sluit de grote weergave
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.isFullscreen) {
      setFullscreen(false);
    }
  });

  /* ============================================================
   * Bestaande bediening: regio, kaartlaag, bottom sheet
   * ============================================================ */
  if (regionBtn) {
    regionBtn.addEventListener('click', () => {
      state.selectedProvinceId = state.selectedProvinceId ? null : 'utrecht';
      updateUI();
    });
  }

  if (layerSelect) {
    layerSelect.addEventListener('change', () => {
      state.layerId = layerSelect.value;
      updateUI();
    });
  }

  /* ---------- Bottom sheet omhoog en omlaag swipen ---------- */
  function setSheetFull(full) {
    state.sheetFull = Boolean(full);
    if (mapShell) {
      mapShell.style.transition = '';
      mapShell.style.flexBasis = '';
    }
    if (app) {
      app.classList.toggle('sheet-full', state.sheetFull);
    }
    if (statusbar) {
      statusbar.classList.toggle('sheet-full', state.sheetFull);
    }
    if (sheetToggle) {
      sheetToggle.setAttribute('aria-expanded', state.sheetFull ? 'true' : 'false');
    }
    setTimeout(drawRadar, 300);
  }

  if (sheetToggle && app && mapShell) {
    let dragging = false;
    let startY = 0;
    let startBasis = 0;
    let moved = false;
    let suppressNextClick = false;

    const appSheet = document.getElementById('app-sheet');
    const appbody = document.querySelector('.appbody');
    const getMaxBasis = () => Math.max(180, Math.round(app.clientHeight * 0.48));

    const onPointerDown = (e) => {
      if (e.target.closest('#terug')) return;
      dragging = true;
      moved = false;
      startY = e.clientY;
      startBasis = mapShell.getBoundingClientRect().height;
      mapShell.style.transition = 'none';
      if (e.currentTarget.setPointerCapture) {
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // ignore synthetic pointer capture errors
        }
      }
    };

    const onPointerMove = (e) => {
      if (!dragging) return;
      const dy = e.clientY - startY;
      if (Math.abs(dy) > 5) moved = true;
      const maxBasis = getMaxBasis();
      const nextBasis = Math.max(0, Math.min(maxBasis, startBasis + dy));
      mapShell.style.flexBasis = `${nextBasis}px`;
    };

    const onPointerEnd = (e) => {
      if (!dragging) return;
      dragging = false;
      const dy = e.clientY - startY;
      suppressNextClick = true;
      setTimeout(() => { suppressNextClick = false; }, 120);

      if (!moved) {
        setSheetFull(!state.sheetFull);
        return;
      }
      const maxBasis = getMaxBasis();
      const currentHeight = mapShell.getBoundingClientRect().height;
      if (dy < -28) {
        setSheetFull(true);
      } else if (dy > 28) {
        setSheetFull(false);
      } else {
        setSheetFull(currentHeight < maxBasis * 0.5);
      }
    };

    [sheetToggle, appbar].forEach((handle) => {
      if (!handle) return;
      handle.addEventListener('pointerdown', onPointerDown);
      handle.addEventListener('pointermove', onPointerMove);
      handle.addEventListener('pointerup', onPointerEnd);
      handle.addEventListener('pointercancel', onPointerEnd);
    });

    sheetToggle.addEventListener('click', () => {
      if (suppressNextClick) return;
      setSheetFull(!state.sheetFull);
    });

    if (appSheet) {
      let bodySwipeY = null;
      let bodyStartScroll = 0;

      appSheet.addEventListener('pointerdown', (e) => {
        if (e.target.closest('#sheet-toggle, #appbar, input, select')) return;
        bodySwipeY = e.clientY;
        bodyStartScroll = appbody ? appbody.scrollTop : 0;
      });

      appSheet.addEventListener('pointerup', (e) => {
        if (bodySwipeY === null) return;
        const dy = e.clientY - bodySwipeY;
        bodySwipeY = null;
        if (!state.sheetFull && dy < -36) {
          setSheetFull(true);
        } else if (state.sheetFull && dy > 44 && bodyStartScroll <= 2) {
          setSheetFull(false);
        }
      });

      appSheet.addEventListener('pointercancel', () => {
        bodySwipeY = null;
      });
    }

    document.addEventListener('pagina-gewijzigd', (e) => {
      const pageId = e.detail && e.detail.id;
      if (!pageId) return;
      setSheetFull(pageId !== 'p-menu');
    });
  }

  window.addEventListener('resize', () => {
    drawRadar();
    applyViewBox();
  });

  // Kleurthema kan meebewegen met licht/donker
  window.matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', drawRadar);

  /* ============================================================
   * Start: GeoJSON laden en initiële weergave
   * ============================================================ */
  applyViewBox();
  updateUI();
  loadGeoJSON();
})();

import {
  MAP_VIEWBOX,
  SURROUNDING_PATHS,
  PROVINCES,
  LAYERS,
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
  const sheetToggle = document.getElementById('sheet-toggle');
  const appbar = document.getElementById('appbar');

  if (!svg || !canvas || !stage) return;

  const ctx = canvas.getContext('2d');
  const SVG_NS = 'http://www.w3.org/2000/svg';

  const state = {
    selectedProvinceId: null,
    layerId: 'besmettingen',
    sheetFull: false,
  };

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

  function createSvgEl(tag, attrs = {}) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, String(v));
    }
    return el;
  }

  // Build SVG map layers
  const bgGroup = createSvgEl('g', { class: 'nl-surrounding' });
  bgGroup.appendChild(createSvgEl('path', { d: SURROUNDING_PATHS.belgium, class: 'nl-neighbor' }));
  bgGroup.appendChild(createSvgEl('path', { d: SURROUNDING_PATHS.germany, class: 'nl-neighbor' }));
  svg.appendChild(bgGroup);

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

    for (const d of province.paths) {
      group.appendChild(createSvgEl('path', { d, class: 'nl-province-shape' }));
    }

    const selectHandler = () => {
      state.selectedProvinceId =
        state.selectedProvinceId === province.id ? null : province.id;
      updateUI();
    };

    group.addEventListener('click', (e) => {
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

  // Single measurement point marker (1 meetpunt)
  const pinGroup = createSvgEl('g', { class: 'nl-dots', 'aria-hidden': 'true' });
  const activePin = createSvgEl('g', { class: 'nl-active-pin' });
  activePin.appendChild(createSvgEl('circle', { cx: 0, cy: 0, r: 7.5, class: 'nl-pin-halo' }));
  activePin.appendChild(createSvgEl('circle', { cx: 0, cy: 0, r: 3.8, class: 'nl-pin-core' }));
  pinGroup.appendChild(activePin);
  svg.appendChild(pinGroup);

  // Clicking on the sea resets to Nederland
  svg.addEventListener('click', () => {
    if (state.selectedProvinceId !== null) {
      state.selectedProvinceId = null;
      updateUI();
    }
  });

  function getProvinceTint(metric, layerId) {
    if (!metric) return '#1d7d24';
    if (layerId === 'vaccin') {
      const mix = Math.round(metric.intensity * 40);
      return `rgb(22, ${110 + mix}, ${48 + Math.round(mix * 0.5)})`;
    }
    if (layerId === 'rgetal') {
      return metric.level === 'hoog'
        ? '#267e26'
        : metric.level === 'matig'
        ? '#1d7624'
        : '#186823';
    }
    return metric.level === 'hoog'
      ? '#218426'
      : metric.level === 'matig'
      ? '#1b7924'
      : '#166b22';
  }

  function updateUI() {
    const selected = getProvinceById(state.selectedProvinceId);

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

    drawRadar();
  }

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

    const scale = Math.min(w / MAP_VIEWBOX.width, h / MAP_VIEWBOX.height);
    const offsetX = (w - MAP_VIEWBOX.width * scale) / 2;
    const offsetY = (h - MAP_VIEWBOX.height * scale) / 2;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    const blobs = getRadarBlobs(state.layerId);

    for (const blob of blobs) {
      const grad = ctx.createRadialGradient(
        blob.x,
        blob.y,
        2,
        blob.x,
        blob.y,
        blob.radius
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

    // Swipe-up anywhere on the sheet/pages to pull up to full height, swipe-down at top to reveal map
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

  window.addEventListener('resize', drawRadar);

  updateUI();
})();

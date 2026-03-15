/* ================================================================
   StitchTexTech — main.js
   Interaktive Zeitleiste mit D3.js v7
   ================================================================ */

(function () {
  'use strict';

  async function loadJson(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} fuer ${url}`);
    }
    return response.json();
  }

  /* ── Konfiguration ─────────────────────────────────────────────── */
  const YEAR_START = 1700;
  const YEAR_END   = 2030;
  const MARGIN     = { top: 72, right: 50, bottom: 8, left: 0 };

  const SIG_RADIUS = {
    low:      5,
    medium:   7.5,
    high:     10.5,
    landmark: 14
  };

  const TRACKS = [
    { id: 'A', label: 'Näh- & Stickmaschinen',              color: '#C0392B', dash: '10,5' },
    { id: 'B', label: 'Open-Source-Textilmaschinen',         color: '#27AE60', dash: '5,4' },
    { id: 'C', label: 'Open Hardware / DIY-Technologie',     color: '#2980B9', dash: '14,3,2,3' },
    { id: 'D', label: 'Allgemeine Technologie',              color: '#7F8C8D', dash: null },
    { id: 'E', label: 'Pädagogik & Computational Thinking',  color: '#9B59B6', dash: '6,3' },
    { id: 'F', label: 'Stitch(x) Projekt',                   color: '#E67E22', dash: '2,3' },
    { id: 'G', label: 'Textildesign, Kunst & Material',      color: '#A66E4A', dash: '9,4' }
  ];
  const TRACK_MAP  = Object.fromEntries(TRACKS.map(t => [t.id, t]));
  const TRACK_IDS  = TRACKS.map(t => t.id);

  /* ── App-State ─────────────────────────────────────────────────── */
  let xScale;           // Basis-Scale (unveränderlich nach init)
  let currentXScale;    // Aktuelle Scale (nach Zoom)
  let zoomBehavior;
  let svgSel;

  let activeFilters  = new Set(TRACK_IDS);
  let showConn       = false;
  let showLabels     = false;
  let selectedId     = null;
  let hoveredId      = null;
  let searchQuery    = '';
  let activeSession  = null;   // Kurs-Modus: aktive Session-ID oder null
  let viewMode       = 'multi';  // 'multi' | 'single'
  let collapsedLayerMap = null;  // Map<eventId, layer>
  let svgFontScale = 1;  // updated by applyFontSize(), ratio to 15px base
  function svgPx(base) { return Math.round(base * svgFontScale * 10) / 10; }
  function collDim() {
    return {
      cardW:   Math.round(108 * svgFontScale),
      cardH:   Math.round(40  * svgFontScale),
      layerGap: Math.round(6  * svgFontScale),
      stemGap:  3
    };
  }
  const COLL = { get cardW() { return collDim().cardW; }, get cardH() { return collDim().cardH; }, get layerGap() { return collDim().layerGap; }, get stemGap() { return collDim().stemGap; } };

  let labelGroupSel  = null;   // SVG-Gruppe für permanente Labels

  /* ── Session-Edit + Präsentations-State ────────────────────────── */
  let sessionEditMode  = false;
  let presentationMode = false;
  let presEvents       = [];
  let presIdx          = 0;
  let presScope        = 'session';  // 'session' | 'all'

  let galleryItems = [];   // current media items in gallery
  let galleryIdx   = 0;    // active gallery item index
  let navEvents    = [];   // visible events sorted by year (for panel nav)
  let navIdx       = 0;    // current index in navEvents
  let editingId     = null;
  let activeMetrics    = new Set();  // Set aktiver Metrik-IDs (Mehrfachauswahl)
  let metricsData      = null;       // Geladen aus data/metrics.json
  let trackLabelLevels = new Map();  // eventId → 1|2 (pro-Track-Kollisionsvermeidung)

  /* ── Daten ─────────────────────────────────────────────────────── */
  let data = null;
  let sourcesData = [];
  let eventMap = new Map();

  /* ── DOM-Referenzen ────────────────────────────────────────────── */
  const svgWrapper   = document.getElementById('stt-svg-wrapper');
  const sidebar      = document.getElementById('stt-sidebar');
  const panel        = document.getElementById('stt-panel');
  const panelBar     = document.getElementById('stt-panel-bar');
  const panelClose   = document.getElementById('stt-panel-close');
  const panelYear    = document.getElementById('stt-panel-year');
  const panelBadge   = document.getElementById('stt-panel-badge');
  const panelTitle   = document.getElementById('stt-panel-title');
  const panelSub     = document.getElementById('stt-panel-subtitle');
  const panelDesc    = document.getElementById('stt-panel-desc');
  const panelLinks   = document.getElementById('stt-panel-links');
  const panelSource  = document.getElementById('stt-panel-source');
  const panelBody    = document.getElementById('stt-panel-body');
  const editForm     = document.getElementById('stt-edit-form');
  const editBtn      = document.getElementById('stt-panel-edit');
  const exportBtn    = document.getElementById('stt-export-btn');
  const tooltip      = document.getElementById('stt-tooltip');

  /* ================================================================
     LOCAL EDITS — localStorage + Export
  ================================================================ */
  const LS_KEY          = 'stt-local-edits';
  const LS_SESSIONS_KEY = 'stt-local-sessions';

  function loadLocalEdits() {
    try {
      const stored = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
      data.events.forEach(ev => {
        if (stored[ev.id]) Object.assign(ev, stored[ev.id]);
      });
      updateExportBadge();
    } catch (e) { /* ignore */ }
  }

  function saveLocalEdit(id, changes) {
    try {
      const stored = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
      stored[id] = Object.assign(stored[id] || {}, changes);
      localStorage.setItem(LS_KEY, JSON.stringify(stored));
      updateExportBadge();
    } catch (e) { /* ignore */ }
  }

  function countLocalEdits() {
    try {
      return Object.keys(JSON.parse(localStorage.getItem(LS_KEY) || '{}')).length;
    } catch (e) { return 0; }
  }

  function updateExportBadge() {
    if (!exportBtn) return;
    const n = countLocalEdits();
    const hasSessEdits = (() => {
      try { return Object.keys(JSON.parse(localStorage.getItem(LS_SESSIONS_KEY) || '{}')).length > 0; }
      catch (e) { return false; }
    })();
    exportBtn.hidden = n === 0 && !hasSessEdits;
    exportBtn.textContent = n > 0 ? `↓ ${n} Edit${n !== 1 ? 's' : ''}` : '↓ Session-Edits';
  }

  function exportData() {
    const blob = new Blob(
      [JSON.stringify(data, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = 'timeline-edited.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function resetLocalEdits() {
    if (!confirm('Alle lokalen Änderungen löschen und Originaldaten wiederherstellen?')) return;
    localStorage.removeItem(LS_KEY);
    window.location.reload();
  }

  /* ── Lokale Session-Edits (stt-local-sessions) ─────────────────── */
  function loadLocalSessions() {
    try {
      const stored = JSON.parse(localStorage.getItem(LS_SESSIONS_KEY) || '{}');
      /* Bestehende Sessions aktualisieren */
      (data.sessions || []).forEach(sess => {
        const s = stored[sess.id];
        if (!s) return;
        sess.events = s.events || sess.events;
        if (s.title !== undefined) sess.title = s.title;
        if (s.date  !== undefined) sess.date  = s.date;
        if (s.desc  !== undefined) sess.desc  = s.desc;
      });
      /* Neu angelegte Sessions (nur in localStorage, nicht in JSON) */
      const existingIds = new Set((data.sessions || []).map(s => s.id));
      Object.entries(stored).forEach(([id, s]) => {
        if (!existingIds.has(id)) {
          data.sessions = data.sessions || [];
          data.sessions.push({ id, title: s.title || id, date: s.date || '', desc: s.desc || '', events: s.events || [] });
        }
      });
      updateExportBadge();
    } catch (e) { /* ignore */ }
  }

  function saveLocalSessions() {
    try {
      const stored = {};
      (data.sessions || []).forEach(sess => {
        stored[sess.id] = { events: sess.events || [], title: sess.title, date: sess.date, desc: sess.desc };
      });
      localStorage.setItem(LS_SESSIONS_KEY, JSON.stringify(stored));
      updateExportBadge();
    } catch (e) { /* ignore */ }
  }

  /* loadLocalSessions: auch title/date/desc übernehmen + neue Sessions anlegen */
  /* (Funktion bereits oben definiert; hier wird loadLocalSessions ergänzt) */

  /* ── Session-Manager-Modal ──────────────────────────────────────── */
  function openSessionManager() {
    buildSessionManagerList();
    openModal('stt-session-mgr-modal');
  }

  function buildSessionManagerList() {
    const list = document.getElementById('stt-session-mgr-list');
    if (!list) return;
    list.innerHTML = '';
    (data.sessions || []).forEach(sess => list.appendChild(buildSessionRow(sess)));
  }

  function buildSessionRow(sess) {
    const row = document.createElement('div');
    row.className = 'stt-session-mgr__row';
    row.dataset.id = sess.id;

    const fields = document.createElement('div');
    fields.className = 'stt-session-mgr__row-fields';

    const titleIn = document.createElement('input');
    titleIn.type = 'text'; titleIn.className = 'stt-session-mgr__title';
    titleIn.value = sess.title || ''; titleIn.placeholder = 'Titel';
    titleIn.setAttribute('aria-label', 'Session-Titel');

    const dateIn = document.createElement('input');
    dateIn.type = 'date'; dateIn.className = 'stt-session-mgr__date';
    dateIn.value = sess.date || '';
    dateIn.setAttribute('aria-label', 'Datum');

    const descIn = document.createElement('input');
    descIn.type = 'text'; descIn.className = 'stt-session-mgr__desc';
    descIn.value = sess.desc || ''; descIn.placeholder = 'Kurzbeschreibung';
    descIn.setAttribute('aria-label', 'Beschreibung');

    fields.append(titleIn, dateIn, descIn);

    const meta = document.createElement('div');
    meta.className = 'stt-session-mgr__row-meta';

    const count = document.createElement('span');
    count.className = 'stt-session-mgr__count';
    count.textContent = `${(sess.events || []).length} Events`;

    const saveBtn = document.createElement('button');
    saveBtn.className = 'stt-btn stt-btn--ghost stt-session-mgr__save';
    saveBtn.textContent = 'Speichern';
    saveBtn.addEventListener('click', () => {
      sess.title = titleIn.value.trim();
      sess.date  = dateIn.value;
      sess.desc  = descIn.value.trim();
      saveLocalSessions();
      rebuildSessionPicker();
      showToast(`Session "${sess.title}" gespeichert`);
    });

    const delBtn = document.createElement('button');
    delBtn.className = 'stt-btn stt-btn--danger stt-session-mgr__del';
    delBtn.textContent = '✕';
    delBtn.title = 'Session löschen';
    delBtn.addEventListener('click', () => {
      if (!confirm(`Session "${sess.title || sess.id}" löschen?`)) return;
      data.sessions = (data.sessions || []).filter(s => s.id !== sess.id);
      if (activeSession === sess.id) {
        activeSession = null;
        const selEl = document.getElementById('stt-session-select');
        if (selEl) { selEl.value = ''; selEl.classList.remove('has-session'); }
        const editBtn2 = document.getElementById('stt-session-edit-btn');
        if (editBtn2) editBtn2.hidden = true;
        if (sessionEditMode) exitSessionEditMode();
        applyEventVisibility();
      }
      saveLocalSessions();
      rebuildSessionPicker();
      buildSessionManagerList();
      showToast('Session gelöscht');
    });

    meta.append(count, saveBtn, delBtn);
    row.append(fields, meta);
    return row;
  }

  function addNewSession() {
    const id   = 'sess-' + Date.now();
    const idx  = (data.sessions || []).length + 1;
    const sess = { id, title: `Neue Session ${idx}`, date: '', desc: '', events: [] };
    data.sessions = data.sessions || [];
    data.sessions.push(sess);
    saveLocalSessions();
    rebuildSessionPicker();
    buildSessionManagerList();
    const list = document.getElementById('stt-session-mgr-list');
    const newRow = list?.lastElementChild;
    newRow?.scrollIntoView({ behavior: 'smooth' });
    newRow?.querySelector('.stt-session-mgr__title')?.select();
    newRow?.querySelector('.stt-session-mgr__title')?.focus();
  }

  /* Dropdown nach Änderungen neu aufbauen */
  function rebuildSessionPicker() {
    const sel = document.getElementById('stt-session-select');
    if (!sel) return;
    const prev = sel.value;
    while (sel.options.length > 1) sel.remove(1);
    (data.sessions || []).forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      const d = s.date ? new Date(s.date).toLocaleDateString('de-AT', { day:'2-digit', month:'2-digit' }) : '';
      opt.textContent = `${d}${d ? ' · ' : ''}${s.title}`;
      sel.appendChild(opt);
    });
    if ([...sel.options].some(o => o.value === prev)) sel.value = prev;
  }

  /* ================================================================
     SIDEBAR — Track-Labels (synchron mit SVG-Tracks)
  ================================================================ */
  function buildSidebar() {
    const rows = `repeat(${TRACKS.length}, 1fr)`;
    sidebar.style.gridTemplateRows = rows;
    const padTop    = MARGIN.top;
    const padBottom = MARGIN.bottom;
    sidebar.style.paddingTop    = padTop    + 'px';
    sidebar.style.paddingBottom = padBottom + 'px';

    TRACKS.forEach(t => {
      const div = document.createElement('div');
      div.className = 'stt-track-label';
      div.dataset.track = t.id;
      div.setAttribute('role', 'listitem');
      div.innerHTML = `
        <span class="stt-track-label__swatch" style="background:${t.color}"></span>
        <span>${t.label}</span>`;
      sidebar.appendChild(div);
    });
  }

  /* ================================================================
     SVG — Aufbau
  ================================================================ */
  function svgDimensions() {
    const rect = svgWrapper.getBoundingClientRect();
    return {
      w: rect.width,
      h: rect.height
    };
  }

  /* Y-Position der Mittellinie eines Tracks */
  function trackY(trackId, h) {
    const dim = h !== undefined ? h : svgDimensions().h;
    const inner = dim - MARGIN.top - MARGIN.bottom;
    const th = inner / TRACKS.length;
    const i  = TRACK_IDS.indexOf(trackId);
    return MARGIN.top + i * th + th / 2;
  }

  /* Datumsobjekt für ein Ereignis */
  function eventDate(ev) {
    return new Date(ev.year, ev.month ? ev.month - 1 : 6, 1);
  }

  /* ── Verbindungspfad (kubische Bezier-Kurve) ─────────────────── */
  function connectionPath(src, tgt, sc, h) {
    const x1 = sc(eventDate(src));
    const y1 = trackY(src.track, h);
    const x2 = sc(eventDate(tgt));
    const y2 = trackY(tgt.track, h);
    const cx = (x1 + x2) / 2;
    return `M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`;
  }

  /* ================================================================
     METRIK-OVERLAY — Kontext-Hintergrunddaten
  ================================================================ */
  function renderMetricOverlay(g, sc, h) {
    g.selectAll('*').remove();
    if (!activeMetrics.size || !metricsData) return;

    const yBot = h - MARGIN.bottom;
    const yTop = MARGIN.top;

    /* Alle aktiven Metriken in derselben Reihenfolge wie metricsData */
    const ordered = (metricsData.metrics || []).filter(m => activeMetrics.has(m.id));

    ordered.forEach((metric, idx) => {
      const pts = metric.data.filter(p => p.year >= YEAR_START && p.year <= YEAR_END + 10);
      if (pts.length < 2) return;

      const useLog = metric.scale === 'log';
      const vals   = pts.map(p => p.value);
      const vMax   = d3.max(vals);
      const vMin   = useLog ? d3.min(vals.filter(v => v > 0)) : 0;

      const yScale = useLog
        ? d3.scaleLog().domain([vMin, vMax]).range([yBot, yTop]).clamp(true)
        : d3.scaleLinear().domain([0, vMax]).range([yBot, yTop]).clamp(true);

      const mg = g.append('g')
        .attr('class', `stt-metric-single stt-metric-${metric.id}`)
        .style('pointer-events', 'none');

      /* Fläche */
      mg.append('path')
        .datum(pts)
        .attr('class', 'stt-metric-area')
        .attr('d', d3.area()
          .x(p => sc(new Date(p.year, 6, 1)))
          .y0(yBot)
          .y1(p => yScale(p.value))
          .curve(d3.curveCatmullRom))
        .attr('fill', metric.color)
        .attr('fill-opacity', metric.fillOpacity || 0.09);

      /* Oberkante-Linie */
      mg.append('path')
        .datum(pts)
        .attr('class', 'stt-metric-line')
        .attr('d', d3.line()
          .x(p => sc(new Date(p.year, 6, 1)))
          .y(p => yScale(p.value))
          .curve(d3.curveCatmullRom))
        .attr('fill', 'none')
        .attr('stroke', metric.color)
        .attr('stroke-width', 1.5)
        .attr('stroke-opacity', 0.5);

      /* Label oben rechts, vertikal gestapelt — mit aktuellem Endwert */
      const latestPt  = pts[pts.length - 1];
      const fmtFn     = d3.format(metric.format || ',.0f');
      const fmtVal    = fmtFn(latestPt.value);
      mg.append('text')
        .attr('class', 'stt-metric-label')
        .attr('x', sc.range()[1] - 6)
        .attr('y', yTop + 13 + idx * 14)
        .attr('text-anchor', 'end')
        .attr('fill', metric.color)
        .attr('font-family', "'IBM Plex Mono', monospace")
        .attr('font-size', svgPx(9) + 'px')
        .attr('font-weight', '600')
        .text(`${metric.label}: ${fmtVal} ${metric.unit} (${latestPt.year})`);

      /* Annotationen: Punkte auf der Kurve mit Mini-Label */
      (metric.annotations || []).forEach(ann => {
        const val = interpolateMetric(metric, ann.year);
        if (val === null) return;
        const ax = sc(new Date(ann.year, 6, 1));
        const ay = yScale(val);

        mg.append('circle')
          .attr('cx', ax).attr('cy', ay)
          .attr('r', 3)
          .attr('fill', metric.color)
          .attr('stroke', 'white')
          .attr('stroke-width', 1.5)
          .style('pointer-events', 'none');

        mg.append('text')
          .attr('x', ax + 5).attr('y', ay - 5)
          .attr('fill', metric.color)
          .attr('font-family', "'IBM Plex Mono', monospace")
          .attr('font-size', svgPx(8) + 'px')
          .attr('opacity', 0.75)
          .style('pointer-events', 'none')
          .text(`${ann.year}`);
      });
    });
  }

  /* ================================================================
     METRIK-HILFSFUNKTIONEN
  ================================================================ */

  /* Linearer oder logarithmischer Interpolationswert für ein Jahr */
  function interpolateMetric(metric, year) {
    const pts = metric.data;
    if (!pts || !pts.length) return null;
    const years = pts.map(p => p.year);
    const i = d3.bisectLeft(years, year);
    if (i === 0) return year < pts[0].year ? null : pts[0].value;
    if (i >= pts.length) return pts[pts.length - 1].value;
    const a = pts[i - 1], b = pts[i];
    const t = (year - a.year) / (b.year - a.year);
    if (metric.scale === 'log') {
      return Math.exp(Math.log(a.value) + t * (Math.log(b.value) - Math.log(a.value)));
    }
    return a.value + t * (b.value - a.value);
  }

  /* Crosshair beim Hovern über die SVG-Timeline */
  function updateCrosshair(mx) {
    if (!svgSel || !activeMetrics.size || !metricsData || !currentXScale) return;

    let chG = svgSel.select('.stt-metric-crosshair');
    if (chG.empty()) chG = svgSel.append('g').attr('class', 'stt-metric-crosshair');
    chG.selectAll('*').remove();

    const year = Math.round(currentXScale.invert(mx).getFullYear());
    if (year < YEAR_START - 10 || year > YEAR_END + 10) return;

    const { h, w } = svgDimensions();
    const ordered  = (metricsData.metrics || []).filter(m => activeMetrics.has(m.id));
    if (!ordered.length) return;

    /* Vertikale Linie */
    chG.append('line')
      .attr('x1', mx).attr('x2', mx)
      .attr('y1', MARGIN.top).attr('y2', h - MARGIN.bottom)
      .attr('stroke', '#555')
      .attr('stroke-width', 0.75)
      .attr('stroke-dasharray', '4,3')
      .attr('opacity', 0.28)
      .style('pointer-events', 'none');

    /* Annotation-Check: gibt es eine Annotation nahe diesem Jahr? */
    const ANNO_RANGE = 3;
    const annos = [];
    ordered.forEach(metric => {
      (metric.annotations || []).forEach(ann => {
        if (Math.abs(ann.year - year) <= ANNO_RANGE) annos.push({ metric, ann });
      });
    });

    /* Readout-Box */
    const lineH   = Math.round(15 * svgFontScale);
    const rows    = ordered.length + (annos.length ? 1 : 0);
    const boxH    = Math.round(22 * svgFontScale) + rows * lineH + (annos.length ? 2 : 0);
    const boxW    = Math.round(154 * svgFontScale);
    const readX   = mx + 10 + boxW > w - 6 ? mx - boxW - 8 : mx + 10;
    const readY   = MARGIN.top + 8;

    const box = chG.append('g')
      .attr('transform', `translate(${readX},${readY})`)
      .style('pointer-events', 'none');

    box.append('rect')
      .attr('x', -4).attr('y', -4)
      .attr('width', boxW).attr('height', boxH)
      .attr('rx', 4)
      .attr('fill', 'var(--surface)')
      .attr('fill-opacity', 0.93)
      .attr('stroke', 'var(--border)')
      .attr('stroke-width', 0.8);

    /* Jahr */
    box.append('text')
      .attr('x', 4).attr('y', Math.round(12 * svgFontScale))
      .attr('font-family', "'IBM Plex Mono', monospace")
      .attr('font-size', svgPx(10) + 'px')
      .attr('font-weight', '600')
      .attr('fill', 'var(--text)')
      .text(year);

    /* Werte für jede aktive Metrik */
    ordered.forEach((metric, idx) => {
      const val = interpolateMetric(metric, year);
      if (val === null) return;
      const fmt    = metric.format || ',.0f';
      const fmtFn  = d3.format(fmt);
      const valStr = fmtFn(val);
      const row    = 22 + idx * lineH;

      box.append('circle')
        .attr('cx', 5).attr('cy', row + 3)
        .attr('r', 3.5)
        .attr('fill', metric.color);

      box.append('text')
        .attr('x', 14).attr('y', row + lineH * 0.55)
        .attr('font-family', "'IBM Plex Mono', monospace")
        .attr('font-size', svgPx(9) + 'px')
        .attr('fill', metric.color)
        .text(`${valStr} ${metric.unit}`);
    });

    /* Annotationshinweis */
    if (annos.length) {
      const ry = 22 + ordered.length * lineH + 4;
      box.append('line')
        .attr('x1', 0).attr('x2', boxW - 8)
        .attr('y1', ry - 2).attr('y2', ry - 2)
        .attr('stroke', 'var(--border)').attr('stroke-width', 0.6);
      box.append('text')
        .attr('x', 4).attr('y', ry + Math.round(10 * svgFontScale))
        .attr('font-family', "'IBM Plex Sans', sans-serif")
        .attr('font-size', svgPx(8) + 'px')
        .attr('fill', 'var(--muted)')
        .attr('font-style', 'italic')
        .text(annos.map(a => a.ann.label).join(' · '));
    }
  }

  function clearCrosshair() {
    if (svgSel) svgSel.select('.stt-metric-crosshair').selectAll('*').remove();
  }

  /* ── Haupt-SVG aufbauen ──────────────────────────────────────── */
  function buildSVG() {
    const { w, h } = svgDimensions();

    /* Basis-Scale */
    xScale        = d3.scaleTime()
      .domain([new Date(YEAR_START, 0, 1), new Date(YEAR_END, 0, 1)])
      .range([0, w - MARGIN.right]);
    currentXScale = xScale;

    svgSel = d3.select('#stt-svg')
      .attr('width',   w)
      .attr('height',  h)
      .attr('viewBox', `0 0 ${w} ${h}`);

    svgSel.selectAll('*').remove();

    /* ── Defs ──────────────────────────────────────────────────── */
    const defs = svgSel.append('defs');

    /* Clip-Path: Events außerhalb des sichtbaren Bereichs ausblenden */
    defs.append('clipPath').attr('id', 'stt-clip')
      .append('rect')
      .attr('x',      -MARGIN.right)
      .attr('y',      0)
      .attr('width',  w + MARGIN.right * 2)
      .attr('height', h);

    /* Glow-Filter für landmark-Events */
    const glow = defs.append('filter').attr('id', 'stt-glow');
    glow.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
    const feMerge = glow.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    /* ── Track-Hintergrundbänder ─────────────────────────────── */
    const bandG = svgSel.append('g').attr('class', 'stt-bands');
    const inner = h - MARGIN.top - MARGIN.bottom;
    const th    = inner / TRACKS.length;

    TRACKS.forEach((t, i) => {
      bandG.append('rect')
        .attr('class', 'stt-track-band')
        .attr('x',      0)
        .attr('y',      MARGIN.top + i * th)
        .attr('width',  w)
        .attr('height', th);
    });

    /* ── Metrik-Overlay (hinter Markierungen) ────────────────── */
    const metricG = svgSel.append('g')
      .attr('class', 'stt-metric-overlay')
      .attr('clip-path', 'url(#stt-clip)');
    renderMetricOverlay(metricG, currentXScale, h);

    /* ── Zeitsäulen: Jahrzehnt- und Jahrhundert-Markierungen ─── */
    const markerG = svgSel.append('g').attr('class', 'stt-markers');
    renderMarkers(markerG, currentXScale, h);

    /* ── Zeitachse ───────────────────────────────────────────── */
    const axisG = svgSel.append('g')
      .attr('class', 'stt-axis')
      .attr('transform', `translate(0,${MARGIN.top - 6})`);
    renderAxis(axisG, currentXScale);

    /* ── Hauptgruppe (geclippt) ──────────────────────────────── */
    const mainG = svgSel.append('g')
      .attr('clip-path', 'url(#stt-clip)')
      .attr('class', 'stt-main-g');

    /* Verbindungslinien */
    const connG = mainG.append('g')
      .attr('class', 'stt-conn-group');
    renderConnections(connG, currentXScale, h);

    /* Track-Linien (Stich-Optik) */
    const lineG = mainG.append('g').attr('class', 'stt-lines');
    TRACKS.forEach(t => {
      lineG.append('line')
        .attr('class',            'stt-track-line')
        .attr('data-track',       t.id)
        .attr('x1',               xScale(new Date(YEAR_START - 20, 0, 1)))
        .attr('x2',               xScale(new Date(YEAR_END   + 20, 0, 1)))
        .attr('y1',               trackY(t.id, h))
        .attr('y2',               trackY(t.id, h))
        .attr('stroke',           t.color)
        .attr('stroke-width',     1.5)
        .attr('stroke-dasharray', t.dash || '')
        .attr('opacity',          0.55);
    });

    /* Events */
    const eventG = mainG.append('g').attr('class', 'stt-event-group');
    renderEvents(eventG, currentXScale, h);

    /* Labels (permanente Beschriftungen) */
    labelGroupSel = mainG.append('g').attr('class', 'stt-label-group');
    renderEventLabels(labelGroupSel, currentXScale, h);

    /* ── Zoom-Verhalten ────────────────────────────────────── */
    zoomBehavior = d3.zoom()
      .scaleExtent([0.15, 30])
      /* Rechtsklick-Drag für Pan; horizontale Wheel-Events separat */
      .filter(event => {
        if (event.type === 'wheel') {
          return Math.abs(event.deltaX || 0) <= Math.abs(event.deltaY || 0);
        }
        if (event.type === 'mousedown') return event.button === 0 || event.button === 2;
        return true;
      })
      .on('zoom', (event) => onZoom(event, axisG, markerG, connG, lineG, eventG, h));

    svgSel
      .call(zoomBehavior)
      .on('dblclick.zoom', null)
      .on('contextmenu', e => e.preventDefault()); /* kein Rechtsklick-Menü */

  }

  /* ── Zeitachse rendern / aktualisieren ───────────────────────── */
  function renderAxis(axisG, sc, innerH) {
    const { h } = svgDimensions();
    const inner = innerH !== undefined ? innerH : h - MARGIN.top - MARGIN.bottom;

    const axis = d3.axisTop(sc)
      .ticks(d3.timeYear.every(20))
      .tickSize(-inner - 6)
      .tickFormat(d3.timeFormat('%Y'));

    axisG.call(axis);
    axisG.select('.domain').remove();
    axisG.selectAll('.tick line').attr('opacity', 0); /* Markierungen separat */
    axisG.selectAll('.tick text')
      .attr('font-family', "'IBM Plex Mono', monospace")
      .attr('font-size',   svgPx(10) + 'px')
      .attr('fill',        '#9CA3AF')
      .attr('dy',          '-4px');
  }

  /* ── Jahrzehnt- / Jahrhundert-Säulen ──────────────────────────── */
  function renderMarkers(markerG, sc, h) {
    markerG.selectAll('*').remove();
    const inner = h - MARGIN.top - MARGIN.bottom;

    for (let y = YEAR_START; y <= YEAR_END; y += 10) {
      const x = sc(new Date(y, 0, 1));
      const isCentury = y % 100 === 0;
      markerG.append('line')
        .attr('class',        isCentury ? 'stt-century-mark' : 'stt-decade-mark')
        .attr('x1',           x).attr('x2', x)
        .attr('y1',           MARGIN.top)
        .attr('y2',           MARGIN.top + inner)
        .attr('stroke',       isCentury ? '#CBD5E1' : '#F1F3F5')
        .attr('stroke-width', isCentury ? 1 : 0.5);
    }
  }

  /* ── Events rendern ──────────────────────────────────────────── */
  function renderEvents(eventG, sc, h) {
    eventG.selectAll('.stt-event').remove();

    const evts = eventG.selectAll('.stt-event')
      .data(data.events, d => d.id)
      .enter()
      .append('circle')
      .attr('class',      d => ['stt-event', d.significance === 'landmark' ? 'is-landmark' : ''].join(' ').trim())
      .attr('data-id',    d => d.id)
      .attr('data-track', d => d.track)
      .attr('cx',         d => sc(eventDate(d)))
      .attr('cy',         d => trackY(d.track, h))
      .attr('r',          d => SIG_RADIUS[d.significance] || SIG_RADIUS.medium)
      .attr('fill',       d => TRACK_MAP[d.track]?.color || '#999')
      .attr('stroke',     d => d.significance === 'landmark' ? 'rgba(255,255,255,0.65)' : 'none')
      .attr('stroke-width', 2)
      .attr('tabindex',   0)
      .attr('role',       'button')
      .attr('aria-label', d => `${d.title}, ${d.year}, ${TRACK_MAP[d.track]?.label || ''}`)
      .style('filter',    d => d.significance === 'landmark' ? 'url(#stt-glow)' : null)
      .on('click',      onEventClick)
      .on('keydown',    onEventKeydown)
      .on('mouseenter', onEventMouseEnter)
      .on('mouseleave', onEventMouseLeave);

    applyEventVisibility();
  }

  /* ── Permanente Labels rendern ───────────────────────────────── */
  function renderEventLabels(labelG, sc, h) {
    labelG.selectAll('.stt-event-label').remove();
    if (!showLabels) return;

    const SW     = Math.round(3 * svgFontScale);
    const GAP    = 2;
    const PR     = Math.round(5 * svgFontScale);
    const FW     = 4.9 * svgFontScale;  // approx char width scales with font
    const LH     = Math.round(10 * svgFontScale);
    const PV     = 1;
    const PILL_H = LH * 2 + PV * 2;
    const LVL_GAP = 3;
    const MIN_GAP = Math.round(78 * svgFontScale);

    /* Greedy per-track level assignment based on current scale */
    trackLabelLevels.clear();
    const sorted = [...data.events].sort((a, b) => a.year - b.year);
    const trackLast = new Map(); // trackId → [lastX_L1, lastX_L2]
    sorted.forEach(ev => {
      const cx = sc(eventDate(ev));
      if (!trackLast.has(ev.track)) trackLast.set(ev.track, [-Infinity, -Infinity]);
      const [l1, l2] = trackLast.get(ev.track);
      if (cx - l1 >= MIN_GAP) {
        trackLabelLevels.set(ev.id, 1);
        trackLast.set(ev.track, [cx, l2]);
      } else if (cx - l2 >= MIN_GAP) {
        trackLabelLevels.set(ev.id, 2);
        trackLast.set(ev.track, [l1, cx]);
      } else {
        const lv = (cx - l1 >= cx - l2) ? 1 : 2;
        trackLabelLevels.set(ev.id, lv);
        if (lv === 1) trackLast.set(ev.track, [cx, l2]);
        else          trackLast.set(ev.track, [l1, cx]);
      }
    });

    function labelCY(d) {
      const base = trackY(d.track, h) - (SIG_RADIUS[d.significance] || SIG_RADIUS.medium) - 3;
      return (trackLabelLevels.get(d.id) === 2) ? base - PILL_H - LVL_GAP : base;
    }
    function pillW(d) {
      const chars = Math.max(Math.min(d.title.length, 16), String(d.year).length);
      return SW + GAP + chars * FW + PR;
    }

    const gs = labelG.selectAll('.stt-event-label')
      .data(data.events, d => d.id)
      .enter()
      .append('g')
      .attr('class',      'stt-event-label')
      .attr('data-id',    d => d.id)
      .attr('data-track', d => d.track)
      .attr('transform',  d => `translate(${sc(eventDate(d))},${labelCY(d)})`)
      .style('cursor', 'pointer')
      .on('mouseenter', onEventMouseEnter)
      .on('mouseleave', onEventMouseLeave);

    /* Background rect: white with colored stroke — matches compact card style */
    gs.append('rect')
      .attr('rx',           3)
      .attr('x',            d => -pillW(d) / 2)
      .attr('y',            -PILL_H)
      .attr('width',        d => pillW(d))
      .attr('height',       PILL_H)
      .attr('fill',         'var(--surface)')
      .attr('fill-opacity', 0.93)
      .attr('stroke',       d => TRACK_MAP[d.track]?.color || '#999')
      .attr('stroke-width', 0.8);

    /* Color swatch (left strip) — mirrors compact card */
    gs.append('rect')
      .attr('rx',     2)
      .attr('x',      d => -pillW(d) / 2)
      .attr('y',      -PILL_H)
      .attr('width',  SW)
      .attr('height', PILL_H)
      .attr('fill',   d => TRACK_MAP[d.track]?.color || '#999');

    gs.append('text')
      .attr('class',       'stt-card__year')
      .attr('x',           d => -pillW(d) / 2 + SW + GAP)
      .attr('y',           -(LH + PV))
      .attr('text-anchor', 'start')
      .attr('fill',        d => TRACK_MAP[d.track]?.color || '#999')
      .text(d => d.year);

    gs.append('text')
      .attr('class',       'stt-card__title')
      .attr('x',           d => -pillW(d) / 2 + SW + GAP)
      .attr('y',           -PV)
      .attr('text-anchor', 'start')
      .text(d => {
        const t = d.title;
        return t.length > 17 ? t.slice(0, 16) + '…' : t;
      });
  }

  /* ── Verbindungslinien rendern ───────────────────────────────── */
  function renderConnections(connG, sc, h) {
    connG.selectAll('.stt-connection').remove();

    /* Alle eindeutigen Paare sammeln */
    const seen  = new Set();
    const pairs = [];
    data.events.forEach(src => {
      (src.connections || []).forEach(tgtId => {
        const tgt = eventMap.get(tgtId);
        if (!tgt) return;
        const key = [src.id, tgtId].sort().join('|');
        if (!seen.has(key)) {
          seen.add(key);
          pairs.push({ key, src, tgt });
        }
      });
    });

    connG.selectAll('.stt-connection')
      .data(pairs, d => d.key)
      .enter()
      .append('path')
      .attr('class',   'stt-connection')
      .attr('data-key', d => d.key)
      .attr('d',       d => connectionPath(d.src, d.tgt, sc, h))
      .attr('stroke',  d => TRACK_MAP[d.src.track]?.color || '#999')
      .attr('opacity', 0);

    /* Sichtbarkeit je nach State */
    updateConnectionVisibility(connG);
  }

  function updateConnectionVisibility(connG) {
    if (viewMode === 'single') {
      updateCollapsedConnVisibility();
      return;
    }
    const g = connG || svgSel.select('.stt-conn-group');
    g.classed('stt-connections-on', showConn);
    const activeId = hoveredId || selectedId;
    if (activeId) {
      g.selectAll('.stt-connection')
        .attr('opacity', d => (d.src.id === activeId || d.tgt.id === activeId) ? 0.75 : (showConn ? 0.08 : 0));
    } else {
      g.selectAll('.stt-connection')
        .attr('opacity', showConn ? 0.32 : 0);
    }
  }

  /* ================================================================
     KOMPAKT-MODUS (Collapsed Single-Axis View)
  ================================================================ */
  function buildCollapsedSVG() {
    const { w, h } = svgDimensions();
    const AXIS_Y = h / 2;

    xScale        = d3.scaleTime()
      .domain([new Date(YEAR_START, 0, 1), new Date(YEAR_END, 0, 1)])
      .range([0, w - MARGIN.right]);
    currentXScale = xScale;

    svgSel = d3.select('#stt-svg')
      .attr('width',   w)
      .attr('height',  h)
      .attr('viewBox', `0 0 ${w} ${h}`);

    svgSel.selectAll('*').remove();

    /* Defs */
    const defs = svgSel.append('defs');
    defs.append('clipPath').attr('id', 'stt-clip')
      .append('rect')
      .attr('x',      -MARGIN.right)
      .attr('y',      0)
      .attr('width',  w + MARGIN.right * 2)
      .attr('height', h);
    const glow = defs.append('filter').attr('id', 'stt-glow');
    glow.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
    const feMerge = glow.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    /* Marker group */
    const markerG = svgSel.append('g').attr('class', 'stt-markers');
    renderCollapsedMarkers(markerG, currentXScale, AXIS_Y, h);

    /* ── Metrik-Overlay ──────────────────────────────────────── */
    const metricG = svgSel.append('g')
      .attr('class', 'stt-metric-overlay')
      .attr('clip-path', 'url(#stt-clip)');
    renderMetricOverlay(metricG, currentXScale, h);

    /* Axis (labels floating at AXIS_Y) */
    const axisG = svgSel.append('g')
      .attr('class',     'stt-axis')
      .attr('transform', `translate(0,${AXIS_Y})`);
    renderAxis(axisG, currentXScale, 0);

    /* Main group (clipped) */
    const mainG = svgSel.append('g')
      .attr('clip-path', 'url(#stt-clip)')
      .attr('class',     'stt-main-g');

    /* Horizontal axis line */
    mainG.append('line')
      .attr('class', 'stt-collapsed-line')
      .attr('x1', 0).attr('x2', w)
      .attr('y1', AXIS_Y).attr('y2', AXIS_Y);

    /* Greedy layer assignments */
    collapsedLayerMap = computeCollapsedLayers(currentXScale);

    const collConnG = mainG.append('g').attr('class', 'stt-collapsed-conn-group');
    const stemG     = mainG.append('g').attr('class', 'stt-stem-group');
    const cardG     = mainG.append('g').attr('class', 'stt-card-group-container');
    const eventG    = mainG.append('g').attr('class', 'stt-event-group');

    renderCollapsedConnections(collConnG, currentXScale, AXIS_Y, h);
    renderCollapsedCards(stemG, cardG, currentXScale, AXIS_Y, h);
    renderCollapsedEvents(eventG, currentXScale, AXIS_Y);

    /* Zoom */
    zoomBehavior = d3.zoom()
      .scaleExtent([0.15, 30])
      .filter(event => {
        if (event.type === 'wheel')
          return Math.abs(event.deltaX || 0) <= Math.abs(event.deltaY || 0);
        if (event.type === 'mousedown') return event.button === 0 || event.button === 2;
        return true;
      })
      .on('zoom', (event) => onCollapsedZoom(event, axisG, markerG, mainG, AXIS_Y, h, w));

    svgSel
      .call(zoomBehavior)
      .on('dblclick.zoom', null)
      .on('contextmenu', e => e.preventDefault());

    applyEventVisibility();
  }

  /* Greedy layer assignment in pixel space — [1,-1,2,-2,3,-3] priority */
  function computeCollapsedLayers(sc) {
    const sorted = [...data.events].sort((a, b) => a.year - b.year);
    const layers = [1, -1, 2, -2, 3, -3];
    const lastX  = new Map([[1,-Infinity],[-1,-Infinity],[2,-Infinity],[-2,-Infinity],[3,-Infinity],[-3,-Infinity]]);
    const minGap = COLL.cardW + 8;
    const result = new Map();

    sorted.forEach(ev => {
      const cx = sc(eventDate(ev));
      let chosen = null;
      for (const l of layers) {
        if (cx - lastX.get(l) >= minGap) { chosen = l; break; }
      }
      if (chosen === null) {
        chosen = layers.reduce((best, l) =>
          cx - lastX.get(l) > cx - lastX.get(best) ? l : best, layers[0]);
      }
      lastX.set(chosen, cx);
      result.set(ev.id, chosen);
    });
    return result;
  }

  /* Collapsed markers spanning full SVG height */
  function renderCollapsedMarkers(markerG, sc, axisY, h) {
    markerG.selectAll('*').remove();
    for (let y = YEAR_START; y <= YEAR_END; y += 10) {
      const x         = sc(new Date(y, 0, 1));
      const isCentury = y % 100 === 0;
      markerG.append('line')
        .attr('class',        isCentury ? 'stt-century-mark' : 'stt-decade-mark')
        .attr('x1', x).attr('x2', x)
        .attr('y1', MARGIN.top)
        .attr('y2', h - MARGIN.bottom)
        .attr('stroke',       isCentury ? '#CBD5E1' : '#F1F3F5')
        .attr('stroke-width', isCentury ? 1 : 0.5);
    }
  }

  /* Arc path for a single connection in collapsed view */
  function collArcPath(src, tgt, sc, axisY, h) {
    const x1      = sc(eventDate(src));
    const x2      = sc(eventDate(tgt));
    const mx      = (x1 + x2) / 2;
    const layerStep = Math.max(55,
      (Math.min(axisY - MARGIN.top, h - axisY) - COLL.cardH - 10) / 2);
    const maxH  = layerStep * 0.52;
    const arcH  = Math.max(8, Math.min(maxH, Math.abs(x2 - x1) / 10));
    return `M${x1},${axisY} Q${mx},${axisY - arcH} ${x2},${axisY}`;
  }

  /* Render all connection arcs for collapsed view */
  function renderCollapsedConnections(g, sc, axisY, h) {
    g.selectAll('*').remove();
    const evMap = new Map(data.events.map(e => [e.id, e]));
    const seen  = new Set();
    const pairs = [];
    data.events.forEach(ev => {
      (ev.connections || []).forEach(tid => {
        const key = [ev.id, tid].sort().join('||');
        if (!seen.has(key) && evMap.has(tid)) {
          seen.add(key);
          pairs.push({ src: ev, tgt: evMap.get(tid) });
        }
      });
    });
    g.selectAll('.stt-collapsed-conn')
      .data(pairs)
      .enter()
      .append('path')
      .attr('class',   'stt-collapsed-conn')
      .attr('data-src', d => d.src.id)
      .attr('data-tgt', d => d.tgt.id)
      .attr('d',        d => collArcPath(d.src, d.tgt, sc, axisY, h))
      .attr('stroke',   d => TRACK_MAP[d.src.track]?.color || '#999')
      .attr('opacity',  0);
  }

  /* Update collapsed connection visibility based on current state */
  function updateCollapsedConnVisibility() {
    if (!svgSel) return;
    const paths = svgSel.selectAll('.stt-collapsed-conn');
    const activeId = hoveredId || selectedId;
    if (activeId) {
      paths.attr('opacity', d =>
        (d.src.id === activeId || d.tgt.id === activeId) ? 0.72 : (showConn ? 0.05 : 0)
      );
      return;
    }
    if (!showConn) {
      paths.attr('opacity', 0);
      return;
    }
    paths.attr('opacity', 0.12);
  }

  /* Render stems + label cards in collapsed view */
  function renderCollapsedCards(stemG, cardG, sc, axisY, h) {
    /* LAYER_STEP so 3 cards fit above AND below the axis */
    const LAYER_STEP = Math.max(46, Math.min(
      (axisY - MARGIN.top - COLL.cardH - 5) / 3,
      (h - axisY - COLL.cardH - 5) / 3
    ));
    const OFF = Math.max(4, LAYER_STEP * 0.08); // small gap from axis line
    const layerCardTop = {
      1:    axisY - LAYER_STEP - COLL.cardH,
      2:    axisY - 2 * LAYER_STEP - COLL.cardH,
      3:    axisY - 3 * LAYER_STEP - COLL.cardH,
      '-1': axisY + OFF,
      '-2': axisY + LAYER_STEP + OFF,
      '-3': axisY + 2 * LAYER_STEP + OFF
    };

    const cardData = data.events.map(ev => {
      const layer   = collapsedLayerMap.get(ev.id) || 1;
      const cardTop = layerCardTop[layer] !== undefined
        ? layerCardTop[layer] : layerCardTop[1];
      const cx      = sc(eventDate(ev));
      const stemY1  = layer > 0
        ? cardTop + COLL.cardH + COLL.stemGap
        : axisY + COLL.stemGap;
      const stemY2  = layer > 0
        ? axisY - COLL.stemGap
        : cardTop - COLL.stemGap;
      return { ev, layer, cardTop, cx, stemY1, stemY2 };
    });

    /* Stems (behind cards) */
    stemG.selectAll('.stt-stem').remove();
    stemG.selectAll('.stt-stem')
      .data(cardData, d => d.ev.id)
      .enter()
      .append('line')
      .attr('class',        'stt-stem')
      .attr('data-id',      d => d.ev.id)
      .attr('x1',           d => d.cx)
      .attr('x2',           d => d.cx)
      .attr('y1',           d => d.stemY1)
      .attr('y2',           d => d.stemY2)
      .attr('stroke',       d => TRACK_MAP[d.ev.track]?.color || '#999')
      .attr('stroke-width', 1)
      .attr('opacity',      0.5);

    /* Cards */
    cardG.selectAll('.stt-card-group').remove();
    const groups = cardG.selectAll('.stt-card-group')
      .data(cardData, d => d.ev.id)
      .enter()
      .append('g')
      .attr('class',      'stt-card-group')
      .attr('data-id',    d => d.ev.id)
      .attr('data-track', d => d.ev.track)
      .attr('transform',  d => `translate(${d.cx - COLL.cardW / 2},${d.cardTop})`)
      .on('click',      (evt, d) => onEventClick(evt, d.ev))
      .on('mouseenter', (evt, d) => onEventMouseEnter(evt, d.ev))
      .on('mouseleave', onEventMouseLeave);

    /* Background rect */
    groups.append('rect')
      .attr('x', 0).attr('y', 0)
      .attr('width',        COLL.cardW)
      .attr('height',       COLL.cardH)
      .attr('rx', 3)
      .attr('fill',         'var(--surface)')
      .attr('stroke',       d => TRACK_MAP[d.ev.track]?.color || '#999')
      .attr('stroke-width', 1);

    /* Color swatch */
    groups.append('rect')
      .attr('x', 0).attr('y', 0)
      .attr('width',  3)
      .attr('height', COLL.cardH)
      .attr('rx', 2)
      .attr('fill', d => TRACK_MAP[d.ev.track]?.color || '#999');

    /* Year label */
    groups.append('text')
      .attr('class', 'stt-card__year')
      .attr('x', 8).attr('y', Math.round(13 * svgFontScale))
      .attr('fill', d => TRACK_MAP[d.ev.track]?.color || '#999')
      .text(d => d.ev.year);

    /* Title label */
    const maxChars = Math.round(19 / svgFontScale);
    groups.append('text')
      .attr('class', 'stt-card__title')
      .attr('x', 8).attr('y', Math.round(27 * svgFontScale))
      .text(d => {
        const t = d.ev.title;
        return t.length > maxChars ? t.slice(0, maxChars - 1) + '…' : t;
      });
  }

  /* Event circles on single collapsed axis */
  function renderCollapsedEvents(eventG, sc, axisY) {
    eventG.selectAll('.stt-event').remove();
    eventG.selectAll('.stt-event')
      .data(data.events, d => d.id)
      .enter()
      .append('circle')
      .attr('class',      d => ['stt-event', d.significance === 'landmark' ? 'is-landmark' : ''].join(' ').trim())
      .attr('data-id',    d => d.id)
      .attr('data-track', d => d.track)
      .attr('cx',         d => sc(eventDate(d)))
      .attr('cy',         axisY)
      .attr('r',          d => SIG_RADIUS[d.significance] || SIG_RADIUS.medium)
      .attr('fill',       d => TRACK_MAP[d.track]?.color || '#999')
      .attr('stroke',     d => d.significance === 'landmark' ? 'rgba(255,255,255,0.65)' : 'none')
      .attr('stroke-width', 2)
      .attr('tabindex',   0)
      .attr('role',       'button')
      .attr('aria-label', d => `${d.title}, ${d.year}, ${TRACK_MAP[d.track]?.label || ''}`)
      .style('filter',    d => d.significance === 'landmark' ? 'url(#stt-glow)' : null)
      .on('click',      onEventClick)
      .on('keydown',    onEventKeydown)
      .on('mouseenter', onEventMouseEnter)
      .on('mouseleave', onEventMouseLeave);
    applyEventVisibility();
  }

  /* Zoom handler for collapsed view */
  function onCollapsedZoom(event, axisG, markerG, mainG, axisY, h, w) {
    const newScale = event.transform.rescaleX(xScale);
    currentXScale  = newScale;

    renderAxis(axisG, newScale, 0);
    renderCollapsedMarkers(markerG, newScale, axisY, h);

    mainG.select('.stt-collapsed-line')
      .attr('x1', 0).attr('x2', w);

    mainG.select('.stt-event-group').selectAll('.stt-event')
      .attr('cx', d => newScale(eventDate(d)));

    mainG.select('.stt-card-group-container').selectAll('.stt-card-group')
      .attr('transform', d => `translate(${newScale(eventDate(d.ev)) - COLL.cardW / 2},${d.cardTop})`);

    mainG.select('.stt-stem-group').selectAll('.stt-stem')
      .attr('x1', d => newScale(eventDate(d.ev)))
      .attr('x2', d => newScale(eventDate(d.ev)));

    mainG.select('.stt-collapsed-conn-group').selectAll('.stt-collapsed-conn')
      .attr('d', d => collArcPath(d.src, d.tgt, newScale, axisY, h));

    /* Metrik-Overlay */
    const metricGColl = svgSel.select('.stt-metric-overlay');
    if (!metricGColl.empty()) renderMetricOverlay(metricGColl, newScale, h);
  }

  /* ================================================================
     ZOOM
  ================================================================ */
  function onZoom(event, axisG, markerG, connG, lineG, eventG, h) {
    const newScale = event.transform.rescaleX(xScale);
    currentXScale  = newScale;

    /* Achse */
    renderAxis(axisG, newScale);

    /* Jahrzehnt-/Jahrhundert-Markierungen */
    renderMarkers(markerG, newScale, h);

    /* Track-Linien */
    lineG.selectAll('.stt-track-line')
      .attr('x1', newScale(new Date(YEAR_START - 20, 0, 1)))
      .attr('x2', newScale(new Date(YEAR_END   + 20, 0, 1)));

    /* Events */
    eventG.selectAll('.stt-event')
      .attr('cx', d => newScale(eventDate(d)));

    /* Labels */
    if (labelGroupSel) {
      const PILL_H = Math.round(22 * svgFontScale);
      const LVL_GAP = 3;
      labelGroupSel.selectAll('.stt-event-label')
        .attr('transform', d => {
          const cx   = newScale(eventDate(d));
          const base = trackY(d.track, h) - (SIG_RADIUS[d.significance] || SIG_RADIUS.medium) - 3;
          const cy   = (trackLabelLevels.get(d.id) === 2) ? base - PILL_H - LVL_GAP : base;
          return `translate(${cx},${cy})`;
        });
    }

    /* Verbindungen */
    const { h: hNow } = svgDimensions();
    connG.selectAll('.stt-connection')
      .attr('d', d => connectionPath(d.src, d.tgt, newScale, hNow));

    /* Metrik-Overlay */
    const metricGZoom = svgSel.select('.stt-metric-overlay');
    if (!metricGZoom.empty()) renderMetricOverlay(metricGZoom, newScale, hNow);
  }

  /* ================================================================
     EVENTS: Interaction
  ================================================================ */
  function onEventClick(domEvent, d) {
    domEvent.stopPropagation();
    if (sessionEditMode) {
      toggleEventInSession(d.id);
      return;
    }
    selectedId = d.id;
    openPanel(d);
    applyEventVisibility();
  }

  function onEventKeydown(domEvent, d) {
    if (domEvent.key === 'Enter' || domEvent.key === ' ') {
      domEvent.preventDefault();
      onEventClick(domEvent, d);
    }
  }

  function onEventMouseEnter(domEvent, d) {
    const wrapRect = svgWrapper.getBoundingClientRect();
    const tgt      = domEvent.target;
    const rect     = tgt.getBoundingClientRect();
    const track    = TRACK_MAP[d.track] || {};

    /* Erstes Bild aus Medien (kein Video/Embed) */
    const thumb = normalizeMedia(d).find(m => m.type === 'image' || m.type === 'screenshot');
    const descSnippet = d.description
      ? d.description.slice(0, 90) + (d.description.length > 90 ? '…' : '')
      : '';

    tooltip.innerHTML = `
      ${thumb ? `<img class="stt-tooltip__img" src="${thumb.url}" alt="${thumb.caption || ''}" loading="lazy">` : ''}
      <div class="stt-tooltip__body">
        <div class="stt-tooltip__meta">
          <span class="stt-tooltip__year">${d.year}</span>
          <span class="stt-tooltip__badge" style="background:${track.color}28;color:${track.color}">${track.label || d.track}</span>
        </div>
        <div class="stt-tooltip__title">${d.title}</div>
        ${d.subtitle ? `<div class="stt-tooltip__sub">${d.subtitle}</div>` : ''}
        ${descSnippet  ? `<div class="stt-tooltip__desc">${descSnippet}</div>` : ''}
      </div>
    `;

    /* Bild-Fehler: Platzhalter ausblenden */
    tooltip.querySelector('.stt-tooltip__img')
      ?.addEventListener('error', function () { this.remove(); }, { once: true });

    const cx   = rect.left - wrapRect.left + rect.width / 2;
    const cy   = rect.top  - wrapRect.top;
    const cyBottom = rect.bottom - wrapRect.top;

    /* Horizontal: zentriert, außer wenn rechts kein Platz */
    const tWidth = 240;
    const left = cx + tWidth / 2 + 12 > wrapRect.width
      ? cx - tWidth / 2 - 4
      : cx;

    /* Vertikal: Tooltip nach unten klappen wenn zu wenig Platz nach oben */
    const TOOLTIP_APPROX_H = thumb ? 220 : 140;
    const flipBelow = cy < TOOLTIP_APPROX_H + 12;
    tooltip.classList.toggle('is-flipped', flipBelow);
    tooltip.classList.toggle('has-thumb', !!thumb);
    tooltip.style.left = left + 'px';
    tooltip.style.top  = flipBelow ? cyBottom + 'px' : cy + 'px';
    tooltip.classList.add('is-visible');
    tooltip.removeAttribute('aria-hidden');
    hoveredId = d.id;
    updateConnectionVisibility();
  }

  function onEventMouseLeave() {
    tooltip.classList.remove('is-visible', 'is-flipped', 'has-thumb');
    tooltip.setAttribute('aria-hidden', 'true');
    hoveredId = null;
    updateConnectionVisibility();
  }

  /* ================================================================
     SESSION-EDIT-MODE
  ================================================================ */
  function enterSessionEditMode() {
    sessionEditMode = true;
    document.body.classList.add('stt-session-edit-mode');
    const btn = document.getElementById('stt-session-edit-btn');
    if (btn) { btn.textContent = '✓ Fertig'; btn.classList.add('is-active'); }
    applyEventVisibility();
    showToast('Klicke auf Events zum Hinzufügen / Entfernen aus der Session');
  }

  function exitSessionEditMode() {
    sessionEditMode = false;
    document.body.classList.remove('stt-session-edit-mode');
    const btn = document.getElementById('stt-session-edit-btn');
    if (btn) { btn.textContent = '✏ bearbeiten'; btn.classList.remove('is-active'); }
    saveLocalSessions();
    applyEventVisibility();
    updateExportBadge();
  }

  function toggleEventInSession(id) {
    if (!activeSession) return;
    const sess = (data.sessions || []).find(s => s.id === activeSession);
    if (!sess) return;
    sess.events = sess.events || [];
    const idx = sess.events.indexOf(id);
    if (idx >= 0) sess.events.splice(idx, 1);
    else          sess.events.push(id);
    applySessionEditOverlay();
  }

  /* Gemeinsame Sichtbarkeits-Logik (wird auch in updatePanelNav, buildPresEvents genutzt) */
  function isFadedEvent(d) {
    const trackOff   = !activeFilters.has(d.track);
    const searchOff  = searchQuery.length > 0 && !matchesSearch(d);
    /* Im Session-Edit-Mode werden alle Events angezeigt (kein Session-Filter) */
    const sessionOff = activeSession && !sessionEditMode && !inActiveSession(d);
    return trackOff || searchOff || sessionOff;
  }

  /* CSS-Klassen für Session-Edit-Modus auf SVG-Circles */
  function applySessionEditOverlay() {
    if (!svgSel) return;
    const inSess = d => {
      if (!activeSession) return false;
      const sess = (data.sessions || []).find(s => s.id === activeSession);
      return sess ? (sess.events || []).includes(d.id) : false;
    };
    svgSel.selectAll('.stt-event')
      .classed('stt-ev-in-session',  d => sessionEditMode && inSess(d))
      .classed('stt-ev-out-session', d => sessionEditMode && !inSess(d));
  }

  /* ── Sichtbarkeit aller Circles aktualisieren ──────────────── */
  function applyEventVisibility() {
    if (svgSel) {
      svgSel.selectAll('.stt-event')
        .classed('is-selected', d => d.id === selectedId)
        .classed('is-faded', isFadedEvent);

      /* Labels mitfaden (multi-track) */
      if (labelGroupSel) {
        labelGroupSel.selectAll('.stt-event-label')
          .classed('is-faded', isFadedEvent);
      }

      /* Kompakt-Modus: Karten, Stems und Verbindungsbögen */
      if (viewMode === 'single') {
        svgSel.selectAll('.stt-card-group')
          .classed('is-faded', d => isFadedEvent(d.ev));
        svgSel.selectAll('.stt-stem')
          .classed('is-faded', d => isFadedEvent(d.ev));
        updateCollapsedConnVisibility();
      }

      applySessionEditOverlay();
    }

    document.querySelectorAll('.stt-track-label').forEach(el => {
      el.classList.toggle('is-hidden', !activeFilters.has(el.dataset.track));
    });
    document.querySelectorAll('.stt-filter-btn').forEach(btn => {
      const on = activeFilters.has(btn.dataset.track);
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function matchesSearch(ev) {
    const q = searchQuery.toLowerCase();
    return (
      ev.title.toLowerCase().includes(q)       ||
      (ev.subtitle     || '').toLowerCase().includes(q) ||
      (ev.description  || '').toLowerCase().includes(q) ||
      (ev.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }

  /* Kurs-Modus: Ereignis gehört zur aktiven Session? */
  function inActiveSession(ev) {
    if (!activeSession) return true;
    const sess = (data.sessions || []).find(s => s.id === activeSession);
    return sess ? (sess.events || []).includes(ev.id) : true;
  }

  /* ================================================================
     PRÄSENTATIONS-MODUS
  ================================================================ */
  function buildPresEvents() {
    if (presScope === 'session' && activeSession) {
      const sess = (data.sessions || []).find(s => s.id === activeSession);
      return (sess?.events || [])
        .map(id => eventMap.get(id)).filter(Boolean)
        .sort((a, b) => eventDate(a) - eventDate(b));
    }
    return data.events.filter(e => !isFadedEvent(e))
      .sort((a, b) => eventDate(a) - eventDate(b));
  }

  function enterPresentationMode() {
    presScope  = activeSession ? 'session' : 'all';
    presEvents = buildPresEvents();
    if (presEvents.length === 0) { showToast('Keine Events für Präsentation'); return; }

    const selIdx = selectedId ? presEvents.findIndex(e => e.id === selectedId) : -1;
    presIdx = selIdx >= 0 ? selIdx : 0;

    presentationMode = true;
    if (svgSel) svgSel.classed('stt-pres-active', true);

    const overlayEl = document.getElementById('stt-pres-overlay');
    if (overlayEl) overlayEl.removeAttribute('hidden');

    renderPresCard(presEvents[presIdx]);
    document.addEventListener('keydown', onPresKeydown);
  }

  function exitPresentationMode() {
    presentationMode = false;
    if (svgSel) {
      svgSel.classed('stt-pres-active', false);
      svgSel.selectAll('.stt-event').classed('stt-ev-presenting', false);
    }
    const overlayEl = document.getElementById('stt-pres-overlay');
    if (overlayEl) overlayEl.setAttribute('hidden', '');
    document.removeEventListener('keydown', onPresKeydown);
  }

  function renderPresCard(ev) {
    if (!ev) return;
    const track = TRACK_MAP[ev.track] || {};

    /* Trackbar */
    const bar = document.querySelector('.stt-pres-trackbar');
    if (bar) bar.style.background = track.color || '#ccc';

    /* Dot */
    const dotEl = document.querySelector('.stt-pres-dot');
    if (dotEl) dotEl.style.background = track.color || '#ccc';

    /* Year */
    const yearEl = document.querySelector('.stt-pres-year');
    if (yearEl) yearEl.textContent = ev.year;

    /* Badge */
    const badgeEl = document.querySelector('.stt-pres-badge');
    if (badgeEl) {
      badgeEl.textContent = track.label || ev.track;
      badgeEl.style.background = (track.color || '#ccc') + '28';
      badgeEl.style.color      = track.color || '#666';
    }

    /* Title / Subtitle */
    const titleEl = document.querySelector('.stt-pres-title');
    if (titleEl) titleEl.textContent = ev.title;
    const subEl = document.querySelector('.stt-pres-subtitle');
    if (subEl) subEl.textContent = ev.subtitle || '';

    /* Gallery */
    buildPresGallery(normalizeMedia(ev));

    /* Description */
    const descEl = document.querySelector('.stt-pres-desc');
    if (descEl) descEl.textContent = ev.description || '';

    /* Connections */
    buildPresConnectionChips(ev);

    /* Counter */
    const counterEl = document.querySelector('.stt-pres-counter');
    if (counterEl) counterEl.textContent = `${presIdx + 1} / ${presEvents.length}`;

    /* Nav button state */
    const prevBtn = document.getElementById('stt-pres-prev');
    const nextBtn = document.getElementById('stt-pres-next');
    if (prevBtn) prevBtn.disabled = presIdx <= 0;
    if (nextBtn) nextBtn.disabled = presIdx >= presEvents.length - 1;

    /* Highlight active event on timeline */
    if (svgSel) {
      svgSel.selectAll('.stt-event')
        .classed('stt-ev-presenting', d => d.id === ev.id);
    }

    /* Scroll card to top */
    const card = document.querySelector('.stt-pres-card');
    if (card) card.scrollTop = 0;

    /* Scroll timeline to event */
    scrollTimelineToEvent(ev);
  }

  function buildPresGallery(items) {
    const container = document.querySelector('.stt-pres-gallery');
    if (!container) return;
    container.innerHTML = '';
    if (items.length === 0) { container.hidden = true; return; }
    container.hidden = false;

    const item = items[0];
    if (item.type === 'video') {
      const iframe = document.createElement('iframe');
      iframe.src             = item.url;
      iframe.allow           = 'accelerometer; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      iframe.className       = 'stt-pres-gallery__video';
      container.appendChild(iframe);
    } else if (item.url) {
      const img  = document.createElement('img');
      img.src     = item.url;
      img.alt     = item.caption || '';
      img.className = 'stt-pres-gallery__img';
      img.onerror = () => { container.hidden = true; };
      container.appendChild(img);
    }

    if (item.caption || item.license || item.author) {
      const cap = document.createElement('p');
      cap.className   = 'stt-pres-gallery__caption';
      cap.textContent = [item.caption, item.license, item.author].filter(Boolean).join(' · ');
      container.appendChild(cap);
    }
  }

  function buildPresConnectionChips(ev) {
    const container = document.querySelector('.stt-pres-connections');
    if (!container) return;
    container.innerHTML = '';
    const conns = (ev.connections || []).map(id => eventMap.get(id)).filter(Boolean);
    if (conns.length === 0) { container.hidden = true; return; }
    container.hidden = false;

    const lbl = document.createElement('span');
    lbl.className   = 'stt-connections__label';
    lbl.textContent = 'Verbunden mit:';
    container.appendChild(lbl);

    conns.forEach(connEv => {
      const track = TRACK_MAP[connEv.track] || {};
      const chip  = document.createElement('button');
      chip.className = 'stt-conn-chip';
      const shortTitle = connEv.title.length > 22 ? connEv.title.slice(0, 21) + '…' : connEv.title;
      chip.innerHTML   = `<span class="stt-conn-chip__dot" style="background:${track.color}"></span><span>${connEv.year} · ${shortTitle}</span>`;
      chip.addEventListener('click', () => {
        exitPresentationMode();
        switchPanelTo(connEv);
      });
      container.appendChild(chip);
    });
  }

  function scrollTimelineToEvent(ev) {
    if (!currentXScale || !svgSel || !zoomBehavior) return;
    const x = currentXScale(eventDate(ev));
    const wrapRect = svgWrapper.getBoundingClientRect();
    if (x >= 0 && x <= wrapRect.width) return; /* already visible */
    const t       = d3.zoomTransform(svgSel.node());
    const baseX   = xScale(eventDate(ev));
    const newX    = wrapRect.width / 2 - t.k * baseX;
    const newTr   = d3.zoomIdentity.translate(newX, t.y).scale(t.k);
    svgSel.transition().duration(450).call(zoomBehavior.transform, newTr);
  }

  function onPresKeydown(e) {
    if (!presentationMode) return;
    if (e.key === 'ArrowLeft' && presIdx > 0) {
      e.preventDefault();
      presIdx--;
      renderPresCard(presEvents[presIdx]);
    } else if (e.key === 'ArrowRight' && presIdx < presEvents.length - 1) {
      e.preventDefault();
      presIdx++;
      renderPresCard(presEvents[presIdx]);
    }
  }

  /* ================================================================
     DETAIL PANEL v2
  ================================================================ */

  /* Normalize legacy image/video fields into media[] array */
  function normalizeMedia(ev) {
    if (ev.media && ev.media.length > 0) return ev.media;
    const items = [];
    if (ev.image && ev.image.url && ev.image.url !== 'TODO') {
      items.push({ type: 'image', url: ev.image.url, caption: ev.image.caption,
                   license: ev.image.license, author: ev.image.author });
    }
    if (ev.video) {
      items.push({ type: 'video', url: ev.video.url, caption: ev.video.caption });
    }
    return items;
  }

  /* Open panel (first time / from timeline click) */
  function openPanel(ev) {
    selectedId = ev.id;
    renderPanelContent(ev);
    updatePanelNav();
    panel.classList.add('is-open');
    applyEventVisibility();
    panelClose.focus();
  }

  /* Fill panel content without triggering open animation */
  function renderPanelContent(ev) {
    const track = TRACK_MAP[ev.track] || {};

    /* Track bar */
    panelBar.style.background = track.color || '#ccc';

    /* Header meta */
    panelYear.textContent  = ev.year;
    panelBadge.textContent = track.label || ev.track;
    panelBadge.style.background = (track.color || '#ccc') + '22';
    panelBadge.style.color      = track.color || '#666';

    /* Titles */
    panelTitle.textContent = ev.title;
    panelSub.textContent   = ev.subtitle || '';
    if (panelSub.textContent) panelSub.removeAttribute('hidden');
    else panelSub.setAttribute('hidden', '');

    /* Gallery */
    buildGallery(normalizeMedia(ev));

    /* Description */
    panelDesc.textContent = ev.description || '';

    /* Connections */
    buildConnectionChips(ev);

    /* Links */
    panelLinks.innerHTML = '';
    (ev.links || []).forEach(lnk => {
      const a = document.createElement('a');
      a.href        = lnk.url;
      a.textContent = lnk.label;
      a.className   = 'stt-panel__link';
      a.target      = '_blank';
      a.rel         = 'noopener noreferrer';
      panelLinks.appendChild(a);
    });

    /* Source */
    panelSource.textContent = ev.source ? `Quelle: ${ev.source}` : '';

    /* Scroll body to top */
    if (panelBody) panelBody.scrollTop = 0;
  }

  /* Switch to another event with fade-out/in */
  function switchPanelTo(ev) {
    closeEditMode();
    if (!panelBody) { openPanel(ev); return; }
    panelBody.classList.add('is-fading');
    setTimeout(() => {
      selectedId = ev.id;
      renderPanelContent(ev);
      updatePanelNav();
      applyEventVisibility();
      panelBody.classList.remove('is-fading');
    }, 160);
  }

  /* ── Gallery ─────────────────────────────────────────────────── */
  function buildGallery(items) {
    const stageEl   = document.getElementById('stt-gallery-stage');
    const dotsEl    = document.getElementById('stt-gallery-dots');
    const galleryEl = document.getElementById('stt-panel-gallery');
    if (!stageEl || !galleryEl) return;

    stageEl.innerHTML = '';
    dotsEl.innerHTML  = '';
    galleryItems = items;
    galleryIdx   = 0;

    if (items.length === 0) {
      galleryEl.hidden = true;
      return;
    }
    galleryEl.hidden = false;

    items.forEach((item, i) => {
      let el;
      if (item.type === 'video') {
        el = document.createElement('iframe');
        el.src             = item.url;
        el.allow           = 'accelerometer; encrypted-media; gyroscope; picture-in-picture';
        el.allowFullscreen = true;
        el.loading         = 'lazy';
        el.title           = item.caption || 'Video';
        el.className       = 'stt-gallery__video';
      } else if (item.type === 'embed') {
        const wrap   = document.createElement('div');
        wrap.className = 'stt-gallery__embed-wrap';
        const iframe = document.createElement('iframe');
        iframe.src     = item.url;
        iframe.loading = 'lazy';
        iframe.title   = item.caption || item.label || 'Webseite';
        iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
        const overlay = document.createElement('div');
        overlay.className = 'stt-gallery__embed-overlay';
        const link   = document.createElement('a');
        link.href      = item.url;
        link.target    = '_blank';
        link.rel       = 'noopener noreferrer';
        link.className = 'stt-gallery__embed-link';
        link.textContent = 'Im Browser öffnen ↗';
        overlay.appendChild(link);
        wrap.append(iframe, overlay);
        el = wrap;
      } else {
        /* image or screenshot */
        el = document.createElement('img');
        el.src       = item.url;
        el.alt       = item.caption || '';
        el.loading   = 'lazy';
        el.className = 'stt-gallery__img';
        el.onerror   = () => { el.style.display = 'none'; };
      }

      if (i === 0) el.classList.add('is-active');
      stageEl.appendChild(el);

      /* Dot indicator (only when >1 items) */
      if (items.length > 1) {
        const dot = document.createElement('button');
        dot.className   = 'stt-gallery__dot' + (i === 0 ? ' is-active' : '');
        dot.setAttribute('aria-label', `Medium ${i + 1}`);
        dot.dataset.idx = i;
        dot.addEventListener('click', () => showGalleryItem(i));
        dotsEl.appendChild(dot);
      }
    });

    updateGalleryCaption();
    updateGalleryArrows();
  }

  function showGalleryItem(idx) {
    if (idx < 0 || idx >= galleryItems.length) return;
    const stageEl = document.getElementById('stt-gallery-stage');
    const dotsEl  = document.getElementById('stt-gallery-dots');
    if (!stageEl) return;

    stageEl.children[galleryIdx]?.classList.remove('is-active');
    dotsEl.children[galleryIdx]?.classList.remove('is-active');
    galleryIdx = idx;
    stageEl.children[galleryIdx]?.classList.add('is-active');
    dotsEl.children[galleryIdx]?.classList.add('is-active');

    updateGalleryCaption();
    updateGalleryArrows();
  }

  function updateGalleryCaption() {
    const el   = document.getElementById('stt-gallery-caption');
    const item = galleryItems[galleryIdx];
    if (!el || !item) return;
    el.textContent = [item.caption, item.license, item.author].filter(Boolean).join(' · ');
  }

  function updateGalleryArrows() {
    const prev = document.getElementById('stt-gallery-prev');
    const next = document.getElementById('stt-gallery-next');
    const show = galleryItems.length > 1;
    if (prev) { prev.style.visibility = show ? '' : 'hidden'; prev.disabled = galleryIdx === 0; }
    if (next) { next.style.visibility = show ? '' : 'hidden'; next.disabled = galleryIdx >= galleryItems.length - 1; }
  }

  /* ── Connection Chips ────────────────────────────────────────── */
  function buildConnectionChips(ev) {
    const container = document.getElementById('stt-panel-connections');
    if (!container) return;
    container.innerHTML = '';

    const conns = (ev.connections || [])
      .map(id => eventMap.get(id))
      .filter(Boolean);

    if (conns.length === 0) { container.hidden = true; return; }
    container.hidden = false;

    const lbl = document.createElement('span');
    lbl.className   = 'stt-connections__label';
    lbl.textContent = 'Verbunden mit:';
    container.appendChild(lbl);

    conns.forEach(connEv => {
      const track = TRACK_MAP[connEv.track] || {};
      const chip  = document.createElement('button');
      chip.className = 'stt-conn-chip';
      const shortTitle = connEv.title.length > 22 ? connEv.title.slice(0, 21) + '…' : connEv.title;
      chip.innerHTML  = `<span class="stt-conn-chip__dot" style="background:${track.color}"></span><span>${connEv.year} · ${shortTitle}</span>`;
      chip.addEventListener('click', () => switchPanelTo(connEv));
      container.appendChild(chip);
    });
  }

  /* ── Panel Navigation (prev / next visible event) ─────────────── */
  function updatePanelNav() {
    navEvents = [...data.events]
      .filter(e => !isFadedEvent(e))
      .sort((a, b) => a.year - b.year || a.id.localeCompare(b.id));

    navIdx = navEvents.findIndex(e => e.id === selectedId);

    const prevBtn = document.getElementById('stt-panel-prev');
    const nextBtn = document.getElementById('stt-panel-next');
    if (prevBtn) prevBtn.disabled = navIdx <= 0;
    if (nextBtn) nextBtn.disabled = navIdx < 0 || navIdx >= navEvents.length - 1;
  }

  function closePanel() {
    closeEditMode();
    panel.classList.remove('is-open');
    selectedId = null;
    applyEventVisibility();
  }

  /* ================================================================
     EDIT MODE — Panel-Formular
  ================================================================ */

  function openEditMode(ev) {
    editingId = ev.id;
    editBtn.classList.add('is-active');
    panelBody.hidden = true;
    buildEditForm(ev);
    editForm.removeAttribute('hidden');
    editForm.querySelector('input[name="title"]')?.focus();
  }

  function closeEditMode() {
    editingId = null;
    editBtn.classList.remove('is-active');
    editForm.setAttribute('hidden', '');
    editForm.innerHTML = '';
    panelBody.hidden = false;
  }

  function buildEditForm(ev) {
    editForm.innerHTML = '';

    /* Helper: create a labeled field */
    function field(labelText, inputEl, hint) {
      const wrap = document.createElement('div');
      wrap.className = 'stt-edit-field';
      const lbl = document.createElement('label');
      lbl.textContent = labelText;
      wrap.appendChild(lbl);
      wrap.appendChild(inputEl);
      if (hint) {
        const sp = document.createElement('span');
        sp.className = 'stt-edit-field-hint';
        sp.textContent = hint;
        wrap.appendChild(sp);
      }
      return wrap;
    }
    function input(name, value, type = 'text') {
      const el = document.createElement('input');
      el.type = type; el.name = name; el.value = value ?? '';
      return el;
    }
    function select(name, options, value) {
      const el = document.createElement('select');
      el.name = name;
      options.forEach(([v, l]) => {
        const o = document.createElement('option');
        o.value = v; o.textContent = l;
        if (v === value) o.selected = true;
        el.appendChild(o);
      });
      return el;
    }
    function textarea(name, value, rows = 3) {
      const el = document.createElement('textarea');
      el.name = name; el.value = value ?? ''; el.rows = rows;
      return el;
    }
    function sectionHead(title) {
      const sec = document.createElement('div');
      sec.className = 'stt-edit-section';
      const h = document.createElement('div');
      h.className = 'stt-edit-section-title';
      h.textContent = title;
      sec.appendChild(h);
      return sec;
    }

    /* Basic fields */
    editForm.appendChild(field('Titel *', input('title', ev.title)));

    /* Track — prominent position so it's easy to find */
    const trackOpts = TRACKS.map(t => [t.id, `${t.id} — ${t.label}`]);
    const trackSel = select('track', trackOpts, ev.track);
    const trackSwatch = document.createElement('span');
    trackSwatch.className = 'stt-edit-track-swatch';
    const currentTrack = TRACKS.find(t => t.id === ev.track);
    trackSwatch.style.background = currentTrack ? currentTrack.color : '#888';
    const trackRow = document.createElement('div');
    trackRow.className = 'stt-edit-track-row';
    trackRow.appendChild(trackSwatch);
    trackRow.appendChild(trackSel);
    trackSel.addEventListener('change', () => {
      const t = TRACKS.find(tr => tr.id === trackSel.value);
      trackSwatch.style.background = t ? t.color : '#888';
    });
    editForm.appendChild(field('Track *', trackRow));

    editForm.appendChild(field('Untertitel', input('subtitle', ev.subtitle)));

    const row2 = document.createElement('div');
    row2.className = 'stt-edit-row2';
    row2.appendChild(field('Jahr *', input('year', ev.year, 'number')));
    row2.appendChild(field('Monat', input('month', ev.month ?? '', 'number')));
    editForm.appendChild(row2);

    const sigOpts = [['low','Niedrig'],['medium','Mittel'],['high','Hoch'],['landmark','Landmark']];
    editForm.appendChild(field('Bedeutung *', select('significance', sigOpts, ev.significance)));

    editForm.appendChild(field('Beschreibung', textarea('description', ev.description, 4)));

    editForm.appendChild(field('Tags', input('tags', (ev.tags || []).join(', ')), 'kommagetrennt'));

    editForm.appendChild(field('Quelle', input('source', ev.source)));

    editForm.appendChild(field(
      'Verbindungen',
      input('connections', (ev.connections || []).join(', ')),
      'Event-IDs kommagetrennt'
    ));

    /* Media section */
    const mediaSec = sectionHead('Medien');
    const mediaList = document.createElement('div');
    mediaList.id = 'stt-edit-media-list';
    mediaList.style.cssText = 'display:flex;flex-direction:column;gap:6px';
    mediaSec.appendChild(mediaList);
    const addMediaBtn = document.createElement('button');
    addMediaBtn.type = 'button';
    addMediaBtn.className = 'stt-edit-add-btn';
    addMediaBtn.textContent = '+ Medium';
    addMediaBtn.addEventListener('click', () => addMediaRow(mediaList, {}));
    mediaSec.appendChild(addMediaBtn);
    editForm.appendChild(mediaSec);
    normalizeMedia(ev).forEach(m => addMediaRow(mediaList, m));

    /* Links section */
    const linksSec = sectionHead('Links');
    const linksList = document.createElement('div');
    linksList.id = 'stt-edit-links-list';
    linksList.style.cssText = 'display:flex;flex-direction:column;gap:6px';
    linksSec.appendChild(linksList);
    const addLinkBtn = document.createElement('button');
    addLinkBtn.type = 'button';
    addLinkBtn.className = 'stt-edit-add-btn';
    addLinkBtn.textContent = '+ Link';
    addLinkBtn.addEventListener('click', () => addLinkRow(linksList, {}));
    linksSec.appendChild(addLinkBtn);
    editForm.appendChild(linksSec);
    (ev.links || []).forEach(l => addLinkRow(linksList, l));

    /* Actions */
    const actions = document.createElement('div');
    actions.className = 'stt-edit-actions';
    const saveBtn = document.createElement('button');
    saveBtn.type = 'submit';
    saveBtn.className = 'stt-btn stt-btn--primary';
    saveBtn.textContent = 'Speichern';
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'stt-btn';
    cancelBtn.textContent = 'Abbrechen';
    cancelBtn.addEventListener('click', closeEditMode);
    actions.appendChild(saveBtn);
    actions.appendChild(cancelBtn);
    editForm.appendChild(actions);

    editForm.addEventListener('submit', (e) => { e.preventDefault(); saveEditForm(); });
  }

  function addMediaRow(container, item) {
    const row = document.createElement('div');
    row.className = 'stt-edit-dyn-row stt-edit-dyn-row--media';
    const typeOpts = [['image','image'],['video','video'],['embed','embed'],['screenshot','screenshot']];
    const typeSel = document.createElement('select');
    typeOpts.forEach(([v,l]) => {
      const o = document.createElement('option');
      o.value = v; o.textContent = l;
      if (v === item.type) o.selected = true;
      typeSel.appendChild(o);
    });
    const urlIn  = document.createElement('input'); urlIn.type = 'url'; urlIn.placeholder = 'URL'; urlIn.value = item.url || '';
    const capIn  = document.createElement('input'); capIn.type = 'text'; capIn.placeholder = 'Caption'; capIn.value = item.caption || '';
    const rmBtn  = document.createElement('button'); rmBtn.type = 'button'; rmBtn.className = 'stt-edit-dyn-remove'; rmBtn.textContent = '×';
    rmBtn.addEventListener('click', () => row.remove());
    row.appendChild(typeSel); row.appendChild(urlIn); row.appendChild(capIn); row.appendChild(rmBtn);
    container.appendChild(row);
  }

  function addLinkRow(container, item) {
    const row = document.createElement('div');
    row.className = 'stt-edit-dyn-row stt-edit-dyn-row--link';
    const labelIn = document.createElement('input'); labelIn.type = 'text'; labelIn.placeholder = 'Label'; labelIn.value = item.label || '';
    const urlIn   = document.createElement('input'); urlIn.type = 'url';  urlIn.placeholder = 'URL';   urlIn.value = item.url || '';
    const rmBtn   = document.createElement('button'); rmBtn.type = 'button'; rmBtn.className = 'stt-edit-dyn-remove'; rmBtn.textContent = '×';
    rmBtn.addEventListener('click', () => row.remove());
    row.appendChild(labelIn); row.appendChild(urlIn); row.appendChild(rmBtn);
    container.appendChild(row);
  }

  function readMediaRows() {
    return [...document.querySelectorAll('#stt-edit-media-list .stt-edit-dyn-row')]
      .map(row => {
        const [typeSel, urlIn, capIn] = row.children;
        return { type: typeSel.value, url: urlIn.value.trim(), caption: capIn.value.trim() };
      })
      .filter(m => m.url);
  }

  function readLinkRows() {
    return [...document.querySelectorAll('#stt-edit-links-list .stt-edit-dyn-row')]
      .map(row => {
        const [labelIn, urlIn] = row.children;
        return { label: labelIn.value.trim(), url: urlIn.value.trim() };
      })
      .filter(l => l.url);
  }

  function saveEditForm() {
    const ev = data.events.find(e => e.id === editingId);
    if (!ev) { closeEditMode(); return; }

    const get  = name => editForm.querySelector(`[name="${name}"]`);
    const connections = get('connections').value
      .split(',').map(s => s.trim()).filter(Boolean)
      .filter(id => eventMap.has(id));

    const unknownConns = get('connections').value
      .split(',').map(s => s.trim()).filter(Boolean)
      .filter(id => id && !eventMap.has(id));
    if (unknownConns.length > 0) {
      const errEl = editForm.querySelector('.stt-edit-field-error') || document.createElement('span');
      errEl.className = 'stt-edit-field-error';
      errEl.textContent = `Unbekannte IDs: ${unknownConns.join(', ')}`;
      get('connections').parentNode.appendChild(errEl);
      return;
    }

    const changes = {
      title:        get('title').value.trim(),
      subtitle:     get('subtitle').value.trim() || null,
      year:         parseInt(get('year').value, 10) || ev.year,
      month:        parseInt(get('month').value, 10) || null,
      track:        get('track').value,
      significance: get('significance').value,
      description:  get('description').value.trim(),
      tags:         get('tags').value.split(',').map(t => t.trim()).filter(Boolean),
      source:       get('source').value.trim() || null,
      connections,
      media:        readMediaRows(),
      links:        readLinkRows()
    };

    /* Apply to in-memory data */
    Object.assign(ev, changes);
    eventMap.set(ev.id, ev);

    /* Persist */
    saveLocalEdit(ev.id, changes);

    /* Exit edit mode + re-render panel */
    closeEditMode();
    renderPanelContent(ev);
    updatePanelNav();

    /* Re-render timeline */
    if (viewMode === 'single') buildCollapsedSVG();
    else buildSVG();

    showToast('Gespeichert ✓');
  }

  /* ================================================================
     CONTROLS: Filter, Verbindungen, Reset, Suche
  ================================================================ */
  function setupControls() {

    /* Session-Manager-Button */
    document.getElementById('stt-session-mgr-btn')?.addEventListener('click', openSessionManager);

    /* Verbindungen */
    document.getElementById('stt-conn-btn').addEventListener('click', function () {
      showConn = !showConn;
      this.setAttribute('aria-pressed', showConn ? 'true' : 'false');
      updateConnectionVisibility();
    });

    /* Labels-Toggle */
    const labelBtn = document.getElementById('stt-label-btn');
    if (labelBtn) {
      labelBtn.addEventListener('click', function () {
        showLabels = !showLabels;
        this.setAttribute('aria-pressed', showLabels ? 'true' : 'false');
        if (viewMode === 'single') {
          /* Kompakt-Modus: Cards + Stems ein-/ausblenden */
          const hidden = !showLabels;
          svgSel.select('.stt-card-group-container').style('display', hidden ? 'none' : null);
          svgSel.select('.stt-stem-group').style('display', hidden ? 'none' : null);
        } else if (labelGroupSel) {
          renderEventLabels(labelGroupSel, currentXScale, svgDimensions().h);
          applyEventVisibility();
        }
      });
    }

    /* Zoom Reset */
    document.getElementById('stt-reset-btn').addEventListener('click', () => {
      svgSel.transition().duration(400)
        .call(zoomBehavior.transform, d3.zoomIdentity);
    });

    /* Vollbild */
    (function () {
      const fsBtn       = document.getElementById('stt-fullscreen-btn');
      const iconEnter   = fsBtn?.querySelector('.stt-fs-icon--enter');
      const iconExit    = fsBtn?.querySelector('.stt-fs-icon--exit');
      if (!fsBtn || !document.fullscreenEnabled) { if (fsBtn) fsBtn.hidden = true; return; }

      function updateFsBtn () {
        const isFs = !!document.fullscreenElement;
        fsBtn.setAttribute('aria-pressed', isFs);
        fsBtn.title = isFs ? 'Vollbild beenden' : 'Vollbild';
        if (iconEnter) iconEnter.hidden = isFs;
        if (iconExit)  iconExit.hidden  = !isFs;
      }

      fsBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
        } else {
          document.exitFullscreen();
        }
      });

      document.addEventListener('fullscreenchange', updateFsBtn);
      document.addEventListener('keydown', (e) => {
        if (e.key === 'F11') { e.preventDefault(); fsBtn.click(); }
      });
    })();

    /* Suche */
    document.getElementById('stt-search').addEventListener('input', function () {
      searchQuery = this.value.trim();
      applyEventVisibility();
    });

    /* Session-Picker befüllen und anschließen */
    setupSessionPicker();

    /* Panel schließen */
    panelClose.addEventListener('click', closePanel);

    /* Edit button */
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        const ev = data.events.find(e => e.id === selectedId);
        if (!ev) return;
        if (editingId) closeEditMode();
        else openEditMode(ev);
      });
    }

    /* Export button */
    if (exportBtn) {
      exportBtn.addEventListener('click', exportData);
    }

    /* Präsentations-Button */
    document.getElementById('stt-pres-btn')?.addEventListener('click', enterPresentationMode);

    /* Präsentations-Overlay-Controls */
    document.getElementById('stt-pres-close')?.addEventListener('click', exitPresentationMode);
    document.getElementById('stt-pres-prev')?.addEventListener('click', () => {
      if (presIdx > 0) { presIdx--; renderPresCard(presEvents[presIdx]); }
    });
    document.getElementById('stt-pres-next')?.addEventListener('click', () => {
      if (presIdx < presEvents.length - 1) { presIdx++; renderPresCard(presEvents[presIdx]); }
    });
    document.querySelector('.stt-pres-scope-toggle')?.addEventListener('click', () => {
      presScope  = presScope === 'session' ? 'all' : 'session';
      presEvents = buildPresEvents();
      presIdx    = Math.min(presIdx, Math.max(0, presEvents.length - 1));
      if (presEvents.length > 0) renderPresCard(presEvents[presIdx]);
      else { exitPresentationMode(); showToast('Keine Events verfügbar'); }
    });

    document.addEventListener('keydown', e => {
      /* Keine Shortcuts wenn ein Textfeld fokussiert ist */
      const tag = document.activeElement?.tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if (e.key === 'Escape') {
        if (presentationMode) { exitPresentationMode(); return; }
        closePanel();
        closeAllModals();
        return;
      }

      /* Panel-Navigation per Pfeiltasten (nur wenn Panel offen, kein Input fokussiert) */
      if (!inInput && !presentationMode && selectedId !== null) {
        if (e.key === 'ArrowLeft' && navIdx > 0) {
          e.preventDefault();
          switchPanelTo(navEvents[navIdx - 1]);
        } else if (e.key === 'ArrowRight' && navIdx >= 0 && navIdx < navEvents.length - 1) {
          e.preventDefault();
          switchPanelTo(navEvents[navIdx + 1]);
        }
      }
    });

    /* Panel-Navigation: Vorheriges / Nächstes Ereignis */
    document.getElementById('stt-panel-prev')?.addEventListener('click', () => {
      if (navIdx > 0) switchPanelTo(navEvents[navIdx - 1]);
    });
    document.getElementById('stt-panel-next')?.addEventListener('click', () => {
      if (navIdx >= 0 && navIdx < navEvents.length - 1) switchPanelTo(navEvents[navIdx + 1]);
    });

    /* Galerie-Pfeile */
    document.getElementById('stt-gallery-prev')?.addEventListener('click', () => showGalleryItem(galleryIdx - 1));
    document.getElementById('stt-gallery-next')?.addEventListener('click', () => showGalleryItem(galleryIdx + 1));

    /* View-Mode Toggle: Kompakt ↔ Tracks */
    const collapseBtn = document.getElementById('stt-collapse-btn');
    if (collapseBtn) {
      collapseBtn.addEventListener('click', function () {
        viewMode = viewMode === 'multi' ? 'single' : 'multi';
        const isCollapsed = viewMode === 'single';
        this.setAttribute('aria-pressed', isCollapsed ? 'true' : 'false');
        this.textContent  = isCollapsed ? 'Tracks' : 'Kompakt';
        sidebar.style.display = isCollapsed ? 'none' : '';
        if (isCollapsed) {
          /* Kompakt-Karten sind per default sichtbar → showLabels auf true setzen */
          showLabels = true;
          if (labelBtn) labelBtn.setAttribute('aria-pressed', 'true');
          buildCollapsedSVG();
        } else {
          sidebar.innerHTML = '';
          buildSidebar();
          buildSVG();
        }
      });
    }
  }

  /* ================================================================
     SESSION-PICKER (Kurs-Modus)
  ================================================================ */
  function setupSessionPicker() {
    const sel = document.getElementById('stt-session-select');
    if (!sel || !data.sessions) return;

    data.sessions.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      const d = s.date ? new Date(s.date).toLocaleDateString('de-AT', { day:'2-digit', month:'2-digit' }) : '';
      opt.textContent = `${d} · ${s.title}`;
      sel.appendChild(opt);
    });

    sel.addEventListener('change', function () {
      activeSession = this.value || null;
      this.classList.toggle('has-session', !!activeSession);

      /* Edit-Button: nur sichtbar wenn Session aktiv */
      const editBtn2 = document.getElementById('stt-session-edit-btn');
      if (editBtn2) editBtn2.hidden = !activeSession;

      /* Edit-Mode beenden wenn Session weggewählt */
      if (!activeSession && sessionEditMode) exitSessionEditMode();

      applyEventVisibility();

      /* Info-Toast bei Session-Auswahl */
      if (activeSession) {
        const sess = data.sessions.find(s => s.id === activeSession);
        if (sess) showToast(`Session: ${sess.title} — ${sess.desc}`);
      }
    });

    /* Edit-Button anschließen */
    const sessionEditBtn = document.getElementById('stt-session-edit-btn');
    if (sessionEditBtn) {
      sessionEditBtn.addEventListener('click', () => {
        if (sessionEditMode) exitSessionEditMode();
        else                 enterSessionEditMode();
      });
    }
  }

  /* ================================================================
     GENERISCHES POPOVER — wiederverwendbar für Rubriken + Overlays
  ================================================================ */
  const openPopovers = new Set();

  function setupPopover(trigger, popover) {
    function isOpen() { return popover.classList.contains('is-open'); }
    function open() {
      // Schließe alle anderen Popovers
      openPopovers.forEach(fn => fn());
      popover.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
      openPopovers.add(close);
    }
    function close() {
      popover.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
      openPopovers.delete(close);
    }

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      isOpen() ? close() : open();
    });

    document.addEventListener('pointerdown', function (e) {
      if (isOpen() && !popover.contains(e.target) && !trigger.contains(e.target)) {
        close();
      }
    }, true);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) {
        close();
        trigger.focus();
      }
    });
  }

  /* ================================================================
     RUBRIKEN-POPOVER — Track-Filter als Dropdown
  ================================================================ */
  function setupFilterPopover() {
    const trigger = document.getElementById('stt-filter-trigger');
    const popover = document.getElementById('stt-filter-popover');
    const badge   = document.getElementById('stt-filter-badge');
    if (!trigger || !popover) return;

    function updateFilterBadge() {
      const total    = TRACK_IDS.length;
      const active   = activeFilters.size;
      const hidden   = total - active;
      badge.textContent = hidden;
      badge.hidden      = hidden === 0;
      trigger.classList.toggle('has-active', hidden > 0);
      // Update button states
      popover.querySelectorAll('.stt-filter-btn').forEach(btn => {
        const on = activeFilters.has(btn.dataset.track);
        btn.classList.toggle('is-active', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }

    popover.querySelectorAll('.stt-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.track;
        if (activeFilters.has(id)) activeFilters.delete(id);
        else                       activeFilters.add(id);
        updateFilterBadge();
        applyEventVisibility();
      });
    });

    setupPopover(trigger, popover);
    updateFilterBadge();
  }

  /* ================================================================
     METRIK-PICKER — Optionen aus metricsData befüllen
  ================================================================ */
  function setupMetricPicker() {
    const popover = document.getElementById('stt-overlay-popover');
    const trigger = document.getElementById('stt-overlay-trigger');
    const badge   = document.getElementById('stt-overlay-badge');
    if (!popover || !trigger || !metricsData) return;

    /* ── Popover-Inhalt nach Kategorie gruppiert aufbauen ── */
    const groups = new Map();
    (metricsData.metrics || []).forEach(m => {
      const cat = m.category || 'Sonstiges';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(m);
    });

    groups.forEach((metrics, cat) => {
      const section = document.createElement('div');
      section.className = 'stt-overlay-group';

      const lbl = document.createElement('div');
      lbl.className = 'stt-overlay-group__label';
      lbl.textContent = cat;
      section.appendChild(lbl);

      const btnsRow = document.createElement('div');
      btnsRow.className = 'stt-overlay-group__btns';

      metrics.forEach(m => {
        const btn = document.createElement('button');
        btn.className = 'stt-metric-btn';
        btn.dataset.metric = m.id;
        btn.style.setProperty('--clr', m.color);
        btn.setAttribute('aria-pressed', 'false');

        const titleParts = [m.label, `Einheit: ${m.unit}`];
        if (m.context)   titleParts.push(m.context);
        if (m.scaleNote) titleParts.push(`ℹ ${m.scaleNote}`);
        titleParts.push(`Quelle: ${m.source}`);
        btn.title = titleParts.join('\n');

        btn.innerHTML = [
          `<span class="stt-metric-btn__dot"></span>`,
          `<span class="stt-metric-btn__label">${m.label}</span>`,
          `<span class="stt-metric-btn__unit">${m.unit}</span>`,
          m.scale === 'log' ? `<span class="stt-metric-btn__badge">log</span>` : ''
        ].join('');

        btn.addEventListener('click', function () {
          const id = this.dataset.metric;
          if (activeMetrics.has(id)) activeMetrics.delete(id);
          else                        activeMetrics.add(id);
          const on = activeMetrics.has(id);
          this.classList.toggle('is-active', on);
          this.setAttribute('aria-pressed', on ? 'true' : 'false');
          /* Badge aktualisieren */
          const count = activeMetrics.size;
          badge.textContent = count;
          badge.hidden = count === 0;
          trigger.classList.toggle('has-active', count > 0);
          const mg = svgSel.select('.stt-metric-overlay');
          if (!mg.empty()) renderMetricOverlay(mg, currentXScale, svgDimensions().h);
        });

        btnsRow.appendChild(btn);
      });

      section.appendChild(btnsRow);
      popover.appendChild(section);
    });

    setupPopover(trigger, popover);
  }

  /* Kurze Nachricht oben rechts */
  function showToast(msg) {
    let toast = document.getElementById('stt-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'stt-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('is-visible');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('is-visible'), 4000);
  }

  /* ================================================================
     MODALS (Help, Quellen)
  ================================================================ */
  const overlay = document.getElementById('stt-modal-overlay');

  function openModal(id) {
    document.getElementById(id).removeAttribute('hidden');
    overlay.removeAttribute('hidden');
    document.getElementById(id).querySelector('button')?.focus();
  }

  function closeAllModals() {
    document.querySelectorAll('.stt-modal').forEach(m => m.setAttribute('hidden', ''));
    overlay.setAttribute('hidden', '');
  }

  function setupModals() {
    document.getElementById('stt-help-btn').addEventListener('click', () => openModal('stt-help-modal'));
    document.getElementById('stt-sources-btn').addEventListener('click', () => {
      buildSourcesList();
      openModal('stt-sources-modal');
    });
    document.getElementById('stt-session-add-btn')?.addEventListener('click', addNewSession);

    document.querySelectorAll('.stt-modal-close, [data-modal]').forEach(btn => {
      btn.addEventListener('click', closeAllModals);
    });
    overlay.addEventListener('click', closeAllModals);
  }

  function buildSourcesList() {
    const list = document.getElementById('stt-sources-list');
    if (list.children.length > 0) return; /* Nur einmal aufbauen */

    const sources = sourcesData || [];

    if (sources.length > 0) {
      /* Aus sources.js: vollständige Bibliografie */
      sources.forEach(s => {
        const div = document.createElement('div');
        div.className = 'stt-source-entry';
        const parts = [s.author, s.year, `«${s.title}»`];
        if (s.journal) parts.push(s.journal);
        if (s.license) parts.push(s.license);
        div.textContent = parts.join('. ');
        if (s.url) {
          const a = document.createElement('a');
          a.href = s.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
          a.textContent = ' → ' + s.url;
          a.style.wordBreak = 'break-all';
          div.appendChild(a);
        }
        list.appendChild(div);
      });
    } else {
      /* Fallback: Quellen aus den Ereignissen */
      data.events.forEach(ev => {
        if (!ev.source) return;
        const div = document.createElement('div');
        div.className = 'stt-source-entry';
        div.textContent = `[${ev.year}] ${ev.title} — ${ev.source}`;
        list.appendChild(div);
      });
    }
  }

  /* ================================================================
     RESIZE
  ================================================================ */
  function setupResize() {
    let timer;
    const ro = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (viewMode === 'single') {
          buildCollapsedSVG();
        } else {
          buildSVG();
          sidebar.innerHTML = '';
          buildSidebar();
        }
      }, 180);
    });
    ro.observe(svgWrapper);
  }

  /* ================================================================
     INIT
  ================================================================ */
  /* ================================================================
     SCHRIFTGRÖSSE A−/A+ — skaliert html font-size (alles rem)
  ================================================================ */
  const FONT_STEPS = [13, 14, 15, 16, 17, 18, 20];
  const FONT_DEFAULT = 15;
  const FONT_STORAGE_KEY = 'stt-font-size';

  function applyFontSize(px, rebuild) {
    svgFontScale = px / FONT_DEFAULT;
    document.documentElement.style.setProperty('--font-base', px + 'px');
    document.documentElement.style.setProperty('--svg-card-font', svgPx(9) + 'px');
    const downBtn = document.getElementById('stt-font-down');
    const upBtn   = document.getElementById('stt-font-up');
    if (downBtn) downBtn.disabled = px <= FONT_STEPS[0];
    if (upBtn)   upBtn.disabled   = px >= FONT_STEPS[FONT_STEPS.length - 1];
    if (rebuild && svgSel) {
      if (viewMode === 'single') buildCollapsedSVG();
      else                       buildSVG();
    }
  }

  function setupFontSize() {
    const stored = parseInt(localStorage.getItem(FONT_STORAGE_KEY), 10);
    let current  = FONT_STEPS.includes(stored) ? stored : FONT_DEFAULT;
    applyFontSize(current, false);

    const downBtn = document.getElementById('stt-font-down');
    const upBtn   = document.getElementById('stt-font-up');
    if (!downBtn || !upBtn) return;

    downBtn.addEventListener('click', () => {
      const idx = FONT_STEPS.indexOf(current);
      if (idx > 0) {
        current = FONT_STEPS[idx - 1];
        localStorage.setItem(FONT_STORAGE_KEY, current);
        applyFontSize(current, true);
      }
    });
    upBtn.addEventListener('click', () => {
      const idx = FONT_STEPS.indexOf(current);
      if (idx < FONT_STEPS.length - 1) {
        current = FONT_STEPS[idx + 1];
        localStorage.setItem(FONT_STORAGE_KEY, current);
        applyFontSize(current, true);
      }
    });
  }

  async function init() {
    try {
      data = await loadJson('data/timeline.json');
      const sourcesPayload = await loadJson('data/sources.json');
      sourcesData = Array.isArray(sourcesPayload) ? sourcesPayload : (sourcesPayload.sources || []);
      eventMap = new Map(data.events.map(e => [e.id, e]));
      loadLocalEdits();
      loadLocalSessions();
    } catch (error) {
      console.error('[STT] Fehler beim Laden der JSON-Daten.', error);
      document.body.innerHTML = '<p style="padding:2rem;font-family:monospace">Fehler: `data/timeline.json` oder `data/sources.json` konnte nicht geladen werden. Bitte einen lokalen HTTP-Server verwenden (z.B. <code>python3 -m http.server</code>).</p>';
      return;
    }

    /* Metriken optional laden — Fehler stellen kein Problem dar */
    try {
      metricsData = await loadJson('data/metrics.json');
    } catch (e) {
      console.debug('[STT] Metrikdaten nicht verfügbar:', e.message);
    }

    setupFontSize();
    buildSidebar();
    buildSVG();
    setupControls();
    setupFilterPopover();
    setupMetricPicker();
    setupModals();
    setupResize();

    /* Crosshair für Metrik-Overlay (einmalig registrieren) */
    const svgEl = document.getElementById('stt-svg');
    svgEl.addEventListener('mousemove', (e) => {
      if (!activeMetrics.size) return;
      const [mx] = d3.pointer(e, svgEl);
      updateCrosshair(mx);
    });
    svgEl.addEventListener('mouseleave', clearCrosshair);

    /* Horizontaler Trackpad-Swipe → Pan statt Zoom (einmalig registrieren) */
    svgWrapper.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaX || 0) > Math.abs(e.deltaY || 0)) {
        e.preventDefault();
        const t    = d3.zoomTransform(svgSel.node());
        const newT = d3.zoomIdentity.translate(t.x - e.deltaX, t.y).scale(t.k);
        svgSel.call(zoomBehavior.transform, newT);
      }
    }, { passive: false });

    /* URL-Hash: Direkt-Link zu einem Ereignis (#event-id) */
    if (location.hash) {
      const id = location.hash.slice(1);
      const ev = eventMap.get(id);
      if (ev) {
        selectedId = id;
        openPanel(ev);
        applyEventVisibility();
      }
    }
  }

  document.addEventListener('DOMContentLoaded', init);

})();

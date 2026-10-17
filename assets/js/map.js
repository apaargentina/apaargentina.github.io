/**
 * APA — Mapa "Red de Parasitología Argentina"
 *
 * Dos vistas sobre el mismo mapa (se alternan con el toggle de la página):
 *  - Delegaciones Regionales: polígonos (provincias completas y/o partidos de Buenos Aires)
 *    definidos como TEXTO en _data/delegaciones.csv (columnas "provincias" y "partidos").
 *    Al pasar el mouse se resalta toda la delegación y aparece su información.
 *  - Grupos de Investigación: puntos con clusters, desde _data/grupos.csv.
 *
 * Los datos llegan como JSON dentro de la página (<script id="...-data">).
 * Los contornos están en assets/geo/ (fuente: IGN).
 */

document.addEventListener('DOMContentLoaded', () => {
  const mapEl = document.getElementById('red-map');
  if (!mapEl || typeof L === 'undefined') return;

  const readJSON = (id) => {
    const el = document.getElementById(id);
    try { return el ? JSON.parse(el.textContent || '[]') || [] : []; }
    catch (e) { console.error('[mapa] No se pudo leer ' + id, e); return []; }
  };
  const delegaciones = readJSON('delegaciones-data');
  const grupos = readJSON('grupos-data');

  // ── Utilidades ─────────────────────────────────────────────────────
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();
  const list = (s) => String(s || '').split(/[;\n]/).map((x) => x.trim()).filter(Boolean);

  // Nombres alternativos de provincias que el equipo puede escribir
  const provKey = (name) => {
    const k = norm(name);
    if (k.indexOf('tierra del fuego') === 0) return 'tierra del fuego';
    if (['caba', 'ciudad de buenos aires', 'capital federal'].indexOf(k) !== -1) return 'ciudad autonoma de buenos aires';
    return k;
  };

  const PALETTE = ['#E87838', '#6F8F7A', '#584D36', '#D9A441', '#5E8CA6', '#B5543B', '#9A7DA8', '#8AA05A', '#C98B6B', '#4F7C82'];
  const BASE_STYLE = { color: '#BBB7AC', weight: 1, fillColor: '#F1E9DA', fillOpacity: 0.75 };

  const HINTS = {
    delegaciones: 'Pasá el mouse por una delegación para ver sus datos de contacto; hacé clic para fijarlos.',
    grupos: 'Cada punto es un grupo de investigación. Los círculos con número agrupan varios: hacé clic o acercate para separarlos.',
  };

  // ── Mapa ───────────────────────────────────────────────────────────
  const map = L.map(mapEl, { zoomControl: true, scrollWheelZoom: false, minZoom: 3 });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · Límites: IGN',
    maxZoom: 19,
  }).addTo(map);
  const ARGENTINA = [[-55.2, -73.8], [-21.7, -53.4]];   // sin Antártida ni islas, para encuadrar
  map.fitBounds(ARGENTINA);

  // ── Contenido de tooltips / popups ─────────────────────────────────
  function delegacionHTML(d, links) {
    const mails = list(d.email).map((m) => links
      ? `<a href="mailto:${esc(m)}" style="color:#E87838;word-break:break-all;">${esc(m)}</a>`
      : `<span>${esc(m)}</span>`).join('<br>');
    return `<div class="apa-card">
      <div class="apa-card-kicker">Delegación</div>
      <div class="apa-card-title">${esc(d.delegacion)}</div>
      ${d.descripcion ? `<div class="apa-card-desc">${esc(d.descripcion)}</div>` : ''}
      ${d.delegado ? `<div class="apa-card-person">${esc(d.delegado)}</div>` : ''}
      ${d.institucion ? `<div class="apa-card-line">${esc(d.institucion)}</div>` : ''}
      ${d.direccion ? `<div class="apa-card-line">${esc(d.direccion)}</div>` : ''}
      ${d.telefono ? `<div class="apa-card-line">Tel.: ${esc(d.telefono)}</div>` : ''}
      ${mails ? `<div class="apa-card-line apa-card-mail">${mails}</div>` : ''}
    </div>`;
  }

  function grupoHTML(g, links) {
    const lugar = [g.ciudad, g.provincia && g.provincia !== g.ciudad ? g.provincia : ''].filter(Boolean).map(esc).join(', ');
    const mail = g.email ? (links
      ? `<a href="mailto:${esc(g.email)}" style="color:#E87838;word-break:break-all;">${esc(g.email)}</a>`
      : `<span>${esc(g.email)}</span>`) : '';
    const web = g.web ? (links
      ? `<a href="${esc(g.web)}" target="_blank" rel="noopener" style="color:#E87838;word-break:break-all;">${esc(g.web.replace(/^https?:\/\/(www\.)?/, ''))}</a>`
      : `<span>${esc(g.web.replace(/^https?:\/\/(www\.)?/, ''))}</span>`) : '';
    return `<div class="apa-card">
      <div class="apa-card-kicker">Grupo de investigación</div>
      <div class="apa-card-title">${esc(g.grupo)}</div>
      ${g.institucion ? `<div class="apa-card-desc">${esc(g.institucion)}</div>` : ''}
      ${g.responsable ? `<div class="apa-card-person">${esc(g.responsable)}</div>` : ''}
      ${g.linea ? `<div class="apa-card-line">${esc(g.linea)}</div>` : ''}
      ${lugar ? `<div class="apa-card-line">${lugar}</div>` : ''}
      ${mail || web ? `<div class="apa-card-line apa-card-mail">${[mail, web].filter(Boolean).join('<br>')}</div>` : ''}
    </div>`;
  }

  // ── Vista 1: delegaciones (polígonos) ──────────────────────────────
  const delegacionesLayer = L.layerGroup();
  let delegacionesBuilt = false;

  function buildDelegaciones(provincias, partidos) {
    // 1. ¿qué delegación tiene cada provincia / partido?
    const porProvincia = {};
    const porPartido = {};
    let delegacionResto = -1;
    delegaciones.forEach((d, i) => {
      list(d.provincias).forEach((p) => {
        const k = provKey(p);
        if (porProvincia[k] !== undefined) console.warn('[mapa] La provincia "' + p + '" está en más de una delegación.');
        porProvincia[k] = i;
      });
      list(d.partidos).forEach((p) => {
        if (norm(p) === 'resto') { delegacionResto = i; return; }
        const k = norm(p);
        if (porPartido[k] !== undefined) console.warn('[mapa] El partido "' + p + '" está en más de una delegación.');
        porPartido[k] = i;
      });
    });

    // 2. capa base: todas las provincias en neutro
    const base = L.geoJSON(provincias, { style: () => BASE_STYLE, interactive: false });
    delegacionesLayer.addLayer(base);

    // 3. un grupo de polígonos por delegación
    const grupos = delegaciones.map(() => []);
    const usadas = {};
    (provincias.features || []).forEach((f) => {
      const k = provKey(f.properties.nombre);
      if (porProvincia[k] !== undefined) { grupos[porProvincia[k]].push(f); usadas[k] = true; }
    });
    const partidosUsados = {};
    (partidos.features || []).forEach((f) => {
      const k = norm(f.properties.nombre);
      let i = porPartido[k];
      if (i !== undefined) partidosUsados[k] = true;
      else if (delegacionResto >= 0) i = delegacionResto;
      if (i !== undefined) grupos[i].push(f);
    });

    // avisos para detectar errores de tipeo en el CSV
    Object.keys(porProvincia).forEach((k) => { if (!usadas[k]) console.warn('[mapa] Provincia no encontrada en el mapa: "' + k + '"'); });
    Object.keys(porPartido).forEach((k) => { if (!partidosUsados[k]) console.warn('[mapa] Partido no encontrado: "' + k + '"'); });

    delegaciones.forEach((d, i) => {
      if (!grupos[i].length) return;
      const color = PALETTE[i % PALETTE.length];
      const normal = { color: '#FFFFFF', weight: 1, fillColor: color, fillOpacity: 0.62 };
      const resaltado = { color: '#FFFFFF', weight: 2, fillColor: color, fillOpacity: 0.88 };
      const fg = L.featureGroup();
      L.geoJSON({ type: 'FeatureCollection', features: grupos[i] }, {
        style: () => normal,
        onEachFeature: (feature, layer) => {
          layer.bindTooltip(delegacionHTML(d, false), { sticky: true, className: 'apa-tooltip apa-tooltip--card', opacity: 1 });
          layer.bindPopup(delegacionHTML(d, true), { maxWidth: 300, className: 'apa-popup' });
          layer.on('mouseover', () => { fg.setStyle(resaltado); fg.bringToFront(); });
          layer.on('mouseout', () => fg.setStyle(normal));
          layer.on('click', () => layer.closeTooltip());
          fg.addLayer(layer);
        },
      });
      delegacionesLayer.addLayer(fg);
    });
    delegacionesBuilt = true;
  }

  // ── Vista 2: grupos (puntos con clusters) ──────────────────────────
  const PIN_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>';
  const pinIcon = L.divIcon({
    className: 'apa-pin', html: `<span>${PIN_SVG}</span>`,
    iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -16], tooltipAnchor: [0, -14],
  });

  const hasCluster = typeof L.markerClusterGroup === 'function';
  const gruposLayer = hasCluster
    ? L.markerClusterGroup({
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true,     // varios grupos en el MISMO punto se abren en abanico
        maxClusterRadius: 45,
        iconCreateFunction: (cluster) => {
          const n = cluster.getChildCount();
          const size = n < 10 ? 38 : n < 50 ? 46 : 54;
          return L.divIcon({ html: `<span>${n}</span>`, className: 'apa-cluster', iconSize: [size, size] });
        },
      })
    : L.layerGroup();
  if (!hasCluster) console.warn('[mapa] No se cargó leaflet.markercluster: los grupos se muestran sin agrupar.');
  const gruposBounds = [];
  grupos.forEach((g) => {
    const lat = parseFloat(g.lat), lon = parseFloat(g.lon);
    if (isNaN(lat) || isNaN(lon)) return;
    const m = L.marker([lat, lon], { icon: pinIcon, keyboard: true, title: g.grupo || '' })
      .bindTooltip(grupoHTML(g, false), { direction: 'top', className: 'apa-tooltip apa-tooltip--card', opacity: 1 })
      .bindPopup(grupoHTML(g, true), { maxWidth: 300, className: 'apa-popup' });
    gruposLayer.addLayer(m);
    gruposBounds.push([lat, lon]);
  });

  // ── Toggle ─────────────────────────────────────────────────────────
  const hint = document.getElementById('mapa-hint');
  const buttons = document.querySelectorAll('.map-toggle-btn');
  let geoPromise = null;
  let currentMode = 'delegaciones';

  function loadGeo() {
    if (!geoPromise) {
      const get = (url) => fetch(url).then((r) => { if (!r.ok) throw new Error(url + ' → ' + r.status); return r.json(); });
      geoPromise = Promise.all([get(mapEl.dataset.provincias), get(mapEl.dataset.partidos)]);
    }
    return geoPromise;
  }

  function setMode(mode) {
    buttons.forEach((b) => {
      const on = b.dataset.mode === mode;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    currentMode = mode;
    if (hint) hint.textContent = HINTS[mode];
    map.closePopup();

    if (mode === 'grupos') {
      if (map.hasLayer(delegacionesLayer)) map.removeLayer(delegacionesLayer);
      map.addLayer(gruposLayer);
      if (gruposBounds.length) map.fitBounds(gruposBounds, { padding: [40, 40], maxZoom: 7 });
    } else {
      if (map.hasLayer(gruposLayer)) map.removeLayer(gruposLayer);
      loadGeo().then((geo) => {
        if (currentMode !== 'delegaciones') return;   // el usuario ya cambió de vista
        if (!delegacionesBuilt) buildDelegaciones(geo[0], geo[1]);
        map.addLayer(delegacionesLayer);
        map.fitBounds(ARGENTINA);
      }).catch((e) => {
        console.error('[mapa] No se pudieron cargar los contornos:', e);
        if (hint) hint.textContent = 'No se pudo cargar el mapa de delegaciones. La lista de abajo tiene los mismos datos.';
      });
    }
  }

  buttons.forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  setMode('delegaciones');

  // ── Estilos del popup (Leaflet) ────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    .apa-popup .leaflet-popup-content-wrapper {
      background: #FFFFFF; border: 1px solid #BBB7AC; border-radius: 12px;
      box-shadow: 0 8px 32px rgba(9,2,1,0.18); color: #090201;
      font-family: 'PT Sans', system-ui, sans-serif;
    }
    .apa-popup .leaflet-popup-tip { background: #FFFFFF; }
    .apa-popup .leaflet-popup-close-button { color: #584D36 !important; font-size: 1.1rem !important; }
    .leaflet-container { font-family: 'PT Sans', system-ui, sans-serif; }
  `;
  document.head.appendChild(style);
});
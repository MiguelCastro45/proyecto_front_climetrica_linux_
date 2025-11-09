// src/components/UserMapDashboard.jsx
import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Chart } from "chart.js/auto";
import jsPDF from "jspdf";
import "../styles/UserMapDashboard.css";
import PolygonDrawer from './PolygonDrawer';

const BASE_TILE = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

function getDateOffsetFormatted(offset) {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
}

const LAYER_DEFS = {
  "Temperatura terrestre": {
    type: "openweathermap",
    layer: "temp_new",
    opacity: 0.9,
    useLowResFallback: true,
    legend: { min: -5, max: 40, unit: "°C", colors: ["#1a1a6e", "#2929cc", "#00bfff", "#00ff7f", "#ffff00", "#ffa500", "#ff4500", "#8b0000"] },
  },
  "Temperatura del mar": {
    type: "wmts",
    layer: "GHRSST_L4_MUR_Sea_Surface_Temperature",
    format: "png",
    tileMatrixSet: "GoogleMapsCompatible_Level7",
    maxNativeZoom: 7,
    opacity: 0.9,
    legend: { min: 0, max: 35, unit: "°C", colors: ["#000033", "#001a66", "#0052cc", "#0099ff", "#00ccff", "#66ffcc", "#ffff99", "#ff9933"] },
  },
  "Corrientes Oceánicas (Color)": {
    type: "openweathermap",
    layer: "wind",
    opacity: 0.85,
    useLowResFallback: true,
    pane: 'currentsPane',
    maxNativeZoom: 10,
    maxZoom: 10,
    legend: { min: 0, max: 25, unit: "m/s", colors: ["#00ff00", "#80ff00", "#ffff00", "#ffaa00", "#ff5500", "#ff0055", "#cc0099"] },
  },
  "Precipitación": {
    type: "wmts",
    layer: "GPM_3IMERGHH_V07B_Precipitation",
    format: "png",
    tileMatrixSet: "GoogleMapsCompatible_Level9",
    maxNativeZoom: 9,
    opacity: 1.0,
    alt: [
      { name: 'OpenWeatherMap', type: 'openweathermap', layer: 'precipitation_new' },
      { name: 'RainViewer', type: 'rainviewer' }
    ],
    legend: { min: 0, max: 50, unit: "mm", colors: ["#0000aa", "#0088ff", "#00ddff", "#00ff88", "#88ff00", "#ffff00", "#ffaa00", "#ff5500", "#ff0000", "#aa0044"] },
  },
  "Vientos (OWM)": {
    type: 'openweathermap',
    layer: 'wind_new',
    opacity: 1.0,
    useLowResFallback: false,
    legend: { min: 0, max: 25, unit: 'm/s', colors: ["#00ff00", "#80ff00", "#ffff00", "#ffaa00", "#ff5500", "#ff0055", "#cc0099"] }
  },
};

const OPEN_METEO_MAP = {
  "Temperatura terrestre": { daily: "temperature_2m_mean", unit: "°C" },
  "Aerosol (Vientos)": { daily: "windspeed_10m_max", unit: "m/s" },
  "Precipitación": { daily: "precipitation_sum", unit: "mm" },
};

export default function ClimateDashboard() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef({});
  const popupRef = useRef(null);
  const searchRef = useRef(null);
  const modalCanvasRef = useRef(null);

  const [activeVar, setActiveVar] = useState("Temperatura del mar");
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [selectedData, setSelectedData] = useState(null);
  const [legendHover, setLegendHover] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRange, setModalRange] = useState(7);
  const [drawMode, setDrawMode] = useState(false);
  const [polygonData, setPolygonData] = useState(null);
  const [hasPolygon, setHasPolygon] = useState(false);
  const [dataTimestamp, setDataTimestamp] = useState(null);

  async function reverseGeocode(lat, lon) {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`);
      const j = await r.json();
      return j.display_name || "Desconocido";
    } catch {
      return "Desconocido";
    }
  }

  async function fetchSeriesFor(variableKey, lat, lon, days) {
    const openCfg = OPEN_METEO_MAP[variableKey];
    if (!openCfg) {
      setDataTimestamp(new Date());
      return simulateSeries(variableKey, days);
    }
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    const fmt = (d) => d.toISOString().slice(0, 10);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&start_date=${fmt(start)}&end_date=${fmt(end)}&daily=${openCfg.daily}&timezone=UTC`;
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error("Open-Meteo failed");
      const j = await resp.json();
      const times = j.daily?.time || [];
      const arr = j.daily?.[openCfg.daily] || [];
      if (!times.length) {
        setDataTimestamp(new Date());
        return simulateSeries(variableKey, days);
      }
      
      const latestDate = new Date(times[times.length - 1]);
      setDataTimestamp(latestDate);
      
      return times.map((t, i) => ({ date: t, value: arr[i] != null ? (+arr[i]).toFixed(2) : "0" }));
    } catch (err) {
      console.warn("open-meteo err", err);
      setDataTimestamp(new Date());
      return simulateSeries(variableKey, days);
    }
  }

  function computeStats(series) {
    const vals = series.map((s) => parseFloat(s.value));
    const sum = vals.reduce((a, b) => a + b, 0);
    const mean = vals.length ? (sum / vals.length).toFixed(2) : "0";
    const max = vals.length ? Math.max(...vals).toFixed(2) : "0";
    const min = vals.length ? Math.min(...vals).toFixed(2) : "0";
    return { mean, max, min };
  }

  function simulateSeries(variableKey, days) {
    const baseMap = {
      "Temperatura terrestre": 25,
      "Temperatura del mar": 21,
      "Aerosol (Vientos)": 7,
      "Corrientes Oceánicas": 0.6,
      "Precipitación": 2,
    };
    const base = baseMap[variableKey] ?? 10;
    const now = new Date();
    const out = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      const noise = (Math.random() - 0.5) * (base * 0.25 + 1);
      const v = Math.max(0, +(base + noise).toFixed(2));
      out.push({ date: d.toISOString().slice(0, 10), value: v.toString() });
    }
    return out;
  }

  function aggregateSeries(seriesArray) {
    if (seriesArray.length === 0) return [];
    if (seriesArray.length === 1) return seriesArray[0];

    const dateMap = {};
    seriesArray.forEach(series => {
      series.forEach(point => {
        if (!dateMap[point.date]) {
          dateMap[point.date] = [];
        }
        dateMap[point.date].push(parseFloat(point.value));
      });
    });

    return Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({
        date,
        value: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)
      }));
  }

  function openPopupAt(lat, lng, place, series) {
    const map = mapRef.current;
    if (!map) return;

    const popupEl = L.DomUtil.create("div", "popup-wrapper");
    popupEl.innerHTML = `
      <div class="popup-header">
        <div class="popup-title">${activeVar}</div>
        <div class="popup-place">${place}</div>
        <div class="popup-coords">Lat ${lat.toFixed(4)} · Lon ${lng.toFixed(4)}</div>
      </div>
      <div class="popup-stats">
        <div><strong>Valor actual:</strong> ${series[series.length - 1].value} ${LAYER_DEFS[activeVar].legend.unit}</div>
        <div><strong>Promedio:</strong> ${computeStats(series).mean} &nbsp; <strong>Máx:</strong> ${computeStats(series).max} &nbsp; <strong>Mín:</strong> ${computeStats(series).min}</div>
      </div>
    `;
    const canvas = L.DomUtil.create("canvas", "popup-canvas", popupEl);
    canvas.width = 380; canvas.height = 140;
    drawMiniChart(canvas, series, LAYER_DEFS[activeVar].legend.colors);

    const expandBtn = L.DomUtil.create("button", "popup-expand", popupEl);
    expandBtn.innerText = "Ampliar serie";
    expandBtn.onclick = () => {
      setModalRange(7);
      setModalOpen(true);
      setTimeout(() => drawModalSeries(activeVar, lat, lng, 7), 120);
    };

    L.popup({ maxWidth: 460 }).setLatLng([lat, lng]).setContent(popupEl).openOn(map);
    popupRef.current = { el: popupEl, lat, lng, var: activeVar };
  }

  async function handlePointSelection(lat, lng) {
    const place = await reverseGeocode(lat, lng);
    setSelectedPoint({ lat, lng, place });

    const series = await fetchSeriesFor(activeVar, lat, lng, 7);
    const stats = computeStats(series);

    const data = {
      lat: lat.toFixed(6),
      lng: lng.toFixed(6),
      place,
      variable: activeVar,
      unit: LAYER_DEFS[activeVar].legend.unit,
      value: series[series.length - 1].value,
      series,
      mean: stats.mean,
      max: stats.max,
      min: stats.min,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
    };
    setSelectedData(data);
    openPopupAt(lat, lng, place, series);
  }

  async function handlePolygonComplete(data) {
    console.log('Polígono completado:', data);
    const { center, place, samplePoints } = data;
    const [lat, lng] = center;

    const allSeries = await Promise.all(
      samplePoints.map(([sampleLat, sampleLng]) => 
        fetchSeriesFor(activeVar, sampleLat, sampleLng, 7)
      )
    );

    const aggregatedSeries = aggregateSeries(allSeries);
    const stats = computeStats(aggregatedSeries);

    setPolygonData(data);
    setSelectedPoint({ lat, lng, place });
    setHasPolygon(true);

    const resultData = {
      lat: lat.toFixed(6),
      lng: lng.toFixed(6),
      place: `${place} (Área ${samplePoints.length} puntos)`,
      variable: activeVar,
      unit: LAYER_DEFS[activeVar].legend.unit,
      value: aggregatedSeries[aggregatedSeries.length - 1].value,
      series: aggregatedSeries,
      mean: stats.mean,
      max: stats.max,
      min: stats.min,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
    };
    
    setSelectedData(resultData);
    openPopupAt(lat, lng, resultData.place, aggregatedSeries);
    setDrawMode(false);
  }

  function handleClearPolygon() {
    if (window.__clearPolygon) {
      window.__clearPolygon();
      setHasPolygon(false);
      setPolygonData(null);
      console.log('Polígono eliminado del mapa');
    }
  }

  async function searchPlace(q) {
    if (!q) return;
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`);
      const j = await resp.json();
      if (!j || !j.length) return;
      const { lat, lon } = j[0];
      const map = mapRef.current;
      map.setView([+lat, +lon], 9);
      await handlePointSelection(+lat, +lon);
    } catch (err) {
      console.warn("search error", err);
    }
  }

  function drawMiniChart(canvas, series, colors) {
    if (!canvas) return;
    try { if (canvas._chart) canvas._chart.destroy(); } catch {}
    const ctx = canvas.getContext("2d");
    canvas.style.background = "#fff";
    const labels = series.map((s) => s.date);
    const data = series.map((s) => +s.value);
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, colors[0]); 
    grad.addColorStop(0.5, colors[Math.floor(colors.length / 2)]); 
    grad.addColorStop(1, colors[colors.length - 1]);
    const chart = new Chart(ctx, {
      type: "line",
      data: { labels, datasets: [{ data, borderColor: colors[Math.floor(colors.length / 2)], backgroundColor: grad, fill: true, tension: 0.25, pointRadius: 2 }] },
      options: { responsive: false, plugins: { legend: { display: false } } },
    });
    canvas._chart = chart;
  }

  async function drawModalSeries(variableKey, lat, lon, days) {
    const series = await fetchSeriesFor(variableKey, lat, lon, days);
    if (modalCanvasRef.current) drawMiniChart(modalCanvasRef.current, series, LAYER_DEFS[variableKey].legend.colors);
    setSelectedData((prev) => prev ? ({ ...prev, series, value: series[series.length - 1].value }) : prev);
  }

  function isDataLive() {
    if (!dataTimestamp) return false;
    const today = new Date();
    const dataDate = new Date(dataTimestamp);
    const diffDays = Math.floor((today - dataDate) / (1000 * 60 * 60 * 24));
    return diffDays <= 1;
  }

  function getDataStatusMessage() {
    if (!dataTimestamp) return null;
    
    if (isDataLive()) {
      return "🔴 Datos en tiempo real";
    } else {
      const dataDate = new Date(dataTimestamp);
      const formatted = dataDate.toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      return `📅 Datos obtenidos de: ${formatted}`;
    }
  }

  function downloadJSON() {
    if (!selectedData) return;
    
    const dataWithMetadata = {
      ...selectedData,
      dataStatus: getDataStatusMessage(),
      isLiveData: isDataLive(),
      dataDate: dataTimestamp ? dataTimestamp.toISOString() : null,
      downloadDate: new Date().toISOString(),
      variable: activeVar
    };
    
    const blob = new Blob([JSON.stringify(dataWithMetadata, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `climate_data_${activeVar.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  }

  function downloadPDF() {
    if (!selectedData) return;
    const doc = new jsPDF();
    let y = 18;
    const p = (t) => { doc.setFontSize(11); doc.text(t, 12, y); y += 8; };
    
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Reporte Climático', 12, y);
    y += 10;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const statusMsg = getDataStatusMessage() || 'Estado desconocido';
    doc.text(statusMsg, 12, y);
    y += 6;
    doc.text(`Variable: ${activeVar}`, 12, y);
    y += 10;
    
    doc.setFontSize(11);
    p(`Lugar: ${selectedData.place}`);
    p(`Coordenadas: ${selectedData.lat}, ${selectedData.lng}`);
    p(`Valor actual: ${selectedData.value} ${selectedData.unit}`);
    p(`Promedio: ${selectedData.mean} | Máx: ${selectedData.max} | Mín: ${selectedData.min}`);
    p(`Fecha de consulta: ${selectedData.date} ${selectedData.time}`);
    
    if (dataTimestamp) {
      const dataDate = new Date(dataTimestamp);
      p(`Fecha de los datos: ${dataDate.toLocaleDateString('es-ES')}`);
    }
    
    y += 4;
    p("Serie temporal:");
    selectedData.series?.forEach((s) => p(`  ${s.date}: ${s.value} ${selectedData.unit}`));
    
    doc.save(`reporte_climatico_${activeVar.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`);
  }

  function onLegendMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const pct = 1 - y / rect.height;
    const cfg = LAYER_DEFS[activeVar].legend;
    const val = cfg.min + pct * (cfg.max - cfg.min);
    setLegendHover(val.toFixed(2) + " " + cfg.unit);
  }

  function onLegendLeave() { setLegendHover(null); }

  useEffect(() => {
    const map = L.map(mapContainerRef.current, { 
      center: [4.6, -74.1], 
      zoom: 6, 
      minZoom: 2, 
      maxZoom: 10,
      maxBounds: [[-90, -180], [90, 180]],
      maxBoundsViscosity: 1.0,
      worldCopyJump: false
    });
    mapRef.current = map;

    setTimeout(() => {
      try { map.invalidateSize(); } catch (e) { console.warn('invalidateSize err', e); }
    }, 200);

    const onResize = () => { try { map.invalidateSize(); } catch {} };
    window.addEventListener('resize', onResize);

    L.tileLayer(BASE_TILE, { 
      attribution: "&copy; OpenStreetMap", 
      zIndex: 1,
      noWrap: true,
      bounds: [[-90, -180], [90, 180]]
    }).addTo(map);

    try {
      if (!map.getPane('gibsOverlays')) map.createPane('gibsOverlays');
      const p = map.getPane('gibsOverlays');
      if (p) p.style.zIndex = 650;
      
      if (!map.getPane('currentsPane')) map.createPane('currentsPane');
      const cp = map.getPane('currentsPane');
      if (cp) {
        cp.style.zIndex = 660;
        try { cp.style.mixBlendMode = 'multiply'; } catch (e) {}
      }
    } catch (e) {
      console.warn('pane create err', e);
    }

    Object.entries(LAYER_DEFS).forEach(([name, cfg]) => {
      try {
        if (cfg.type === "wmts") {
          const tryDays = 5;
          const tryDates = Array.from({ length: tryDays }, (_, i) => getDateOffsetFormatted(i));
          const makeUrl = (date) => `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${cfg.layer}/default/${date}/${cfg.tileMatrixSet}/{z}/{y}/{x}.${cfg.format}`;
          const makeUrlWithMatrix = (date, matrix) => `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${cfg.layer}/default/${date}/${matrix}/{z}/{y}/{x}.${cfg.format}`;

          const url = makeUrl(tryDates[0]);
          console.log(`[${name}] WMTS URL example:`, url.replace('{z}/{y}/{x}', '6/20/30'));

          const layerOpts = {
            tileSize: 256,
            opacity: cfg.opacity != null ? cfg.opacity : 0.6,
            pane: 'gibsOverlays',
            zIndex: 650,
            attribution: "NASA GIBS",
            maxNativeZoom: cfg.maxNativeZoom,
            maxZoom: 10,
            noWrap: true,
            crossOrigin: true,
            errorTileUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
          };

          if (cfg.useLowResFallback) {
            layerOpts.tileSize = 512;
            layerOpts.zoomOffset = -1;
            layerOpts.maxZoom = Math.min(8, (cfg.maxNativeZoom || 7) + 1);
          }

          const owmAltImmediate = Array.isArray(cfg.alt) ? cfg.alt.find(a => a.type === 'openweathermap') : (cfg.alt && cfg.alt.type === 'openweathermap' ? cfg.alt : null);
          let layer = null;
          if (owmAltImmediate && process.env.REACT_APP_OWM_KEY) {
            try {
              const key = process.env.REACT_APP_OWM_KEY;
              const owmUrl = `https://tile.openweathermap.org/map/${owmAltImmediate.layer}/{z}/{x}/{y}.png?appid=${key}`;
              const owmOpts = Object.assign({}, layerOpts);
              if (cfg.useLowResFallback) { owmOpts.tileSize = 512; owmOpts.zoomOffset = -1; owmOpts.maxZoom = Math.min(8, (cfg.maxNativeZoom || 7) + 1); }
              layer = L.tileLayer(owmUrl, owmOpts);
              layer.on('tileload', function (ev) { try { console.log(name + ' OWM tileload:', ev.tile && ev.tile.src); } catch (e) {} });
              layer.on('tileerror', function (ev) { try { console.warn(name + ' OWM tileerror', ev.tile && ev.tile.src); } catch (e) {} });
              console.log(name + ' using OpenWeatherMap as primary provider');
            } catch (owmErr) {
              console.warn(name + ' failed to create OWM layer, falling back to WMTS', owmErr);
            }
          }

          if (!layer) {
            layer = L.tileLayer(url, layerOpts);
            layer.on('tileload', function (ev) {
              try { console.log(name + ' tileload:', ev.tile && ev.tile.src); } catch (e) {}
            });
          }

          try {
            const probeTiles = (urlTemplate, coords) => {
              return Promise.all(coords.map(({z,x,y}) => new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => resolve(true);
                img.onerror = () => resolve(false);
                img.src = urlTemplate.replace('{z}/{y}/{x}', `${z}/${y}/${x}`);
                setTimeout(() => resolve(false), 3000);
              }))).then(results => results.filter(Boolean).length / results.length);
            };

            const latLngToTile = (lat, lon, z) => {
              const xtile = Math.floor((lon + 180) / 360 * Math.pow(2, z));
              const latRad = lat * Math.PI / 180;
              const ytile = Math.floor((1 - Math.log(Math.tan(latRad) + 1/Math.cos(latRad)) / Math.PI) / 2 * Math.pow(2, z));
              return { x: xtile, y: ytile };
            };

            const mapCenter = map.getCenter();
            const zProbe = Math.min(map.getZoom(), layerOpts.maxZoom || 6, 6);
            const centerTile = latLngToTile(mapCenter.lat, mapCenter.lng, zProbe);
            const probeCoords = [
              { z: zProbe, x: centerTile.x, y: centerTile.y },
              { z: zProbe, x: centerTile.x + 1, y: centerTile.y },
              { z: zProbe, x: centerTile.x, y: centerTile.y + 1 },
              { z: zProbe, x: centerTile.x - 1, y: centerTile.y }
            ];

            (async () => {
              try {
                const matrixCandidates = [cfg.tileMatrixSet, 'GoogleMapsCompatible_Level8', 'GoogleMapsCompatible_Level7'];
                const primaryUrl = makeUrlWithMatrix(tryDates[0], matrixCandidates[0]);
                const successRatio = await probeTiles(primaryUrl, probeCoords);
                console.log(name + ' WMTS probe successRatio:', successRatio);
                if (successRatio < 0.5 && cfg.alt && Array.isArray(cfg.alt)) {
                  const owmAlt = cfg.alt.find(a => a.type === 'openweathermap');
                  if (owmAlt && process.env.REACT_APP_OWM_KEY) {
                    const k = process.env.REACT_APP_OWM_KEY;
                    const owmUrl = `https://tile.openweathermap.org/map/${owmAlt.layer}/{z}/{x}/{y}.png?appid=${k}`;
                    const altLayer = L.tileLayer(owmUrl, { tileSize: cfg.useLowResFallback ? 512 : 256, opacity: cfg.opacity || 0.6, pane: cfg.pane || 'gibsOverlays', attribution: 'OpenWeatherMap' });
                    layersRef.current[name] = altLayer;
                    console.log(name + ' switched to OpenWeatherMap based on probe');
                    return;
                  }
                  const rainAlt = cfg.alt.find(a => a.type === 'rainviewer');
                  if (rainAlt) {
                    if (layer.__gibs_prebuiltRainViewer) {
                      layersRef.current[name] = layer.__gibs_prebuiltRainViewer;
                      console.log(name + ' switched to prebuilt RainViewer based on probe');
                      return;
                    }
                    try {
                      const r = await fetch('https://api.rainviewer.com/public/maps.json');
                      const j = await r.json();
                      const timestamp = (Array.isArray(j.timestamps) && j.timestamps.length) ? j.timestamps[j.timestamps.length-1] : (j.radar && j.radar.length ? j.radar[j.radar.length-1].time : null);
                      if (timestamp) {
                        const rvUrl = `https://tilecache.rainviewer.com/v2/radar/${timestamp}/{z}/{x}/{y}/256.png`;
                        const rvLayer = L.tileLayer(rvUrl, { tileSize: 256, opacity: cfg.opacity || 0.75, pane: cfg.pane || 'gibsOverlays', attribution: 'RainViewer' });
                        layersRef.current[name] = rvLayer;
                        console.log(name + ' switched to RainViewer based on probe');
                        return;
                      }
                    } catch (e) { console.warn('rainviewer probe err', e); }
                  }
                }
              } catch (probeErr) { console.warn(name + ' WMTS probe err', probeErr); }
            })();
          } catch (probeSetupErr) { console.warn('probe setup err', probeSetupErr); }

          layer.__gibs_tryDates = tryDates;
          layer.__gibs_attemptDate = 0;
          const matrixCandidates = [cfg.tileMatrixSet, 'GoogleMapsCompatible_Level8', 'GoogleMapsCompatible_Level7'];
          layer.__gibs_matrixIdx = 0;
          layer.on('tileerror', function (ev) {
            try {
              const coords = ev.coords || (ev.tile && ev.tile.coords) || null;
              const url = ev.tile && ev.tile.src;
              console.warn(name + ' tileerror', 'coords:', coords, 'url:', url, 'dateAttempt:', layer.__gibs_attemptDate, 'matrixIdx:', layer.__gibs_matrixIdx);
              const nextDateAttempt = layer.__gibs_attemptDate + 1;
              if (nextDateAttempt < layer.__gibs_tryDates.length) {
                const nextDate = layer.__gibs_tryDates[nextDateAttempt];
                const newUrl = makeUrlWithMatrix(nextDate, matrixCandidates[layer.__gibs_matrixIdx]);
                console.warn(name + ' WMTS tileerror — switching to date ' + nextDate);
                layer.__gibs_attemptDate = nextDateAttempt;
                try { layer.setUrl(newUrl); } catch (e) { console.warn('setUrl err', e); }
                return;
              }

              if (layer.__gibs_matrixIdx + 1 < matrixCandidates.length) {
                layer.__gibs_matrixIdx += 1;
                const nextMatrix = matrixCandidates[layer.__gibs_matrixIdx];
                const newUrl = makeUrlWithMatrix(layer.__gibs_tryDates[0], nextMatrix);
                console.warn(name + ' WMTS tileerror — switching TileMatrixSet to ' + nextMatrix + ' and retrying dates');
                layer.__gibs_attemptDate = 0;
                try { layer.setUrl(newUrl); } catch (e) { console.warn('setUrl err', e); }
                return;
              }

              try {
                if (cfg.alt) {
                  if (!layer.__gibs_altIdx) layer.__gibs_altIdx = 0;
                  const alts = Array.isArray(cfg.alt) ? cfg.alt : [cfg.alt];
                  if (layer.__gibs_altIdx < alts.length) {
                    const candidate = alts[layer.__gibs_altIdx];
                    layer.__gibs_altIdx += 1;
                    console.warn(name + ' WMTS tileerror — switching to alt provider: ' + (candidate.name || candidate.type));

                    if (candidate.type === 'openweathermap') {
                      try {
                        const key = process.env.REACT_APP_OWM_KEY || '';
                        if (!key) {
                          console.warn(name + ' OpenWeatherMap alt requested but REACT_APP_OWM_KEY is not set. Skipping to next alt.');
                          try { layer.fire('tileerror', ev); } catch (e) {}
                          return;
                        }
                        const owmUrl = `https://tile.openweathermap.org/map/${candidate.layer}/{z}/{x}/{y}.png?appid=${key}`;
                        const optsOwm = {
                          tileSize: cfg.useLowResFallback ? 512 : 256,
                          opacity: cfg.opacity != null ? cfg.opacity : 0.6,
                          pane: 'gibsOverlays',
                          zIndex: 650,
                          attribution: 'OpenWeatherMap',
                          noWrap: cfg.noWrap || false,
                          errorTileUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
                        };
                        if (cfg.useLowResFallback) { optsOwm.zoomOffset = -1; optsOwm.maxZoom = Math.min(8, (cfg.maxNativeZoom || 7) + 1); }
                        const altLayer = L.tileLayer(owmUrl, optsOwm);
                        altLayer.on('tileload', (e) => { try { console.log(name + ' OWM alt tileload:', e.tile && e.tile.src); } catch (ee) {} });
                        altLayer.on('tileerror', (e) => { try { console.warn(name + ' OWM alt tileerror', e.tile && e.tile.src); } catch (ee) {} });
                        layersRef.current[name] = altLayer;
                        try { if (map.hasLayer(layer)) map.removeLayer(layer); if (activeVar === name) altLayer.addTo(map); } catch (e) { console.warn('alt layer swap err', e); }
                        return;
                      } catch (owmErr) { console.warn(name + ' openweathermap alt err', owmErr); }
                    }

                    if (candidate.type === 'xyz') {
                      const opts2 = {
                        tileSize: cfg.useLowResFallback ? 512 : 256,
                        opacity: cfg.opacity != null ? cfg.opacity : 0.6,
                        pane: 'gibsOverlays',
                        zIndex: 650,
                        attribution: cfg.attribution || '',
                        noWrap: cfg.noWrap || false,
                        errorTileUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
                      };
                      if (cfg.useLowResFallback) {
                        opts2.zoomOffset = -1;
                        opts2.maxZoom = Math.min(8, (cfg.maxNativeZoom || 7) + 1);
                      }
                      const altLayer = L.tileLayer(candidate.url, opts2);
                      altLayer.on('tileload', (e) => { try { console.log(name + ' alt tileload:', e.tile && e.tile.src); } catch (ee) {} });
                      altLayer.on('tileerror', (e) => { try { console.warn(name + ' alt tileerror', e.tile && e.tile.src); } catch (ee) {} });
                      layersRef.current[name] = altLayer;
                      try {
                        if (map.hasLayer(layer)) map.removeLayer(layer);
                        if (activeVar === name) altLayer.addTo(map);
                      } catch (e) { console.warn('alt layer swap err', e); }
                      return;
                    }

                    if (candidate.type === 'rainviewer') {
                      try {
                        if (layer && layer.__gibs_prebuiltRainViewer) {
                          try {
                            const rvLayer = layer.__gibs_prebuiltRainViewer;
                            layersRef.current[name] = rvLayer;
                            if (map.hasLayer(layer)) map.removeLayer(layer);
                            if (activeVar === name) rvLayer.addTo(map);
                            console.log(name + ' switched to prebuilt RainViewer alt');
                            return;
                          } catch (swapErr) { console.warn('rv prebuilt swap err', swapErr); }
                        }
                        fetch('https://api.rainviewer.com/public/maps.json').then(res => res.json()).then((j) => {
                          if (j && (Array.isArray(j.timestamps) ? j.timestamps.length : (j.radar && j.radar.length))) {
                            const timestamp = (Array.isArray(j.timestamps) && j.timestamps.length) ? j.timestamps[j.timestamps.length - 1] : (j.radar && j.radar.length ? j.radar[j.radar.length - 1].time : null);
                            if (timestamp) {
                              const rvUrl = `https://tilecache.rainviewer.com/v2/radar/${timestamp}/{z}/{x}/{y}/256.png`;
                              const opts3 = {
                                tileSize: 256,
                                opacity: cfg.opacity != null ? cfg.opacity : 0.75,
                                pane: 'gibsOverlays',
                                zIndex: 650,
                                attribution: 'RainViewer'
                              };
                              const rvLayer = L.tileLayer(rvUrl, opts3);
                              rvLayer.on('tileload', (e) => { try { console.log(name + ' RainViewer tileload:', e.tile && e.tile.src); } catch (ee) {} });
                              rvLayer.on('tileerror', (e) => { try { console.warn(name + ' RainViewer tileerror', e.tile && e.tile.src); } catch (ee) {} });
                              layersRef.current[name] = rvLayer;
                              try { if (map.hasLayer(layer)) map.removeLayer(layer); if (activeVar === name) rvLayer.addTo(map); } catch (e) { console.warn('rv swap err', e); }
                              return;
                            }
                          }
                          console.warn(name + ' RainViewer maps.json did not return timestamps');
                        }).catch((fetchErr) => { console.warn(name + ' RainViewer fetch err', fetchErr); });
                        return;
                      } catch (rvErr) { console.warn('rainviewer alt err', rvErr); }
                    }
                  }
                }
              } catch (altErr) {
                console.warn('alt handler err', altErr);
              }

              console.warn(name + ' WMTS tileerror — no fallback dates or matrices left');
            } catch (ee) {
              console.warn('tileerror handler err', ee);
            }
          });

          layersRef.current[name] = layer;

          try {
            if (cfg.alt) {
              const alts = Array.isArray(cfg.alt) ? cfg.alt : [cfg.alt];
              const hasRain = alts.find(a => a.type === 'rainviewer');
              if (hasRain) {
                fetch('https://api.rainviewer.com/public/maps.json').then(r => r.json()).then((j) => {
                    try {
                    let timestamp = null;
                    if (Array.isArray(j.timestamps) && j.timestamps.length) timestamp = j.timestamps[j.timestamps.length - 1];
                    if (!timestamp && Array.isArray(j.radar) && j.radar.length) {
                      const last = j.radar[j.radar.length - 1];
                      timestamp = last && last.time ? last.time : null;
                    }
                    if (timestamp) {
                      const rvUrl = `https://tilecache.rainviewer.com/v2/radar/${timestamp}/{z}/{x}/{y}/256.png`;
                      const rvOpts = {
                        tileSize: 256,
                        opacity: cfg.opacity != null ? cfg.opacity : 0.75,
                        pane: 'gibsOverlays',
                        zIndex: 650,
                        attribution: 'RainViewer'
                      };
                      const rvLayer = L.tileLayer(rvUrl, rvOpts);
                      rvLayer.on('tileload', (e) => { try { console.log(name + ' RainViewer prebuilt tileload:', e.tile && e.tile.src); } catch (ee) {} });
                      rvLayer.on('tileerror', (e) => { try { console.warn(name + ' RainViewer prebuilt tileerror', e.tile && e.tile.src); } catch (ee) {} });
                      try { layer.__gibs_prebuiltRainViewer = rvLayer; console.log(name + ' RainViewer prebuilt and ready'); } catch (e) { console.warn('attach prebuilt rv err', e); }
                    } else {
                      console.warn(name + ' RainViewer maps.json returned no timestamp');
                    }
                  } catch (procErr) { console.warn(name + ' RainViewer build err', procErr); }
                }).catch((fetchErr) => { console.warn(name + ' RainViewer fetch err', fetchErr); });
              }
            }
          } catch (altprefErr) { console.warn('alt prefetch err', altprefErr); }

          try { console.log('[layer created]', name, 'type:', cfg.type, 'urlExample:', (layer._url || cfg.url || '').replace('{z}/{y}/{x}', '6/20/30')); } catch (e) {}
        } else if (cfg.type === "wms") {
          const wmsLayer = L.tileLayer.wms(cfg.url, {
            layers: cfg.params.layers,
            format: cfg.params.format || "image/png",
            transparent: true,
            opacity: cfg.opacity != null ? cfg.opacity : 0.6,
            pane: 'gibsOverlays',
            zIndex: 650,
            attribution: "NOAA"
          });
          wmsLayer.on('tileload', (ev) => { try { console.log(name + ' tileload:', ev.tile && ev.tile.src); } catch (e) {} });
          wmsLayer.on('tileerror', (ev) => { try { console.warn(name + ' tileerror', ev.tile && ev.tile.src); } catch (e) {} });
          layersRef.current[name] = wmsLayer;
          try { console.log('[layer created]', name, 'type: wms', 'url:', cfg.url); } catch (e) {}
        } else if (cfg.type === "openweathermap") {
          try {
            const key = process.env.REACT_APP_OWM_KEY || '';
            if (!key) console.warn(name + ' OpenWeatherMap layer defined but REACT_APP_OWM_KEY is not set; tiles will likely return errors');
            const owmUrl = `https://tile.openweathermap.org/map/${cfg.layer}/{z}/{x}/{y}.png?appid=${key}`;
            const owmOpts = {
              tileSize: cfg.tileSize || 256,
              opacity: cfg.opacity != null ? cfg.opacity : 0.6,
              pane: cfg.pane || 'gibsOverlays',
              zIndex: cfg.zIndex || 650,
              attribution: 'OpenWeatherMap',
              maxNativeZoom: cfg.maxNativeZoom || cfg.maxNativeZoom === 0 ? cfg.maxNativeZoom : cfg.maxNativeZoom,
              maxZoom: cfg.maxZoom || 19,
              noWrap: cfg.noWrap || false,
              errorTileUrl: cfg.errorTileUrl || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
            };
            if (cfg.useLowResFallback) { owmOpts.tileSize = 512; owmOpts.zoomOffset = -1; owmOpts.maxZoom = Math.min(8, (cfg.maxNativeZoom || 7) + 1); }
            const owmLayer = L.tileLayer(owmUrl, owmOpts);
            owmLayer.on('tileload', (ev) => { try { console.log(name + ' OWM tileload:', ev.tile && ev.tile.src); } catch (e) {} });
            owmLayer.on('tileerror', (ev) => { try { console.warn(name + ' OWM tileerror', ev.tile && ev.tile.src); } catch (e) {} });
            layersRef.current[name] = owmLayer;
            try { console.log('[layer created]', name, 'type: openweathermap', 'urlExample:', owmUrl.replace('{z}/{x}/{y}', '6/20/30')); } catch (e) {}
          } catch (owmCreateErr) { console.warn('openweathermap layer create err', owmCreateErr); }
        } else if (cfg.type === "xyz") {
          const opts = {
            tileSize: cfg.tileSize || 256,
            opacity: cfg.opacity != null ? cfg.opacity : 0.6,
            pane: 'gibsOverlays',
            zIndex: cfg.zIndex || 650,
            attribution: cfg.attribution || "",
            maxNativeZoom: cfg.maxNativeZoom || cfg.maxNativeZoom === 0 ? cfg.maxNativeZoom : cfg.maxNativeZoom,
            maxZoom: cfg.maxZoom || 19,
            subdomains: cfg.subdomains || 'abc',
            noWrap: cfg.noWrap || false,
            errorTileUrl: cfg.errorTileUrl || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
          };
          if (cfg.useLowResFallback) {
            opts.tileSize = 512;
            opts.zoomOffset = -1;
            opts.maxZoom = Math.min(8, (cfg.maxNativeZoom || 7) + 1);
          }
          const xyzLayer = L.tileLayer(cfg.url, opts);
          xyzLayer.on('tileload', (ev) => { try { console.log(name + ' tileload:', ev.tile && ev.tile.src); } catch (e) {} });
          xyzLayer.on('tileerror', (ev) => { try { console.warn(name + ' tileerror', ev.tile && ev.tile.src); } catch (e) {} });
          layersRef.current[name] = xyzLayer;
          try { console.log('[layer created]', name, 'type: xyz', 'urlExample:', (cfg.url || '').replace('{z}/{x}/{y}', '6/20/30')); } catch (e) {}
        }
      } catch (err) {
        console.warn("layer create err", name, err);
      }
    });

    if (layersRef.current[activeVar]) {
      try {
        console.log('Adding default active layer:', activeVar, 'layersRef keys:', Object.keys(layersRef.current));
        layersRef.current[activeVar].addTo(map);
        console.log(`Added default layer: ${activeVar}`);
      } catch (e) {
        console.warn('error adding default layer', e);
      }
    }

    return () => {
      map.remove();
      mapRef.current = null;
      window.removeEventListener('resize', onResize);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleMapClick = async (e) => {
      if (drawMode) return;
      
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      await handlePointSelection(lat, lng);
    };
    
    map.on("click", handleMapClick);

    return () => {
      map.off("click", handleMapClick);
    };
  }, [drawMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    console.log(`Switching to layer: ${activeVar}`);

    Object.values(layersRef.current).forEach((l) => { 
      try { 
        if (map.hasLayer(l)) {
          map.removeLayer(l);
        }
      } catch (e) {
        console.warn('Error removing layer:', e);
      }
    });
    
    const activeLayer = layersRef.current[activeVar];
    if (activeLayer) {
      if (!map.hasLayer(activeLayer)) activeLayer.addTo(map);
      console.log(`Layer ${activeVar} added to map`);
    } else {
      console.warn(`Layer ${activeVar} not found in layersRef`);
    }

    if (selectedPoint) {
      (async () => {
        const { lat, lng } = selectedPoint;
        const series = await fetchSeriesFor(activeVar, lat, lng, modalOpen ? modalRange : 7);
        const stats = computeStats(series);
        setSelectedData({
          lat: lat.toFixed(6),
          lng: lng.toFixed(6),
          place: selectedPoint.place,
          variable: activeVar,
          unit: LAYER_DEFS[activeVar].legend.unit,
          value: series[series.length - 1].value,
          series,
          mean: stats.mean,
          max: stats.max,
          min: stats.min,
          date: new Date().toLocaleDateString(),
          time: new Date().toLocaleTimeString(),
        });

        if (popupRef.current && Math.abs(popupRef.current.lat - lat) < 1e-6 && Math.abs(popupRef.current.lng - lng) < 1e-6) {
          try { map.closePopup(); } catch {}
          openPopupAt(lat, lng, selectedPoint.place, series);
        }
      })();
    }
  }, [activeVar]);

  useEffect(() => {
    if (!modalOpen) return;
    const lat = selectedData ? +selectedData.lat : 4.6;
    const lng = selectedData ? +selectedData.lng : -74.1;
    drawModalSeries(activeVar, lat, lng, modalRange);
  }, [modalOpen, modalRange]);

  const selectInlineStyle = {
    background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#e6f4ff",
    padding: "8px 10px",
    borderRadius: 8,
    fontWeight: 700,
    boxShadow: "0 4px 14px rgba(2,6,23,0.6)",
    outline: "none",
  };

  const legend = LAYER_DEFS[activeVar].legend;

  return (
    <div className="um-dashboard">
      <div ref={mapContainerRef} className="um-map" />

      {dataTimestamp && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: isDataLive() 
            ? 'rgba(34, 197, 94, 0.95)' 
            : 'rgba(59, 130, 246, 0.95)',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: '600',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          border: isDataLive() 
            ? '2px solid rgba(34, 197, 94, 1)' 
            : '2px solid rgba(59, 130, 246, 1)'
        }}>
          <div>{getDataStatusMessage()}</div>
          <div style={{ 
            fontSize: '11px', 
            opacity: 0.9,
            fontWeight: '500'
          }}>
            Variable: {activeVar}
          </div>
        </div>
      )}

      <div className="um-var-selector" style={{ gap: 12 }}>
        <input
          ref={searchRef}
          type="text"
          placeholder="Buscar lugar (ej. Popayán, Cauca)"
          onKeyDown={(e) => {
            if (e.key === "Enter") searchPlace(e.target.value);
          }}
          style={{
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid rgba(255, 255, 255, 0.84)",
            background: "rgba(255, 255, 255, 0.6)",
            color: "#0a0b0cff",
            minWidth: 220,
          }}
        />
        
        <button
          className="um-btn"
          onClick={() => {
            const q = searchRef.current?.value;
            if (q) searchPlace(q);
          }}
          style={{ marginLeft: 0 }}
        >
          🔎 Buscar
        </button>

        <button
          className="um-btn"
          onClick={() => setDrawMode(!drawMode)}
          style={{
            marginLeft: 8,
            background: drawMode 
              ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' 
              : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            border: drawMode ? '2px solid #fca5a5' : '2px solid #93c5fd'
          }}
        >
          {drawMode ? '✕ Cancelar dibujo' : '✏️ Dibujar área'}
        </button>

        {hasPolygon && !drawMode && (
          <button
            className="um-btn"
            onClick={handleClearPolygon}
            style={{
              marginLeft: 8,
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              border: '2px solid #fbbf24'
            }}
          >
            🗑️ Borrar figura
          </button>
        )}

        <label style={{ color: "#787d81ff", fontWeight: 800, marginLeft: 12 }}>
          Variable
        </label>
        <select 
          value={activeVar}
          onChange={(e) => setActiveVar(e.target.value)} 
          style={{
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid rgba(255, 255, 255, 0.84)",
            background: "rgba(255, 255, 255, 0.6)",
            color: "#787d81ff",
            minWidth: 220,
          }}
        >
          {Object.keys(LAYER_DEFS).map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>

      <div className="um-legend" onMouseMove={onLegendMove} onMouseLeave={onLegendLeave}>
        <div className="um-legend-bar" style={{ background: `linear-gradient(to top, ${legend.colors.join(",")})` }} />
        <div className="um-legend-labels">
          <div>{legend.max}</div>
          <div className="um-legend-unit">{legend.unit}</div>
          <div>{legend.min}</div>
        </div>
        {legendHover && <div className="um-legend-tooltip">{legendHover}</div>}
      </div>

      <div className="um-buttons">
        <button className="um-btn" onClick={downloadJSON}>Descargar JSON</button>
        <button className="um-btn danger" onClick={downloadPDF}>Descargar PDF</button>
      </div>

      {modalOpen && (
        <div className="um-modal" onClick={() => setModalOpen(false)}>
          <div className="um-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="um-modal-header">
              <h3 style={{ margin: 0 }}>{activeVar} — Serie ampliada</h3>
              <div className="um-modal-controls">
                <label style={{ color: "#cfe8ff" }}>Rango</label>
                <select value={modalRange} onChange={(e) => setModalRange(+e.target.value)} style={{ ...selectInlineStyle, padding: "6px 8px" }}>
                  <option value={3}>3 días</option>
                  <option value={7}>7 días</option>
                  <option value={15}>15 días</option>
                  <option value={30}>1 mes</option>
                  <option value={90}>3 meses</option>
                  <option value={180}>6 meses</option>
                  <option value={365}>1 año</option>
                </select>
              </div>
            </div>
            <div className="um-modal-body">
              <canvas ref={modalCanvasRef} width={820} height={340} />
            </div>
            <div className="um-modal-footer">
              <button className="um-btn" onClick={() => setModalOpen(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      <PolygonDrawer 
        map={mapRef.current}
        isActive={drawMode}
        onPolygonComplete={handlePolygonComplete}
        onClearPolygon={true}
        activeVariable={activeVar}
      />
    </div>
  );
}
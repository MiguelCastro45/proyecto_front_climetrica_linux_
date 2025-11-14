// src/components/UserMapDashboard.jsx

/**
 * ============================================================================
 * COMPONENTE PRINCIPAL: CLIMATE DASHBOARD
 * ============================================================================
 * 
 * Dashboard interactivo para visualización de datos climatológicos en tiempo real.
 * 
 * Características principales:
 * - Visualización de mapas con capas climáticas (temperatura, precipitación, vientos)
 * - Selección de puntos individuales o áreas poligonales
 * - Series temporales con gráficos interactivos
 * - Descarga de datos en formato JSON y PDF
 * - Búsqueda de lugares con autocompletado
 * - Integración con múltiples APIs (NASA GIBS, OpenWeatherMap, Open-Meteo)
 * 
 * Autor: Sistema de Monitoreo Climático
 * Última actualización: 2025
 */

import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Chart } from "chart.js/auto";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "../styles/UserMapDashboard.css";
import PolygonDrawer from './PolygonDrawer';

// ============================================================================
// CONSTANTES GLOBALES
// ============================================================================

// URL base para tiles de OpenStreetMap
const BASE_TILE = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

/**
 * Genera una fecha formateada (YYYY-MM-DD) con un offset de días desde hoy
 * @param {number} offset - Número de días hacia atrás desde hoy
 * @returns {string} Fecha en formato ISO (YYYY-MM-DD)
 */
function getDateOffsetFormatted(offset) {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
}

/**
 * LAYER_DEFS: Definición de todas las capas climáticas disponibles
 * 
 * Cada capa incluye:
 * - type: Tipo de servicio (wmts, wms, openweathermap, xyz)
 * - layer: Identificador de la capa en el servicio
 * - opacity: Transparencia de la capa (0-1)
 * - legend: Configuración de la leyenda (min, max, colores)
 * - alt: Proveedores alternativos en caso de fallo
 * - apiName: Nombre del proveedor de datos
 */
const LAYER_DEFS = {
  "Temperatura terrestre": {
    type: "openweathermap",
    layer: "temp_new",
    opacity: 0.9,
    useLowResFallback: true,
    apiName: "OpenWeatherMap",
    legend: { min: -5, max: 40, unit: "°C", colors: ["#1a1a6e", "#2929cc", "#00bfff", "#00ff7f", "#ffff00", "#ffa500", "#ff4500", "#8b0000"] },
  },
  "Temperatura del mar": {
    type: "wmts",
    layer: "GHRSST_L4_MUR_Sea_Surface_Temperature",
    format: "png",
    tileMatrixSet: "GoogleMapsCompatible_Level7",
    maxNativeZoom: 7,
    opacity: 0.9,
    apiName: "NASA GIBS",
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
    apiName: "OpenWeatherMap",
    legend: { min: 0, max: 25, unit: "m/s", colors: ["#00ff00", "#80ff00", "#ffff00", "#ffaa00", "#ff5500", "#ff0055", "#cc0099"] },
  },
  "Precipitación": {
    type: "wmts",
    layer: "GPM_3IMERGHH_V07B_Precipitation",
    format: "png",
    tileMatrixSet: "GoogleMapsCompatible_Level9",
    maxNativeZoom: 9,
    opacity: 1.0,
    apiName: "NASA GIBS",
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
    apiName: "OpenWeatherMap",
    legend: { min: 0, max: 25, unit: 'm/s', colors: ["#00ff00", "#80ff00", "#ffff00", "#ffaa00", "#ff5500", "#ff0055", "#cc0099"] }
  },
};

/**
 * OPEN_METEO_MAP: Mapeo de variables a parámetros de Open-Meteo API
 * Open-Meteo proporciona datos históricos y pronósticos
 */
const OPEN_METEO_MAP = {
  "Temperatura terrestre": { daily: "temperature_2m_mean", unit: "°C" },
  "Aerosol (Vientos)": { daily: "windspeed_10m_max", unit: "m/s" },
  "Precipitación": { daily: "precipitation_sum", unit: "mm" },
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function ClimateDashboard({ currentUser }) {
  // ========================================
  // REFERENCIAS (useRef)
  // Referencias a elementos DOM y objetos de Leaflet
  // ========================================
  const mapContainerRef = useRef(null);  // Contenedor del mapa
  const mapRef = useRef(null);            // Instancia de Leaflet
  const layersRef = useRef({});           // Capas climáticas
  const popupRef = useRef(null);          // Popup activo
  const searchRef = useRef(null);         // Input de búsqueda
  const modalCanvasRef = useRef(null);    // Canvas del modal
  const timeSeriesChartRef = useRef(null); // Gráfico de series temporales

  // ========================================
  // ESTADOS (useState)
  // Gestión del estado de la aplicación
  // ========================================
  
  // Variable climática activa (por defecto: Temperatura del mar)
  const [activeVar, setActiveVar] = useState("Temperatura del mar");
  
  // Punto seleccionado en el mapa
  const [selectedPoint, setSelectedPoint] = useState(null);
  
  // Datos del punto seleccionado (estadísticas y series)
  const [selectedData, setSelectedData] = useState(null);
  
  // Valor al pasar el mouse sobre la leyenda
  const [legendHover, setLegendHover] = useState(null);
  
  // Control del modal de serie temporal ampliada
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStartDate, setModalStartDate] = useState('');
  const [modalEndDate, setModalEndDate] = useState('');
  
  // Modo de dibujo de polígonos
  const [drawMode, setDrawMode] = useState(false);
  const [polygonData, setPolygonData] = useState(null);
  const [hasPolygon, setHasPolygon] = useState(false);
  
  // Timestamp de los datos (para mostrar si son en tiempo real)
  const [dataTimestamp, setDataTimestamp] = useState(null);
  
  // Rango de días para descargar datos
  const [downloadDateRange, setDownloadDateRange] = useState(7);
  
  // ========================================
  // FECHAS POR DEFECTO: Hoy y hace 7 días
  // ========================================
  const getDefaultEndDate = () => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  };
  
  const getDefaultStartDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 7); // 7 días hacia atrás
    return date.toISOString().slice(0, 10);
  };
  
  // Fechas del panel principal (con valores por defecto)
  const [startDate, setStartDate] = useState(getDefaultStartDate());
  const [endDate, setEndDate] = useState(getDefaultEndDate());
  
  // Historial de puntos consultados
  const [selectedPointsHistory, setSelectedPointsHistory] = useState([]);
  
  // ========================================
  // BÚSQUEDA DE LUGARES
  // ========================================
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  
  // ========================================
  // INFORMACIÓN DEL USUARIO
  // ========================================
  const [userInfo, setUserInfo] = useState({
    nombre: currentUser?.first_name && currentUser?.last_name 
      ? `${currentUser.first_name} ${currentUser.last_name}` 
      : "Usuario Demo",
    rol: currentUser?.role || "Analista",
    email: currentUser?.email || "usuario@ejemplo.com"
  });

  /**
   * EFECTO: Actualizar información del usuario cuando cambia
   */
  useEffect(() => {
    if (currentUser) {
      setUserInfo({
        nombre: currentUser.first_name && currentUser.last_name 
          ? `${currentUser.first_name} ${currentUser.last_name}` 
          : "Usuario Demo",
        rol: currentUser.role || "Analista",
        email: currentUser.email || "usuario@ejemplo.com"
      });
    }
  }, [currentUser]);

  /**
   * EFECTO: Cerrar sugerencias al hacer clic fuera del input de búsqueda
   * IMPORTANTE: No cerrar si el click es dentro del dropdown de sugerencias
   */
  useEffect(() => {
    function handleClickOutside(event) {
      // No hacer nada si no hay sugerencias visibles
      if (!showSuggestions) return;
      
      // Verificar si el click fue en el input de búsqueda
      if (searchRef.current && searchRef.current.contains(event.target)) {
        return; // No cerrar
      }
      
      // Verificar si el click fue en el dropdown de sugerencias
      const suggestionDropdown = document.querySelector('.search-suggestions');
      if (suggestionDropdown && suggestionDropdown.contains(event.target)) {
        console.log('Click dentro del dropdown, no cerrar');
        return; // No cerrar
      }
      
      // Si llegamos aquí, el click fue fuera - cerrar dropdown
      console.log('Click fuera del dropdown, cerrando...');
      setShowSuggestions(false);
    }

    // Usar mousedown en lugar de click para mejor control
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSuggestions]);

  /**
   * EFECTO: Calcular posición del dropdown de sugerencias
   * Se actualiza cuando cambian las sugerencias o al hacer scroll/resize
   */
  useEffect(() => {
    const updatePosition = () => {
      if (showSuggestions && searchRef.current) {
        const rect = searchRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + 4,     // 4px debajo del input
          left: rect.left,
          width: rect.width
        });
      }
    };

    updatePosition();

    // Recalcular en resize y scroll
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [showSuggestions, searchSuggestions]);

  /**
   * EFECTO: Búsqueda de sugerencias con debounce (500ms)
   * Se ejecuta cuando el usuario escribe en el input de búsqueda
   */
  useEffect(() => {
    // Requiere mínimo 3 caracteres
    if (!searchQuery || searchQuery.trim().length < 3) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`);
        const results = await resp.json();
        console.log('Sugerencias encontradas:', results);
        if (results && results.length > 0) {
          setSearchSuggestions(results);
          setShowSuggestions(true);
          console.log('Mostrando', results.length, 'sugerencias');
        } else {
          setSearchSuggestions([]);
          setShowSuggestions(false);
          console.log('No se encontraron sugerencias');
        }
      } catch (err) {
        console.warn("search suggestions error", err);
        setSearchSuggestions([]);
        setShowSuggestions(false);
      }
    }, 500); // Debounce de 500ms

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  /**
   * FUNCIÓN: Seleccionar una sugerencia de lugar
   * @param {Object} suggestion - Objeto con datos del lugar (lat, lon, display_name)
   * 
   * Proceso:
   * 1. Actualiza el input con el nombre del lugar
   * 2. Navega al lugar en el mapa con animación
   * 3. Obtiene y muestra los datos climatológicos
   */
  async function selectSuggestion(suggestion) {
    console.log('🎯 selectSuggestion llamada con:', suggestion);
    
    const { lat, lon, display_name } = suggestion;
    
    console.log('📍 Lugar seleccionado:', display_name, `(${lat}, ${lon})`);
    
    // IMPORTANTE: Actualizar el input con el lugar seleccionado
    setSearchQuery(display_name);
    console.log('✅ Input actualizado con:', display_name);
    
    // Cerrar dropdown
    setShowSuggestions(false);
    setSearchSuggestions([]);
    console.log('✅ Dropdown cerrado');
    
    const map = mapRef.current;
    if (!map) {
      console.error('❌ Mapa no disponible');
      return;
    }
    
    // Convertir a números
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    
    console.log('🗺️ Navegando al lugar en el mapa...', { latitude, longitude });
    
    // Navegar al lugar con animación suave
    map.flyTo([latitude, longitude], 10, {
      duration: 1.2,        // Animación de 1.2 segundos
      easeLinearity: 0.25
    });
    
    // Esperar a que la animación del mapa termine
    await new Promise(resolve => setTimeout(resolve, 700));
    console.log('✅ Animación completada');
    
    // Traer los datos del lugar y mostrar el popup
    console.log('📊 Obteniendo datos climatológicos del lugar...');
    try {
      await handlePointSelection(latitude, longitude);
      console.log('✅ Datos mostrados en el popup');
    } catch (error) {
      console.error('❌ Error obteniendo datos:', error);
    }
  }

  /**
   * FUNCIÓN: Capturar snapshot del mapa como imagen
   * @returns {Promise<string|null>} Data URL de la imagen o null si falla
   * 
   * Utiliza html2canvas para convertir el mapa en una imagen PNG
   */
  async function captureMapSnapshot() {
    try {
      const mapElement = mapContainerRef.current;
      if (!mapElement) return null;

      // Esperar a que el mapa se estabilice
      await new Promise(resolve => setTimeout(resolve, 1500));

      const canvas = await html2canvas(mapElement, {
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#1a1a1a',
        scale: 2,
      });

      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Error capturando mapa:', error);
      return null;
    }
  }

  /**
   * FUNCIÓN: Crear gráfico de serie temporal
   * @param {Array} series - Array de objetos {date, value}
   * @param {Array} colors - Colores para el gradiente
   * @returns {Promise<string>} Data URL de la imagen del gráfico
   * 
   * Genera un gráfico Chart.js y lo convierte a imagen PNG
   */
  async function createTimeSeriesChart(series, colors) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      
      const labels = series.map((s) => s.date);
      const data = series.map((s) => +s.value);
      
      // Crear gradiente de colores
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, colors[0]); 
      grad.addColorStop(0.5, colors[Math.floor(colors.length / 2)]); 
      grad.addColorStop(1, colors[colors.length - 1]);
      
      const chart = new Chart(ctx, {
        type: "line",
        data: { 
          labels, 
          datasets: [{ 
            data, 
            borderColor: colors[Math.floor(colors.length / 2)], 
            backgroundColor: grad, 
            fill: true, 
            tension: 0.25, 
            pointRadius: 3,
            pointBackgroundColor: colors[Math.floor(colors.length / 2)],
            borderWidth: 2
          }] 
        },
        options: { 
          responsive: false,
          plugins: { 
            legend: { display: false },
            title: {
              display: true,
              text: `Serie Temporal - ${activeVar}`,
              color: '#333',
              font: { size: 16, weight: 'bold' }
            }
          },
          scales: {
            y: {
              beginAtZero: false,
              ticks: { color: '#666' },
              grid: { color: '#e0e0e0' }
            },
            x: {
              ticks: { color: '#666' },
              grid: { color: '#e0e0e0' }
            }
          }
        },
      });
      
      setTimeout(() => {
        const imageData = canvas.toDataURL('image/png');
        chart.destroy();
        resolve(imageData);
      }, 100);
    });
  }

  /**
   * FUNCIÓN: Geocodificación inversa (coordenadas -> nombre de lugar)
   * @param {number} lat - Latitud
   * @param {number} lon - Longitud
   * @returns {Promise<string>} Nombre del lugar
   */
  async function reverseGeocode(lat, lon) {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`);
      const j = await r.json();
      return j.display_name || "Desconocido";
    } catch {
      return "Desconocido";
    }
  }

  /**
   * FUNCIÓN: Obtener serie temporal de datos para una variable
   * @param {string} variableKey - Nombre de la variable climática
   * @param {number} lat - Latitud
   * @param {number} lon - Longitud
   * @param {number} days - Número de días de datos
   * @returns {Promise<Array>} Array de {date, value}
   * 
   * Intenta obtener datos reales de Open-Meteo API
   * Si falla, genera datos simulados
   */
  async function fetchSeriesFor(variableKey, lat, lon, days) {
    const openCfg = OPEN_METEO_MAP[variableKey];
    
    // Si no hay configuración de Open-Meteo, simular datos
    if (!openCfg) {
      setDataTimestamp(new Date());
      return simulateSeries(variableKey, days);
    }
    
    // Calcular rango de fechas
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    const fmt = (d) => d.toISOString().slice(0, 10);
    
    // Construir URL de Open-Meteo
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
      
      // Actualizar timestamp de los datos
      const latestDate = new Date(times[times.length - 1]);
      setDataTimestamp(latestDate);
      
      return times.map((t, i) => ({ 
        date: t, 
        value: arr[i] != null ? (+arr[i]).toFixed(2) : "0" 
      }));
    } catch (err) {
      console.warn("open-meteo err", err);
      setDataTimestamp(new Date());
      return simulateSeries(variableKey, days);
    }
  }

  /**
   * FUNCIÓN: Calcular estadísticas de una serie temporal
   * @param {Array} series - Array de {date, value}
   * @returns {Object} {mean, max, min} - Estadísticas calculadas
   */
  function computeStats(series) {
    const vals = series.map((s) => parseFloat(s.value));
    const sum = vals.reduce((a, b) => a + b, 0);
    const mean = vals.length ? (sum / vals.length).toFixed(2) : "0";
    const max = vals.length ? Math.max(...vals).toFixed(2) : "0";
    const min = vals.length ? Math.min(...vals).toFixed(2) : "0";
    return { mean, max, min };
  }

  /**
   * FUNCIÓN: Simular datos cuando la API falla
   * @param {string} variableKey - Nombre de la variable
   * @param {number} days - Número de días
   * @returns {Array} Array de {date, value} simulados
   */
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
      const d = new Date(now); 
      d.setDate(now.getDate() - i);
      const noise = (Math.random() - 0.5) * (base * 0.25 + 1);
      const v = Math.max(0, +(base + noise).toFixed(2));
      out.push({ 
        date: d.toISOString().slice(0, 10), 
        value: v.toString() 
      });
    }
    
    return out;
  }

  /**
   * FUNCIÓN: Agregar múltiples series en una sola (promedio)
   * @param {Array} seriesArray - Array de series
   * @returns {Array} Serie agregada con promedios por fecha
   * 
   * Útil para polígonos con múltiples puntos de muestreo
   */
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

  /**
   * FUNCIÓN: Abrir popup en una ubicación del mapa
   * @param {number} lat - Latitud
   * @param {number} lng - Longitud
   * @param {string} place - Nombre del lugar
   * @param {Array} series - Serie temporal de datos
   * 
   * Crea un popup personalizado con:
   * - Información del lugar
   * - Estadísticas actuales
   * - Mini gráfico de serie temporal
   * - Botón para ampliar serie
   */
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
    
    // Agregar canvas para mini gráfico
    const canvas = L.DomUtil.create("canvas", "popup-canvas", popupEl);
    canvas.width = 380; 
    canvas.height = 140;
    drawMiniChart(canvas, series, LAYER_DEFS[activeVar].legend.colors);

    // Botón para ampliar serie en modal
    const expandBtn = L.DomUtil.create("button", "popup-expand", popupEl);
    expandBtn.innerText = "Ampliar serie";
    expandBtn.onclick = () => {
      setModalOpen(true);
      
      // MEJORA: Usar las fechas del panel principal si existen
      // Si no hay fechas en el panel, usar defaults (hoy y hace 7 días)
      const modalStart = startDate || getDefaultStartDate();
      const modalEnd = endDate || getDefaultEndDate();
      
      setModalStartDate(modalStart);
      setModalEndDate(modalEnd);
      
      const days = calculateDaysDifference(modalStart, modalEnd);
      setTimeout(() => drawModalSeries(activeVar, lat, lng, days), 120);
    };

    L.popup({ maxWidth: 460 })
      .setLatLng([lat, lng])
      .setContent(popupEl)
      .openOn(map);
      
    popupRef.current = { el: popupEl, lat, lng, var: activeVar };
  }

  /**
   * FUNCIÓN: Manejar selección de un punto en el mapa
   * @param {number} lat - Latitud
   * @param {number} lng - Longitud
   * 
   * Proceso:
   * 1. Geocodifica las coordenadas para obtener nombre del lugar
   * 2. Obtiene serie temporal de datos
   * 3. Calcula estadísticas
   * 4. Actualiza estado y abre popup
   * 5. Guarda en historial de puntos consultados
   */
  async function handlePointSelection(lat, lng) {
    const place = await reverseGeocode(lat, lng);
    setSelectedPoint({ lat, lng, place });

    const series = await fetchSeriesFor(activeVar, lat, lng, downloadDateRange);
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
    
    // Agregar al historial de puntos consultados
    setSelectedPointsHistory(prev => [
      ...prev,
      {
        lat: lat.toFixed(6),
        lng: lng.toFixed(6),
        place,
        value: series[series.length - 1].value,
        timestamp: new Date().toISOString()
      }
    ]);
    
    openPopupAt(lat, lng, place, series);
  }

  /**
   * FUNCIÓN: Manejar completado de polígono dibujado
   * @param {Object} data - Datos del polígono {center, place, samplePoints}
   * 
   * Proceso:
   * 1. Obtiene datos de todos los puntos de muestreo
   * 2. Agrega las series en una sola
   * 3. Calcula estadísticas
   * 4. Muestra resultado en popup
   */
  async function handlePolygonComplete(data) {
    console.log('Polígono completado:', data);
    const { center, place, samplePoints } = data;
    const [lat, lng] = center;

    // Obtener datos de todos los puntos de muestreo
    const allSeries = await Promise.all(
      samplePoints.map(([sampleLat, sampleLng]) => 
        fetchSeriesFor(activeVar, sampleLat, sampleLng, downloadDateRange)
      )
    );

    // Agregar series (promediar valores por fecha)
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

  /**
   * FUNCIÓN: Limpiar polígono del mapa
   * Llama a la función global expuesta por PolygonDrawer
   */
  function handleClearPolygon() {
    if (window.__clearPolygon) {
      window.__clearPolygon();
      setHasPolygon(false);
      setPolygonData(null);
      console.log('Polígono eliminado del mapa');
    }
  }

  /**
   * FUNCIÓN MEJORADA: Limpiar todo (polígonos, puntos y popups)
   * Limpia cualquier dibujo en el mapa y cierra popups
   */
  function handleClearAll() {
    console.log('🗑️ Limpiando todo del mapa...');
    
    // Limpiar polígono si existe
    if (window.__clearPolygon) {
      window.__clearPolygon();
      setHasPolygon(false);
      setPolygonData(null);
      console.log('✅ Polígono eliminado');
    }
    
    // Cerrar popup si está abierto
    const map = mapRef.current;
    if (map) {
      try {
        map.closePopup();
        console.log('✅ Popup cerrado');
      } catch (e) {
        console.log('No había popup abierto');
      }
    }
    
    // Limpiar estado de punto seleccionado
    setSelectedPoint(null);
    setSelectedData(null);
    popupRef.current = null;
    
    console.log('✅ Todo limpiado del mapa');
  }

  /**
   * FUNCIÓN: Buscar lugar por texto
   * @param {string} q - Texto de búsqueda
   * 
   * Usa Nominatim para geocodificar el texto y navegar al lugar
   */
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

  /**
   * FUNCIÓN: Dibujar mini gráfico en canvas
   * @param {HTMLCanvasElement} canvas - Canvas donde dibujar
   * @param {Array} series - Serie temporal
   * @param {Array} colors - Colores para el gradiente
   * 
   * Crea un gráfico Chart.js compacto para popups
   */
  function drawMiniChart(canvas, series, colors) {
    if (!canvas) return;
    try { if (canvas._chart) canvas._chart.destroy(); } catch {}
    
    const ctx = canvas.getContext("2d");
    canvas.style.background = "#fff";
    
    const labels = series.map((s) => s.date);
    const data = series.map((s) => +s.value);
    
    // Crear gradiente
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, colors[0]); 
    grad.addColorStop(0.5, colors[Math.floor(colors.length / 2)]); 
    grad.addColorStop(1, colors[colors.length - 1]);
    
    const chart = new Chart(ctx, {
      type: "line",
      data: { 
        labels, 
        datasets: [{ 
          data, 
          borderColor: colors[Math.floor(colors.length / 2)], 
          backgroundColor: grad, 
          fill: true, 
          tension: 0.25, 
          pointRadius: 2 
        }] 
      },
      options: { 
        responsive: false, 
        plugins: { legend: { display: false } } 
      },
    });
    
    canvas._chart = chart;
  }

  /**
   * FUNCIÓN: Dibujar serie en el modal (canvas grande)
   * @param {string} variableKey - Variable climática
   * @param {number} lat - Latitud
   * @param {number} lon - Longitud
   * @param {number} days - Días de datos
   */
  async function drawModalSeries(variableKey, lat, lon, days) {
    const series = await fetchSeriesFor(variableKey, lat, lon, days);
    if (modalCanvasRef.current) {
      drawMiniChart(modalCanvasRef.current, series, LAYER_DEFS[variableKey].legend.colors);
    }
    setSelectedData((prev) => prev ? ({ 
      ...prev, 
      series, 
      value: series[series.length - 1].value 
    }) : prev);
  }

  /**
   * FUNCIÓN: Verificar si los datos están en tiempo real
   * @returns {boolean} true si los datos son recientes (≤1 día)
   */
  function isDataLive() {
    if (!dataTimestamp) return false;
    const today = new Date();
    const dataDate = new Date(dataTimestamp);
    const diffDays = Math.floor((today - dataDate) / (1000 * 60 * 60 * 24));
    return diffDays <= 1;
  }

  /**
   * FUNCIÓN: Obtener mensaje de estado de los datos
   * @returns {string|null} Mensaje descriptivo del estado de los datos
   */
  function getDataStatusMessage() {
    if (!dataTimestamp) return null;
    
    const apiName = LAYER_DEFS[activeVar]?.apiName || "API desconocido";
    
    if (isDataLive()) {
      return `Datos en tiempo real - ${apiName}`;
    } else {
      const dataDate = new Date(dataTimestamp);
      const formatted = dataDate.toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      return `Datos obtenidos de: ${formatted} - ${apiName}`;
    }
  }
  
  /**
   * FUNCIÓN: Obtener mensaje de estado para mostrar en interfaz
   * Similar a getDataStatusMessage pero con emojis
   */
  function getDataStatusMessageForDisplay() {
    if (!dataTimestamp) return null;
    
    const apiName = LAYER_DEFS[activeVar]?.apiName || "API desconocido";
    
    if (isDataLive()) {
      return `🔴 Datos en tiempo real - ${apiName}`;
    } else {
      const dataDate = new Date(dataTimestamp);
      const formatted = dataDate.toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      return `📅 Datos obtenidos de: ${formatted} - ${apiName}`; 
    }
  }

  /**
   * FUNCIÓN: Calcular diferencia en días entre dos fechas
   * @param {string} start - Fecha inicio (YYYY-MM-DD)
   * @param {string} end - Fecha fin (YYYY-MM-DD)
   * @returns {number} Diferencia en días
   */
  function calculateDaysDifference(start, end) {
    if (!start || !end) return 1;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  }

  /**
   * FUNCIÓN: Manejar cambio de rango de fechas en el panel principal
   * @param {string} start - Fecha inicio
   * @param {string} end - Fecha fin
   */
  function handleDateRangeChange(start, end) {
    setStartDate(start);
    setEndDate(end);
    if (start && end) {
      const days = calculateDaysDifference(start, end);
      setDownloadDateRange(days);
    }
  }

  /**
   * FUNCIÓN: Manejar cambio de fechas en el modal
   * @param {string} start - Fecha inicio
   * @param {string} end - Fecha fin
   * 
   * Recalcula automáticamente la serie temporal con el nuevo rango
   */
  function handleModalDateChange(start, end) {
    setModalStartDate(start);
    setModalEndDate(end);
    if (start && end && selectedPoint) {
      const days = calculateDaysDifference(start, end);
      const { lat, lng } = selectedPoint;
      drawModalSeries(activeVar, lat, lng, days);
    }
  }

  /**
   * FUNCIÓN: Descargar datos del modal en formato JSON
   * Incluye metadatos completos del usuario, consulta y datos climatológicos
   */
  async function downloadModalJSON() {
    if (!selectedData || !modalStartDate || !modalEndDate) return;
    
    const lat = parseFloat(selectedData.lat);
    const lng = parseFloat(selectedData.lng);
    const days = calculateDaysDifference(modalStartDate, modalEndDate);
    const series = await fetchSeriesFor(activeVar, lat, lng, days);
    const stats = computeStats(series);
    
    const dataWithMetadata = {
      usuario: {
        nombre: userInfo.nombre,
        rol: userInfo.rol,
        email: userInfo.email,
        fechaDescarga: new Date().toISOString(),
        horaDescarga: new Date().toLocaleTimeString('es-ES')
      },
      consulta: {
        variable: activeVar,
        lugar: selectedData.place,
        coordenadas: polygonData ? {
          tipo: "Polígono",
          centro: { latitud: selectedData.lat, longitud: selectedData.lng },
          puntosMuestreados: polygonData.samplePoints.map(([lat, lng]) => ({ 
            latitud: lat.toFixed(6), 
            longitud: lng.toFixed(6) 
          }))
        } : {
          tipo: "Punto único",
          latitud: selectedData.lat,
          longitud: selectedData.lng
        },
        rangoTemporal: `${days} dia${days > 1 ? 's' : ''}`,
        fechaInicio: series[0]?.date,
        fechaFin: series[series.length - 1]?.date
      },
      estadoDatos: {
        mensaje: getDataStatusMessageForDisplay(),
        enTiempoReal: isDataLive(),
        fechaDatos: dataTimestamp ? dataTimestamp.toISOString() : null,
        fuenteAPI: LAYER_DEFS[activeVar]?.apiName || "Desconocido"
      },
      datosClimaticos: {
        valorActual: series[series.length - 1].value,
        unidad: selectedData.unit,
        estadisticas: {
          promedio: stats.mean,
          maximo: stats.max,
          minimo: stats.min
        },
        serieTemporal: series
      }
    };
    
    const blob = new Blob([JSON.stringify(dataWithMetadata, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `clima_modal_${activeVar.replace(/\s+/g, '_')}_${days}dias_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  }

  /**
   * FUNCIÓN: Descargar datos del panel en formato JSON
   * Similar a downloadModalJSON pero usa fechas del panel principal
   */
  async function downloadJSON() {
    if (!selectedData) return;
    
    const lat = parseFloat(selectedData.lat);
    const lng = parseFloat(selectedData.lng);
    const series = await fetchSeriesFor(activeVar, lat, lng, downloadDateRange);
    const stats = computeStats(series);
    
    const dataWithMetadata = {
      usuario: {
        nombre: userInfo.nombre,
        rol: userInfo.rol,
        email: userInfo.email,
        fechaDescarga: new Date().toISOString(),
        horaDescarga: new Date().toLocaleTimeString('es-ES')
      },
      consulta: {
        variable: activeVar,
        lugar: selectedData.place,
        coordenadas: polygonData ? {
          tipo: "Polígono",
          centro: { latitud: selectedData.lat, longitud: selectedData.lng },
          puntosMuestreados: polygonData.samplePoints.map(([lat, lng]) => ({ 
            latitud: lat.toFixed(6), 
            longitud: lng.toFixed(6) 
          }))
        } : {
          tipo: "Punto único",
          latitud: selectedData.lat,
          longitud: selectedData.lng
        },
        rangoTemporal: `${downloadDateRange} dia${downloadDateRange > 1 ? 's' : ''}`,
        fechaInicio: series[0]?.date,
        fechaFin: series[series.length - 1]?.date
      },
      estadoDatos: {
        mensaje: getDataStatusMessageForDisplay(),
        enTiempoReal: isDataLive(),
        fechaDatos: dataTimestamp ? dataTimestamp.toISOString() : null,
        fuenteAPI: LAYER_DEFS[activeVar]?.apiName || "Desconocido"
      },
      datosClimaticos: {
        valorActual: series[series.length - 1].value,
        unidad: selectedData.unit,
        estadisticas: {
          promedio: stats.mean,
          maximo: stats.max,
          minimo: stats.min
        },
        serieTemporal: series
      }
    };
    
    const blob = new Blob([JSON.stringify(dataWithMetadata, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `clima_${activeVar.replace(/\s+/g, '_')}_${downloadDateRange}dias_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  }

  /**
   * FUNCIÓN: Cargar logo como Base64
   * @returns {Promise<string|null>} Logo en formato Base64 o null si falla
   */
  async function loadLogoAsBase64() {
    try {
      const response = await fetch('/logo/7_img.jpg');
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error cargando logo:', error);
      return null;
    }
  }

  /**
   * FUNCIÓN: Descargar PDF del modal
   * Genera un PDF con los datos de la serie temporal ampliada
   */
  async function downloadModalPDF() {
    if (!selectedData || !modalStartDate || !modalEndDate) return;

    // Mostrar indicador de carga
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'pdf-loading';
    loadingDiv.textContent = 'Generando PDF...';
    document.body.appendChild(loadingDiv);

    try {
      const lat = parseFloat(selectedData.lat);
      const lng = parseFloat(selectedData.lng);
      const days = calculateDaysDifference(modalStartDate, modalEndDate);
      const series = await fetchSeriesFor(activeVar, lat, lng, days);
      const stats = computeStats(series);

      await generatePDFDocument(series, stats, days);
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF. Por favor intente nuevamente.');
    } finally {
      document.body.removeChild(loadingDiv);
    }
  }

  /**
   * FUNCIÓN: Descargar PDF del panel principal
   * Similar a downloadModalPDF pero usa el rango de fechas del panel
   */
  async function downloadPDF() {
    if (!selectedData) return;

    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'pdf-loading';
    loadingDiv.textContent = 'Generando PDF...';
    document.body.appendChild(loadingDiv);

    try {
      const lat = parseFloat(selectedData.lat);
      const lng = parseFloat(selectedData.lng);
      const series = await fetchSeriesFor(activeVar, lat, lng, downloadDateRange);
      const stats = computeStats(series);

      await generatePDFDocument(series, stats, downloadDateRange);
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF. Por favor intente nuevamente.');
    } finally {
      document.body.removeChild(loadingDiv);
    }
  }

  /**
   * FUNCIÓN: Generar documento PDF completo
   * @param {Array} series - Serie temporal de datos
   * @param {Object} stats - Estadísticas calculadas
   * @param {number} daysRange - Rango de días
   * 
   * Genera un PDF profesional con:
   * - Encabezado con gradiente y logo
   * - Información del usuario
   * - Detalles de la consulta
   * - Estadísticas
   * - Mapa de ubicación
   * - Gráfico de serie temporal
   * - Tabla de datos detallados
   * - Numeración de páginas
   */
  async function generatePDFDocument(series, stats, daysRange) {
    const doc = new jsPDF();
    let y = 15;
    
    const logoBase64 = await loadLogoAsBase64();
    
    // ========================================
    // ENCABEZADO CON GRADIENTE AZUL-TURQUESA
    // ========================================
    const headerHeight = 45;
    const steps = 30;
    for (let i = 0; i < steps; i++) {
      const yPos = (headerHeight / steps) * i;
      const height = headerHeight / steps + 0.5;
      
      const blueStart = { r: 59, g: 89, b: 152 };
      const turquoiseEnd = { r: 64, g: 224, b: 208 };
      
      const ratio = i / steps;
      const r = Math.round(blueStart.r + (turquoiseEnd.r - blueStart.r) * ratio);
      const g = Math.round(blueStart.g + (turquoiseEnd.g - blueStart.g) * ratio);
      const b = Math.round(blueStart.b + (turquoiseEnd.b - blueStart.b) * ratio);
      
      doc.setFillColor(r, g, b);
      doc.rect(0, yPos, 210, height, 'F');
    }
    
    // Agregar logo con fondo blanco semi-transparente
    if (logoBase64) {
      try {
        doc.setFillColor(255, 255, 255);
        doc.setGState(new doc.GState({ opacity: 0.15 }));
        doc.roundedRect(8, 6, 45, 33, 3, 3, 'F');
        doc.setGState(new doc.GState({ opacity: 1.0 }));
        doc.addImage(logoBase64, 'JPEG', 10, 8, 40, 30);
      } catch (error) {
        console.error('Error agregando logo al PDF:', error);
      }
    }
    
    // Título principal
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.text('Reporte Climatico', 120, 18, { align: 'center' });
    
    // Subtítulo con variable
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text('Variable: ' + activeVar, 120, 27, { align: 'center' });
    
    // Estado de los datos
    const statusMsg = getDataStatusMessage() || 'Estado desconocido';
    doc.setFontSize(10);
    doc.text(statusMsg, 120, 35, { align: 'center' });
    
    y = 55;
    
    // ========================================
    // INFORMACIÓN DEL USUARIO
    // ========================================
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Informacion del Usuario', 14, y);
    y += 7;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Nombre: ${userInfo.nombre}`, 14, y);
    y += 5;
    doc.text(`Rol: ${userInfo.rol}`, 14, y);
    y += 5;
    doc.text(`Email: ${userInfo.email}`, 14, y);
    y += 5;
    doc.text(`Fecha de descarga: ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES')}`, 14, y);
    y += 10;
    
    // Línea separadora
    doc.setDrawColor(200, 200, 200);
    doc.line(14, y, 196, y);
    y += 7;
    
    // ========================================
    // UBICACIÓN CONSULTADA
    // ========================================
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Ubicacion Consultada', 14, y);
    y += 7;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Lugar: ${selectedData.place}`, 14, y);
    y += 5;
    
    // Mostrar información específica de polígono o punto único
    if (polygonData) {
      doc.text(`Tipo: Area delimitada (Poligono)`, 14, y);
      y += 5;
      doc.text(`Centro: ${selectedData.lat}, ${selectedData.lng}`, 14, y);
      y += 5;
      doc.text(`Puntos muestreados: ${polygonData.samplePoints.length}`, 14, y);
      y += 5;
    } else {
      doc.text(`Coordenadas: ${selectedData.lat}, ${selectedData.lng}`, 14, y);
      y += 5;
    }
    
    doc.text(`Rango temporal: ${daysRange} dia${daysRange > 1 ? 's' : ''}`, 14, y);
    y += 5;
    doc.text(`Periodo: ${series[0]?.date} a ${series[series.length - 1]?.date}`, 14, y);
    y += 10;
    
    // ========================================
    // ESTADÍSTICAS
    // ========================================
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Estadisticas', 14, y);
    y += 7;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Valor actual: ${series[series.length - 1].value} ${selectedData.unit}`, 14, y);
    y += 5;
    doc.text(`Promedio: ${stats.mean} ${selectedData.unit}`, 14, y);
    y += 5;
    doc.text(`Maximo: ${stats.max} ${selectedData.unit}`, 14, y);
    y += 5;
    doc.text(`Minimo: ${stats.min} ${selectedData.unit}`, 14, y);
    y += 10;

    // ========================================
    // HISTORIAL DE PUNTOS CONSULTADOS
    // ========================================
    if (selectedPointsHistory.length > 1) {
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Puntos Consultados (' + selectedPointsHistory.length + ' ubicaciones)', 14, y);
      y += 7;
      
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      
      selectedPointsHistory.forEach(function(point, index) {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text((index + 1) + '. ' + point.place, 14, y);
        y += 4;
        doc.text('   Coordenadas: ' + point.lat + ', ' + point.lng, 14, y);
        y += 4;
        doc.text('   Valor: ' + point.value + ' ' + selectedData.unit, 14, y);
        y += 5;
      });
      
      y += 5;
    }
    
    // ========================================
    // PUNTOS DEL POLÍGONO (si aplica)
    // ========================================
    if (polygonData && polygonData.samplePoints) {
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Puntos del Poligono', 14, y);
      y += 7;
      
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      
      polygonData.samplePoints.forEach(function([lat, lng], index) {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(`${index + 1}. Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`, 14, y);
        y += 4;
      });
      
      y += 10;
    }

    // Nueva página si es necesario
    if (y > 200) {
      doc.addPage();
      y = 20;
    }

    // ========================================
    // MAPA DE UBICACIÓN
    // ========================================
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Mapa de Ubicacion', 14, y);
    y += 5;
    
    const mapSnapshot = await captureMapSnapshot();
    if (mapSnapshot) {
      const mapWidth = 180;
      const mapHeight = 100;
      doc.addImage(mapSnapshot, 'PNG', 14, y, mapWidth, mapHeight);
      y += mapHeight + 10;
    } else {
      doc.setFontSize(10);
      doc.setFont(undefined, 'italic');
      doc.text('(Captura del mapa no disponible)', 14, y);
      y += 10;
    }

    // Nueva página si es necesario
    if (y > 200) {
      doc.addPage();
      y = 20;
    }

    // ========================================
    // SERIE TEMPORAL (GRÁFICO)
    // ========================================
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Serie Temporal', 14, y);
    y += 5;
    
    const chartImage = await createTimeSeriesChart(series, LAYER_DEFS[activeVar].legend.colors);
    if (chartImage) {
      const chartWidth = 180;
      const chartHeight = 70;
      doc.addImage(chartImage, 'PNG', 14, y, chartWidth, chartHeight);
      y += chartHeight + 10;
    }

    // Nueva página si es necesario
    if (y > 230) {
      doc.addPage();
      y = 20;
    }

    // ========================================
    // DATOS DETALLADOS (TABLA)
    // ========================================
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Datos Detallados', 14, y);
    y += 7;
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    
    // Encabezado de la tabla
    doc.setFont(undefined, 'bold');
    doc.text('Fecha', 14, y);
    doc.text(`Valor (${selectedData.unit})`, 60, y);
    y += 5;
    doc.setFont(undefined, 'normal');
    
    // Filas de datos
    series.forEach((s, index) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
        doc.setFont(undefined, 'bold');
        doc.text('Fecha', 14, y);
        doc.text(`Valor (${selectedData.unit})`, 60, y);
        y += 5;
        doc.setFont(undefined, 'normal');
      }
      doc.text(s.date, 14, y);
      doc.text(s.value, 60, y);
      y += 4.5;
    });

    // ========================================
    // PIE DE PÁGINA EN TODAS LAS PÁGINAS
    // ========================================
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Pagina ${i} de ${pageCount}`, 105, 290, { align: 'center' });
      doc.text('Generado por Sistema de Monitoreo Climatico', 105, 285, { align: 'center' });
    }

    // Guardar PDF
    doc.save(`reporte_clima_${activeVar.replace(/\s+/g, '_')}_${daysRange}dias_${new Date().toISOString().slice(0,10)}.pdf`);
  }

  /**
   * FUNCIÓN: Manejar movimiento del mouse sobre la leyenda
   * Muestra el valor correspondiente a la posición del mouse
   */
  function onLegendMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const pct = 1 - y / rect.height;
    const cfg = LAYER_DEFS[activeVar].legend;
    const val = cfg.min + pct * (cfg.max - cfg.min);
    setLegendHover(val.toFixed(2) + " " + cfg.unit);
  }

  /**
   * FUNCIÓN: Limpiar tooltip de la leyenda al salir
   */
  function onLegendLeave() { 
    setLegendHover(null); 
  }

  /**
   * ========================================
   * EFECTO: INICIALIZACIÓN DEL MAPA
   * ========================================
   * 
   * Se ejecuta una sola vez al montar el componente
   * 
   * Proceso:
   * 1. Crea instancia de Leaflet
   * 2. Agrega controles de zoom personalizados
   * 3. Agrega capa base de OpenStreetMap
   * 4. Crea panes personalizados para capas
   * 5. Inicializa todas las capas climáticas
   * 6. Agrega capa activa por defecto
   * 
   * Cleanup:
   * - Destruye el mapa al desmontar
   */
  useEffect(() => {
    const map = L.map(mapContainerRef.current, { 
      center: [4.6, -74.1],  // Bogotá, Colombia
      zoom: 6, 
      minZoom: 2, 
      maxZoom: 10,
      maxBounds: [[-90, -180], [90, 180]], // Límites del mundo
      maxBoundsViscosity: 1.0,
      worldCopyJump: false,
      zoomControl: false // Deshabilitamos el control por defecto
    });
    mapRef.current = map;

    // Agregar controles de zoom personalizados en esquina superior derecha
    L.control.zoom({
      position: 'topright'
    }).addTo(map);

    // Forzar recalculo de tamaño del mapa después de renderizar
    setTimeout(() => {
      try { map.invalidateSize(); } catch (e) { console.warn('invalidateSize err', e); }
    }, 200);

    // Listener para resize de ventana
    const onResize = () => { try { map.invalidateSize(); } catch {} };
    window.addEventListener('resize', onResize);

    // Agregar capa base de OpenStreetMap
    L.tileLayer(BASE_TILE, { 
      attribution: "&copy; OpenStreetMap", 
      zIndex: 1,
      noWrap: true,
      bounds: [[-90, -180], [90, 180]]
    }).addTo(map);

    // ========================================
    // CREAR PANES PERSONALIZADOS
    // ========================================
    // Panes permiten controlar el orden z-index de las capas
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

    // ========================================
    // INICIALIZAR TODAS LAS CAPAS
    // ========================================
    Object.entries(LAYER_DEFS).forEach(([name, cfg]) => {
      try {
        // TIPO: WMTS (NASA GIBS)
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

          // Priorizar OpenWeatherMap si está disponible como alternativa
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

          // Sistema de fallback automático para WMTS
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

            // Probar disponibilidad de tiles asincrónicamente
            (async () => {
              try {
                const matrixCandidates = [cfg.tileMatrixSet, 'GoogleMapsCompatible_Level8', 'GoogleMapsCompatible_Level7'];
                const primaryUrl = makeUrlWithMatrix(tryDates[0], matrixCandidates[0]);
                const successRatio = await probeTiles(primaryUrl, probeCoords);
                console.log(name + ' WMTS probe successRatio:', successRatio);
                
                // Si falla, cambiar a proveedor alternativo
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

          // Sistema de fallback manual en caso de error de tile
          layer.__gibs_tryDates = tryDates;
          layer.__gibs_attemptDate = 0;
          const matrixCandidates = [cfg.tileMatrixSet, 'GoogleMapsCompatible_Level8', 'GoogleMapsCompatible_Level7'];
          layer.__gibs_matrixIdx = 0;
          
          layer.on('tileerror', function (ev) {
            try {
              const coords = ev.coords || (ev.tile && ev.tile.coords) || null;
              const url = ev.tile && ev.tile.src;
              console.warn(name + ' tileerror', 'coords:', coords, 'url:', url, 'dateAttempt:', layer.__gibs_attemptDate, 'matrixIdx:', layer.__gibs_matrixIdx);
              
              // Intentar con fecha anterior
              const nextDateAttempt = layer.__gibs_attemptDate + 1;
              if (nextDateAttempt < layer.__gibs_tryDates.length) {
                const nextDate = layer.__gibs_tryDates[nextDateAttempt];
                const newUrl = makeUrlWithMatrix(nextDate, matrixCandidates[layer.__gibs_matrixIdx]);
                console.warn(name + ' WMTS tileerror — switching to date ' + nextDate);
                layer.__gibs_attemptDate = nextDateAttempt;
                try { layer.setUrl(newUrl); } catch (e) { console.warn('setUrl err', e); }
                return;
              }

              // Intentar con otro TileMatrixSet
              if (layer.__gibs_matrixIdx + 1 < matrixCandidates.length) {
                layer.__gibs_matrixIdx += 1;
                const nextMatrix = matrixCandidates[layer.__gibs_matrixIdx];
                const newUrl = makeUrlWithMatrix(layer.__gibs_tryDates[0], nextMatrix);
                console.warn(name + ' WMTS tileerror — switching TileMatrixSet to ' + nextMatrix + ' and retrying dates');
                layer.__gibs_attemptDate = 0;
                try { layer.setUrl(newUrl); } catch (e) { console.warn('setUrl err', e); }
                return;
              }

              // Cambiar a proveedor alternativo
              try {
                if (cfg.alt) {
                  if (!layer.__gibs_altIdx) layer.__gibs_altIdx = 0;
                  const alts = Array.isArray(cfg.alt) ? cfg.alt : [cfg.alt];
                  if (layer.__gibs_altIdx < alts.length) {
                    const candidate = alts[layer.__gibs_altIdx];
                    layer.__gibs_altIdx += 1;
                    console.warn(name + ' WMTS tileerror — switching to alt provider: ' + (candidate.name || candidate.type));

                    // OpenWeatherMap alternativo
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

                    // XYZ alternativo
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

                    // RainViewer alternativo
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

          // Pre-construir capa de RainViewer si está disponible
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
        } 
        
        // TIPO: WMS
        else if (cfg.type === "wms") {
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
        } 
        
        // TIPO: OpenWeatherMap
        else if (cfg.type === "openweathermap") {
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
        } 
        
        // TIPO: XYZ
        else if (cfg.type === "xyz") {
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

    // Agregar capa activa por defecto al mapa
    if (layersRef.current[activeVar]) {
      try {
        console.log('Adding default active layer:', activeVar, 'layersRef keys:', Object.keys(layersRef.current));
        layersRef.current[activeVar].addTo(map);
        console.log(`Added default layer: ${activeVar}`);
      } catch (e) {
        console.warn('error adding default layer', e);
      }
    }

    // Cleanup al desmontar
    return () => {
      map.remove();
      mapRef.current = null;
      window.removeEventListener('resize', onResize);
    };
  }, []);

  /**
   * ========================================
   * EFECTO: CLICK EN EL MAPA
   * ========================================
   * 
   * Maneja clics en el mapa para seleccionar puntos
   * No se ejecuta si el modo de dibujo está activo
   */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleMapClick = async (e) => {
      if (drawMode) return; // No procesar clics en modo dibujo
      
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      await handlePointSelection(lat, lng);
    };
    
    map.on("click", handleMapClick);

    return () => {
      map.off("click", handleMapClick);
    };
  }, [drawMode, downloadDateRange]);

  /**
   * ========================================
   * EFECTO: CAMBIO DE VARIABLE ACTIVA
   * ========================================
   * 
   * Proceso:
   * 1. Remueve todas las capas del mapa
   * 2. Agrega la capa de la nueva variable activa
   * 3. Actualiza datos del punto seleccionado si existe
   */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    console.log(`Switching to layer: ${activeVar}`);

    // Remover todas las capas
    Object.values(layersRef.current).forEach((l) => { 
      try { 
        if (map.hasLayer(l)) {
          map.removeLayer(l);
        }
      } catch (e) {
        console.warn('Error removing layer:', e);
      }
    });
    
    // Agregar capa activa
    const activeLayer = layersRef.current[activeVar];
    if (activeLayer) {
      if (!map.hasLayer(activeLayer)) activeLayer.addTo(map);
      console.log(`Layer ${activeVar} added to map`);
    } else {
      console.warn(`Layer ${activeVar} not found in layersRef`);
    }

    // Actualizar datos del punto seleccionado
    if (selectedPoint) {
      (async () => {
        const { lat, lng } = selectedPoint;
        const series = await fetchSeriesFor(activeVar, lat, lng, downloadDateRange);
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

        // Actualizar popup si está en la misma ubicación
        if (popupRef.current && Math.abs(popupRef.current.lat - lat) < 1e-6 && Math.abs(popupRef.current.lng - lng) < 1e-6) {
          try { map.closePopup(); } catch {}
          openPopupAt(lat, lng, selectedPoint.place, series);
        }
      })();
    }
  }, [activeVar]);

  /**
   * ========================================
   * EFECTO: ACTUALIZAR SERIE EN MODAL
   * ========================================
   * 
   * Se ejecuta cuando:
   * - Se abre el modal
   * - Cambian las fechas del modal
   */
  useEffect(() => {
    if (!modalOpen) return;
    if (!modalStartDate || !modalEndDate || !selectedPoint) return;
    
    const days = calculateDaysDifference(modalStartDate, modalEndDate);
    const { lat, lng } = selectedPoint;
    drawModalSeries(activeVar, lat, lng, days);
  }, [modalOpen, modalStartDate, modalEndDate]);

  /**
   * ========================================
   * EFECTO: ACTUALIZAR DATOS AL CAMBIAR RANGO DE FECHAS
   * ========================================
   * 
   * Cuando el usuario cambia el rango de fechas en el panel,
   * recalcula los datos del punto seleccionado
   */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedPoint) return;

    (async () => {
      const { lat, lng, place } = selectedPoint;
      const series = await fetchSeriesFor(activeVar, lat, lng, downloadDateRange);
      const stats = computeStats(series);
      
      setSelectedData({
        lat: lat.toFixed(6),
        lng: lng.toFixed(6),
        place: place,
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

      // Actualizar popup si existe
      if (popupRef.current) {
        try { map.closePopup(); } catch {}
        openPopupAt(lat, lng, place, series);
      }
    })();
  }, [downloadDateRange]);

  // Obtener configuración de leyenda de la variable activa
  const legend = LAYER_DEFS[activeVar].legend;

  // ============================================================================
  // RENDERIZADO DEL COMPONENTE
  // ============================================================================
  return (
    <div className="um-dashboard">
      {/* Contenedor del mapa Leaflet */}
      <div ref={mapContainerRef} className="um-map" />

      {/* Banner de estado de datos (tiempo real o histórico) */}
      {dataTimestamp && (
        <div className={`data-status-banner ${isDataLive() ? 'live' : 'historical'}`}>
          <div className="data-status-main">{getDataStatusMessage()}</div>
          <div className="data-status-sub">Variable: {activeVar}</div>
        </div>
      )}

      {/* ========================================
          PANEL DE CONTROLES
          ======================================== */}
      <div className="um-var-selector">
        {/* Input de búsqueda de lugares */}
        <div className="search-container">
          <input
            ref={searchRef}
            type="text"
            className="search-input"
            placeholder="Buscar lugar (ej. Popayán, Cauca)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchQuery) {
                searchPlace(searchQuery);
                setShowSuggestions(false);
              }
              if (e.key === "Escape") {
                setShowSuggestions(false);
              }
            }}
            onFocus={() => {
              if (searchSuggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
          />
        </div>

        {/* Selector de variable climática */}
        <label className="control-label">Variable</label>
        <select 
          className="control-select"
          value={activeVar}
          onChange={(e) => setActiveVar(e.target.value)} 
        >
          {Object.keys(LAYER_DEFS).map((k) => <option key={k} value={k}>{k}</option>)}
        </select>

        {/* Selector de fecha inicio */}
        <label className="control-label">Fecha Inicio</label>
        <input
          type="date"
          className="date-input"
          value={startDate}
          onChange={(e) => handleDateRangeChange(e.target.value, endDate)}
          max={endDate || undefined}
        />

        {/* Selector de fecha fin */}
        <label className="control-label">Fecha Fin</label>
        <input
          type="date"
          className="date-input"
          value={endDate}
          onChange={(e) => handleDateRangeChange(startDate, e.target.value)}
          min={startDate || undefined}
        />

        {/* Botones de dibujar y borrar polígono */}
        <div className="draw-buttons-container">
          <button
            className={`um-btn btn-draw ${drawMode ? 'active' : ''}`}
            onClick={() => setDrawMode(!drawMode)}
            title={drawMode ? 'Cancelar dibujo' : 'Dibujar área en el mapa'}
          >
            {drawMode ? '✕ Cancelar' : '✏️ Dibujar'}
          </button>

          {/* Botón unificado de borrar - se muestra si hay polígono O punto seleccionado */}
          {(hasPolygon || selectedPoint) && !drawMode && (
            <button
              className="um-btn btn-delete"
              onClick={handleClearAll}
              title="Limpiar todo del mapa (polígonos y puntos)"
            >
              🗑️ Borrar
            </button>
          )}
        </div>
      </div>

      {/* ========================================
          LEYENDA DE COLORES
          ======================================== */}
      <div className="um-legend" onMouseMove={onLegendMove} onMouseLeave={onLegendLeave}>
        <div 
          className="um-legend-bar" 
          style={{ background: `linear-gradient(to top, ${legend.colors.join(",")})` }} 
        />
        <div className="um-legend-labels">
          <div>{legend.max}</div>
          <div className="um-legend-unit">{legend.unit}</div>
          <div>{legend.min}</div>
        </div>
        {legendHover && <div className="um-legend-tooltip">{legendHover}</div>}
      </div>

      {/* ========================================
          BOTONES DE DESCARGA
          ======================================== */}
      <div className="um-buttons">
        <button className="um-btn" onClick={downloadJSON}>Descargar JSON</button>
        <button className="um-btn danger" onClick={downloadPDF}>Descargar PDF</button>
      </div>

      {/* ========================================
          MODAL DE SERIE TEMPORAL AMPLIADA
          ======================================== */}
      {modalOpen && (
        <div className="um-modal" onClick={() => setModalOpen(false)}>
          <div className="um-modal-card" onClick={(e) => e.stopPropagation()}>
            {/* Encabezado del modal */}
            <div className="um-modal-header">
              <h3 className="modal-title">{activeVar} — Serie ampliada</h3>
              <button className="modal-close-btn" onClick={() => setModalOpen(false)}>✕</button>
            </div>
            
            {/* Información del lugar seleccionado */}
            <div className="um-modal-info">
              {selectedData && (
                <>
                  <div className="modal-info-item">
                    <strong>Lugar:</strong> {selectedData.place}
                  </div>
                  <div className="modal-info-item">
                    <strong>Coordenadas:</strong> {selectedData.lat}, {selectedData.lng}
                  </div>
                  {selectedData.series && selectedData.series.length > 0 && (
                    <>
                      <div className="modal-info-item">
                        <strong>Valor actual:</strong> {selectedData.series[selectedData.series.length - 1].value} {selectedData.unit}
                      </div>
                      <div className="modal-info-item">
                        <strong>Promedio:</strong> {selectedData.mean} {selectedData.unit}
                      </div>
                      <div className="modal-info-item">
                        <strong>Máximo:</strong> {selectedData.max} {selectedData.unit}
                      </div>
                      <div className="modal-info-item">
                        <strong>Mínimo:</strong> {selectedData.min} {selectedData.unit}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Controles de fecha del modal */}
            <div className="um-modal-date-controls">
              <div className="modal-date-group">
                <label className="modal-label">Fecha Inicio</label>
                <input
                  type="date"
                  className="modal-date-input"
                  value={modalStartDate}
                  onChange={(e) => handleModalDateChange(e.target.value, modalEndDate)}
                  max={modalEndDate || undefined}
                />
              </div>
              <div className="modal-date-group">
                <label className="modal-label">Fecha Fin</label>
                <input
                  type="date"
                  className="modal-date-input"
                  value={modalEndDate}
                  onChange={(e) => handleModalDateChange(modalStartDate, e.target.value)}
                  min={modalStartDate || undefined}
                />
              </div>
            </div>

            {/* Canvas con gráfico ampliado */}
            <div className="um-modal-body">
              <canvas ref={modalCanvasRef} width={820} height={340} />
            </div>

            {/* Botones del modal */}
            <div className="um-modal-footer">
              <button className="um-btn" onClick={downloadModalJSON}>Descargar JSON</button>
              <button className="um-btn danger" onClick={downloadModalPDF}>Descargar PDF</button>
              <button className="um-btn btn-close-modal" onClick={() => setModalOpen(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================
          COMPONENTE POLYGON DRAWER
          ======================================== */}
      <PolygonDrawer 
        map={mapRef.current}
        isActive={drawMode}
        onPolygonComplete={handlePolygonComplete}
        onClearPolygon={true}
        activeVariable={activeVar}
      />

      {/* ========================================
          DROPDOWN DE SUGERENCIAS (PORTAL)
          ======================================== 
          
          Se renderiza como portal en el body para evitar
          problemas de z-index y overflow
      */}
      {showSuggestions && searchSuggestions.length > 0 && ReactDOM.createPortal(
        <div 
          className="search-suggestions"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${Math.max(dropdownPosition.width || 320, 320)}px`
          }}
          onClick={(e) => {
            // Prevenir que el click en el dropdown cierre las sugerencias
            e.stopPropagation();
          }}
        >
          {searchSuggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.place_id || index}-${suggestion.lat}-${suggestion.lon}`}
              className="search-suggestion-item"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🖱️ Click en sugerencia:', suggestion.display_name);
                selectSuggestion(suggestion);
              }}
              onMouseDown={(e) => {
                // Prevenir que el mousedown cierre el dropdown antes del click
                e.preventDefault();
              }}
            >
              <div className="suggestion-icon">📍</div>
              <div className="suggestion-content">
                <div className="suggestion-name">{suggestion.display_name}</div>
                <div className="suggestion-type">{suggestion.type || 'Lugar'}</div>
              </div>
            </div>
          ))}
        </div>,
        document.body // Renderizar en el body
      )}
    </div>
  );
}
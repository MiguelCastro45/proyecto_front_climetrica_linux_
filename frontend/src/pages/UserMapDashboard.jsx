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

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import ReactDOM from "react-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import terminator from 'leaflet-terminator';
import { Chart } from "chart.js/auto";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import domtoimage from "dom-to-image-more";
import { handleAPIError } from "../utils/errorHandler";
import API from "../api/api";
import "../styles/UserMapDashboard.css";
import PolygonDrawer from './PolygonDrawer';
import { saveClimateData } from '../api/Save_climate_data_helper';
import AnimatedLayerOverlay from '../components/AnimatedLayer';


// ============================================================================
// CONSTANTES GLOBALES
// ============================================================================

/**
 * MAPAS BASE DISPONIBLES
 * Diferentes proveedores de tiles para el mapa base
 */
const BASE_MAPS = {
  osm: {
    name: "OpenStreetMap",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19,
    description: "Mapa estándar colaborativo"
  },
  cartodb_voyager: {
    name: "Voyager",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap, &copy; CartoDB",
    maxZoom: 19,
    description: "Estilo equilibrado entre claro y detallado"
  },
  esri_world: {
    name: "Satélite ESRI",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
    maxZoom: 18,
    description: "Imágenes satelitales de alta resolución"
  }
};

// Mapa base por defecto
const DEFAULT_BASE_MAP = 'osm';

/**
 * CULTIVOS DISPONIBLES PARA ANÁLISIS
 * Definición de cultivos principales en Colombia con sus parámetros óptimos
 */
const CULTIVOS = {
  "Café": {
    nombre: "Café",
    temperaturaOptima: { min: 17, max: 23 },
    precipitacionOptima: { min: 1500, max: 2500 },
    altitudOptima: { min: 1200, max: 1800 },
    color: "#8B4513",
    icono: "☕",
    cicloSiembra: "Mar-Abr, Sep-Oct",
    cicloCosecha: "Oct-Ene, Abr-Jun"
  },
  "Maíz": {
    nombre: "Maíz",
    temperaturaOptima: { min: 18, max: 30 },
    precipitacionOptima: { min: 400, max: 800 },
    altitudOptima: { min: 0, max: 2600 },
    color: "#FFD700",
    icono: "🌽",
    cicloSiembra: "Feb-Mar, Ago-Sep",
    cicloCosecha: "Jun-Jul, Dic-Ene"
  },
  "Arroz": {
    nombre: "Arroz",
    temperaturaOptima: { min: 22, max: 32 },
    precipitacionOptima: { min: 1200, max: 2500 },
    altitudOptima: { min: 0, max: 1000 },
    color: "#F5DEB3",
    icono: "🌾",
    cicloSiembra: "Mar-Abr, Jul-Ago",
    cicloCosecha: "Jul-Ago, Nov-Dic"
  },
  "Papa": {
    nombre: "Papa",
    temperaturaOptima: { min: 10, max: 20 },
    precipitacionOptima: { min: 600, max: 1000 },
    altitudOptima: { min: 2000, max: 3500 },
    color: "#DEB887",
    icono: "🥔",
    cicloSiembra: "Feb-Mar, Ago-Sep",
    cicloCosecha: "Jun-Jul, Dic-Ene"
  },
  "Plátano": {
    nombre: "Plátano",
    temperaturaOptima: { min: 21, max: 29 },
    precipitacionOptima: { min: 1500, max: 3000 },
    altitudOptima: { min: 0, max: 1200 },
    color: "#FFE135",
    icono: "🍌",
    cicloSiembra: "Todo el año",
    cicloCosecha: "Todo el año (8-12 meses)"
  },
  "Cacao": {
    nombre: "Cacao",
    temperaturaOptima: { min: 23, max: 28 },
    precipitacionOptima: { min: 1500, max: 2500 },
    altitudOptima: { min: 0, max: 800 },
    color: "#7B3F00",
    icono: "🍫",
    cicloSiembra: "Abr-May",
    cicloCosecha: "Oct-Dic, Mar-Jun"
  },
  "Caña de Azúcar": {
    nombre: "Caña de Azúcar",
    temperaturaOptima: { min: 20, max: 30 },
    precipitacionOptima: { min: 1100, max: 1500 },
    altitudOptima: { min: 0, max: 1800 },
    color: "#90EE90",
    icono: "🎋",
    cicloSiembra: "Feb-Mar, Ago-Sep",
    cicloCosecha: "12-18 meses después"
  }
};

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
    legend: {
      min: -5,
      max: 40,
      unit: "°C",
      colors: ["#1e1b4b", "#312e81", "#4338ca", "#6366f1", "#818cf8", "#a5b4fc", "#fef08a", "#fde047", "#facc15", "#fb923c", "#f97316", "#dc2626", "#991b1b"]
    },
  },
  "Temperatura del mar": {
    type: "wmts",
    layer: "GHRSST_L4_MUR_Sea_Surface_Temperature",
    format: "png",
    tileMatrixSet: "GoogleMapsCompatible_Level7",
    maxNativeZoom: 7,
    opacity: 0.9,
    apiName: "NASA GIBS",
    legend: {
      min: 0,
      max: 35,
      unit: "°C",
      colors: ["#0c4a6e", "#075985", "#0369a1", "#0284c7", "#0ea5e9", "#22d3ee", "#67e8f9", "#a5f3fc", "#e0f2fe", "#fef3c7", "#fde047", "#facc15", "#fb923c"]
    },
  },
  "Corrientes Oceánicas (Color)": {
    type: "openweathermap",
    layer: "wind",
    opacity: 0.85,
    useLowResFallback: true,
    pane: 'currentsPane',
    maxNativeZoom: 10,
    apiName: "OpenWeatherMap",
    legend: {
      min: 0,
      max: 25,
      unit: "m/s",
      colors: ["#064e3b", "#065f46", "#047857", "#059669", "#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#d1fae5", "#fef3c7", "#fde047", "#fbbf24", "#fb923c"]
    },
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
    legend: {
      min: 0,
      max: 50,
      unit: "mm",
      colors: ["#1e1b4b", "#1e3a8a", "#1e40af", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe", "#e0f2fe", "#a7f3d0", "#fef3c7", "#fde047", "#fb923c", "#ef4444"]
    },
  },
  "Vientos (OWM)": {
    type: 'openweathermap',
    layer: 'wind_new',
    opacity: 1.0,
    useLowResFallback: false,
    apiName: "OpenWeatherMap",
    legend: {
      min: 0,
      max: 25,
      unit: 'm/s',
      colors: ["#064e3b", "#065f46", "#047857", "#059669", "#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#d1fae5", "#fef3c7", "#fde047", "#fbbf24", "#fb923c"]
    }
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

const ClimateDashboard = forwardRef(({ currentUser }, ref) => {
  // ========================================
  // REFERENCIAS (useRef)
  // Referencias a elementos DOM y objetos de Leaflet
  // ========================================
  const mapContainerRef = useRef(null);  // Contenedor del mapa
  const mapRef = useRef(null);            // Instancia de Leaflet
  const layersRef = useRef({});           // Capas climáticas
  const popupRef = useRef(null);          // Popup activo
  const searchRef = useRef(null);         // Input de búsqueda
  const popupCanvasRef = useRef(null);    // Canvas del panel lateral (popup inicial)
  const modalCanvasRef = useRef(null);    // Canvas del modal ampliado
  const timeSeriesChartRef = useRef(null); // Gráfico de series temporales
  const tooltipRef = useRef(null);        // Tooltip del mapa

  // ========================================
  // ESTADOS (useState)
  // Gestión del estado de la aplicación
  // ========================================
  
  // Variable climática activa (por defecto: Temperatura del mar)
  const [activeVar, setActiveVar] = useState("Temperatura del mar");
  const activeVarRef = useRef("Temperatura del mar");

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

  // Cargar capas desde el backend
  const [layerDefs, setLayerDefs] = useState(LAYER_DEFS);
  const [loadingLayers, setLoadingLayers] = useState(true);

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
  // DATOS PARA ANIMACIONES
  // ========================================
  const [mapBounds, setMapBounds] = useState(null);
  const [currentTileData, setCurrentTileData] = useState(null);

  // ========================================
  // MAPA BASE
  // ========================================
  const [selectedBaseMap, setSelectedBaseMap] = useState(DEFAULT_BASE_MAP);
  const [showBaseMapSelector, setShowBaseMapSelector] = useState(false);
  const baseLayerRef = useRef(null);

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

  // ========================================
  // ANÁLISIS DE CULTIVOS
  // ========================================
  const [cultivoSeleccionado, setCultivoSeleccionado] = useState("Café");
  const [cropAnalysisData, setCropAnalysisData] = useState(null);
  const [activeModalTab, setActiveModalTab] = useState('clima'); // 'clima' o 'cultivos'

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
   * EFECTO: Cargar variables y capas desde el backend
   */
  useEffect(() => {
    const loadVariables = async () => {
      try {
        const res = await API.get("/public/variables/");
        const vars = res.data.variables;

        // Si el backend todavía no tiene variables configuradas, usar las
        // capas hardcodeadas (LAYER_DEFS) como fallback para no dejar el
        // dashboard sin ninguna capa (lo que provocaba un crash al render).
        if (!Array.isArray(vars) || vars.length === 0) {
          setLayerDefs(LAYER_DEFS);
          setLoadingLayers(false);
          return;
        }

        // Construir layerDefs desde las variables del backend
        const newLayerDefs = {};
        vars.forEach(v => {
          newLayerDefs[v.nombre] = {
            type: v.configuracion_api.tipo,
            layer: v.configuracion_api.layer,
            format: v.configuracion_api.formato,
            tileMatrixSet: v.configuracion_api.tile_matrix_set,
            maxNativeZoom: v.configuracion_api.max_native_zoom,
            opacity: v.configuracion_animacion?.opacidad || 0.9,
            useLowResFallback: v.configuracion_api.tipo === "openweathermap",
            apiName: v.configuracion_api.tipo.toUpperCase(),
            legend: {
              min: v.leyenda.min,
              max: v.leyenda.max,
              colors: v.leyenda.colores || [],
              unit: v.unidad || ""
            }
          };
        });

        setLayerDefs(newLayerDefs);

        // Si la variable activa por defecto ("Temperatura del mar") no existe
        // entre las capas que devuelve el backend, seleccionar la primera
        // disponible para evitar accesos a layerDefs[activeVar] indefinidos.
        if (!newLayerDefs[activeVar]) {
          const primera = Object.keys(newLayerDefs)[0];
          if (primera) setActiveVar(primera);
        }

        setLoadingLayers(false);
        console.log("✅ Capas cargadas desde el backend:", Object.keys(newLayerDefs));
      } catch (error) {
        console.error("❌ Error cargando variables:", error);
        // Usar hardcodeadas como fallback
        setLayerDefs(LAYER_DEFS);
        setLoadingLayers(false);
      }
    };

    loadVariables();
  }, []); // Solo cargar una vez al montar

  /**
   * EFECTO: Redibujar gráfico del panel lateral cuando selectedData cambie
   * Esto asegura que el gráfico se mantenga visible después de cerrar el modal
   */
  useEffect(() => {
    if (selectedData && selectedData.series && popupCanvasRef.current && !modalOpen) {
      setTimeout(() => {
        drawMiniChart(popupCanvasRef.current, selectedData.series, layerDefs[activeVar].legend.colors);
      }, 100);
    }
  }, [selectedData, modalOpen, activeVar]);

  /**
   * EFECTO: Redibujar gráfico cuando cambia la pestaña activa en el panel lateral
   * Esto soluciona el problema de que el gráfico desaparece al cambiar de pestaña
   */
  useEffect(() => {
    if (selectedData && selectedData.series && popupCanvasRef.current && !modalOpen && activeModalTab === 'clima') {
      setTimeout(() => {
        drawMiniChart(popupCanvasRef.current, selectedData.series, layerDefs[activeVar].legend.colors);
      }, 50);
    }
  }, [activeModalTab, selectedData, modalOpen, activeVar]);

  /**
   * Exponer funciones al componente padre mediante ref
   */
  useImperativeHandle(ref, () => ({
    saveToMyRecords,
    downloadJSON,
    downloadPDF,
    toggleDrawMode: () => setDrawMode(!drawMode),
    clearAll: handleClearAll,
    getDrawMode: () => drawMode,
    hasContent: () => hasPolygon || selectedPoint
  }));

  /**
   * EFECTO: Actualizar popup cuando cambie la variable activa
   * Recarga los datos del punto seleccionado con la nueva variable
   */
  useEffect(() => {
    async function updatePopupForNewVariable() {
      // Solo actualizar si hay un punto seleccionado
      if (!selectedPoint || !popupRef.current) return;

      const { lat, lng, place } = selectedPoint;

      // Obtener datos de la nueva variable
      const series = await fetchSeriesFor(activeVar, lat, lng, downloadDateRange);
      const stats = computeStats(series);

      // Actualizar datos seleccionados
      const newData = {
        lat: lat.toFixed(6),
        lng: lng.toFixed(6),
        place,
        variable: activeVar,
        unit: layerDefs[activeVar].legend.unit,
        value: series[series.length - 1].value,
        series,
        mean: stats.mean,
        max: stats.max,
        min: stats.min,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
      };
      setSelectedData(newData);

      // Re-abrir popup con nueva variable
      openPopupAt(lat, lng, place, series);

      console.log(`🔄 Popup actualizado para variable: ${activeVar}`);
    }

    updatePopupForNewVariable();
  }, [activeVar]); // Se ejecuta cuando cambia la variable activa

  /**
   * EFECTO: Actualizar análisis de cultivo cuando cambie el cultivo seleccionado
   * Re-ejecuta el análisis si hay un punto/polígono seleccionado
   */
  useEffect(() => {
    async function updateCropAnalysis() {
      // Solo actualizar si hay datos seleccionados con coordenadas
      if (!selectedData || !selectedData.lat || !selectedData.lng) return;

      try {
        const cropAnalysis = await realizarAnalisisCultivo(
          parseFloat(selectedData.lat),
          parseFloat(selectedData.lng)
        );
        setCropAnalysisData(cropAnalysis);
        console.log(`🌾 Análisis de cultivo actualizado para: ${cultivoSeleccionado}`);
      } catch (error) {
        console.error('Error actualizando análisis de cultivo:', error);
        alert(`⚠️ Error al analizar cultivo: ${error.message || 'Error desconocido'}`);
      }
    }

    updateCropAnalysis();
  }, [cultivoSeleccionado]); // Se ejecuta cuando cambia el cultivo seleccionado

  /**
   * EFECTO: Dibujar gráfico inicial cuando se abre el modal
   * Se ejecuta cuando el modal se abre y hay datos disponibles
   * También se ejecuta cuando se cambia de pestaña para redibujar el gráfico
   */
  useEffect(() => {
    if (modalOpen && selectedData && selectedData.series && modalCanvasRef.current && activeModalTab === 'clima') {
      // Dibujar el gráfico con los datos existentes
      // Usar un timeout más largo para asegurar que el canvas esté completamente renderizado
      setTimeout(() => {
        if (modalCanvasRef.current && selectedData.series) {
          // Limpiar cualquier gráfico previo antes de dibujar
          const canvas = modalCanvasRef.current;
          if (canvas._chart) {
            try {
              canvas._chart.destroy();
            } catch (e) {
              console.warn('Error limpiando gráfico previo:', e);
            }
          }

          // Dibujar el gráfico con las dimensiones correctas
          drawMiniChart(canvas, selectedData.series, layerDefs[activeVar].legend.colors);
        }
      }, 150);
    }
  }, [modalOpen, selectedData?.series, activeVar, activeModalTab]); // Incluir activeModalTab para redibujar al cambiar de pestaña

  /**
   * EFECTO: Actualizar serie de tiempo cuando cambien las fechas del modal
   * Re-dibuja el gráfico con el nuevo rango de fechas seleccionado
   */
  useEffect(() => {
    async function updateModalSeries() {
      // Solo actualizar si el modal está abierto y hay fechas y punto seleccionado
      if (!modalOpen || !modalStartDate || !modalEndDate || !selectedPoint) return;

      // No actualizar si las fechas son las mismas que las iniciales
      // (esto evita sobrescribir al abrir el modal)
      if (!selectedData || !selectedData.series) return;

      try {
        const { lat, lng } = selectedPoint;
        const days = calculateDaysDifference(modalStartDate, modalEndDate);

        // Validar que el rango de fechas sea válido
        if (days < 1) {
          console.warn('Rango de fechas inválido');
          return;
        }

        console.log(`📊 Actualizando serie de tiempo: ${modalStartDate} a ${modalEndDate} (${days} días)`);

        // Obtener nueva serie de tiempo
        const series = await fetchSeriesFor(activeVar, lat, lng, days);
        const stats = computeStats(series);

        // Redibujar gráfico PRIMERO (antes de actualizar el estado) para evitar parpadeo
        if (modalCanvasRef.current) {
          drawMiniChart(modalCanvasRef.current, series, layerDefs[activeVar].legend.colors);
        }

        // Actualizar datos seleccionados con la nueva serie
        setSelectedData((prev) => prev ? ({
          ...prev,
          series,
          value: series[series.length - 1].value,
          mean: stats.mean,
          max: stats.max,
          min: stats.min
        }) : prev);

      } catch (error) {
        console.error('Error actualizando serie de tiempo:', error);
        alert(`⚠️ Error al actualizar serie de tiempo: ${error.message || 'Error desconocido'}`);
      }
    }

    updateModalSeries();
  }, [modalStartDate, modalEndDate]); // Se ejecuta cuando cambian las fechas del modal

  /**
   * EFECTO: Ocultar tooltip del mapa cuando el modal está abierto
   * El tooltip del mapa se oculta cuando se abre el modal para evitar que se superponga
   */
  useEffect(() => {
    if (tooltipRef.current) {
      if (modalOpen) {
        tooltipRef.current.style.display = 'none';
      }
      // No es necesario mostrarlo cuando se cierre el modal
      // porque el evento mousemove del mapa lo mostrará automáticamente
    }
  }, [modalOpen]);

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
        const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1`);
        const results = await resp.json();
        console.log('Sugerencias encontradas:', results);
        if (results && results.length > 0) {
          // Formatear resultados para mostrar nombre simplificado: "Ciudad, Estado, País"
          const formattedResults = results.map(result => {
            const address = result.address || {};
            const city = address.city || address.town || address.village || address.municipality || address.county;
            const state = address.state || address.region;
            const country = address.country || '';

            // Crear nombre simplificado: "Ciudad, Estado, País"
            let shortName = '';
            if (city && state && country) {
              shortName = `${city}, ${state}, ${country}`;
            } else if (city && country) {
              shortName = `${city}, ${country}`;
            } else if (state && country) {
              shortName = `${state}, ${country}`;
            } else if (country) {
              shortName = country;
            } else {
              // Fallback: tomar las últimas 3 partes del display_name
              const parts = result.display_name.split(',').map(p => p.trim());
              if (parts.length >= 3) {
                shortName = parts.slice(-3).join(', ');
              } else {
                shortName = result.display_name;
              }
            }

            return {
              ...result,
              shortName: shortName.trim(),
              country: country
            };
          });

          setSearchSuggestions(formattedResults);
          setShowSuggestions(true);
          console.log('Mostrando', formattedResults.length, 'sugerencias');
        } else {
          setSearchSuggestions([]);
          setShowSuggestions(false);
          console.log('No se encontraron sugerencias');
        }
      } catch (err) {
        console.warn("Error al buscar sugerencias de lugares:", err);
        setSearchSuggestions([]);
        setShowSuggestions(false);
        // No mostramos alert aquí porque es una función de sugerencias que se ejecuta automáticamente
      }
    }, 500); // Debounce de 500ms

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  /**
   * FUNCIÓN: Seleccionar una sugerencia de lugar
   * @param {Object} suggestion - Objeto con datos del lugar (lat, lon, display_name, shortName)
   *
   * Proceso:
   * 1. Actualiza el input con el nombre del lugar (usa shortName si está disponible)
   * 2. Navega al lugar en el mapa con animación
   * 3. Obtiene y muestra los datos climatológicos
   */
  async function selectSuggestion(suggestion) {
    console.log('🎯 selectSuggestion llamada con:', suggestion);

    const { lat, lon, display_name, shortName } = suggestion;

    // Usar shortName si está disponible, sino display_name
    const placeNameToShow = shortName || display_name;

    console.log('📍 Lugar seleccionado:', placeNameToShow, `(${lat}, ${lon})`);

    // IMPORTANTE: Actualizar el input con el nombre simplificado del lugar
    setSearchQuery(placeNameToShow);
    console.log('✅ Input actualizado con:', placeNameToShow);

    // Cerrar dropdown
    setShowSuggestions(false);
    setSearchSuggestions([]);
    console.log('✅ Dropdown cerrado');

    // Convertir a números
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    console.log('🗺️ Navegando al lugar en el mapa...', { latitude, longitude });

    // Traer los datos del lugar y mostrar el popup
    // handlePointSelection se encargará de centrar el mapa
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
   * Utiliza dom-to-image-more para convertir el mapa en una imagen PNG
   * Esta biblioteca maneja mejor las imágenes cross-origin (NASA GIBS tiles)
   */
  async function captureMapSnapshot() {
    try {
      const map = mapRef.current;
      const mapElement = mapContainerRef.current;
      if (!map || !mapElement) {
        console.error('Mapa no disponible para captura');
        return null;
      }

      // Invalidar el tamaño del mapa para asegurar renderizado correcto
      map.invalidateSize();

      // Esperar a que todas las capas se carguen completamente
      // Tiempo extendido para capas WMTS de NASA GIBS
      console.log('⏳ Esperando carga de capas climáticas...');
      await new Promise(resolve => setTimeout(resolve, 4000));

      console.log('📸 Capturando mapa con dom-to-image-more...');

      // Usar dom-to-image-more que maneja mejor las imágenes cross-origin
      const dataUrl = await domtoimage.toPng(mapElement, {
        quality: 0.95,
        bgcolor: '#1a1a1a',
        width: mapElement.offsetWidth,
        height: mapElement.offsetHeight,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
        },
        // Filtrar elementos que puedan causar problemas
        filter: (node) => {
          // Excluir controles de zoom y atribución si causan problemas
          if (node.classList) {
            return !node.classList.contains('leaflet-control-container');
          }
          return true;
        }
      });

      console.log('✅ Mapa capturado exitosamente con dom-to-image-more');
      return dataUrl;
    } catch (error) {
      console.error('❌ Error capturando mapa con dom-to-image-more:', error);

      // Fallback: Intentar con html2canvas como alternativa
      try {
        const mapElement = mapContainerRef.current;
        if (!mapElement) return null;

        console.log('⚠️ Intentando captura alternativa con html2canvas...');

        const canvas = await html2canvas(mapElement, {
          useCORS: false,
          allowTaint: true,
          logging: false,
          backgroundColor: '#1a1a1a',
          scale: 1,
        });

        return canvas.toDataURL('image/png');
      } catch (fallbackError) {
        console.error('Error en captura alternativa:', fallbackError);
        return null;
      }
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
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.4,
            pointRadius: 5,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: colors[Math.floor(colors.length / 2)],
            pointBorderWidth: 2.5,
            pointHoverRadius: 7,
            pointHoverBackgroundColor: colors[Math.floor(colors.length / 2)],
            pointHoverBorderColor: '#ffffff',
            pointHoverBorderWidth: 2,
            borderWidth: 3
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
              ticks: {
                color: '#666',
                font: { size: 11 }
              },
              grid: {
                color: '#e5e7eb',
                drawBorder: false
              }
            },
            x: {
              ticks: {
                color: '#666',
                font: { size: 10 }
              },
              grid: {
                color: '#f3f4f6',
                drawBorder: false
              }
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
   * FUNCIÓN: Geocodificación inversa (coordenadas -> nombre de lugar simplificado)
   * @param {number} lat - Latitud
   * @param {number} lon - Longitud
   * @returns {Promise<string>} Nombre del lugar simplificado
   *
   * Devuelve un nombre simplificado del formato:
   * "Ciudad, Departamento/Estado, País"
   * Ejemplo: "Santiago de Cali, Valle del Cauca, Colombia"
   */
  async function reverseGeocode(lat, lon) {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`);
      const j = await r.json();

      if (!j.display_name) return "Desconocido";

      // Extraer las partes relevantes del address
      const address = j.address || {};
      const city = address.city || address.town || address.village || address.municipality || address.county;
      const state = address.state || address.region;
      const country = address.country;

      // Construir el nombre simplificado
      let simplifiedName = '';

      if (city && state && country) {
        // Formato ideal: "Ciudad, Estado, País"
        simplifiedName = `${city}, ${state}, ${country}`;
      } else if (city && country) {
        // Si no hay estado: "Ciudad, País"
        simplifiedName = `${city}, ${country}`;
      } else if (state && country) {
        // Si no hay ciudad: "Estado, País"
        simplifiedName = `${state}, ${country}`;
      } else if (country) {
        // Solo país
        simplifiedName = country;
      } else {
        // Fallback: tomar las últimas 3 partes del display_name
        const parts = j.display_name.split(',').map(p => p.trim());
        if (parts.length >= 3) {
          simplifiedName = parts.slice(-3).join(', ');
        } else {
          simplifiedName = j.display_name;
        }
      }

      return simplifiedName.trim();
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
   * FUNCIÓN: Calcular estadísticas avanzadas de una serie temporal
   * @param {Array} series - Array de {date, value}
   * @returns {Object} Estadísticas extendidas incluyendo tendencia, desviación, percentiles
   */
  function computeAdvancedStats(series) {
    if (!series || series.length === 0) {
      return {
        mean: 0,
        max: 0,
        min: 0,
        stdDev: 0,
        trend: 'stable',
        trendValue: 0,
        percentile25: 0,
        percentile75: 0,
        variance: 0,
        lastValue: 0,
        changePercent: 0
      };
    }

    const vals = series.map((s) => parseFloat(s.value));
    const n = vals.length;

    // Estadísticas básicas
    const sum = vals.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    const max = Math.max(...vals);
    const min = Math.min(...vals);
    const lastValue = vals[n - 1];
    const firstValue = vals[0];

    // Desviación estándar y varianza
    const squaredDiffs = vals.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / n;
    const stdDev = Math.sqrt(variance);

    // Percentiles
    const sorted = [...vals].sort((a, b) => a - b);
    const p25Index = Math.floor(n * 0.25);
    const p75Index = Math.floor(n * 0.75);
    const percentile25 = sorted[p25Index];
    const percentile75 = sorted[p75Index];

    // Análisis de tendencia (regresión lineal simple)
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += vals[i];
      sumXY += i * vals[i];
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const trendValue = slope;

    // Determinar tendencia
    let trend = 'stable';
    const trendThreshold = stdDev * 0.1; // 10% de la desviación estándar
    if (Math.abs(slope) > trendThreshold) {
      trend = slope > 0 ? 'increasing' : 'decreasing';
    }

    // Cambio porcentual
    const changePercent = firstValue !== 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;

    return {
      mean: parseFloat(mean.toFixed(2)),
      max: parseFloat(max.toFixed(2)),
      min: parseFloat(min.toFixed(2)),
      stdDev: parseFloat(stdDev.toFixed(2)),
      trend,
      trendValue: parseFloat(trendValue.toFixed(4)),
      percentile25: parseFloat(percentile25.toFixed(2)),
      percentile75: parseFloat(percentile75.toFixed(2)),
      variance: parseFloat(variance.toFixed(2)),
      lastValue: parseFloat(lastValue.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2))
    };
  }

  /**
   * FUNCIÓN: Generar pronóstico basado en tendencia
   * @param {Array} series - Array de {date, value} históricos
   * @param {number} forecastDays - Días a pronosticar
   * @returns {Array} Array de {date, value, isForecast: true} con predicciones
   */
  function generateForecast(series, forecastDays = 7) {
    if (!series || series.length < 3) return [];

    const vals = series.map(s => parseFloat(s.value));
    const n = vals.length;

    // Calcular tendencia (regresión lineal)
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += vals[i];
      sumXY += i * vals[i];
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calcular desviación estándar para añadir variabilidad realista
    const mean = vals.reduce((a, b) => a + b, 0) / n;
    const variance = vals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    // Generar pronóstico
    const forecast = [];
    const lastDate = new Date(series[series.length - 1].date);

    for (let i = 1; i <= forecastDays; i++) {
      const forecastDate = new Date(lastDate);
      forecastDate.setDate(lastDate.getDate() + i);

      // Predicción con componente de tendencia y pequeña variación
      const baseValue = slope * (n + i - 1) + intercept;
      const noise = (Math.random() - 0.5) * stdDev * 0.3; // 30% de la desv. estándar
      const forecastValue = Math.max(0, baseValue + noise);

      forecast.push({
        date: forecastDate.toISOString().slice(0, 10),
        value: forecastValue.toFixed(2),
        isForecast: true
      });
    }

    return forecast;
  }

  /**
   * FUNCIÓN: Detectar alertas climáticas
   * @param {Object} stats - Estadísticas avanzadas de la serie
   * @param {string} variableKey - Nombre de la variable
   * @returns {Array} Array de alertas {type, message, severity}
   */
  function detectClimateAlerts(stats, variableKey) {
    const alerts = [];

    if (!stats || !variableKey) return alerts;

    // Umbrales por variable
    const thresholds = {
      "Temperatura terrestre": { extreme: 40, high: 35, low: 0 },
      "Temperatura del mar": { extreme: 32, high: 28, low: 10 },
      "Precipitación": { extreme: 100, high: 50, heavy: 30 },
      "Aerosol (Vientos)": { extreme: 15, high: 10 },
      "Corrientes Oceánicas": { extreme: 2, high: 1.5 }
    };

    const threshold = thresholds[variableKey];
    if (!threshold) return alerts;

    // Alerta de valor extremo
    if (threshold.extreme && stats.lastValue >= threshold.extreme) {
      alerts.push({
        type: 'extreme',
        message: `Valor extremo detectado: ${stats.lastValue} ${layerDefs[variableKey]?.legend?.unit || ''}`,
        severity: 'high'
      });
    } else if (threshold.high && stats.lastValue >= threshold.high) {
      alerts.push({
        type: 'high',
        message: `Valor alto: ${stats.lastValue} ${layerDefs[variableKey]?.legend?.unit || ''}`,
        severity: 'medium'
      });
    } else if (threshold.low !== undefined && stats.lastValue <= threshold.low) {
      alerts.push({
        type: 'low',
        message: `Valor bajo: ${stats.lastValue} ${layerDefs[variableKey]?.legend?.unit || ''}`,
        severity: 'medium'
      });
    }

    // Alerta de cambio brusco
    if (Math.abs(stats.changePercent) > 30) {
      const direction = stats.changePercent > 0 ? 'incremento' : 'descenso';
      alerts.push({
        type: 'rapid_change',
        message: `${direction} significativo: ${Math.abs(stats.changePercent).toFixed(1)}% en el período`,
        severity: 'medium'
      });
    }

    // Alerta de alta variabilidad
    if (stats.stdDev > stats.mean * 0.5 && stats.mean > 0) {
      alerts.push({
        type: 'high_variability',
        message: `Alta variabilidad en los datos (σ=${stats.stdDev.toFixed(2)})`,
        severity: 'low'
      });
    }

    // Alerta de tendencia fuerte
    if (stats.trend === 'increasing' && Math.abs(stats.changePercent) > 20) {
      alerts.push({
        type: 'increasing_trend',
        message: `Tendencia creciente sostenida (+${stats.changePercent.toFixed(1)}%)`,
        severity: 'low'
      });
    } else if (stats.trend === 'decreasing' && Math.abs(stats.changePercent) > 20) {
      alerts.push({
        type: 'decreasing_trend',
        message: `Tendencia decreciente sostenida (${stats.changePercent.toFixed(1)}%)`,
        severity: 'low'
      });
    }

    return alerts;
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
        <div><strong>Valor actual:</strong> ${series[series.length - 1].value} ${layerDefs[activeVar].legend.unit}</div>
        <div><strong>Promedio:</strong> ${computeStats(series).mean} &nbsp; <strong>Máx:</strong> ${computeStats(series).max} &nbsp; <strong>Mín:</strong> ${computeStats(series).min}</div>
      </div>
    `;
    
    // Agregar canvas para mini gráfico
    const canvas = L.DomUtil.create("canvas", "popup-canvas", popupEl);
    canvas.width = 380; 
    canvas.height = 140;
    drawMiniChart(canvas, series, layerDefs[activeVar].legend.colors);

    // Botón para ampliar serie en modal
    const expandBtn = L.DomUtil.create("button", "popup-expand", popupEl);
    expandBtn.innerText = "Ampliar serie";
    expandBtn.onclick = async () => {
      setModalOpen(true);

      // Obtener el lugar usando geocodificación inversa
      const place = await reverseGeocode(lat, lng);

      // Calcular las estadísticas desde la serie actual
      const stats = computeStats(series);

      // Establecer los datos seleccionados para el modal
      setSelectedData({
        lat,
        lng,
        place,
        series,
        unit: layerDefs[activeVar].legend.unit || "",
        mean: stats.mean,
        max: stats.max,
        min: stats.min
      });

      // Realizar análisis de cultivo
      const cropAnalysis = await realizarAnalisisCultivo(lat, lng);
      setCropAnalysisData(cropAnalysis);

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

    // Centrar el mapa en el punto seleccionado con offset para el modal lateral
    const map = mapRef.current;
    if (map) {
      // Calcular el offset para dejar espacio al modal lateral (350px de ancho + margen)
      const mapContainer = map.getContainer();
      const mapWidth = mapContainer.offsetWidth;
      const sidebarWidth = 350;

      // Posicionar el punto cerca del panel lateral (lado derecho)
      // Dejamos 100px desde el borde del panel para que sea visible
      const marginFromPanel = 100;
      const targetX = mapWidth - sidebarWidth - marginFromPanel; // Posición desde el lado derecho
      const offsetX = targetX - mapWidth / 2;

      const point = map.project([lat, lng], 10);
      point.x += offsetX;
      const newCenter = map.unproject(point, 10);

      map.flyTo(newCenter, 10, {
        duration: 1.5,
        easeLinearity: 0.25
      });
    }

    // Agregar marcador en el punto seleccionado
    if (mapRef.current) {
      // Eliminar marcador anterior si existe
      if (window.currentMarker) {
        mapRef.current.removeLayer(window.currentMarker);
      }

      // Crear nuevo marcador con icono de ubicación
      const locationIcon = L.divIcon({
        className: 'custom-location-marker',
        html: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#3b82f6" stroke="#ffffff" stroke-width="2"/>
          <circle cx="12" cy="9" r="2.5" fill="#ffffff"/>
        </svg>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
      });

      const marker = L.marker([lat, lng], {
        icon: locationIcon
      }).addTo(mapRef.current);

      window.currentMarker = marker;
    }

    const series = await fetchSeriesFor(activeVar, lat, lng, downloadDateRange);
    const stats = computeStats(series);

    const data = {
      lat: lat.toFixed(6),
      lng: lng.toFixed(6),
      place,
      variable: activeVar,
      unit: layerDefs[activeVar].legend.unit,
      value: series[series.length - 1].value,
      series,
      mean: stats.mean,
      max: stats.max,
      min: stats.min,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
    };
    setSelectedData(data);

    // Dibujar el mini gráfico en el panel lateral
    setTimeout(() => {
      if (popupCanvasRef.current) {
        drawMiniChart(popupCanvasRef.current, series, layerDefs[activeVar].legend.colors);
      }
    }, 100);

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

    // Realizar análisis de cultivo automáticamente
    const cropAnalysis = await realizarAnalisisCultivo(lat, lng);
    setCropAnalysisData(cropAnalysis);
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

    // Centrar el mapa en el centro del polígono con offset para el modal lateral
    const map = mapRef.current;
    if (map) {
      // Calcular el offset para dejar espacio al modal lateral (350px de ancho + margen)
      const mapContainer = map.getContainer();
      const mapWidth = mapContainer.offsetWidth;
      const sidebarWidth = 350;

      // Posicionar el punto cerca del panel lateral (lado derecho)
      // Dejamos 100px desde el borde del panel para que sea visible
      const marginFromPanel = 100;
      const targetX = mapWidth - sidebarWidth - marginFromPanel; // Posición desde el lado derecho
      const offsetX = targetX - mapWidth / 2;

      const point = map.project([lat, lng], 11);
      point.x += offsetX;
      const newCenter = map.unproject(point, 11);

      map.flyTo(newCenter, 11, {
        duration: 1.5,
        easeLinearity: 0.25
      });
    }

    // Agregar marcador en el centro del polígono
    if (mapRef.current) {
      // Eliminar marcador anterior si existe
      if (window.currentMarker) {
        mapRef.current.removeLayer(window.currentMarker);
      }

      // Crear marcador para el centro del polígono
      const marker = L.circleMarker([lat, lng], {
        radius: 10,
        fillColor: '#ef4444',
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
      }).addTo(mapRef.current);

      window.currentMarker = marker;
    }

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
      place: place,
      variable: activeVar,
      unit: layerDefs[activeVar].legend.unit,
      value: aggregatedSeries[aggregatedSeries.length - 1].value,
      series: aggregatedSeries,
      mean: stats.mean,
      max: stats.max,
      min: stats.min,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      samplePoints: samplePoints,  // Guardar los puntos del polígono
      isPolygon: true,  // Marcar que es un polígono
    };

    setSelectedData(resultData);

    // Realizar análisis de cultivo automáticamente
    const cropAnalysis = await realizarAnalisisCultivo(lat, lng);
    setCropAnalysisData(cropAnalysis);

    // Ya no abrir el popup antiguo, solo mostrar el panel lateral
    setDrawMode(false);
  }

  /**
   * FUNCIÓN: Limpiar todos los marcadores y popups del mapa
   * Elimina completamente todos los elementos del mapa
   */
  function clearAllMapMarkers() {
    const map = mapRef.current;
    if (!map) return;

    // Cerrar y eliminar todos los popups
    map.closePopup();
    map.eachLayer((layer) => {
      // No eliminar las capas base (TileLayer)
      if (layer instanceof L.Marker || layer instanceof L.Popup || layer instanceof L.Polygon || layer instanceof L.Polyline || layer instanceof L.CircleMarker) {
        map.removeLayer(layer);
      }
    });

    // Eliminar el marcador actual si existe
    if (window.currentMarker) {
      try {
        map.removeLayer(window.currentMarker);
      } catch (e) {
        console.warn('Error eliminando currentMarker:', e);
      }
      window.currentMarker = null;
    }

    // Limpiar referencias
    popupRef.current = null;
    setSelectedPoint(null);
    setSelectedData(null);
    setSelectedPointsHistory([]);

    console.log('✅ Todos los marcadores y popups eliminados del mapa');
  }

  /**
   * FUNCIÓN: Limpiar polígono del mapa
   * Llama a la función global expuesta por PolygonDrawer y limpia todo
   */
  function handleClearPolygon() {
    // Limpiar polígono usando PolygonDrawer
    if (window.__clearPolygon) {
      window.__clearPolygon();
    }

    // Limpiar estados
    setHasPolygon(false);
    setPolygonData(null);

    // Limpiar todos los marcadores y popups
    clearAllMapMarkers();

    console.log('🗑️ Polígono y todos los marcadores eliminados');
  }

  /**
   * FUNCIÓN MEJORADA: Limpiar todo (polígonos, puntos y popups)
   * Limpia cualquier dibujo en el mapa y cierra popups
   */
  function handleClearAll() {
    console.log('🗑️ Limpiando todo del mapa...');

    // Desactivar modo de dibujo
    setDrawMode(false);

    // Limpiar polígono si existe
    if (window.__clearPolygon) {
      window.__clearPolygon();
    }

    // Limpiar estados de polígono
    setHasPolygon(false);
    setPolygonData(null);

    // Limpiar TODOS los marcadores, popups y elementos del mapa
    clearAllMapMarkers();

    console.log('✅ Todo limpiado: polígonos, puntos, popups y marcadores');
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
      await handlePointSelection(+lat, +lon);
    } catch (err) {
      console.warn("search error", err);
    }
  }

  /**
   * FUNCIÓN: Dibujar mini gráfico en canvas con pronósticos
   * @param {HTMLCanvasElement} canvas - Canvas donde dibujar
   * @param {Array} series - Serie temporal
   * @param {Array} colors - Colores para el gradiente
   * @param {boolean} showForecast - Si se debe mostrar pronóstico
   *
   * Crea un gráfico Chart.js compacto con datos históricos y pronósticos
   */
  function drawMiniChart(canvas, series, colors, showForecast = true) {
    if (!canvas) return;
    try { if (canvas._chart) canvas._chart.destroy(); } catch {}

    const ctx = canvas.getContext("2d");
    canvas.style.background = "#fff";

    // Generar pronóstico si está habilitado
    let forecast = [];
    if (showForecast && series.length > 3) {
      forecast = generateForecast(series, 5); // 5 días de pronóstico
    }

    // Combinar datos históricos y pronósticos
    const combinedSeries = [...series, ...forecast];
    const labels = combinedSeries.map((s) => s.date);
    const data = combinedSeries.map((s) => +s.value);

    // Crear datasets separados para históricos y pronósticos
    const historicalData = series.map((s) => +s.value);
    const forecastData = new Array(series.length).fill(null).concat(forecast.map(f => +f.value));

    // Crear gradiente
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, colors[0]);
    grad.addColorStop(0.5, colors[Math.floor(colors.length / 2)]);
    grad.addColorStop(1, colors[colors.length - 1]);

    const datasets = [
      {
        label: 'Histórico',
        data: historicalData,
        borderColor: colors[Math.floor(colors.length / 2)],
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: colors[Math.floor(colors.length / 2)],
        pointBorderWidth: 2,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: colors[Math.floor(colors.length / 2)],
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2,
        borderWidth: 3
      }
    ];

    // Agregar dataset de pronóstico si existe
    if (forecast.length > 0 && showForecast) {
      datasets.push({
        label: 'Pronóstico',
        data: forecastData,
        borderColor: '#94a3b8',
        backgroundColor: 'rgba(148, 163, 184, 0.1)',
        fill: false,
        tension: 0.4,
        borderDash: [5, 5],
        pointRadius: 4,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#94a3b8',
        pointBorderWidth: 2,
        pointStyle: 'rectRot',
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#94a3b8',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2,
        borderWidth: 2
      });
    }

    const chart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets
      },
      options: {
        responsive: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          legend: {
            display: showForecast && forecast.length > 0,
            position: 'top',
            labels: {
              boxWidth: 12,
              boxHeight: 12,
              padding: 8,
              font: { size: 10 },
              usePointStyle: true
            }
          },
          tooltip: {
            callbacks: {
              title: (items) => {
                const item = items[0];
                const isForecast = item.datasetIndex === 1;
                return `${item.label}${isForecast ? ' (Pronóstico)' : ''}`;
              }
            }
          }
        },
        scales: {
          y: {
            ticks: {
              color: '#666',
              font: { size: 11 }
            },
            grid: {
              color: '#e5e7eb',
              drawBorder: false
            }
          },
          x: {
            ticks: {
              color: '#666',
              font: { size: 9 },
              maxRotation: 45,
              minRotation: 0,
              callback: function(value, index) {
                // Mostrar solo algunas etiquetas para evitar aglomeración
                const label = this.getLabelForValue(value);
                if (index % 2 === 0 || index === labels.length - 1) {
                  return label.slice(5); // Mostrar solo MM-DD
                }
                return '';
              }
            },
            grid: {
              color: '#f3f4f6',
              drawBorder: false
            }
          }
        }
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
      drawMiniChart(modalCanvasRef.current, series, layerDefs[variableKey].legend.colors);
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
    
    const apiName = layerDefs[activeVar]?.apiName || "API desconocido";
    
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
    
    const apiName = layerDefs[activeVar]?.apiName || "API desconocido";
    
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

  // ========================================
  // FUNCIONES DE ANÁLISIS DE CULTIVOS
  // ========================================

  /**
   * Calcula la aptitud de un valor respecto a su rango óptimo
   * @param {number} valor - Valor actual
   * @param {number} min - Valor mínimo óptimo
   * @param {number} max - Valor máximo óptimo
   * @returns {number} Porcentaje de aptitud (0-100)
   */
  function calcularAptitud(valor, min, max) {
    if (valor < min) return Math.max(0, (valor / min) * 100);
    if (valor > max) return Math.max(0, 100 - ((valor - max) / max) * 100);
    return 100;
  }

  /**
   * Obtiene recomendación según el nivel de aptitud
   * @param {number} aptitud - Porcentaje de aptitud (0-100)
   * @returns {object} Nivel, color y texto de recomendación
   */
  function getRecomendacion(aptitud) {
    if (aptitud >= 80) return { nivel: "Alta", color: "#22c55e", texto: "Condiciones óptimas para el cultivo" };
    if (aptitud >= 60) return { nivel: "Media", color: "#eab308", texto: "Condiciones aceptables, considerar manejo" };
    if (aptitud >= 40) return { nivel: "Baja", color: "#f97316", texto: "Requiere inversión significativa en manejo" };
    return { nivel: "No Apto", color: "#ef4444", texto: "No recomendado para este cultivo" };
  }

  /**
   * Evalúa riesgos climáticos para el cultivo con análisis técnico detallado
   * @param {object} datos - Datos climáticos (temperatura, precipitacion, altitud, humedad)
   * @param {object} cultivo - Configuración del cultivo
   * @returns {array} Lista de riesgos identificados con análisis técnico
   */
  function evaluarRiesgos(datos, cultivo) {
    const riesgos = [];

    // ANÁLISIS DE RIESGOS POR TEMPERATURA
    const tempOptMin = cultivo.temperaturaOptima.min;
    const tempOptMax = cultivo.temperaturaOptima.max;
    const tempActual = datos.temperatura;

    if (tempActual < tempOptMin - 5) {
      const deficit = (tempOptMin - tempActual).toFixed(1);
      riesgos.push(`Riesgo crítico de heladas: Temperatura actual (${tempActual.toFixed(1)}°C) está ${deficit}°C por debajo del mínimo óptimo (${tempOptMin}°C). Puede causar daño celular en tejidos vegetales y afectar la fotosíntesis.`);
    } else if (tempActual < tempOptMin) {
      const deficit = (tempOptMin - tempActual).toFixed(1);
      riesgos.push(`Riesgo moderado por bajas temperaturas: ${deficit}°C por debajo del óptimo (${tempOptMin}°C). Puede retrasar el desarrollo vegetativo y reducir la tasa de crecimiento.`);
    }

    if (tempActual > tempOptMax + 5) {
      const exceso = (tempActual - tempOptMax).toFixed(1);
      riesgos.push(`Riesgo crítico de estrés térmico: Temperatura actual (${tempActual.toFixed(1)}°C) excede en ${exceso}°C el máximo óptimo (${tempOptMax}°C). Aumenta la evapotranspiración y puede causar marchitez permanente.`);
    } else if (tempActual > tempOptMax) {
      const exceso = (tempActual - tempOptMax).toFixed(1);
      riesgos.push(`Riesgo moderado de estrés térmico: ${exceso}°C por encima del óptimo (${tempOptMax}°C). Incrementa demanda hídrica y puede afectar la calidad del producto.`);
    }

    // ANÁLISIS DE RIESGOS POR PRECIPITACIÓN Y DÉFICIT HÍDRICO
    const precOptMin = cultivo.precipitacionOptima.min;
    const precOptMax = cultivo.precipitacionOptima.max;
    const precActual = datos.precipitacion;

    if (precActual < precOptMin * 0.5) {
      const deficitPorcentaje = ((precOptMin - precActual) / precOptMin * 100).toFixed(1);
      const deficitMm = (precOptMin - precActual).toFixed(0);
      riesgos.push(`Riesgo crítico de estrés hídrico severo: Precipitación actual (${precActual.toFixed(0)} mm/año) está ${deficitPorcentaje}% por debajo del mínimo óptimo (${precOptMin} mm/año). Déficit de ${deficitMm} mm. Se requiere sistema de riego suplementario urgente.`);
    } else if (precActual < precOptMin * 0.7) {
      const deficitPorcentaje = ((precOptMin - precActual) / precOptMin * 100).toFixed(1);
      riesgos.push(`Riesgo alto de déficit hídrico: Precipitación ${deficitPorcentaje}% por debajo del óptimo. Considerar implementación de riego por goteo o aspersión para mantener balance hídrico.`);
    } else if (precActual < precOptMin) {
      const deficitPorcentaje = ((precOptMin - precActual) / precOptMin * 100).toFixed(1);
      riesgos.push(`Riesgo moderado de estrés hídrico: Precipitación ${deficitPorcentaje}% por debajo del óptimo (${precOptMin} mm). Monitorear humedad del suelo y considerar riego complementario en épocas críticas.`);
    }

    if (precActual > precOptMax * 1.5) {
      const excesoMm = (precActual - precOptMax).toFixed(0);
      const excesoPorcentaje = ((precActual - precOptMax) / precOptMax * 100).toFixed(1);
      riesgos.push(`Riesgo crítico de exceso hídrico: Precipitación (${precActual.toFixed(0)} mm) excede en ${excesoMm} mm (${excesoPorcentaje}%) el máximo óptimo. Alto riesgo de anoxia radicular, enfermedades fúngicas y lixiviación de nutrientes. Implementar sistema de drenaje subsuperficial.`);
    } else if (precActual > precOptMax * 1.3) {
      const excesoMm = (precActual - precOptMax).toFixed(0);
      riesgos.push(`Riesgo alto de saturación hídrica: Exceso de ${excesoMm} mm sobre el óptimo. Mejorar drenaje superficial y considerar siembra en camellones o camas elevadas.`);
    } else if (precActual > precOptMax) {
      riesgos.push(`Riesgo moderado de exceso de precipitación: Puede favorecer desarrollo de enfermedades foliares y reducir aireación del suelo. Monitorear drenaje.`);
    }

    // ANÁLISIS DE RIESGOS POR ALTITUD
    const altOptMin = cultivo.altitudOptima.min;
    const altOptMax = cultivo.altitudOptima.max;
    const altActual = datos.altitud;

    if (altActual < altOptMin - 300) {
      const diferencia = (altOptMin - altActual).toFixed(0);
      riesgos.push(`Riesgo por altitud inadecuada: Ubicación ${diferencia} metros por debajo del rango óptimo (${altOptMin}-${altOptMax} msnm). Puede afectar el desarrollo fenológico y la calidad del producto debido a temperaturas más altas y menor amplitud térmica.`);
    } else if (altActual > altOptMax + 300) {
      const diferencia = (altActual - altOptMax).toFixed(0);
      riesgos.push(`Riesgo por altitud excesiva: Ubicación ${diferencia} metros por encima del rango óptimo. Mayor riesgo de heladas nocturnas, menor temperatura promedio y ciclo vegetativo más largo.`);
    }

    // ANÁLISIS DE HUMEDAD RELATIVA
    if (datos.humedad > 85) {
      riesgos.push(`Riesgo fitosanitario por alta humedad relativa (${datos.humedad.toFixed(1)}%): Ambiente favorable para enfermedades fúngicas como mildiu, roya y antracnosis. Implementar manejo preventivo con fungicidas y mejorar ventilación del cultivo.`);
    } else if (datos.humedad < 40) {
      riesgos.push(`Riesgo por baja humedad relativa (${datos.humedad.toFixed(1)}%): Aumenta la evapotranspiración y el estrés hídrico. Puede causar cierre estomático prematuro reduciendo la fotosíntesis. Considerar riego por aspersión para incrementar humedad ambiental.`);
    }

    // ANÁLISIS DE INTERACCIÓN TEMPERATURA-HUMEDAD (Índice de estrés)
    if (tempActual > tempOptMax && datos.humedad < 50) {
      riesgos.push(`Riesgo combinado de estrés hídrico y térmico: La combinación de alta temperatura (${tempActual.toFixed(1)}°C) y baja humedad (${datos.humedad.toFixed(1)}%) aumenta significativamente la demanda evapotranspirativa. Incrementar frecuencia de riego y considerar mulching para conservar humedad del suelo.`);
    }

    // CÁLCULO DE GDD (Growing Degree Days) - Aproximación básica
    const tempBase = 10; // Temperatura base general para la mayoría de cultivos
    const gdd = Math.max(0, ((tempOptMin + tempOptMax) / 2) - tempBase);
    const gddActual = Math.max(0, tempActual - tempBase);

    if (gddActual < gdd * 0.7) {
      riesgos.push(`Riesgo de acumulación térmica insuficiente: Los grados día de crecimiento (GDD) actuales son bajos, lo que puede prolongar el ciclo del cultivo y afectar la sincronización de la cosecha.`);
    }

    return riesgos;
  }

  /**
   * Realiza análisis completo de aptitud de cultivo para una ubicación
   * @param {number} lat - Latitud
   * @param {number} lng - Longitud
   * @returns {object} Análisis completo de cultivo
   */
  async function realizarAnalisisCultivo(lat, lng) {
    const cultivo = CULTIVOS[cultivoSeleccionado];

    // Asegurar que lat y lng sean números
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    // ========================================
    // OBTENER DATOS CLIMÁTICOS REALES
    // ========================================

    // 1. Temperatura real (del promedio de las series existentes)
    const temperatura = selectedData?.mean ? parseFloat(selectedData.mean) : 20;

    // 2. Obtener altitud real desde Open-Elevation API
    let altitud = 0;
    let altitudFuente = 'estimado';
    try {
      const elevationResponse = await fetch(
        `https://api.open-elevation.com/api/v1/lookup?locations=${latNum},${lngNum}`
      );
      const elevationData = await elevationResponse.json();
      altitud = elevationData.results?.[0]?.elevation || 0;
      altitudFuente = 'Open-Elevation API';
      console.log(`📏 Altitud real obtenida: ${altitud} msnm (${altitudFuente})`);
    } catch (error) {
      console.error('❌ Error obteniendo altitud:', error);
      // Fallback: estimación basada en latitud
      altitud = Math.abs(latNum - 4.5) * 500;
      console.log(`⚠️ Usando altitud estimada: ${altitud} msnm`);
    }

    // 3. Obtener precipitación anual real desde Open-Meteo Archive API
    let precipitacion = 0;
    let precipitacionFuente = 'estimado';
    try {
      // Intentar primero con Open-Meteo Archive API (datos históricos del último año)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);

      const archiveResponse = await fetch(
        `https://archive-api.open-meteo.com/v1/archive?latitude=${latNum}&longitude=${lngNum}&start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}&daily=precipitation_sum`
      );
      const archiveData = await archiveResponse.json();

      if (archiveData.daily && archiveData.daily.precipitation_sum) {
        // Calcular precipitación anual
        const dailyPrecip = archiveData.daily.precipitation_sum;
        const totalPrecip = dailyPrecip.reduce((sum, val) => sum + (val || 0), 0);
        precipitacion = totalPrecip;
        precipitacionFuente = 'Open-Meteo Archive API (último año)';
        console.log(`💧 Precipitación anual: ${precipitacion.toFixed(2)} mm/año (${precipitacionFuente})`);
      } else {
        throw new Error('No se obtuvieron datos del Archive API');
      }
    } catch (error) {
      console.warn('⚠️ Archive API falló, intentando Climate API:', error.message);

      // Fallback 2: Open-Meteo Climate API
      try {
        const climateResponse = await fetch(
          `https://climate-api.open-meteo.com/v1/climate?latitude=${latNum}&longitude=${lngNum}&start_date=1991-01-01&end_date=2020-12-31&models=CMCC_CM2_VHR4&daily=precipitation_sum`
        );
        const climateData = await climateResponse.json();

        if (climateData.daily && climateData.daily.precipitation_sum) {
          const dailyPrecip = climateData.daily.precipitation_sum;
          const totalPrecip = dailyPrecip.reduce((sum, val) => sum + (val || 0), 0);
          const years = (climateData.daily.time.length / 365);
          precipitacion = totalPrecip / years;
          precipitacionFuente = 'Open-Meteo Climate API (1991-2020)';
          console.log(`💧 Precipitación anual promedio: ${precipitacion.toFixed(2)} mm/año (${precipitacionFuente})`);
        } else {
          throw new Error('Climate API no devolvió datos');
        }
      } catch (error2) {
        console.error('❌ Ambas APIs fallaron, usando estimación basada en coordenadas');
        // Fallback 3: Estimación basada en latitud (más cercano al ecuador = más lluvia)
        const latAbsoluta = Math.abs(latNum);
        // Entre 0-10° latitud: alta precipitación (1500-3500 mm)
        // Entre 10-30° latitud: media precipitación (500-1500 mm)
        // Más de 30° latitud: baja precipitación (300-800 mm)
        if (latAbsoluta < 10) {
          precipitacion = 1500 + Math.random() * 2000;
        } else if (latAbsoluta < 30) {
          precipitacion = 500 + Math.random() * 1000;
        } else {
          precipitacion = 300 + Math.random() * 500;
        }
        precipitacionFuente = 'Estimado por ubicación geográfica';
        console.log(`⚠️ Usando precipitación estimada: ${precipitacion.toFixed(2)} mm/año (${precipitacionFuente})`);
      }
    }

    const datosClimaticos = {
      temperatura: temperatura,
      precipitacion: precipitacion,
      altitud: altitud,
      humedad: 60 + Math.random() * 30 // Humedad sigue siendo estimada (requiere API específica)
    };

    console.log('🌍 Datos climáticos obtenidos:', datosClimaticos);

    // Calcular aptitudes
    const aptitudTemp = calcularAptitud(
      datosClimaticos.temperatura,
      cultivo.temperaturaOptima.min,
      cultivo.temperaturaOptima.max
    );
    const aptitudPrec = calcularAptitud(
      datosClimaticos.precipitacion,
      cultivo.precipitacionOptima.min,
      cultivo.precipitacionOptima.max
    );
    const aptitudAlt = calcularAptitud(
      datosClimaticos.altitud,
      cultivo.altitudOptima.min,
      cultivo.altitudOptima.max
    );

    const aptitudTotal = (aptitudTemp + aptitudPrec + aptitudAlt) / 3;

    return {
      cultivo: cultivoSeleccionado,
      ubicacion: { lat: latNum, lng: lngNum, altitud },
      condicionesClimaticas: datosClimaticos,
      fuentesDatos: {
        temperatura: selectedData?.mean ? 'Datos de serie temporal' : 'Estimado',
        precipitacion: precipitacionFuente,
        altitud: altitudFuente
      },
      aptitudes: {
        temperatura: aptitudTemp,
        precipitacion: aptitudPrec,
        altitud: aptitudAlt,
        total: aptitudTotal
      },
      recomendacion: getRecomendacion(aptitudTotal),
      riesgos: evaluarRiesgos(datosClimaticos, cultivo),
      parametrosOptimos: {
        temperatura: `${cultivo.temperaturaOptima.min}°C - ${cultivo.temperaturaOptima.max}°C`,
        precipitacion: `${cultivo.precipitacionOptima.min} - ${cultivo.precipitacionOptima.max} mm/año`,
        altitud: `${cultivo.altitudOptima.min} - ${cultivo.altitudOptima.max} msnm`
      },
      ciclosAgricolas: {
        siembra: cultivo.cicloSiembra,
        cosecha: cultivo.cicloCosecha
      }
    };
  }

  /**
   * FUNCIÓN: Descargar datos del modal en formato JSON
   * Incluye metadatos completos del usuario, consulta y datos climatológicos
   * SOLO DESCARGA - No guarda en base de datos
   */
        async function downloadModalJSON() {
        if (!selectedData || !modalStartDate || !modalEndDate) return;

        const lat = parseFloat(selectedData.lat);
        const lng = parseFloat(selectedData.lng);
        const days = calculateDaysDifference(modalStartDate, modalEndDate);
        const series = await fetchSeriesFor(activeVar, lat, lng, days);
        const stats = computeStats(series);

        // Preparar datos para descarga (sin guardar en BD)
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
              tipo: "Poligono",
              centro: { latitud: selectedData.lat, longitud: selectedData.lng },
              puntosMuestreados: polygonData.samplePoints.map(([lat, lng]) => ({
                latitud: lat.toFixed(6),
                longitud: lng.toFixed(6)
              }))
            } : {
              tipo: "Punto unico",
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
            fuenteAPI: layerDefs[activeVar]?.apiName || "Desconocido"
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
          },
          cropAnalysis: cropAnalysisData ? {
            cultivo: cropAnalysisData.cultivo,
            ubicacion: cropAnalysisData.ubicacion,
            condicionesClimaticas: cropAnalysisData.condicionesClimaticas,
            fuentesDatos: cropAnalysisData.fuentesDatos,
            aptitudes: cropAnalysisData.aptitudes,
            recomendacion: cropAnalysisData.recomendacion,
            riesgos: cropAnalysisData.riesgos,
            parametrosOptimos: cropAnalysisData.parametrosOptimos,
            ciclosAgricolas: cropAnalysisData.ciclosAgricolas
          } : null
        };

        const blob = new Blob([JSON.stringify(dataWithMetadata, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `clima_${activeVar.replace(/\s+/g, '_')}_${days}dias_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
      }

  /**
   * FUNCIÓN: Descargar datos del panel en formato JSON
   * SOLO DESCARGA - No guarda en base de datos
   */
        async function downloadJSON() {
        if (!selectedData) return;

        const lat = parseFloat(selectedData.lat);
        const lng = parseFloat(selectedData.lng);
        const series = await fetchSeriesFor(activeVar, lat, lng, downloadDateRange);
        const stats = computeStats(series);

        // Preparar datos para descarga (sin guardar en BD)
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
              tipo: "Poligono",
              centro: { latitud: selectedData.lat, longitud: selectedData.lng },
              puntosMuestreados: polygonData.samplePoints.map(([lat, lng]) => ({
                latitud: lat.toFixed(6),
                longitud: lng.toFixed(6)
              }))
            } : {
              tipo: "Punto unico",
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
            fuenteAPI: layerDefs[activeVar]?.apiName || "Desconocido"
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
          },
          cropAnalysis: cropAnalysisData ? {
            cultivo: cropAnalysisData.cultivo,
            ubicacion: cropAnalysisData.ubicacion,
            condicionesClimaticas: cropAnalysisData.condicionesClimaticas,
            fuentesDatos: cropAnalysisData.fuentesDatos,
            aptitudes: cropAnalysisData.aptitudes,
            recomendacion: cropAnalysisData.recomendacion,
            riesgos: cropAnalysisData.riesgos,
            parametrosOptimos: cropAnalysisData.parametrosOptimos,
            ciclosAgricolas: cropAnalysisData.ciclosAgricolas
          } : null
        };

        const blob = new Blob([JSON.stringify(dataWithMetadata, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `clima_${activeVar.replace(/\s+/g, '_')}_${downloadDateRange}dias_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
      }

  /**
   * FUNCIÓN: Guardar en Mis Registros (sin descargar)
   * Guarda los datos actuales en MongoDB sin descargar archivo
   */
  async function saveToMyRecords() {
    if (!selectedData) {
      alert('No hay datos seleccionados para guardar');
      return;
    }

    // Mostrar loading
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'pdf-loading';
    loadingDiv.textContent = 'Guardando en tus registros...';
    document.body.appendChild(loadingDiv);

    try {
      const lat = parseFloat(selectedData.lat);
      const lng = parseFloat(selectedData.lng);
      const series = await fetchSeriesFor(activeVar, lat, lng, downloadDateRange);
      const stats = computeStats(series);

      // Preparar datos para guardar
      const dataToSave = {
        lat: selectedData.lat,
        lng: selectedData.lng,
        place: selectedData.place,
        variable: activeVar,
        unit: layerDefs[activeVar].legend.unit,
        value: series[series.length - 1].value,
        series: series,
        mean: stats.mean,
        max: stats.max,
        min: stats.min,
        dataStatusMessage: getDataStatusMessage(),
        isLive: isDataLive(),
        dataTimestamp: dataTimestamp,
        apiSource: layerDefs[activeVar]?.apiName,
        rangoTemporal: `${downloadDateRange} día${downloadDateRange > 1 ? 's' : ''}`,
        // Agregar datos de análisis de cultivos si están disponibles
        cropAnalysis: cropAnalysisData ? {
          cultivo: cropAnalysisData.cultivo,
          ubicacion: cropAnalysisData.ubicacion,
          condicionesClimaticas: cropAnalysisData.condicionesClimaticas,
          fuentesDatos: cropAnalysisData.fuentesDatos,
          aptitudes: cropAnalysisData.aptitudes,
          recomendacion: cropAnalysisData.recomendacion,
          riesgos: cropAnalysisData.riesgos,
          parametrosOptimos: cropAnalysisData.parametrosOptimos,
          ciclosAgricolas: cropAnalysisData.ciclosAgricolas
        } : null
      };

      // Guardar en la base de datos
      const saveResult = await saveClimateData(
        dataToSave,
        {
          ...currentUser,
          nombre: userInfo.nombre,
          rol: userInfo.rol
        },
        polygonData
      );

      if (saveResult.success) {
        alert('✅ Datos guardados exitosamente en tus registros');
        console.log('✅ Datos guardados con ID:', saveResult.data._id);
      } else {
        alert('❌ Error al guardar: ' + (saveResult.error || 'Error desconocido'));
        console.error('❌ Error guardando en BD:', saveResult.error);
      }
    } catch (error) {
      console.error('Error guardando datos:', error);
      alert('Error al guardar los datos. Por favor intente nuevamente.');
    } finally {
      document.body.removeChild(loadingDiv);
    }
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
   * SOLO DESCARGA - No guarda en base de datos
   */
      async function downloadModalPDF() {
      if (!selectedData || !modalStartDate || !modalEndDate) return;

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
   * SOLO DESCARGA - No guarda en base de datos
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

    // Generar PDF
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
    const pageWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const margin = 15;
    const contentWidth = pageWidth - (2 * margin);
    const maxY = pageHeight - 20; // Leave space for footer
    let y = margin;

    const logoBase64 = await loadLogoAsBase64();

    // Helper function to check if we need a new page
    const checkNewPage = (spaceNeeded = 10) => {
      if (y + spaceNeeded > maxY) {
        doc.addPage();
        y = margin;
        return true;
      }
      return false;
    };

    // Helper function to add section with auto page break
    const addText = (text, fontSize, isBold = false, maxWidth = contentWidth) => {
      checkNewPage(fontSize * 0.5);
      doc.setFontSize(fontSize);
      doc.setFont(undefined, isBold ? 'bold' : 'normal');
      const lines = doc.splitTextToSize(text, maxWidth);
      lines.forEach(line => {
        checkNewPage(fontSize * 0.5);
        doc.text(line, margin, y);
        y += fontSize * 0.4;
      });
      return y;
    };

    // ========================================
    // ENCABEZADO PROFESIONAL CON GRADIENTE
    // ========================================
    const headerHeight = 40;
    const steps = 30;
    for (let i = 0; i < steps; i++) {
      const yPos = (headerHeight / steps) * i;
      const height = headerHeight / steps + 0.5;

      const blueStart = { r: 30, g: 58, b: 138 };
      const blueEnd = { r: 59, g: 130, b: 246 };

      const ratio = i / steps;
      const r = Math.round(blueStart.r + (blueEnd.r - blueStart.r) * ratio);
      const g = Math.round(blueStart.g + (blueEnd.g - blueStart.g) * ratio);
      const b = Math.round(blueStart.b + (blueEnd.b - blueStart.b) * ratio);

      doc.setFillColor(r, g, b);
      doc.rect(0, yPos, pageWidth, height, 'F');
    }

    // Agregar logo
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'JPEG', margin, 8, 35, 25);
      } catch (error) {
        console.error('Error agregando logo:', error);
      }
    }

    // Título principal
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('REPORTE CLIMATICO', pageWidth / 2, 18, { align: 'center' });

    // Subtítulo con variable
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(activeVar, pageWidth / 2, 26, { align: 'center' });

    // Estado de los datos
    const statusMsg = getDataStatusMessage() || 'Estado desconocido';
    doc.setFontSize(9);
    doc.text(statusMsg, pageWidth / 2, 33, { align: 'center' });

    y = headerHeight + 10;
    doc.setTextColor(0, 0, 0);
    
    // ========================================
    // INFORMACIÓN DEL USUARIO
    // ========================================
    checkNewPage(30);
    doc.setFillColor(240, 249, 255);
    doc.roundedRect(margin, y, contentWidth, 28, 2, 2, 'F');
    y += 4;

    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 58, 138);
    doc.text('INFORMACION DEL USUARIO', margin + 2, y);
    y += 6;

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`Nombre: ${userInfo.nombre}`, margin + 2, y);
    y += 4;
    doc.text(`Rol: ${userInfo.rol}`, margin + 2, y);
    y += 4;
    doc.text(`Email: ${userInfo.email}`, margin + 2, y);
    y += 4;
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')} - ${new Date().toLocaleTimeString('es-ES')}`, margin + 2, y);
    y += 8;

    // ========================================
    // UBICACIÓN CONSULTADA
    // ========================================
    checkNewPage(35);
    doc.setFillColor(240, 249, 255);
    const ubicacionHeight = polygonData ? 30 : 24;
    doc.roundedRect(margin, y, contentWidth, ubicacionHeight, 2, 2, 'F');
    y += 4;

    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 58, 138);
    doc.text('UBICACION CONSULTADA', margin + 2, y);
    y += 6;

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);
    const placeText = doc.splitTextToSize(`Lugar: ${selectedData.place}`, contentWidth - 4);
    placeText.forEach(line => {
      checkNewPage(5);
      doc.text(line, margin + 2, y);
      y += 4;
    });

    if (polygonData) {
      doc.text(`Tipo: Area delimitada (Poligono)`, margin + 2, y);
      y += 4;
      doc.text(`Centro: Lat ${selectedData.lat}, Lng ${selectedData.lng}`, margin + 2, y);
      y += 4;
      doc.text(`Puntos muestreados: ${polygonData.samplePoints.length}`, margin + 2, y);
    } else {
      doc.text(`Coordenadas: Lat ${selectedData.lat}, Lng ${selectedData.lng}`, margin + 2, y);
    }
    y += 4;
    doc.text(`Periodo: ${series[0]?.date} a ${series[series.length - 1]?.date} (${daysRange} dias)`, margin + 2, y);
    y += 8;

    // ========================================
    // ESTADÍSTICAS
    // ========================================
    checkNewPage(25);
    doc.setFillColor(240, 249, 255);
    doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'F');
    y += 4;

    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 58, 138);
    doc.text('ESTADISTICAS', margin + 2, y);
    y += 6;

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`Valor actual: ${series[series.length - 1].value} ${selectedData.unit}`, margin + 2, y);
    y += 4;
    doc.text(`Promedio: ${stats.mean} ${selectedData.unit}`, margin + 2, y);
    y += 4;
    doc.text(`Maximo: ${stats.max} ${selectedData.unit} | Minimo: ${stats.min} ${selectedData.unit}`, margin + 2, y);
    y += 8;

    // ========================================
    // ANÁLISIS DE CULTIVOS
    // ========================================
    if (cropAnalysisData) {
      checkNewPage(60);

      // Título de sección
      doc.setFillColor(46, 125, 50);
      doc.rect(margin, y, contentWidth, 8, 'F');
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('ANALISIS DE CULTIVO', margin + 2, y + 5);
      y += 12;
      doc.setTextColor(0, 0, 0);

      // Información principal del cultivo
      checkNewPage(25);
      doc.setFillColor(232, 245, 233);
      doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'F');
      y += 4;

      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text(`Cultivo: ${cropAnalysisData.cultivo}`, margin + 2, y);
      y += 5;
      doc.setFont(undefined, 'normal');
      doc.text(`Nivel de Aptitud: ${cropAnalysisData.recomendacion?.nivel || 'N/A'} (${cropAnalysisData.aptitudes?.total || 'N/A'}%)`, margin + 2, y);
      y += 5;
      const recomTexto = cropAnalysisData.recomendacion?.texto || 'No disponible';
      const recomLines = doc.splitTextToSize(recomTexto, contentWidth - 4);
      recomLines.slice(0, 2).forEach(line => {
        doc.text(line, margin + 2, y);
        y += 4;
      });
      y += 4;

      // Aptitudes (barras visuales)
      checkNewPage(25);
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text('Aptitudes:', margin + 2, y);
      y += 5;
      doc.setFont(undefined, 'normal');

      const aptitudes = [
        { label: 'Temperatura', value: cropAnalysisData.aptitudes?.temperatura || 0, color: [251, 113, 22] },
        { label: 'Precipitacion', value: cropAnalysisData.aptitudes?.precipitacion || 0, color: [59, 130, 246] },
        { label: 'Altitud', value: cropAnalysisData.aptitudes?.altitud || 0, color: [139, 92, 246] }
      ];

      aptitudes.forEach(apt => {
        checkNewPage(6);
        doc.text(`${apt.label}: ${apt.value.toFixed(1)}%`, margin + 2, y);
        const barWidth = (apt.value / 100) * 60;
        doc.setFillColor(220, 220, 220);
        doc.rect(margin + 40, y - 3, 60, 4, 'F');
        doc.setFillColor(apt.color[0], apt.color[1], apt.color[2]);
        doc.rect(margin + 40, y - 3, barWidth, 4, 'F');
        y += 6;
      });
      y += 4;

      // Condiciones Climáticas
      if (cropAnalysisData.condicionesClimaticas) {
        checkNewPage(20);
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.text('Condiciones Actuales:', margin + 2, y);
        y += 5;
        doc.setFont(undefined, 'normal');
        doc.text(`Temp: ${cropAnalysisData.condicionesClimaticas.temperatura?.toFixed?.(1) || 'N/A'}°C | ` +
                 `Precip: ${cropAnalysisData.condicionesClimaticas.precipitacion?.toFixed?.(0) || 'N/A'} mm | ` +
                 `Alt: ${cropAnalysisData.condicionesClimaticas.altitud?.toFixed?.(0) || 'N/A'} msnm`, margin + 2, y);
        y += 8;
      }

      // Riesgos
      if (cropAnalysisData.riesgos && cropAnalysisData.riesgos.length > 0) {
        checkNewPage(15 + (cropAnalysisData.riesgos.length * 4));
        doc.setFillColor(255, 243, 224);
        const riskBoxHeight = 10 + (cropAnalysisData.riesgos.length * 4);
        doc.roundedRect(margin, y, contentWidth, riskBoxHeight, 2, 2, 'F');
        y += 4;

        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(230, 81, 0);
        doc.text('Riesgos:', margin + 2, y);
        y += 4;
        doc.setFont(undefined, 'normal');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(8);
        cropAnalysisData.riesgos.slice(0, 3).forEach(riesgo => {
          const riesgoLines = doc.splitTextToSize(`• ${riesgo}`, contentWidth - 6);
          riesgoLines.forEach(line => {
            doc.text(line, margin + 3, y);
            y += 3.5;
          });
        });
        y += 4;
      }

      // Parámetros Óptimos
      if (cropAnalysisData.parametrosOptimos) {
        checkNewPage(18);
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.text('Parametros Optimos:', margin + 2, y);
        y += 5;
        doc.setFont(undefined, 'normal');
        doc.setFontSize(8);

        if (cropAnalysisData.parametrosOptimos.temperatura) {
          const tempText = typeof cropAnalysisData.parametrosOptimos.temperatura === 'string'
            ? cropAnalysisData.parametrosOptimos.temperatura
            : `${cropAnalysisData.parametrosOptimos.temperatura.min}-${cropAnalysisData.parametrosOptimos.temperatura.max}°C`;
          doc.text(`Temp: ${tempText}`, margin + 2, y);
          y += 4;
        }

        if (cropAnalysisData.parametrosOptimos.precipitacion) {
          const precipText = typeof cropAnalysisData.parametrosOptimos.precipitacion === 'string'
            ? cropAnalysisData.parametrosOptimos.precipitacion
            : `${cropAnalysisData.parametrosOptimos.precipitacion.min}-${cropAnalysisData.parametrosOptimos.precipitacion.max} mm`;
          doc.text(`Precip: ${precipText}`, margin + 2, y);
          y += 4;
        }

        if (cropAnalysisData.parametrosOptimos.altitud) {
          const altText = typeof cropAnalysisData.parametrosOptimos.altitud === 'string'
            ? cropAnalysisData.parametrosOptimos.altitud
            : `${cropAnalysisData.parametrosOptimos.altitud.min}-${cropAnalysisData.parametrosOptimos.altitud.max} msnm`;
          doc.text(`Altitud: ${altText}`, margin + 2, y);
          y += 4;
        }
        y += 4;
      }

      y += 4;
    }

    // ========================================
    // MAPA Y GRÁFICOS
    // ========================================
    checkNewPage(110);

    // Mapa de ubicación
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 58, 138);
    doc.text('MAPA DE UBICACION', margin, y);
    y += 5;
    doc.setTextColor(0, 0, 0);

    const mapSnapshot = await captureMapSnapshot();
    if (mapSnapshot) {
      const mapWidth = contentWidth;
      const mapHeight = 80;
      doc.addImage(mapSnapshot, 'PNG', margin, y, mapWidth, mapHeight);
      y += mapHeight + 8;
    } else {
      doc.setFontSize(9);
      doc.setFont(undefined, 'italic');
      doc.text('(Mapa no disponible)', margin, y);
      y += 10;
    }

    // Serie temporal (gráfico)
    checkNewPage(85);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 58, 138);
    doc.text('SERIE TEMPORAL', margin, y);
    y += 5;
    doc.setTextColor(0, 0, 0);

    const chartImage = await createTimeSeriesChart(series, layerDefs[activeVar].legend.colors);
    if (chartImage) {
      const chartWidth = contentWidth;
      const chartHeight = 65;
      doc.addImage(chartImage, 'PNG', margin, y, chartWidth, chartHeight);
      y += chartHeight + 8;
    }

    // ========================================
    // DATOS DETALLADOS (TABLA COMPACTA)
    // ========================================
    checkNewPage(30);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 58, 138);
    doc.text('DATOS DETALLADOS', margin, y);
    y += 6;
    doc.setTextColor(0, 0, 0);

    // Encabezado de tabla
    doc.setFillColor(59, 130, 246);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('Fecha', margin + 2, y + 4);
    doc.text(`Valor (${selectedData.unit})`, margin + 50, y + 4);
    y += 6;
    doc.setTextColor(0, 0, 0);

    // Filas de datos (solo mostrar un resumen)
    doc.setFont(undefined, 'normal');
    doc.setFontSize(7);
    let rowBg = true;
    series.slice(0, 30).forEach((s) => {
      checkNewPage(4);
      if (rowBg) {
        doc.setFillColor(245, 247, 250);
        doc.rect(margin, y - 2.5, contentWidth, 4, 'F');
      }
      doc.text(s.date, margin + 2, y);
      doc.text(String(s.value), margin + 50, y);
      y += 4;
      rowBg = !rowBg;
    });

    if (series.length > 30) {
      y += 2;
      doc.setFont(undefined, 'italic');
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text(`... y ${series.length - 30} registros mas`, margin + 2, y);
      y += 6;
      doc.setTextColor(0, 0, 0);
    }

    // ========================================
    // PIE DE PÁGINA EN TODAS LAS PÁGINAS
    // ========================================
    const pageCount = doc.internal.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
      doc.text(`Pagina ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
      doc.setFontSize(7);
      doc.text('Sistema de Monitoreo Climatico - Climetrica', pageWidth / 2, pageHeight - 4, { align: 'center' });
    }

    // Guardar PDF
    const filename = `Reporte_${activeVar.replace(/\s+/g, '_')}_${daysRange}dias_${new Date().toISOString().slice(0,10)}.pdf`;
    doc.save(filename);
  }

  /**
   * FUNCIÓN: Manejar movimiento del mouse sobre la leyenda
   * Muestra el valor correspondiente a la posición del mouse
   */
  function onLegendMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    const cfg = layerDefs[activeVar].legend;
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
   * Se ejecuta cuando las capas están cargadas
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
    // No inicializar hasta que las capas estén cargadas
    if (loadingLayers) {
      console.log('⏳ Esperando a que se carguen las capas...');
      return;
    }

    console.log('🗺️ Inicializando mapa con', Object.keys(layerDefs).length, 'capas');

    const map = L.map(mapContainerRef.current, {
      center: [4.6, -74.1],  // Bogotá, Colombia
      zoom: 5.5,
      minZoom: 2,
      maxZoom: 18, // Aumentado de 10 a 18 para permitir más zoom
      maxBounds: [[-90, -180], [90, 180]], // Límites del mundo
      maxBoundsViscosity: 1.0,
      worldCopyJump: false,
      zoomControl: false, // Deshabilitamos el control por defecto
      preferCanvas: true, // Mejora el rendimiento en zoom alto
      zoomAnimation: true,
      zoomAnimationThreshold: 4
    });
    mapRef.current = map;

    // Agregar controles de zoom personalizados en esquina inferior derecha (donde estaban los botones de descargar)
    L.control.zoom({
      position: 'bottomleft'
    }).addTo(map);

    // Forzar recalculo de tamaño del mapa después de renderizar
    setTimeout(() => {
      try { map.invalidateSize(); } catch (e) { console.warn('invalidateSize err', e); }
    }, 200);

    // Listener para resize de ventana
    const onResize = () => { try { map.invalidateSize(); } catch {} };
    window.addEventListener('resize', onResize);

    // Listener para actualizar bounds del mapa (para animaciones)
    const updateMapBounds = () => {
      try {
        if (!map || !map._loaded) return;
        const bounds = map.getBounds();
        setMapBounds({
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest()
        });
      } catch (error) {
        console.warn('Error updating map bounds:', error);
      }
    };

    // Actualizar bounds cuando el mapa esté completamente cargado
    map.whenReady(() => {
      updateMapBounds();
      // También actualizar después de un delay adicional por seguridad
      setTimeout(updateMapBounds, 100);
      setTimeout(updateMapBounds, 500);
    });

    // Actualizar bounds cuando el mapa se mueva o haga zoom
    map.on('moveend', updateMapBounds);
    map.on('zoomend', updateMapBounds);

    // Agregar capa base inicial
    const baseMapConfig = BASE_MAPS[selectedBaseMap];
    const baseLayer = L.tileLayer(baseMapConfig.url, {
      attribution: baseMapConfig.attribution,
      zIndex: 1,
      noWrap: true,
      bounds: [[-90, -180], [90, 180]],
      maxZoom: baseMapConfig.maxZoom,
      maxNativeZoom: baseMapConfig.maxZoom
    }).addTo(map);

    baseLayerRef.current = baseLayer;

    // ========================================
    // AGREGAR CAPA DE DÍA/NOCHE (TERMINATOR)
    // ========================================
    let terminatorLayer = terminator();
    terminatorLayer.setStyle({
      fillColor: '#001a33',
      fillOpacity: 0.5,
      color: '#ffd700',
      weight: 3,
      opacity: 0.8
    });
    terminatorLayer.addTo(map);

    // Actualizar cada 10 segundos para tiempo real
    const terminatorInterval = setInterval(() => {
      if (terminatorLayer && map.hasLayer(terminatorLayer)) {
        terminatorLayer.setDate(new Date());
      }
    }, 10000);

    // ========================================
    // TOOLTIP DINÁMICO PARA MOSTRAR DATOS AL PASAR EL MOUSE
    // ========================================
    const tooltipDiv = L.DomUtil.create('div', 'map-hover-tooltip');
    tooltipDiv.style.cssText = `
      position: absolute;
      display: none;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      padding: 4px 8px;
      border-radius: 4px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
      pointer-events: none;
      z-index: 10000;
      font-size: 11px;
      font-weight: 600;
      color: #1f2937;
      border: 1px solid rgba(59, 130, 246, 0.3);
      white-space: nowrap;
    `;
    document.body.appendChild(tooltipDiv);

    // Guardar referencia para poder acceder desde useEffect
    tooltipRef.current = tooltipDiv;

    let tooltipTimeout;
    let lastTooltipCoords = null;

    map.on('mousemove', (e) => {
      const { lat, lng } = e.latlng;
      const currentVar = activeVarRef.current;

      // Mostrar tooltip solo si hay una variable activa
      if (currentVar && layerDefs[currentVar]) {
        const layerDef = layerDefs[currentVar];

        tooltipDiv.style.display = 'block';

        // Posicionamiento dinámico del tooltip
        const mouseX = e.originalEvent.pageX;
        const mouseY = e.originalEvent.pageY;
        const tooltipWidth = 120; // Ancho aproximado del tooltip
        const tooltipHeight = 30; // Alto aproximado del tooltip
        const offset = 15; // Offset desde el cursor

        // Obtener dimensiones de la ventana
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        // Calcular posición horizontal
        let left = mouseX + offset;
        if (left + tooltipWidth > windowWidth) {
          // Si se sale por la derecha, ponerlo a la izquierda del cursor
          left = mouseX - tooltipWidth - offset;
        }

        // Calcular posición vertical
        let top = mouseY - tooltipHeight / 2;
        if (top < 0) {
          // Si se sale por arriba, ponerlo debajo del cursor
          top = mouseY + offset;
        } else if (top + tooltipHeight > windowHeight) {
          // Si se sale por abajo, ponerlo arriba del cursor
          top = mouseY - tooltipHeight - offset;
        }

        tooltipDiv.style.left = left + 'px';
        tooltipDiv.style.top = top + 'px';

        // Guardar coordenadas actuales
        lastTooltipCoords = { lat, lng, currentVar };

        // Mostrar "..." mientras carga
        tooltipDiv.innerHTML = `
          <div style="font-size: 11px; font-weight: 700; color: #6b7280;">
            ...
          </div>
        `;

        // Debounce para obtener el valor real
        clearTimeout(tooltipTimeout);
        tooltipTimeout = setTimeout(async () => {
          try {
            // Verificar que aún estamos en las mismas coordenadas
            if (lastTooltipCoords && lastTooltipCoords.lat === lat && lastTooltipCoords.lng === lng) {
              // Obtener el último valor de la serie temporal (1 día)
              const series = await fetchSeriesFor(currentVar, lat, lng, 1);
              if (series && series.length > 0 && lastTooltipCoords.lat === lat) {
                const latestValue = series[series.length - 1].value;
                tooltipDiv.innerHTML = `
                  <div style="font-size: 11px; font-weight: 700; color: #3b82f6;">
                    ${latestValue} ${layerDef.legend.unit}
                  </div>
                `;
              }
            }
          } catch (error) {
            console.warn('Error obteniendo valor del tooltip:', error);
          }
        }, 300);
      } else {
        tooltipDiv.style.display = 'none';
        lastTooltipCoords = null;
      }
    });

    map.on('mouseout', () => {
      tooltipDiv.style.display = 'none';
    });

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
    Object.entries(layerDefs).forEach(([name, cfg]) => {
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
            maxNativeZoom: cfg.maxNativeZoom || 7,
            maxZoom: 18, // Permite zoom hasta 18 con upscaling de tiles
            noWrap: true,
            crossOrigin: true,
            errorTileUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
            updateWhenZooming: false, // Mejora la fluidez del zoom
            keepBuffer: 2 // Mantiene tiles en caché para mejor experiencia
          };

          if (cfg.useLowResFallback) {
            layerOpts.tileSize = 512;
            layerOpts.zoomOffset = -1;
            layerOpts.maxZoom = 18; // Permitir zoom alto incluso con fallback
          }

          // Priorizar OpenWeatherMap si está disponible como alternativa
          const owmAltImmediate = Array.isArray(cfg.alt) ? cfg.alt.find(a => a.type === 'openweathermap') : (cfg.alt && cfg.alt.type === 'openweathermap' ? cfg.alt : null);
          let layer = null;
          if (owmAltImmediate && process.env.REACT_APP_OWM_KEY) {
            try {
              const key = process.env.REACT_APP_OWM_KEY;
              const owmUrl = `https://tile.openweathermap.org/map/${owmAltImmediate.layer}/{z}/{x}/{y}.png?appid=${key}`;
              const owmOpts = Object.assign({}, layerOpts);
              owmOpts.maxZoom = 18; // OpenWeatherMap con upscaling
              if (cfg.useLowResFallback) {
                owmOpts.tileSize = 512;
                owmOpts.zoomOffset = -1;
              }
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
              maxNativeZoom: cfg.maxNativeZoom || 10,
              maxZoom: 18, // Permitir zoom alto con upscaling
              noWrap: cfg.noWrap || false,
              errorTileUrl: cfg.errorTileUrl || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
              updateWhenZooming: false,
              keepBuffer: 2
            };
            if (cfg.useLowResFallback) {
              owmOpts.tileSize = 512;
              owmOpts.zoomOffset = -1;
              owmOpts.maxZoom = 18; // Mantener zoom alto con fallback
            }
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
            maxNativeZoom: cfg.maxNativeZoom || 10,
            maxZoom: 18, // Permitir zoom alto con upscaling
            subdomains: cfg.subdomains || 'abc',
            noWrap: cfg.noWrap || false,
            errorTileUrl: cfg.errorTileUrl || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
            updateWhenZooming: false,
            keepBuffer: 2
          };
          if (cfg.useLowResFallback) {
            opts.tileSize = 512;
            opts.zoomOffset = -1;
            opts.maxZoom = 18; // Mantener zoom alto con fallback
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
      clearInterval(terminatorInterval);
      if (tooltipDiv && tooltipDiv.parentNode) {
        tooltipDiv.parentNode.removeChild(tooltipDiv);
      }
      map.remove();
      mapRef.current = null;
      window.removeEventListener('resize', onResize);
    };
  }, [loadingLayers]); // Se ejecuta cuando termina de cargar las capas

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
    if (!map || loadingLayers) return; // Esperar a que el mapa y las capas estén listos

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
  }, [drawMode, downloadDateRange, loadingLayers, handlePointSelection]);

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

    // Actualizar ref de variable activa
    activeVarRef.current = activeVar;

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
          unit: layerDefs[activeVar].legend.unit,
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
   * EFECTO: CAMBIAR MAPA BASE DINÁMICAMENTE
   * ========================================
   *
   * Cuando el usuario selecciona un nuevo mapa base,
   * se remueve la capa anterior y se agrega la nueva
   */
  useEffect(() => {
    if (!mapRef.current || !baseLayerRef.current) return;

    const map = mapRef.current;
    const oldLayer = baseLayerRef.current;

    // Remover capa anterior
    map.removeLayer(oldLayer);

    // Agregar nueva capa
    const baseMapConfig = BASE_MAPS[selectedBaseMap];
    const newLayer = L.tileLayer(baseMapConfig.url, {
      attribution: baseMapConfig.attribution,
      zIndex: 1,
      noWrap: true,
      bounds: [[-90, -180], [90, 180]],
      maxZoom: baseMapConfig.maxZoom,
      maxNativeZoom: baseMapConfig.maxZoom
    }).addTo(map);

    baseLayerRef.current = newLayer;

    console.log(`🗺️ Base map changed to: ${baseMapConfig.name}`);
  }, [selectedBaseMap]);

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
        unit: layerDefs[activeVar].legend.unit,
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

  // Obtener configuración de leyenda de la variable activa.
  // Puede no existir todavía si el backend aún no cargó las capas o si la
  // variable activa no coincide con ninguna capa disponible.
  const legend = layerDefs[activeVar]?.legend || { colors: [], min: 0, max: 100, unit: "" };

  // ============================================================================
  // RENDERIZADO DEL COMPONENTE
  // ============================================================================
  return (
    <div className="um-dashboard">
      {/* Contenedor del mapa Leaflet con overlay de animación */}
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <div ref={mapContainerRef} className="um-map" />

        {/* Overlay de animación de capas con datos reales */}
        <AnimatedLayerOverlay
          activeVariable={activeVar}
          isVisible={mapBounds !== null && activeVar !== null}
          mapBounds={mapBounds}
          tileData={currentTileData}
          legendColors={layerDefs[activeVar]?.legend?.colors || []}
          legendMin={layerDefs[activeVar]?.legend?.min || 0}
          legendMax={layerDefs[activeVar]?.legend?.max || 100}
        />
      </div>

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
        <label className="control-label">Lugar</label>
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
          {Object.keys(layerDefs).map((k) => <option key={k} value={k}>{k}</option>)}
        </select>

        {/* Selector de cultivo */}
        <label className="control-label">EscogeCultivo</label>
        <select
          className="control-select"
          value={cultivoSeleccionado}
          onChange={(e) => setCultivoSeleccionado(e.target.value)}
          title="Selecciona un cultivo para análisis de aptitud"
        >
          {Object.keys(CULTIVOS).map((cultivo) => (
            <option key={cultivo} value={cultivo}>
              {CULTIVOS[cultivo].icono} {cultivo}
            </option>
          ))}
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

      </div>

      {/* ========================================
          SELECTOR DE MAPA BASE
          ======================================== */}
      {showBaseMapSelector && (
        <div className="basemap-selector-overlay" onClick={() => setShowBaseMapSelector(false)}>
          <div className="basemap-selector-panel" onClick={(e) => e.stopPropagation()}>
            <div className="basemap-selector-header">
              <h3>Estilo del Mapa</h3>
              <button
                className="basemap-close-btn"
                onClick={() => setShowBaseMapSelector(false)}
              >
                ✕ 
              </button>
            </div>
            <div className="basemap-selector-grid">
              {Object.entries(BASE_MAPS).map(([key, config]) => (
                <div
                  key={key}
                  className={`basemap-option ${selectedBaseMap === key ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedBaseMap(key);
                    setShowBaseMapSelector(false);
                  }}
                >
                  <div className="basemap-preview">
                    <div className={`basemap-preview-image basemap-${key}`}></div>
                  </div>
                  <div className="basemap-info">
                    <div className="basemap-name">{config.name}</div>
                    <div className="basemap-description">{config.description}</div>
                  </div>
                  {selectedBaseMap === key && (
                    <div className="basemap-check">✓</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================
          LEYENDA DE COLORES
          ======================================== */}
      <div className="um-legend" onMouseMove={onLegendMove} onMouseLeave={onLegendLeave}>
        <div className="um-legend-unit">{legend.unit}</div>
        <div 
          className="um-legend-bar" 
          style={{ background: `linear-gradient(to right, ${legend.colors.join(",")})` }}
        />
        <div className="um-legend-labels">
          <div>{legend.min}</div>
          <div>{legend.max}</div>
        </div>
        {legendHover && <div className="um-legend-tooltip">{legendHover}</div>}
      </div>

      {/* ========================================
          BOTONES DE DESCARGA Y GUARDADO
          Movidos al panel lateral de UserPanel
          ======================================== */}

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
          PANEL LATERAL INICIAL (Mini popup)
          ======================================== */}
      {selectedData && !modalOpen && (
        <div className="um-side-panel">
          {/* Encabezado del panel */}
          <div className="side-panel-header">
            <h3 className="side-panel-title">{activeVar}</h3>
            <button className="modal-close-btn" onClick={() => setSelectedData(null)}>✕</button>
          </div>

          {/* Pestañas del panel lateral */}
          <div className="um-side-panel-tabs">
            <button
              className={`um-side-panel-tab ${activeModalTab === 'clima' ? 'active' : ''}`}
              onClick={() => setActiveModalTab('clima')}
            >
              🌡️ Clima
            </button>
            <button
              className={`um-side-panel-tab ${activeModalTab === 'cultivos' ? 'active' : ''}`}
              onClick={() => setActiveModalTab('cultivos')}
            >
              🌾 Cultivo
            </button>
          </div>

          {/* Contenido de la pestaña de Clima */}
          {activeModalTab === 'clima' && (
            <>
              {/* Información del lugar */}
              <div className="side-panel-info">
            <div className="modal-info-item">
              <strong>Lugar:</strong> {selectedData.isPolygon ? 'Región seleccionada' : selectedData.place}
            </div>

            {/* Si es un polígono, mostrar solo el resumen */}
            {selectedData.isPolygon && selectedData.samplePoints ? (
              <div className="modal-info-item">
                <strong>Puntos de muestreo:</strong> {selectedData.samplePoints.length} puntos
              </div>
            ) : (
              <div className="modal-info-item">
                <strong>Coordenadas:</strong> {selectedData.lat}, {selectedData.lng}
              </div>
            )}

            {selectedData.series && selectedData.series.length > 0 && (
              <>
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
          </div>

              {/* Mini gráfico */}
              <div className="side-panel-chart">
                <canvas ref={popupCanvasRef} width={318} height={100} />
              </div>

              {/* Botón para ampliar */}
              <button
                className="side-panel-expand-btn"
                onClick={async () => {
                  setModalOpen(true);

                  // Realizar análisis de cultivo
                  const cropAnalysis = await realizarAnalisisCultivo(selectedData.lat, selectedData.lng);
                  setCropAnalysisData(cropAnalysis);

                  const modalStart = startDate || getDefaultStartDate();
                  const modalEnd = endDate || getDefaultEndDate();
                  setModalStartDate(modalStart);
                  setModalEndDate(modalEnd);
                  const days = calculateDaysDifference(modalStart, modalEnd);
                  setTimeout(() => drawModalSeries(activeVar, selectedData.lat, selectedData.lng, days), 120);
                }}
              >
                Ampliar serie
              </button>
            </>
          )}

          {/* Contenido de la pestaña de Cultivos */}
          {activeModalTab === 'cultivos' && cropAnalysisData && cropAnalysisData.aptitudes && cropAnalysisData.recomendacion && (
            <div className="um-side-panel-crop">
              {/* Encabezado compacto del cultivo */}
              <div className="side-crop-header">
                <span className="side-crop-icon">{CULTIVOS[cropAnalysisData.cultivo]?.icono || '🌱'}</span>
                <div>
                  <h4>{cropAnalysisData.cultivo}</h4>
                  <p className="side-crop-coords">
                    📍 {cropAnalysisData.ubicacion?.lat?.toFixed(4) || 'N/A'}, {cropAnalysisData.ubicacion?.lng?.toFixed(4) || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Aptitud Total Compacta */}
              <div
                className="side-crop-aptitud"
                style={{
                  backgroundColor: (cropAnalysisData.recomendacion?.color || '#666') + '15',
                  borderColor: cropAnalysisData.recomendacion?.color || '#666'
                }}
              >
                <div className="side-crop-aptitud-main">
                  <span className="side-crop-percentage">{cropAnalysisData.aptitudes?.total?.toFixed(2) || '0'}%</span>
                  <span
                    className="side-crop-level"
                    style={{ color: cropAnalysisData.recomendacion?.color || '#666' }}
                  >
                    {cropAnalysisData.recomendacion?.nivel || 'N/A'}
                  </span>
                </div>
                <p className="side-crop-text">{cropAnalysisData.recomendacion?.texto || 'No disponible'}</p>
              </div>

              {/* Barras de aptitud compactas */}
              <div className="side-crop-bars">
                <div className="side-crop-bar-item" title={`Temperatura: ${cropAnalysisData.aptitudes?.temperatura?.toFixed(2) || '0'}% de aptitud`}>
                  <span title="Temperatura">🌡️</span>
                  <div className="side-crop-bar" title={`Temperatura: ${cropAnalysisData.aptitudes?.temperatura?.toFixed(2) || '0'}%`}>
                    <div
                      className="side-crop-bar-fill"
                      style={{
                        width: `${cropAnalysisData.aptitudes?.temperatura || 0}%`,
                        backgroundColor: '#f97316'
                      }}
                    ></div>
                  </div>
                  <span>{cropAnalysisData.aptitudes?.temperatura?.toFixed(2) || '0'}%</span>
                </div>
                <div className="side-crop-bar-item" title={`Precipitación: ${cropAnalysisData.aptitudes?.precipitacion?.toFixed(2) || '0'}% de aptitud`}>
                  <span title="Precipitación">💧</span>
                  <div className="side-crop-bar" title={`Precipitación: ${cropAnalysisData.aptitudes?.precipitacion?.toFixed(2) || '0'}%`}>
                    <div
                      className="side-crop-bar-fill"
                      style={{
                        width: `${cropAnalysisData.aptitudes?.precipitacion || 0}%`,
                        backgroundColor: '#3b82f6'
                      }}
                    ></div>
                  </div>
                  <span>{cropAnalysisData.aptitudes?.precipitacion?.toFixed(2) || '0'}%</span>
                </div>
                <div className="side-crop-bar-item" title={`Altitud: ${cropAnalysisData.aptitudes?.altitud?.toFixed(2) || '0'}% de aptitud`}>
                  <span title="Altitud">⛰️</span>
                  <div className="side-crop-bar" title={`Altitud: ${cropAnalysisData.aptitudes?.altitud?.toFixed(2) || '0'}%`}>
                    <div
                      className="side-crop-bar-fill"
                      style={{
                        width: `${cropAnalysisData.aptitudes?.altitud || 0}%`,
                        backgroundColor: '#8b5cf6'
                      }}
                    ></div>
                  </div>
                  <span>{cropAnalysisData.aptitudes?.altitud?.toFixed(2) || '0'}%</span>
                </div>
              </div>

              {/* Botón para ver más */}
              <button
                className="side-panel-expand-btn"
                onClick={async () => {
                  setModalOpen(true);
                  const modalStart = startDate || getDefaultStartDate();
                  const modalEnd = endDate || getDefaultEndDate();
                  setModalStartDate(modalStart);
                  setModalEndDate(modalEnd);
                  const days = calculateDaysDifference(modalStart, modalEnd);
                  setTimeout(() => drawModalSeries(activeVar, selectedData.lat, selectedData.lng, days), 120);
                }}
              >
                Ver análisis completo
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================
          MODAL DE SERIE TEMPORAL AMPLIADA
          ======================================== */}
      {modalOpen && (
        <div className="um-modal" onClick={() => setModalOpen(false)}>
          <div className="um-modal-card" onClick={(e) => e.stopPropagation()}>
            {/* Encabezado del modal - FIJO */}
            <div className="um-modal-header">
              <div>
                <h3 className="modal-title">{activeVar} — Serie ampliada</h3>
                {selectedData && (
                  <p className="modal-subtitle">
                    📍 {selectedData.isPolygon ? 'Región seleccionada' : selectedData.place}
                  </p>
                )}
              </div>
              <button className="modal-close-btn" onClick={() => setModalOpen(false)}>✕</button>
            </div>

            {/* Pestañas del modal */}
            <div className="um-modal-tabs">
              <button
                className={`um-modal-tab ${activeModalTab === 'clima' ? 'active' : ''}`}
                onClick={() => setActiveModalTab('clima')}
              >
                🌡️ Datos Climáticos
              </button>
              <button
                className={`um-modal-tab ${activeModalTab === 'cultivos' ? 'active' : ''}`}
                onClick={() => setActiveModalTab('cultivos')}
              >
                🌾 Análisis de Cultivos
              </button>
            </div>

            {/* Contenido scrollable */}
            <div className="um-modal-content-wrapper">
              {/* PESTAÑA DE DATOS CLIMÁTICOS */}
              {activeModalTab === 'clima' && (
                <>
                  {/* Descripción de la serie temporal */}
                  <div className="um-modal-description">
                    <p>
                      Esta gráfica muestra la serie temporal completa de <strong>{activeVar}</strong> para la ubicación seleccionada.
                      {selectedData && selectedData.isPolygon && selectedData.samplePoints && (
                        <span> Los datos representan el promedio de <strong>{selectedData.samplePoints.length} puntos de muestreo</strong> distribuidos dentro del área seleccionada.</span>
                      )}
                      {' '}Puedes ajustar el rango de fechas para visualizar períodos específicos y descargar los datos en formato JSON o PDF.
                    </p>
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
                <canvas ref={modalCanvasRef} width={920} height={280} />
              </div>

              {/* Información del lugar seleccionado */}
              <div className="um-modal-info">
                {selectedData && (
                  <>
                    <div className="modal-info-item">
                      <strong>Lugar:</strong> {selectedData.isPolygon ? 'Región seleccionada' : selectedData.place}
                    </div>

                    {/* Si es un polígono, mostrar los puntos de muestreo */}
                    {selectedData.isPolygon && selectedData.samplePoints ? (
                      <>
                        <div className="modal-info-item" style={{ gridColumn: '1 / -1' }}>
                          <strong>Puntos de muestreo:</strong> {selectedData.samplePoints.length} puntos distribuidos en el área
                        </div>
                        {selectedData.samplePoints.map((point, idx) => (
                          <div key={idx} className="modal-info-item">
                            <strong>Punto {idx + 1}:</strong> {point[0].toFixed(6)}, {point[1].toFixed(6)}
                          </div>
                        ))}
                      </>
                    ) : (
                      <div className="modal-info-item">
                        <strong>Coordenadas:</strong> {selectedData.lat}, {selectedData.lng}
                      </div>
                    )}

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
                </>
              )}

              {/* PESTAÑA DE ANÁLISIS DE CULTIVOS */}
              {activeModalTab === 'cultivos' && (
                <>
                  {(!cropAnalysisData || !cropAnalysisData.aptitudes || !cropAnalysisData.recomendacion) ? (
                    <div className="um-crop-analysis" style={{ padding: '20px', textAlign: 'center' }}>
                      <p style={{ color: '#999', fontSize: '1.1em' }}>
                        ℹ️ No hay análisis de cultivo disponible.<br/>
                        Selecciona un cultivo y un punto en el mapa para ver el análisis.
                      </p>
                    </div>
                  ) : (
                    <div className="um-crop-analysis">
                  {/* Encabezado del Cultivo */}
                  <div className="crop-header-card">
                    <span className="crop-icon-large">{CULTIVOS[cropAnalysisData.cultivo]?.icono || '🌱'}</span>
                    <div className="crop-header-info">
                      <h4>{cropAnalysisData.cultivo}</h4>
                      <p className="crop-location">
                        📍 Lat: {cropAnalysisData.ubicacion?.lat?.toFixed(4) || 'N/A'}, Lng: {cropAnalysisData.ubicacion?.lng?.toFixed(4) || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Aptitud Total */}
                  <div
                    className="crop-aptitud-total-card"
                    style={{
                      backgroundColor: (cropAnalysisData.recomendacion?.color || '#666') + '15',
                      borderColor: cropAnalysisData.recomendacion?.color || '#666'
                    }}
                  >
                    <div className="crop-aptitud-main">
                      <span className="crop-aptitud-percentage">{cropAnalysisData.aptitudes?.total?.toFixed(2) || '0'}%</span>
                      <span
                        className="crop-aptitud-level"
                        style={{ color: cropAnalysisData.recomendacion?.color || '#666' }}
                      >
                        {cropAnalysisData.recomendacion?.nivel || 'N/A'}
                      </span>
                    </div>
                    <p className="crop-aptitud-description">{cropAnalysisData.recomendacion?.texto || 'No disponible'}</p>
                  </div>

                  {/* Detalles de Aptitud */}
                  <div className="crop-details-section">
                    <h5>📊 Detalles de Aptitud</h5>
                    <div className="crop-aptitud-bars">
                      <div className="crop-bar-item" title={`Temperatura: ${cropAnalysisData.aptitudes?.temperatura?.toFixed(2) || '0'}% de aptitud`}>
                        <span className="crop-bar-label" title="Temperatura">🌡️ Temperatura</span>
                        <div className="crop-bar-container" title={`Temperatura: ${cropAnalysisData.aptitudes?.temperatura?.toFixed(2) || '0'}%`}>
                          <div
                            className="crop-bar-fill"
                            style={{
                              width: `${cropAnalysisData.aptitudes?.temperatura || 0}%`,
                              backgroundColor: '#f97316'
                            }}
                          ></div>
                        </div>
                        <span className="crop-bar-value">{cropAnalysisData.aptitudes?.temperatura?.toFixed(2) || '0'}%</span>
                      </div>
                      <div className="crop-bar-item" title={`Precipitación: ${cropAnalysisData.aptitudes?.precipitacion?.toFixed(2) || '0'}% de aptitud`}>
                        <span className="crop-bar-label" title="Precipitación">💧 Precipitación</span>
                        <div className="crop-bar-container" title={`Precipitación: ${cropAnalysisData.aptitudes?.precipitacion?.toFixed(2) || '0'}%`}>
                          <div
                            className="crop-bar-fill"
                            style={{
                              width: `${cropAnalysisData.aptitudes?.precipitacion || 0}%`,
                              backgroundColor: '#3b82f6'
                            }}
                          ></div>
                        </div>
                        <span className="crop-bar-value">{cropAnalysisData.aptitudes?.precipitacion?.toFixed(2) || '0'}%</span>
                      </div>
                      <div className="crop-bar-item" title={`Altitud: ${cropAnalysisData.aptitudes?.altitud?.toFixed(2) || '0'}% de aptitud`}>
                        <span className="crop-bar-label" title="Altitud">⛰️ Altitud</span>
                        <div className="crop-bar-container" title={`Altitud: ${cropAnalysisData.aptitudes?.altitud?.toFixed(2) || '0'}%`}>
                          <div
                            className="crop-bar-fill"
                            style={{
                              width: `${cropAnalysisData.aptitudes?.altitud || 0}%`,
                              backgroundColor: '#8b5cf6'
                            }}
                          ></div>
                        </div>
                        <span className="crop-bar-value">{cropAnalysisData.aptitudes?.altitud?.toFixed(2) || '0'}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Condiciones Climáticas */}
                  {cropAnalysisData.condicionesClimaticas && (
                    <div className="crop-conditions-section">
                      <h5>🌤️ Condiciones Climáticas</h5>
                      <div className="crop-conditions-grid">
                        <div className="crop-condition-box" title={`Temperatura actual: ${cropAnalysisData.condicionesClimaticas.temperatura?.toFixed(1) || 'N/A'}°C`}>
                          <span className="crop-condition-label" title="Temperatura">🌡️ Temperatura</span>
                          <span className="crop-condition-value">{cropAnalysisData.condicionesClimaticas.temperatura?.toFixed(1) || 'N/A'}°C</span>
                        </div>
                        <div className="crop-condition-box" title={`Precipitación anual: ${cropAnalysisData.condicionesClimaticas.precipitacion?.toFixed(0) || 'N/A'} mm`}>
                          <span className="crop-condition-label" title="Precipitación">💧 Precipitación</span>
                          <span className="crop-condition-value">{cropAnalysisData.condicionesClimaticas.precipitacion?.toFixed(0) || 'N/A'} mm</span>
                        </div>
                        <div className="crop-condition-box" title={`Altitud: ${cropAnalysisData.condicionesClimaticas.altitud?.toFixed(0) || 'N/A'} metros sobre el nivel del mar`}>
                          <span className="crop-condition-label" title="Altitud">⛰️ Altitud</span>
                          <span className="crop-condition-value">{cropAnalysisData.condicionesClimaticas.altitud?.toFixed(0) || 'N/A'} msnm</span>
                        </div>
                        <div className="crop-condition-box" title={`Humedad relativa: ${cropAnalysisData.condicionesClimaticas.humedad?.toFixed(1) || 'N/A'}%`}>
                          <span className="crop-condition-label" title="Humedad">💦 Humedad</span>
                          <span className="crop-condition-value">{cropAnalysisData.condicionesClimaticas.humedad?.toFixed(1) || 'N/A'}%</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Riesgos */}
                  {cropAnalysisData.riesgos && cropAnalysisData.riesgos.length > 0 && (
                    <div className="crop-risks-section">
                      <h5>⚠️ Riesgos Identificados</h5>
                      <ul className="crop-risks-list">
                        {cropAnalysisData.riesgos.map((riesgo, idx) => (
                          <li key={idx}>{riesgo}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Información del Cultivo */}
                  {CULTIVOS[cropAnalysisData.cultivo] && (
                    <div className="crop-info-section">
                      <h5>📋 Información del Cultivo</h5>
                      <div className="crop-info-list">
                        <div className="crop-info-row">
                          <strong>Temp. Óptima:</strong>
                          <span>{CULTIVOS[cropAnalysisData.cultivo].temperaturaOptima.min}°C - {CULTIVOS[cropAnalysisData.cultivo].temperaturaOptima.max}°C</span>
                        </div>
                        <div className="crop-info-row">
                          <strong>Precip. Óptima:</strong>
                          <span>{CULTIVOS[cropAnalysisData.cultivo].precipitacionOptima.min} - {CULTIVOS[cropAnalysisData.cultivo].precipitacionOptima.max} mm</span>
                        </div>
                        <div className="crop-info-row">
                          <strong>Alt. Óptima:</strong>
                          <span>{CULTIVOS[cropAnalysisData.cultivo].altitudOptima.min} - {CULTIVOS[cropAnalysisData.cultivo].altitudOptima.max} msnm</span>
                        </div>
                        <div className="crop-info-row">
                          <strong>Siembra:</strong>
                          <span>{CULTIVOS[cropAnalysisData.cultivo].cicloSiembra}</span>
                        </div>
                        <div className="crop-info-row">
                          <strong>Cosecha:</strong>
                          <span>{CULTIVOS[cropAnalysisData.cultivo].cicloCosecha}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                  )}
                </>
              )}
            </div>

            {/* Botones del modal - FIJOS */}
            <div className="um-modal-footer">
              <button className="um-btn" onClick={downloadModalJSON}>
                <img src="/iconos/download.png" alt="" />
                Descargar JSON
              </button>
              <button className="um-btn danger" onClick={downloadModalPDF}>
                <img src="/iconos/file-pdf.png" alt="" />
                Descargar PDF
              </button>
              <button className="um-btn btn-close-modal" onClick={() => setModalOpen(false)}>
                ✕ Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

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
            width: `${dropdownPosition.width || 200}px`
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
                console.log('🖱️ Click en sugerencia:', suggestion.shortName || suggestion.display_name);
                selectSuggestion(suggestion);
              }}
              onMouseDown={(e) => {
                // Prevenir que el mousedown cierre el dropdown antes del click
                e.preventDefault();
              }}
            >
              <div className="suggestion-icon">📌</div>
              <div className="suggestion-content">
                <div className="suggestion-name">{suggestion.shortName || suggestion.display_name}</div>
                {suggestion.country && <div className="suggestion-type">{suggestion.country}</div>}
              </div>
            </div>
          ))}
        </div>,
        document.body // Renderizar en el body
      )}

      {/* ========================================
          BOTÓN DE MAPA BASE - JUNTO AL ZOOM
          ======================================== */}
      <button
        className="map-layer-button-zoom"
        onClick={() => setShowBaseMapSelector(!showBaseMapSelector)}
        title="Cambiar estilo del mapa base"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
          <polyline points="2 17 12 22 22 17"></polyline>
          <polyline points="2 12 12 17 22 12"></polyline>
        </svg>
      </button>
    </div>
  );
});

ClimateDashboard.displayName = 'ClimateDashboard';

export default ClimateDashboard;
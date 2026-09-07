import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, Polygon, useMap } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import domtoimage from "dom-to-image-more";
import jsPDF from "jspdf";
import { Chart } from "chart.js/auto";
import "leaflet/dist/leaflet.css";
import API from "../api/api";
import { handleAPIErrorWithAuth, handleAPIError } from "../utils/errorHandler";
import styles from "../styles/ClimateDashboard.module.css";

/**
 * Componente helper para capturar la referencia del mapa de Leaflet
 */
function MapRefHelper({ mapRef }) {
  const map = useMap();
  useEffect(() => {
    if (map) {
      mapRef.current = map;
    }
  }, [map, mapRef]);
  return null;
}

/**
 * Definiciones de capas climáticas para renderizar en el mapa
 * Basado en las definiciones de UserMapDashboard
 */
const LAYER_DEFS = {
  "Temperatura terrestre": {
    type: "openweathermap",
    layer: "temp_new",
    opacity: 0.6,
    apiKey: process.env.REACT_APP_OWM_KEY || "",
    maxNativeZoom: 18,
    legend: {
      colors: ["#1e1b4b", "#312e81", "#4338ca", "#6366f1", "#818cf8", "#a5b4fc", "#fef08a", "#fde047", "#facc15", "#fb923c", "#f97316", "#dc2626", "#991b1b"]
    }
  },
  "Temperatura del mar": {
    type: "wmts",
    layer: "GHRSST_L4_MUR_Sea_Surface_Temperature",
    format: "png",
    opacity: 0.9,
    maxNativeZoom: 7,
    baseUrl: "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/GHRSST_L4_MUR_Sea_Surface_Temperature/default/{time}/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png",
    legend: {
      colors: ["#0c4a6e", "#075985", "#0369a1", "#0284c7", "#0ea5e9", "#22d3ee", "#67e8f9", "#a5f3fc", "#e0f2fe", "#fef3c7", "#fde047", "#facc15", "#fb923c"]
    }
  },
  "Precipitación": {
    type: "wmts",
    layer: "GPM_3IMERGHH_V07B_Precipitation",
    format: "png",
    opacity: 0.7,
    maxNativeZoom: 9,
    baseUrl: "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/GPM_3IMERGHH_V07B_Precipitation/default/{time}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png",
    legend: {
      colors: ["#f0f9ff", "#e0f2fe", "#bae6fd", "#7dd3fc", "#38bdf8", "#0ea5e9", "#0284c7", "#0369a1", "#075985", "#0c4a6e"]
    }
  },
  "Vientos (OWM)": {
    type: "openweathermap",
    layer: "wind_new",
    opacity: 0.7,
    apiKey: process.env.REACT_APP_OWM_KEY || "",
    maxNativeZoom: 18,
    legend: {
      colors: ["#f0fdf4", "#dcfce7", "#bbf7d0", "#86efac", "#4ade80", "#22c55e", "#16a34a", "#15803d", "#166534", "#14532d"]
    }
  }
};

/**
 * CULTIVOS DISPONIBLES PARA ANÁLISIS
 * Definición de cultivos principales con sus emojis
 */
const CULTIVOS = {
  "Café": { icono: "☕", nombre: "Café" },
  "Maíz": { icono: "🌽", nombre: "Maíz" },
  "Arroz": { icono: "🌾", nombre: "Arroz" },
  "Papa": { icono: "🥔", nombre: "Papa" },
  "Plátano": { icono: "🍌", nombre: "Plátano" },
  "Cacao": { icono: "🍫", nombre: "Cacao" },
  "Caña de Azúcar": { icono: "🎋", nombre: "Caña de Azúcar" }
};

/**
 * Obtiene la URL de TileLayer para una variable climática
 * @param {string} variable - Nombre de la variable
 * @returns {string|null} - URL del tile layer o null si no está soportada
 */
function getClimateLayerUrl(variable) {
  const layerDef = LAYER_DEFS[variable];
  if (!layerDef) return null;

  const today = new Date().toISOString().split('T')[0];

  if (layerDef.type === "openweathermap") {
    return `https://tile.openweathermap.org/map/${layerDef.layer}/{z}/{x}/{y}.png?appid=${layerDef.apiKey}`;
  } else if (layerDef.type === "wmts" && layerDef.baseUrl) {
    return layerDef.baseUrl.replace('{time}', today);
  }

  return null;
}

/**
 * ============================================================================
 * COMPONENTE: CLIMATE DASHBOARD MEJORADO
 * ============================================================================
 * 
 * Mejoras implementadas:
 * 1. Filtro por usuario logueado
 * 2. Filtro funcional por fecha
 * 3. Botón para eliminar registros con confirmación
 * 4. PDFs mejorados sin errores con ñ y caracteres especiales
 * 5. Soporte para mostrar polígonos en el mapa
 * 
 * Autor: Sistema de Monitoreo Climetico - Climetrica
 * Última actualización: 2025
 */

export default function ClimateDashboard({ currentUser: propCurrentUser }) {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const timeSeriesChartRef = useRef(null);
  const modalCanvasRef = useRef(null);

  // ========================================
  // ESTADOS
  // ========================================
  const [currentUser, setCurrentUser] = useState(propCurrentUser || null);
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [filters, setFilters] = useState({ fecha: "", lugar: "", variable: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalData, setModalData] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [activeTab, setActiveTab] = useState('detalles'); // 'detalles' o 'cultivo'

  /**
   * EFECTO: Obtener usuario logueado si no se pasó como prop
   */
  useEffect(() => {
    const fetchCurrentUser = async () => {
      // Si ya hay currentUser desde las props, no hacer nada
      if (propCurrentUser) {
        setCurrentUser(propCurrentUser);
        return;
      }

      // Si no, obtenerlo del token
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          console.warn('⚠️ No hay token, redirigiendo a login');
          navigate("/");
          return;
        }

        const res = await API.get("/profile/");
        console.log('📥 Respuesta completa de /profile/:', res.data);

        // El backend devuelve {user: {...}}, no directamente el usuario
        const userData = res.data.user || res.data;
        console.log('👤 Usuario extraído:', userData);
        console.log('🆔 userData._id:', userData._id);
        console.log('📛 userData.first_name:', userData.first_name);
        console.log('📛 userData.last_name:', userData.last_name);

        setCurrentUser(userData);
      } catch (err) {
        console.error('❌ Error obteniendo usuario:', err);
        const errorMessage = handleAPIErrorWithAuth(err, navigate, "cargar datos del usuario");
        setError(errorMessage);
      }
    };

    fetchCurrentUser();
  }, [propCurrentUser, navigate]);

  /**
   * EFECTO: Cargar datos del servidor filtrados por usuario
   */
  useEffect(() => {
    // No cargar datos hasta que tengamos el currentUser
    if (!currentUser) {
      return;
    }

    const fetchData = async () => {
      try {
        // Construir URL con filtros (ruta relativa)
        let url = "/climate-data/";
        const params = new URLSearchParams();

        // FILTRO POR USUARIO LOGUEADO
        console.log('🔍 Verificando currentUser para filtrado inicial:', currentUser);

        if (currentUser && currentUser._id) {
          params.append('userId', currentUser._id);
          console.log('🔑 Filtrando por userId:', currentUser._id);
        } else {
          console.warn('⚠️ No se puede filtrar por usuario - currentUser:', currentUser);
        }

        if (params.toString()) {
          url += '?' + params.toString();
        }

        console.log('📡 Cargando datos desde:', url);
        const res = await API.get(url);
        const raw = res.data.status ? res.data.data : res.data;

        const cleaned = raw.map((item) => {
          // Parsear coordenadas si vienen como string JSON
          let coordenadas = item.consulta?.coordenadas;
          if (typeof coordenadas === 'string') {
            try {
              coordenadas = JSON.parse(coordenadas);
            } catch (e) {
              coordenadas = { latitud: "N/A", longitud: "N/A" };
            }
          }

          // Parsear estadísticas si vienen como string JSON
          let estadisticas = item.datosClimaticos?.estadisticas;
          if (typeof estadisticas === 'string') {
            try {
              estadisticas = JSON.parse(estadisticas);
            } catch (e) {
              estadisticas = { promedio: "N/A", maximo: "N/A", minimo: "N/A" };
            }
          }

          // Parsear serie temporal si viene como string JSON
          let serieTemporal = item.datosClimaticos?.serieTemporal;
          if (typeof serieTemporal === 'string') {
            try {
              const parsed = JSON.parse(serieTemporal);
              if (Array.isArray(parsed)) {
                serieTemporal = parsed.map(punto => {
                  if (typeof punto === 'string') {
                    return JSON.parse(punto);
                  }
                  return punto;
                });
              }
            } catch (e) {
              serieTemporal = [];
            }
          }

          // Parsear puntos muestreados y vértices si vienen en coordenadas
          let puntosMuestreados = null;
          let vertices = null;

          if (coordenadas && coordenadas.puntosMuestreados) {
            puntosMuestreados = coordenadas.puntosMuestreados;
          }

          if (coordenadas && coordenadas.vertices) {
            vertices = coordenadas.vertices;
          }

          return {
            _id: item._id, // IMPORTANTE: Guardar el ID para poder eliminar
            userId: item.usuario?._id || item.usuario?.id || null, // ID del usuario para filtrado
            // Usuario
            nombre: item.usuario?.nombre || "N/A",
            rol: item.usuario?.rol || "N/A",
            email: item.usuario?.email || "N/A",
            fechaDescarga: item.usuario?.fechaDescarga || null, // Fecha original sin formatear
            fecha: item.usuario?.fechaDescarga
              ? new Date(item.usuario.fechaDescarga).toLocaleDateString()
              : "N/A",
            hora: item.usuario?.horaDescarga || "N/A",

            // Consulta
            variable: item.consulta?.variable || "N/A",
            lugar: item.consulta?.lugar || "N/A",
            latitud: coordenadas?.latitud || coordenadas?.centro?.latitud || "N/A",
            longitud: coordenadas?.longitud || coordenadas?.centro?.longitud || "N/A",
            rangoTemporal: item.consulta?.rangoTemporal || "N/A",
            fechaInicio: item.consulta?.fechaInicio || null,
            fechaFin: item.consulta?.fechaFin || null,
            tipoConsulta: coordenadas?.tipo || "Punto único",
            vertices: vertices,
            puntosMuestreados: puntosMuestreados,
            
            // Estado de datos
            estadoDatos: item.estadoDatos || null,
            
            // Datos climáticos
            valorActual: item.datosClimaticos?.valorActual || "N/A",
            unidad: item.datosClimaticos?.unidad || "°C",
            promedio: estadisticas?.promedio || "N/A",
            maximo: estadisticas?.maximo || "N/A",
            minimo: estadisticas?.minimo || "N/A",
            serieTemporal: serieTemporal || [],

            // Análisis de cultivo
            cropAnalysis: item.analisisCultivo || item.cropAnalysis || null
          };
        });

        // Ordenar por fecha más reciente primero
        const sorted = cleaned.sort((a, b) => {
          if (!a.fechaDescarga) return 1;
          if (!b.fechaDescarga) return -1;
          return new Date(b.fechaDescarga) - new Date(a.fechaDescarga);
        });

        setData(sorted);

        // Aplicar filtro de usuario en el frontend también (doble filtrado)
        // Esto asegura que solo se muestren registros del usuario logueado
        const filteredByUser = sorted.filter((d) => {
          if (currentUser && currentUser._id) {
            return d.userId === currentUser._id;
          }
          return true; // Si no hay usuario, mostrar todos
        });

        setFilteredData(filteredByUser);
      } catch (err) {
        console.error(err);
        const errorMessage = handleAPIError(err, "cargar los datos climáticos");
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentUser]); // Re-cargar cuando cambie el usuario

  /**
   * EFECTO: Actualizar serie en modal
   */
  useEffect(() => {
    if (!showMap || !modalData || !modalData.serieTemporal || modalData.serieTemporal.length === 0) {
      if (modalCanvasRef.current && modalCanvasRef.current._chartInstance) {
        try {
          modalCanvasRef.current._chartInstance.destroy();
          modalCanvasRef.current._chartInstance = null;
        } catch (e) {
          console.warn('Error destroying chart:', e);
        }
      }
      return;
    }

    const timeoutId = setTimeout(() => {
      if (modalCanvasRef.current) {
        createTimeSeriesChart(modalData.serieTemporal, modalCanvasRef.current);
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      // No destruir el gráfico en cleanup para que persista al cambiar pestañas
      // Solo se destruirá cuando se cierre el modal o cambie modalData
    };
  }, [showMap, modalData]);

  /**
   * FUNCIÓN MEJORADA: Manejar cambio de filtros
   * Ahora filtra localmente para mejor rendimiento
   */
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);

    // Filtrar localmente desde `data` en lugar de hacer petición al backend
    const filtered = data.filter((d) => {
      // Filtro por fecha de DESCARGA (no por fecha de los datos climáticos)
      if (newFilters.fecha && d.fechaDescarga) {
        // Normalizar ambas fechas para comparación (YYYY-MM-DD)
        const recordDate = new Date(d.fechaDescarga);
        const year = recordDate.getFullYear();
        const month = String(recordDate.getMonth() + 1).padStart(2, '0');
        const day = String(recordDate.getDate()).padStart(2, '0');
        const normalizedRecordDate = `${year}-${month}-${day}`;

        if (normalizedRecordDate !== newFilters.fecha) return false;
      }

      // Filtro por lugar (búsqueda parcial, case-insensitive)
      if (newFilters.lugar && d.lugar) {
        if (!d.lugar.toLowerCase().includes(newFilters.lugar.toLowerCase())) {
          return false;
        }
      }

      // Filtro por variable
      if (newFilters.variable && d.variable !== newFilters.variable) {
        return false;
      }

      return true;
    });

    console.log(`✅ Filtrados ${filtered.length} de ${data.length} registros`);
    setFilteredData(filtered);
  };

  /**
   * FUNCIÓN: Abrir modal con los detalles completos de un registro
   */
  const handleOpenModal = (d) => {
    setModalData(d);
    setShowMap(true); // Activar el mapa automáticamente para renderizar todo junto
    setActiveTab('detalles'); // Resetear a la pestaña de detalles
  };

  /**
   * FUNCIÓN: Cerrar el modal de detalles
   */
  const handleCloseModal = () => {
    if (modalCanvasRef.current && modalCanvasRef.current._chartInstance) {
      try {
        modalCanvasRef.current._chartInstance.destroy();
        modalCanvasRef.current._chartInstance = null;
      } catch (e) {
        console.warn('Error destroying chart on close:', e);
      }
    }
    
    setModalData(null);
    setShowMap(false);
  };

  /**
   * FUNCIÓN NUEVA: Eliminar registro
   */
  const handleDeleteRecord = async (id) => {
    // Confirmación antes de eliminar
    const confirmacion = window.confirm(
      '¿Está seguro que desea eliminar este registro?\n\n' +
      'Esta acción no se puede deshacer.'
    );

    if (!confirmacion) return;

    setDeletingId(id);

    try {
      // Usar ruta relativa - API ya tiene baseURL configurado
      const response = await API.delete(`/climate-data/${id}/`);

      console.log('✅ Respuesta del servidor:', response.data);

      // Actualizar datos locales
      setData(prev => prev.filter(item => item._id !== id));
      setFilteredData(prev => prev.filter(item => item._id !== id));

      // Cerrar modal si el registro eliminado estaba abierto
      if (modalData && modalData._id === id) {
        handleCloseModal();
      }

      alert('✅ Registro eliminado exitosamente');
    } catch (error) {
      console.error('❌ Error eliminando registro:', error);
      const errorMessage = handleAPIError(error, "eliminar el registro");
      alert(`❌ ${errorMessage}`);
    } finally {
      setDeletingId(null);
    }
  };

  /**
   * FUNCIÓN: Crear gráfico de serie temporal
   */
  const createTimeSeriesChart = (series, canvas) => {
    if (!canvas || !series || series.length === 0) return null;

    if (canvas._chartInstance) {
      try {
        canvas._chartInstance.destroy();
        canvas._chartInstance = null;
      } catch (e) {
        console.warn('Error destroying previous chart:', e);
      }
    }

    const ctx = canvas.getContext('2d');

    const labels = series.map((s) => s.date);
    const dataValues = series.map((s) => parseFloat(s.value));

    // Obtener colores de la variable desde LAYER_DEFS
    const variable = modalData?.variable || 'Temperatura del mar';
    const colors = LAYER_DEFS[variable]?.legend?.colors || ["#1a1a6e", "#2929cc", "#00bfff", "#00ff7f", "#ffff00", "#ffa500", "#ff4500", "#8b0000"];
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, colors[0]);
    grad.addColorStop(0.5, colors[Math.floor(colors.length / 2)]);
    grad.addColorStop(1, colors[colors.length - 1]);
    
    const chart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{
          data: dataValues,
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
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
          legend: { display: false },
          title: {
            display: true,
            text: `Serie Temporal - ${modalData?.variable || 'Variable'}`,
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
            ticks: { color: '#666', maxRotation: 45, minRotation: 45 },
            grid: { color: '#e0e0e0' }
          }
        }
      },
    });
    
    canvas._chartInstance = chart;
    return chart;
  };

  /**
   * FUNCIÓN: Capturar snapshot del mapa como imagen
   * Usa dom-to-image-more para capturar capas WMTS correctamente (incluyendo tiles cross-origin)
   */
  const captureMapSnapshot = async () => {
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
        bgcolor: '#f5f5f5',
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
          backgroundColor: '#f5f5f5',
          scale: 1,
        });

        return canvas.toDataURL('image/png');
      } catch (fallbackError) {
        console.error('❌ Error en captura alternativa:', fallbackError);
        return null;
      }
    }
  };

  /**
   * FUNCIÓN: Generar reporte PDF con los datos filtrados
   */
  const handleDownloadReport = async () => {
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      
      // Configurar fuente que soporte caracteres especiales
      pdf.setFont("helvetica");
      
      // Encabezado
      pdf.setFontSize(18);
      // Usar texto compatible sin caracteres especiales problemáticos
      pdf.text("Reporte de Datos Climaticos", 14, 20);

      // Datos
      pdf.setFontSize(12);
      pdf.text("Datos Climaticos:", 14, 40);
      
      let y = 50;
      filteredData.slice(0, 20).forEach((d, i) => {
        pdf.setFontSize(10);
        // Reemplazar caracteres especiales
        const texto = `${i + 1}. ${d.variable} (${d.lugar}) - Valor: ${d.valorActual}${d.unidad}`;
        pdf.text(texto, 14, y);
        y += 7;
        if (y > 270) {
          pdf.addPage();
          y = 20;
        }
      });

      pdf.save("reporte_climatico.pdf");
    } catch (error) {
      console.error(error);
      alert("Ocurrió un error al generar el reporte.");
    }
  };

  /**
   * FUNCIÓN: Descargar datos del modal en formato JSON
   */
  const handleDownloadModalJSON = () => {
    if (!modalData) return;

    const jsonData = {
      usuario: {
        nombre: modalData.nombre,
        rol: modalData.rol,
        email: modalData.email
      },
      consulta: {
        variable: modalData.variable,
        lugar: modalData.lugar,
        tipo: modalData.tipoConsulta,
        coordenadas: modalData.puntosMuestreados ? {
          tipo: "Poligono",
          centro: { latitud: modalData.latitud, longitud: modalData.longitud },
          puntosMuestreados: modalData.puntosMuestreados
        } : {
          tipo: "Punto unico",
          latitud: modalData.latitud,
          longitud: modalData.longitud
        },
        rangoTemporal: modalData.rangoTemporal,
        fechaInicio: modalData.fechaInicio,
        fechaFin: modalData.fechaFin
      },
      estadoDatos: modalData.estadoDatos,
      datosClimaticos: {
        valorActual: modalData.valorActual,
        unidad: modalData.unidad,
        estadisticas: {
          promedio: modalData.promedio,
          maximo: modalData.maximo,
          minimo: modalData.minimo
        },
        serieTemporal: modalData.serieTemporal
      },
      cropAnalysis: modalData.cropAnalysis || null,
      fechaDescarga: modalData.fecha,
      horaDescarga: modalData.hora
    };

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `clima_${modalData.variable.replace(/\s+/g, '_')}_${modalData.fecha.replace(/\//g, '-')}.json`;
    a.click();
  };

  /**
   * FUNCIÓN: Cargar logo como base64 para incluir en PDF
   */
  const loadLogoAsBase64 = async () => {
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
  };

  /**
   * FUNCIÓN: Crear imagen del gráfico para PDF
   */
  const createChartImageForPDF = async (series) => {
    return new Promise((resolve) => {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 800;
      tempCanvas.height = 300;
      const ctx = tempCanvas.getContext('2d');

      const labels = series.map((s) => s.date);
      const dataValues = series.map((s) => parseFloat(s.value));

      // Obtener colores de la variable desde LAYER_DEFS
      const variable = modalData?.variable || 'Temperatura del mar';
      const colors = LAYER_DEFS[variable]?.legend?.colors || ["#1a1a6e", "#2929cc", "#00bfff", "#00ff7f", "#ffff00", "#ffa500", "#ff4500", "#8b0000"];
      const grad = ctx.createLinearGradient(0, 0, 0, tempCanvas.height);
      grad.addColorStop(0, colors[0]);
      grad.addColorStop(0.5, colors[Math.floor(colors.length / 2)]);
      grad.addColorStop(1, colors[colors.length - 1]);

      const tempChart = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [{
            data: dataValues,
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
              text: `Serie Temporal - ${modalData?.variable || 'Variable'}`,
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
              ticks: { color: '#666', maxRotation: 45, minRotation: 45 },
              grid: { color: '#e0e0e0' }
            }
          }
        },
      });
      
      setTimeout(() => {
        const imageData = tempCanvas.toDataURL('image/png');
        tempChart.destroy();
        resolve(imageData);
      }, 100);
    });
  };

  /**
   * FUNCIÓN MEJORADA: Descargar PDF del modal con diseño profesional
   */
  const handleDownloadModalPDF = async () => {
    if (!modalData) return;

    // Variable para rastrear si el mapa estaba oculto
    let wasMapHidden = false;

    const loadingDiv = document.createElement('div');
    loadingDiv.className = styles.pdfLoading || 'pdf-loading';
    loadingDiv.textContent = 'Generando PDF...';
    loadingDiv.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.8);color:white;padding:20px 40px;border-radius:8px;z-index:10000;font-size:18px;';
    document.body.appendChild(loadingDiv);

    try {
      // IMPORTANTE: Si el mapa no está visible, activarlo primero
      wasMapHidden = !showMap;
      if (wasMapHidden) {
        console.log('⚠️ Activando vista de mapa para captura...');
        setShowMap(true);
        // Esperar a que React renderice el mapa
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const doc = new jsPDF();
      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const margin = 15;
      const contentWidth = pageWidth - (2 * margin);
      const maxY = pageHeight - 20;
      let y = margin;

      // IMPORTANTE: Configurar fuente que soporte caracteres especiales
      doc.setFont("helvetica");

      // Cargar logo
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

      // Helper function to add text with auto page break
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
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.text('Reporte Climatico Detallado', pageWidth / 2, 18, { align: 'center' });

      // Subtítulo con variable
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      doc.text('Variable: ' + modalData.variable, pageWidth / 2, 27, { align: 'center' });

      // Estado de los datos
      const statusMsg = modalData.estadoDatos?.mensaje || 'Estado desconocido';
      doc.setFontSize(9);
      doc.text(statusMsg, pageWidth / 2, 34, { align: 'center' });

      y = headerHeight + 10;

      // ========================================
      // INFORMACIÓN DEL USUARIO - CON CAJA
      // ========================================
      checkNewPage(30);
      doc.setFillColor(240, 249, 255); // Light blue background
      doc.roundedRect(margin, y, contentWidth, 28, 2, 2, 'F');

      y += 6;
      doc.setTextColor(30, 58, 138); // Dark blue
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('Informacion del Usuario', margin + 3, y);
      y += 6;

      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(`Nombre: ${modalData.nombre}`, margin + 3, y);
      y += 4.5;
      doc.text(`Rol: ${modalData.rol} | Email: ${modalData.email}`, margin + 3, y);
      y += 4.5;
      doc.text(`Fecha de consulta: ${modalData.fecha} ${modalData.hora}`, margin + 3, y);
      y += 10;

      // ========================================
      // UBICACIÓN CONSULTADA - CON CAJA
      // ========================================
      checkNewPage(35);
      doc.setFillColor(240, 253, 244); // Light green background
      const ubicacionHeight = modalData.puntosMuestreados?.length > 0 ? 30 : 26;
      doc.roundedRect(margin, y, contentWidth, ubicacionHeight, 2, 2, 'F');

      y += 6;
      doc.setTextColor(22, 101, 52); // Dark green
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('Ubicacion Consultada', margin + 3, y);
      y += 6;

      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(`Lugar: ${modalData.lugar}`, margin + 3, y);
      y += 4.5;
      doc.text(`Tipo: ${modalData.tipoConsulta}`, margin + 3, y);
      y += 4.5;

      if (modalData.puntosMuestreados && modalData.puntosMuestreados.length > 0) {
        doc.text(`Centro: ${modalData.latitud}, ${modalData.longitud}`, margin + 3, y);
        y += 4.5;
        doc.text(`Puntos muestreados: ${modalData.puntosMuestreados.length}`, margin + 3, y);
        y += 4.5;
      } else {
        doc.text(`Coordenadas: ${modalData.latitud}, ${modalData.longitud}`, margin + 3, y);
        y += 4.5;
      }

      doc.text(`Periodo: ${modalData.rangoTemporal}`, margin + 3, y);
      if (modalData.fechaInicio && modalData.fechaFin) {
        doc.text(` (${modalData.fechaInicio} a ${modalData.fechaFin})`, margin + 30, y);
      }
      y += 10;

      // ========================================
      // ESTADÍSTICAS - CON CAJA
      // ========================================
      checkNewPage(26);
      doc.setFillColor(254, 249, 240); // Light orange background
      doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'F');

      y += 6;
      doc.setTextColor(146, 64, 14); // Dark orange
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('Estadisticas Climatologicas', margin + 3, y);
      y += 6;

      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(`Valor actual: ${modalData.valorActual} ${modalData.unidad}`, margin + 3, y);
      doc.text(`Promedio: ${modalData.promedio} ${modalData.unidad}`, margin + 70, y);
      y += 4.5;
      doc.text(`Maximo: ${modalData.maximo} ${modalData.unidad}`, margin + 3, y);
      doc.text(`Minimo: ${modalData.minimo} ${modalData.unidad}`, margin + 70, y);
      y += 10;

      // ========================================
      // PUNTOS DEL POLÍGONO (si aplica) - COMPACTO
      // ========================================
      if (modalData.puntosMuestreados && modalData.puntosMuestreados.length > 0) {
        checkNewPage(15);
        doc.setTextColor(30, 58, 138);
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text(`Puntos del Poligono (${modalData.puntosMuestreados.length} puntos)`, margin, y);
        y += 6;

        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(0, 0, 0);

        // Mostrar solo los primeros 20 puntos para evitar PDFs muy largos
        const puntosToShow = modalData.puntosMuestreados.slice(0, 20);
        puntosToShow.forEach((punto, index) => {
          checkNewPage(4);
          doc.text(`${index + 1}. Lat: ${punto.latitud}, Lng: ${punto.longitud}`, margin + 3, y);
          y += 3.5;
        });

        if (modalData.puntosMuestreados.length > 20) {
          doc.setFont(undefined, 'italic');
          doc.text(`... y ${modalData.puntosMuestreados.length - 20} puntos mas`, margin + 3, y);
          y += 4;
        }

        y += 6;
      }

      // ========================================
      // MAPA DE UBICACIÓN - COMPACTO
      // ========================================
      checkNewPage(90);
      doc.setTextColor(30, 58, 138);
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('Mapa de Ubicacion', margin, y);
      y += 5;

      const mapSnapshot = await captureMapSnapshot();
      if (mapSnapshot) {
        const mapWidth = contentWidth;
        const mapHeight = 80;
        doc.addImage(mapSnapshot, 'PNG', margin, y, mapWidth, mapHeight);
        y += mapHeight + 8;
      } else {
        doc.setFontSize(9);
        doc.setFont(undefined, 'italic');
        doc.setTextColor(128, 128, 128);
        doc.text('(Captura del mapa no disponible)', margin, y);
        y += 8;
      }

      // ========================================
      // SERIE TEMPORAL (GRÁFICO) - COMPACTO
      // ========================================
      if (modalData.serieTemporal && modalData.serieTemporal.length > 0) {
        checkNewPage(75);
        doc.setTextColor(30, 58, 138);
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('Serie Temporal', margin, y);
        y += 5;

        const chartImage = await createChartImageForPDF(modalData.serieTemporal);
        if (chartImage) {
          const chartWidth = contentWidth;
          const chartHeight = 65;
          doc.addImage(chartImage, 'PNG', margin, y, chartWidth, chartHeight);
          y += chartHeight + 8;
        }

        // ========================================
        // DATOS DETALLADOS (TABLA COMPACTA)
        // ========================================
        checkNewPage(20);
        doc.setTextColor(30, 58, 138);
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('Datos Detallados', margin, y);
        y += 6;

        doc.setFillColor(240, 249, 255);
        doc.roundedRect(margin, y, contentWidth, 8, 1, 1, 'F');

        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'bold');
        doc.text('Fecha', margin + 2, y + 5);
        doc.text(`Valor (${modalData.unidad})`, margin + 50, y + 5);
        y += 10;

        doc.setFont(undefined, 'normal');

        // Mostrar solo los primeros 30 registros
        const dataToShow = modalData.serieTemporal.slice(0, 30);
        dataToShow.forEach((s, index) => {
          checkNewPage(4);
          // Alternar color de fondo para filas
          if (index % 2 === 0) {
            doc.setFillColor(250, 250, 250);
            doc.rect(margin, y - 2.5, contentWidth, 3.5, 'F');
          }
          doc.text(s.date, margin + 2, y);
          doc.text(s.value.toString(), margin + 50, y);
          y += 3.5;
        });

        if (modalData.serieTemporal.length > 30) {
          doc.setFont(undefined, 'italic');
          doc.setTextColor(128, 128, 128);
          doc.text(`... y ${modalData.serieTemporal.length - 30} registros mas`, margin + 2, y);
          y += 5;
        }
        y += 5;
      }

      // ========================================
      // ANÁLISIS DE CULTIVO (si está disponible)
      // ========================================
      if (modalData.cropAnalysis && modalData.cropAnalysis.cultivo) {
        checkNewPage(70);

        // Caja de título del cultivo
        doc.setFillColor(245, 243, 255); // Light purple
        doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'F');

        y += 6;
        doc.setTextColor(91, 33, 182); // Dark purple
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Analisis de Cultivo', margin + 3, y);
        y += 7;

        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(`Cultivo: ${modalData.cropAnalysis.cultivo}`, margin + 3, y);
        doc.text(`Nivel: ${modalData.cropAnalysis.recomendacion?.nivel || 'N/A'}`, margin + 80, y);
        y += 5;
        doc.text(`Aptitud Total: ${modalData.cropAnalysis.aptitudes?.total || 'N/A'}%`, margin + 3, y);
        y += 10;

        // Recomendación
        checkNewPage(20);
        doc.setTextColor(30, 58, 138);
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('Recomendacion:', margin, y);
        y += 5;

        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(0, 0, 0);
        const recomendacionTexto = modalData.cropAnalysis.recomendacion?.texto || 'No disponible';
        const recomendacionLines = doc.splitTextToSize(recomendacionTexto, contentWidth);
        recomendacionLines.forEach(line => {
          checkNewPage(4);
          doc.text(line, margin, y);
          y += 4;
        });
        y += 5;

        // Aptitudes con barras visuales
        checkNewPage(30);
        doc.setTextColor(30, 58, 138);
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('Aptitudes por Condicion:', margin, y);
        y += 6;

        const aptitudes = [
          { label: 'Temperatura', value: modalData.cropAnalysis.aptitudes?.temperatura || 0, color: [251, 113, 22] },
          { label: 'Precipitacion', value: modalData.cropAnalysis.aptitudes?.precipitacion || 0, color: [59, 130, 246] },
          { label: 'Altitud', value: modalData.cropAnalysis.aptitudes?.altitud || 0, color: [139, 92, 246] }
        ];

        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(0, 0, 0);

        aptitudes.forEach(apt => {
          checkNewPage(6);
          doc.text(`${apt.label}:`, margin, y);
          doc.text(`${apt.value.toFixed(2)}%`, margin + 35, y);

          // Barra de progreso
          const barWidth = (apt.value / 100) * 80;
          doc.setFillColor(220, 220, 220);
          doc.roundedRect(margin + 50, y - 3, 80, 4, 1, 1, 'F');
          doc.setFillColor(apt.color[0], apt.color[1], apt.color[2]);
          doc.roundedRect(margin + 50, y - 3, barWidth, 4, 1, 1, 'F');

          y += 6;
        });
        y += 5;

        // Condiciones Climáticas Actuales
        if (modalData.cropAnalysis.condicionesClimaticas) {
          checkNewPage(20);
          doc.setTextColor(30, 58, 138);
          doc.setFontSize(10);
          doc.setFont(undefined, 'bold');
          doc.text('Condiciones Climaticas Actuales:', margin, y);
          y += 5;

          doc.setFontSize(9);
          doc.setFont(undefined, 'normal');
          doc.setTextColor(0, 0, 0);
          doc.text(`Temp: ${modalData.cropAnalysis.condicionesClimaticas.temperatura}°C`, margin, y);
          doc.text(`Precip: ${modalData.cropAnalysis.condicionesClimaticas.precipitacion.toFixed ? modalData.cropAnalysis.condicionesClimaticas.precipitacion.toFixed(0) : modalData.cropAnalysis.condicionesClimaticas.precipitacion} mm/año`, margin + 50, y);
          doc.text(`Altitud: ${modalData.cropAnalysis.condicionesClimaticas.altitud.toFixed ? modalData.cropAnalysis.condicionesClimaticas.altitud.toFixed(0) : modalData.cropAnalysis.condicionesClimaticas.altitud} msnm`, margin + 110, y);
          y += 8;

          // Fuentes de datos - compacto
          if (modalData.cropAnalysis.fuentesDatos) {
            doc.setFontSize(7);
            doc.setTextColor(100, 100, 100);
            doc.setFont(undefined, 'italic');
            doc.text(`Fuentes: ${modalData.cropAnalysis.fuentesDatos.temperatura || 'N/A'}, ${modalData.cropAnalysis.fuentesDatos.precipitacion || 'N/A'}, ${modalData.cropAnalysis.fuentesDatos.altitud || 'N/A'}`, margin, y);
            y += 6;
            doc.setTextColor(0, 0, 0);
            doc.setFont(undefined, 'normal');
          }
        }

        // Parámetros Óptimos - compacto
        if (modalData.cropAnalysis.parametrosOptimos) {
          checkNewPage(25);
          doc.setTextColor(30, 58, 138);
          doc.setFontSize(10);
          doc.setFont(undefined, 'bold');
          doc.text(`Parametros Optimos para ${modalData.cropAnalysis.cultivo}:`, margin, y);
          y += 5;

          doc.setFontSize(9);
          doc.setFont(undefined, 'normal');
          doc.setTextColor(0, 0, 0);

          if (modalData.cropAnalysis.parametrosOptimos.temperatura) {
            const tempText = typeof modalData.cropAnalysis.parametrosOptimos.temperatura === 'string'
              ? modalData.cropAnalysis.parametrosOptimos.temperatura
              : `${modalData.cropAnalysis.parametrosOptimos.temperatura.min}°C - ${modalData.cropAnalysis.parametrosOptimos.temperatura.max}°C`;
            doc.text(`Temperatura: ${tempText}`, margin, y);
            y += 4.5;
          }

          if (modalData.cropAnalysis.parametrosOptimos.precipitacion) {
            const precipText = typeof modalData.cropAnalysis.parametrosOptimos.precipitacion === 'string'
              ? modalData.cropAnalysis.parametrosOptimos.precipitacion
              : `${modalData.cropAnalysis.parametrosOptimos.precipitacion.min} - ${modalData.cropAnalysis.parametrosOptimos.precipitacion.max} mm/año`;
            doc.text(`Precipitacion: ${precipText}`, margin, y);
            y += 4.5;
          }

          if (modalData.cropAnalysis.parametrosOptimos.altitud) {
            const altitudText = typeof modalData.cropAnalysis.parametrosOptimos.altitud === 'string'
              ? modalData.cropAnalysis.parametrosOptimos.altitud
              : `${modalData.cropAnalysis.parametrosOptimos.altitud.min} - ${modalData.cropAnalysis.parametrosOptimos.altitud.max} msnm`;
            doc.text(`Altitud: ${altitudText}`, margin, y);
            y += 4.5;
          }
          y += 5;
        }

        // Ciclos Agrícolas - compacto
        if (modalData.cropAnalysis.ciclosAgricolas) {
          checkNewPage(15);
          doc.setTextColor(30, 58, 138);
          doc.setFontSize(10);
          doc.setFont(undefined, 'bold');
          doc.text('Ciclos Agricolas:', margin, y);
          y += 5;

          doc.setFontSize(9);
          doc.setFont(undefined, 'normal');
          doc.setTextColor(0, 0, 0);
          doc.text(`Siembra: ${modalData.cropAnalysis.ciclosAgricolas.siembra}`, margin, y);
          y += 4.5;
          doc.text(`Cosecha: ${modalData.cropAnalysis.ciclosAgricolas.cosecha}`, margin, y);
          y += 8;
        }

        // Riesgos Identificados - compacto con caja roja
        if (modalData.cropAnalysis.riesgos && modalData.cropAnalysis.riesgos.length > 0) {
          checkNewPage(20);
          doc.setFillColor(254, 242, 242); // Light red background
          const riesgosHeight = Math.min(modalData.cropAnalysis.riesgos.length * 5 + 10, 40);
          doc.roundedRect(margin, y, contentWidth, riesgosHeight, 2, 2, 'F');

          y += 5;
          doc.setTextColor(185, 28, 28); // Dark red
          doc.setFontSize(10);
          doc.setFont(undefined, 'bold');
          doc.text('Riesgos Identificados:', margin + 3, y);
          y += 5;

          doc.setFontSize(8);
          doc.setFont(undefined, 'normal');
          doc.setTextColor(0, 0, 0);

          modalData.cropAnalysis.riesgos.forEach((riesgo) => {
            checkNewPage(4);
            const riesgoLines = doc.splitTextToSize(`• ${riesgo}`, contentWidth - 6);
            riesgoLines.forEach(line => {
              checkNewPage(4);
              doc.text(line, margin + 3, y);
              y += 4;
            });
          });
          y += 5;
        }
      }

      // ========================================
      // PIE DE PÁGINA PROFESIONAL EN TODAS LAS PÁGINAS
      // ========================================
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        // Línea separadora
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

        // Texto del pie
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.setFont(undefined, 'normal');
        doc.text('Generado por Sistema de Monitoreo Climatico - Climetrica', pageWidth / 2, pageHeight - 10, { align: 'center' });

        doc.setFontSize(8);
        doc.text(`Pagina ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 6, { align: 'center' });
      }

      // Guardar PDF
      doc.save(`reporte_clima_${modalData.variable.replace(/\s+/g, '_')}_${modalData.fecha.replace(/\//g, '-')}.pdf`);

      // Restaurar vista original si el mapa estaba oculto
      if (wasMapHidden) {
        console.log('✅ Restaurando vista de detalles...');
        setShowMap(false);
      }
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF. Por favor intente nuevamente.');

      // Restaurar vista original en caso de error también
      if (wasMapHidden) {
        setShowMap(false);
      }
    } finally {
      document.body.removeChild(loadingDiv);
    }
  };

  // Loading y error states
  if (loading) return <p className={styles.loading}>Cargando datos...</p>;
  if (error) return <p className={styles.error}>{error}</p>;

  return (
    <div className={styles.dashboardContainer}>
      {/* ========================================
          HEADER
          ======================================== */}
      <div className={styles.headerActions}>
        <h2 className={styles.title}> Registro de Datos Climaticos</h2>
        {currentUser && (
          <span style={{ fontSize: '0.9em', color: '#666' }}>
            Usuario: {currentUser.first_name} {currentUser.last_name}
          </span>
        )}
      </div>

      {/* ========================================
          FILTROS
          ======================================== */}
      <div className={styles.filters}>
        <input
          type="date"
          name="fecha"
          value={filters.fecha}
          onChange={handleFilterChange}
          className={styles.filterInput}
          placeholder="Filtrar por fecha"
        />
        <input
          type="text"
          name="lugar"
          placeholder="Buscar por lugar..."
          value={filters.lugar}
          onChange={handleFilterChange}
          className={styles.filterInput}
        />
        <select
          name="variable"
          value={filters.variable}
          onChange={handleFilterChange}
          className={styles.filterInput}
        >
          <option value="">Todas las variables</option>
          {[...new Set(data.map((d) => d.variable))].map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {/* ========================================
          TABLA DE DATOS MEJORADA
          ======================================== */}
      <div className={styles.dataTableContainer}>
        <table className={styles.climateTable}>
          <thead>
            <tr>
              <th>Fecha y Hora de Descarga</th>
              <th>Lugar</th>
              <th>Variable</th>
              <th>Cultivo</th>
              <th>Valor Actual</th>
              <th>Fuente de Datos</th>
              <th>Rango de Consulta</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length > 0 ? (
              filteredData.slice(0, 30).map((d, i) => (
                <tr key={d._id || i}>
                  {/* Fecha y Hora de Descarga */}
                  <td>
                    {d.fecha}<br/>
                    <small style={{ color: '#666' }}>{d.hora}</small>
                  </td>

                  {/* Lugar */}
                  <td>{d.lugar}</td>

                  {/* Variable */}
                  <td>{d.variable}</td>

                  {/* Cultivo */}
                  <td>
                    {d.cropAnalysis && d.cropAnalysis.cultivo ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '1.2em' }}>
                          {CULTIVOS[d.cropAnalysis.cultivo]?.icono || '🌱'}
                        </span>
                        <span>{d.cropAnalysis.cultivo}</span>
                        <small
                          style={{
                            color: d.cropAnalysis.recomendacion?.color || '#666',
                            fontWeight: 'bold',
                            fontSize: '0.75em'
                          }}
                        >
                          ({d.cropAnalysis.aptitudes?.total || 'N/A'}%)
                        </small>
                      </div>
                    ) : (
                      <small style={{ color: '#999' }}>Sin análisis</small>
                    )}
                  </td>

                  {/* Valor Actual */}
                  <td>
                    <strong>{d.valorActual} {d.unidad}</strong>
                  </td>

                  {/* Fuente de Datos */}
                  <td>
                    {d.estadoDatos?.fuenteAPI || 'N/A'}
                    {(d.estadoDatos?.enTiempoReal === 'true' || d.estadoDatos?.enTiempoReal === true) && (
                      <>
                        <br/>
                        <small style={{ color: '#28a745' }}>• Tiempo Real</small>
                      </>
                    )}
                  </td>

                  {/* Rango de Consulta */}
                  <td>
                    {d.fechaInicio && d.fechaFin ? (
                      <>
                        <small>
                          Desde: {d.fechaInicio}<br/>
                          Hasta: {d.fechaFin}
                        </small>
                      </>
                    ) : (
                      <small style={{ color: '#999' }}>N/A</small>
                    )}
                  </td>

                  {/* Acción */}
                  <td>
                    <button
                      className={`${styles.btn} ${styles.btnMore}`}
                      onClick={() => handleOpenModal(d)}
                    >
                      Ver más
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>
                  No hay datos disponibles.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ========================================
          BOTÓN VOLVER
          ======================================== */}
      <div className={styles.backButtonWrapper}>
        <button className={`${styles.btn} ${styles.btnBack}`} onClick={() => navigate(-1)}>
          ⬅ Volver
        </button>
      </div>

      {/* ========================================
          MODAL DE DETALLES MEJORADO
          ======================================== */}
      {modalData && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div className={`${styles.modalContent} ${showMap ? styles.modalWithMap : ''}`} onClick={(e) => e.stopPropagation()}>
            {/* Encabezado del modal */}
            <div className={styles.modalHeader}>
              <h3>📊 Detalles del Registro</h3>
              <button className={styles.modalCloseBtn} onClick={handleCloseModal}>
                ✕
              </button>
            </div>

            {/* Pestañas de navegación */}
            <div className={styles.modalTabs}>
              <button
                className={`${styles.tabButton} ${activeTab === 'detalles' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('detalles')}
              >
                📊 Detalles Climáticos
              </button>
              {modalData.cropAnalysis && modalData.cropAnalysis.cultivo && (
                <button
                  className={`${styles.tabButton} ${activeTab === 'cultivo' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('cultivo')}
                >
                  🌾 Análisis de Cultivo
                </button>
              )}
            </div>

            {/* Cuerpo del modal */}
            <div className={styles.modalBody}>
              {/* MAPA Y SERIE TEMPORAL - SIEMPRE VISIBLE */}
              <div className={styles.modalMapLayout}>
                  {/* Sección del Mapa */}
                  <div className={styles.modalMapSection}>
                    <h4>🗺️ Ubicación en el Mapa</h4>
                    <div className={styles.mapWrapper} ref={mapContainerRef}>
                      <MapContainer
                        center={[parseFloat(modalData.latitud), parseFloat(modalData.longitud)]}
                        zoom={(modalData.vertices || modalData.puntosMuestreados) ? 12 : 13}
                        scrollWheelZoom={true}
                        style={{ height: '400px', width: '100%', borderRadius: '8px' }}
                      >
                        {/* Helper para capturar referencia del mapa */}
                        <MapRefHelper mapRef={mapRef} />

                        {/* Capa base de OpenStreetMap */}
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />

                        {/* Capas climáticas desactivadas en el modal - solo se muestran en el PDF */}

                        {/* Renderizar polígono si hay vértices o puntos muestreados */}
                        {(modalData.vertices || modalData.puntosMuestreados) && (modalData.vertices?.length > 0 || modalData.puntosMuestreados?.length > 0) ? (
                          <>
                            <Polygon
                              positions={(modalData.vertices || modalData.puntosMuestreados).map(p => [parseFloat(p.latitud), parseFloat(p.longitud)])}
                              pathOptions={{ color: '#00bcd4', fillColor: '#00bcd4', fillOpacity: 0.3 }}
                            />
                            {/* Marcador en el centro del polígono */}
                            <CircleMarker
                              center={[parseFloat(modalData.latitud), parseFloat(modalData.longitud)]}
                              radius={10}
                              fillColor="#ff4444"
                              color="#fff"
                              weight={2}
                              fillOpacity={0.9}
                            >
                              <Tooltip permanent>
                                <div style={{ textAlign: 'center' }}>
                                  <strong>{modalData.variable}</strong>
                                  <br />
                                  <span style={{ fontSize: '0.95em' }}>{modalData.lugar}</span>
                                  <br />
                                  <span style={{ fontSize: '0.85em', color: '#666' }}>
                                    Centro ({(modalData.vertices || modalData.puntosMuestreados).length} vértices)
                                  </span>
                                </div>
                              </Tooltip>
                            </CircleMarker>
                            {/* Marcadores en cada vértice del polígono */}
                            {modalData.vertices && modalData.vertices.map((punto, idx) => (
                              <CircleMarker
                                key={`vertice-${idx}`}
                                center={[parseFloat(punto.latitud), parseFloat(punto.longitud)]}
                                radius={6}
                                fillColor="#ff6b6b"
                                color="#fff"
                                weight={2}
                                fillOpacity={0.9}
                              >
                                <Tooltip>
                                  <div>
                                    <strong>🔺 Vértice {idx + 1}</strong>
                                    <br />
                                    <span style={{ fontSize: '0.85em' }}>
                                      Lat: {punto.latitud}
                                      <br />
                                      Lng: {punto.longitud}
                                    </span>
                                  </div>
                                </Tooltip>
                              </CircleMarker>
                            ))}

                            {/* Marcadores en cada punto muestreado (opcional) */}
                            {modalData.puntosMuestreados && modalData.puntosMuestreados.map((punto, idx) => (
                              <CircleMarker
                                key={`muestra-${idx}`}
                                center={[parseFloat(punto.latitud), parseFloat(punto.longitud)]}
                                radius={4}
                                fillColor="#00bcd4"
                                color="#333"
                                weight={1}
                                fillOpacity={0.6}
                              >
                                <Tooltip>
                                  <div>
                                    <strong>📊 Punto de Muestra {idx + 1}</strong>
                                    <br />
                                    <span style={{ fontSize: '0.85em' }}>
                                      Lat: {punto.latitud}
                                      <br />
                                      Lng: {punto.longitud}
                                    </span>
                                  </div>
                                </Tooltip>
                              </CircleMarker>
                            ))}
                          </>
                        ) : (
                          /* Renderizar un solo marcador si es punto único */
                          <CircleMarker
                            center={[parseFloat(modalData.latitud), parseFloat(modalData.longitud)]}
                            radius={8}
                            fillColor="#00bcd4"
                            color="#333"
                            weight={2}
                            fillOpacity={0.8}
                          >
                            <Tooltip permanent>
                              <div>
                                <strong>{modalData.variable}</strong>
                                <br />
                                {modalData.lugar}
                                <br />
                                Valor: {modalData.valorActual} {modalData.unidad}
                              </div>
                            </Tooltip>
                          </CircleMarker>
                        )}
                      </MapContainer>
                    </div>
                  </div>

                  {/* Sección de Estadísticas Compactas */}
                  <div className={styles.modalStatsCompact}>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>📍 Lugar:</span>
                      <span className={styles.statValue}>{modalData.lugar}</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>📊 Variable:</span>
                      <span className={styles.statValue}>{modalData.variable}</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>🌡️ Actual:</span>
                      <span className={styles.statValue}>{modalData.valorActual} {modalData.unidad}</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>📈 Promedio:</span>
                      <span className={styles.statValue}>{modalData.promedio} {modalData.unidad}</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>⬆️ Máximo:</span>
                      <span className={styles.statValue}>{modalData.maximo} {modalData.unidad}</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>⬇️ Mínimo:</span>
                      <span className={styles.statValue}>{modalData.minimo} {modalData.unidad}</span>
                    </div>
                  </div>

                  {/* Sección de Serie Temporal */}
                  {modalData.serieTemporal && modalData.serieTemporal.length > 0 && (
                    <div className={styles.modalTimeSeriesSection}>
                      <h4>📈 Serie Temporal ({modalData.serieTemporal.length} registros)</h4>
                      <div className={styles.chartContainer}>
                        <canvas 
                          ref={modalCanvasRef}
                          width="800" 
                          height="300"
                        />
                      </div>
                    </div>
                  )}
                </div>

              {/* PESTAÑAS DE CONTENIDO */}
              {activeTab === 'detalles' && (
                <>
              {/* INFORMACIÓN COMPLETA DESPUÉS DEL MAPA */}
              <div className={styles.detailsGrid}>
                {/* Cultivo Seleccionado */}
                {modalData.cropAnalysis && modalData.cropAnalysis.cultivo && (
                  <div className={styles.modalSection}>
                    <h4>🌾 Cultivo Analizado</h4>
                    <div className={styles.modalGrid}>
                      <div className={styles.modalItem} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '2em' }}>
                          {CULTIVOS[modalData.cropAnalysis.cultivo]?.icono || '🌱'}
                        </span>
                        <div>
                          <strong>{modalData.cropAnalysis.cultivo}</strong>
                          <br />
                          <small style={{ color: modalData.cropAnalysis.recomendacion?.color || '#666' }}>
                            Aptitud: {modalData.cropAnalysis.aptitudes?.total || 'N/A'}% - {modalData.cropAnalysis.recomendacion?.nivel || 'N/A'}
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className={styles.modalSection}>
                  <h4>👤 Información del Usuario</h4>
                  <div className={styles.modalGrid}>
                    <div className={styles.modalItem}>
                      <strong>Nombre:</strong> {modalData.nombre}
                    </div>
                    <div className={styles.modalItem}>
                      <strong>Rol:</strong> {modalData.rol}
                    </div>
                    <div className={styles.modalItem}>
                      <strong>Email:</strong> {modalData.email}
                    </div>
                    <div className={styles.modalItem}>
                      <strong>Fecha de descarga:</strong> {modalData.fecha}
                    </div>
                    <div className={styles.modalItem}>
                      <strong>Hora de descarga:</strong> {modalData.hora}
                    </div>
                  </div>
                </div>

                <div className={styles.modalSection}>
                  <h4>📍 Ubicación</h4>
                  <div className={styles.modalGrid}>
                    <div className={styles.modalItem}>
                      <strong>Lugar:</strong> {modalData.lugar}
                    </div>
                    <div className={styles.modalItem}>
                      <strong>Tipo:</strong> {modalData.tipoConsulta}
                    </div>
                    <div className={styles.modalItem}>
                      <strong>Latitud:</strong> {modalData.latitud}
                    </div>
                    <div className={styles.modalItem}>
                      <strong>Longitud:</strong> {modalData.longitud}
                    </div>
                    {modalData.puntosMuestreados && (
                      <div className={styles.modalItem}>
                        <strong>Puntos muestreados:</strong> {modalData.puntosMuestreados.length}
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.modalSection}>
                  <h4>🌡️ Datos Climáticos</h4>
                  <div className={styles.modalGrid}>
                    <div className={styles.modalItem}>
                      <strong>Variable:</strong> {modalData.variable}
                    </div>
                    <div className={styles.modalItem}>
                      <strong>Rango temporal:</strong> {modalData.rangoTemporal}
                    </div>
                    <div className={styles.modalItem}>
                      <strong>Valor actual:</strong> {modalData.valorActual} {modalData.unidad}
                    </div>
                    <div className={styles.modalItem}>
                      <strong>Unidad:</strong> {modalData.unidad}
                    </div>
                    <div className={styles.modalItem}>
                      <strong>Promedio:</strong> {modalData.promedio} {modalData.unidad}
                    </div>
                    <div className={styles.modalItem}>
                      <strong>Máximo:</strong> {modalData.maximo} {modalData.unidad}
                    </div>
                    <div className={styles.modalItem}>
                      <strong>Mínimo:</strong> {modalData.minimo} {modalData.unidad}
                    </div>
                  </div>
                </div>

                {/* Estado de los Datos */}
                {modalData.estadoDatos && (
                  <div className={styles.modalSection}>
                    <h4>📡 Estado de los Datos</h4>
                    <div className={styles.modalGrid}>
                      <div className={styles.modalItem}>
                        <strong>Estado:</strong> {modalData.estadoDatos.mensaje || 'N/A'}
                      </div>
                      <div className={styles.modalItem}>
                        <strong>En tiempo real:</strong> {modalData.estadoDatos.enTiempoReal === 'true' || modalData.estadoDatos.enTiempoReal === true ? 'Sí' : 'No'}
                      </div>
                      {modalData.estadoDatos.fechaDatos && (
                        <div className={styles.modalItem}>
                          <strong>Fecha de datos:</strong> {new Date(modalData.estadoDatos.fechaDatos).toLocaleDateString()}
                        </div>
                      )}
                      {modalData.estadoDatos.fuenteAPI && (
                        <div className={styles.modalItem}>
                          <strong>Fuente de datos:</strong> {modalData.estadoDatos.fuenteAPI}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Rango de Fechas de Consulta */}
                {modalData.fechaInicio && modalData.fechaFin && (
                  <div className={styles.modalSection}>
                    <h4>📅 Rango de Consulta</h4>
                    <div className={styles.modalGrid}>
                      <div className={styles.modalItem}>
                        <strong>Fecha inicio:</strong> {modalData.fechaInicio}
                      </div>
                      <div className={styles.modalItem}>
                        <strong>Fecha fin:</strong> {modalData.fechaFin}
                      </div>
                    </div>
                  </div>
                )}
              </div>
                </>
              )}

              {/* PESTAÑA: ANÁLISIS DE CULTIVO */}
              {activeTab === 'cultivo' && modalData.cropAnalysis && modalData.cropAnalysis.cultivo && modalData.cropAnalysis.aptitudes && (
                <div className={styles.cultivoAnalysisContainer}>
                  {/* Encabezado del Cultivo */}
                  <div className={styles.cultivoHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span style={{ fontSize: '4em' }}>
                        {CULTIVOS[modalData.cropAnalysis.cultivo]?.icono || '🌱'}
                      </span>
                      <div>
                        <h2 style={{ margin: '0 0 8px 0' }}>{modalData.cropAnalysis.cultivo}</h2>
                        <p style={{
                          margin: 0,
                          fontSize: '1.2em',
                          color: modalData.cropAnalysis.recomendacion?.color || '#666',
                          fontWeight: 'bold'
                        }}>
                          {modalData.cropAnalysis.recomendacion?.nivel || 'N/A'} - Aptitud Total: {modalData.cropAnalysis.aptitudes?.total || 'N/A'}%
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Recomendación */}
                  <div className={styles.modalSection} style={{
                    backgroundColor: modalData.cropAnalysis.recomendacion?.color ? `${modalData.cropAnalysis.recomendacion.color}20` : '#f5f5f5',
                    border: `2px solid ${modalData.cropAnalysis.recomendacion?.color || '#ccc'}`,
                    borderRadius: '8px',
                    padding: '16px'
                  }}>
                    <h4 style={{ color: modalData.cropAnalysis.recomendacion?.color || '#333' }}>
                      💡 Recomendación
                    </h4>
                    <p style={{ fontSize: '1.1em', margin: '8px 0 0 0' }}>
                      {modalData.cropAnalysis.recomendacion?.texto || 'No disponible'}
                    </p>
                  </div>

                  {/* Aptitudes del Cultivo */}
                  <div className={styles.modalSection}>
                    <h4>📊 Aptitudes para el Cultivo</h4>
                    <div className={styles.aptitudesGrid}>
                      <div className={styles.aptitudCard}>
                        <div className={styles.aptitudIcon}>🌡️</div>
                        <div className={styles.aptitudLabel}>Temperatura</div>
                        <div className={styles.aptitudValue}>
                          {modalData.cropAnalysis.aptitudes?.temperatura || 'N/A'}%
                        </div>
                        <div className={styles.aptitudBar}>
                          <div
                            className={styles.aptitudProgress}
                            style={{
                              width: `${modalData.cropAnalysis.aptitudes?.temperatura || 0}%`,
                              backgroundColor: modalData.cropAnalysis.aptitudes?.temperatura >= 70 ? '#22c55e' :
                                               modalData.cropAnalysis.aptitudes?.temperatura >= 40 ? '#f59e0b' : '#ef4444'
                            }}
                          />
                        </div>
                      </div>

                      <div className={styles.aptitudCard}>
                        <div className={styles.aptitudIcon}>💧</div>
                        <div className={styles.aptitudLabel}>Precipitación</div>
                        <div className={styles.aptitudValue}>
                          {modalData.cropAnalysis.aptitudes?.precipitacion || 'N/A'}%
                        </div>
                        <div className={styles.aptitudBar}>
                          <div
                            className={styles.aptitudProgress}
                            style={{
                              width: `${modalData.cropAnalysis.aptitudes?.precipitacion || 0}%`,
                              backgroundColor: modalData.cropAnalysis.aptitudes?.precipitacion >= 70 ? '#22c55e' :
                                               modalData.cropAnalysis.aptitudes?.precipitacion >= 40 ? '#f59e0b' : '#ef4444'
                            }}
                          />
                        </div>
                      </div>

                      <div className={styles.aptitudCard}>
                        <div className={styles.aptitudIcon}>⛰️</div>
                        <div className={styles.aptitudLabel}>Altitud</div>
                        <div className={styles.aptitudValue}>
                          {modalData.cropAnalysis.aptitudes?.altitud || 'N/A'}%
                        </div>
                        <div className={styles.aptitudBar}>
                          <div
                            className={styles.aptitudProgress}
                            style={{
                              width: `${modalData.cropAnalysis.aptitudes?.altitud || 0}%`,
                              backgroundColor: modalData.cropAnalysis.aptitudes?.altitud >= 70 ? '#22c55e' :
                                               modalData.cropAnalysis.aptitudes?.altitud >= 40 ? '#f59e0b' : '#ef4444'
                            }}
                          />
                        </div>
                      </div>

                      <div className={styles.aptitudCard} style={{
                        border: '2px solid ' + (modalData.cropAnalysis.recomendacion?.color || '#ccc')
                      }}>
                        <div className={styles.aptitudIcon}>🎯</div>
                        <div className={styles.aptitudLabel}>Total</div>
                        <div className={styles.aptitudValue} style={{
                          fontSize: '1.5em',
                          color: modalData.cropAnalysis.recomendacion?.color || '#333'
                        }}>
                          {modalData.cropAnalysis.aptitudes?.total || 'N/A'}%
                        </div>
                        <div className={styles.aptitudBar}>
                          <div
                            className={styles.aptitudProgress}
                            style={{
                              width: `${modalData.cropAnalysis.aptitudes?.total || 0}%`,
                              backgroundColor: modalData.cropAnalysis.recomendacion?.color || '#666'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Condiciones Climáticas Actuales */}
                  {modalData.cropAnalysis.condicionesClimaticas &&
                   modalData.cropAnalysis.condicionesClimaticas.temperatura !== undefined && (
                    <div className={styles.modalSection}>
                      <h4>🌤️ Condiciones Climáticas Actuales</h4>
                      <div className={styles.modalGrid}>
                        <div className={styles.modalItem}>
                          <strong>🌡️ Temperatura:</strong> {modalData.cropAnalysis.condicionesClimaticas.temperatura}°C
                          {modalData.cropAnalysis.fuentesDatos?.temperatura && (
                            <div style={{ fontSize: '0.85em', color: '#666', marginTop: '4px' }}>
                              {modalData.cropAnalysis.fuentesDatos.temperatura === 'estimado' ? '⚠️' : '📡'} {modalData.cropAnalysis.fuentesDatos.temperatura}
                            </div>
                          )}
                        </div>
                        {modalData.cropAnalysis.condicionesClimaticas.precipitacion !== undefined && (
                          <div className={styles.modalItem}>
                            <strong>💧 Precipitación:</strong> {
                              typeof modalData.cropAnalysis.condicionesClimaticas.precipitacion === 'number'
                                ? modalData.cropAnalysis.condicionesClimaticas.precipitacion.toFixed(0)
                                : modalData.cropAnalysis.condicionesClimaticas.precipitacion
                            } mm/año
                            {modalData.cropAnalysis.fuentesDatos?.precipitacion && (
                              <div style={{ fontSize: '0.85em', color: '#666', marginTop: '4px' }}>
                                {modalData.cropAnalysis.fuentesDatos.precipitacion === 'estimado' ? '⚠️' : '📡'} {modalData.cropAnalysis.fuentesDatos.precipitacion}
                              </div>
                            )}
                          </div>
                        )}
                        {modalData.cropAnalysis.condicionesClimaticas.altitud !== undefined && (
                          <div className={styles.modalItem}>
                            <strong>⛰️ Altitud:</strong> {
                              typeof modalData.cropAnalysis.condicionesClimaticas.altitud === 'number'
                                ? modalData.cropAnalysis.condicionesClimaticas.altitud.toFixed(0)
                                : modalData.cropAnalysis.condicionesClimaticas.altitud
                            } msnm
                            {modalData.cropAnalysis.fuentesDatos?.altitud && (
                              <div style={{ fontSize: '0.85em', color: '#666', marginTop: '4px' }}>
                                {modalData.cropAnalysis.fuentesDatos.altitud === 'estimado' ? '⚠️' : '📡'} {modalData.cropAnalysis.fuentesDatos.altitud}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Parámetros Óptimos del Cultivo */}
                  {modalData.cropAnalysis.parametrosOptimos && (
                    <div className={styles.modalSection}>
                      <h4>🎯 Parámetros Óptimos para {modalData.cropAnalysis.cultivo}</h4>
                      <div className={styles.parametrosGrid}>
                        <div className={styles.parametroCard}>
                          <div className={styles.parametroHeader}>
                            <span className={styles.parametroIcon}>🌡️</span>
                            <span className={styles.parametroTitle}>Temperatura</span>
                          </div>
                          <div className={styles.parametroRange}>
                            {typeof modalData.cropAnalysis.parametrosOptimos.temperatura === 'string'
                              ? modalData.cropAnalysis.parametrosOptimos.temperatura
                              : `${modalData.cropAnalysis.parametrosOptimos.temperatura?.min}°C - ${modalData.cropAnalysis.parametrosOptimos.temperatura?.max}°C`
                            }
                          </div>
                        </div>

                        <div className={styles.parametroCard}>
                          <div className={styles.parametroHeader}>
                            <span className={styles.parametroIcon}>💧</span>
                            <span className={styles.parametroTitle}>Precipitación</span>
                          </div>
                          <div className={styles.parametroRange}>
                            {typeof modalData.cropAnalysis.parametrosOptimos.precipitacion === 'string'
                              ? modalData.cropAnalysis.parametrosOptimos.precipitacion
                              : `${modalData.cropAnalysis.parametrosOptimos.precipitacion?.min} - ${modalData.cropAnalysis.parametrosOptimos.precipitacion?.max} mm/año`
                            }
                          </div>
                        </div>

                        <div className={styles.parametroCard}>
                          <div className={styles.parametroHeader}>
                            <span className={styles.parametroIcon}>⛰️</span>
                            <span className={styles.parametroTitle}>Altitud</span>
                          </div>
                          <div className={styles.parametroRange}>
                            {typeof modalData.cropAnalysis.parametrosOptimos.altitud === 'string'
                              ? modalData.cropAnalysis.parametrosOptimos.altitud
                              : `${modalData.cropAnalysis.parametrosOptimos.altitud?.min} - ${modalData.cropAnalysis.parametrosOptimos.altitud?.max} msnm`
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Ciclos Agrícolas */}
                  {modalData.cropAnalysis.ciclosAgricolas && (
                    <div className={styles.modalSection}>
                      <h4>📅 Ciclos Agrícolas</h4>
                      <div className={styles.modalGrid}>
                        <div className={styles.modalItem}>
                          <strong>🌱 Siembra:</strong> {modalData.cropAnalysis.ciclosAgricolas.siembra}
                        </div>
                        <div className={styles.modalItem}>
                          <strong>🌾 Cosecha:</strong> {modalData.cropAnalysis.ciclosAgricolas.cosecha}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Riesgos Identificados */}
                  {modalData.cropAnalysis.riesgos && modalData.cropAnalysis.riesgos.length > 0 && (
                    <div className={styles.modalSection}>
                      <h4 style={{ color: '#ef4444' }}>⚠️ Riesgos Identificados</h4>
                      <ul className={styles.riesgosList}>
                        {modalData.cropAnalysis.riesgos.map((riesgo, index) => (
                          <li key={index} className={styles.riesgoItem}>
                            {riesgo}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Ubicación del Análisis */}
                  {modalData.cropAnalysis.ubicacion && (
                    <div className={styles.modalSection}>
                      <h4>📍 Ubicación del Análisis</h4>
                      <div className={styles.modalGrid}>
                        <div className={styles.modalItem}>
                          <strong>Latitud:</strong> {modalData.cropAnalysis.ubicacion.latitud || modalData.cropAnalysis.ubicacion.lat || modalData.latitud}
                        </div>
                        <div className={styles.modalItem}>
                          <strong>Longitud:</strong> {modalData.cropAnalysis.ubicacion.longitud || modalData.cropAnalysis.ubicacion.lng || modalData.longitud}
                        </div>
                        {(modalData.cropAnalysis.ubicacion.altitud || modalData.cropAnalysis.condicionesClimaticas?.altitud) && (
                          <div className={styles.modalItem}>
                            <strong>Altitud:</strong> {modalData.cropAnalysis.ubicacion.altitud || modalData.cropAnalysis.condicionesClimaticas?.altitud} msnm
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer del modal CON BOTONES MEJORADOS */}
            <div className={styles.modalFooter}>
              <button
                className={`${styles.btn} ${styles.btnDownload}`}
                onClick={handleDownloadModalJSON}
                title="Descargar datos en formato JSON"
              >
                <img src="/iconos/download.png" alt="Descargar" style={{ width: '18px', height: '18px', marginRight: '8px', filter: 'brightness(0) invert(1)' }} />
                Descargar JSON
              </button>
              <button
                className={`${styles.btn} ${styles.btnPdf}`}
                onClick={handleDownloadModalPDF}
                title="Descargar reporte completo en PDF"
              >
                <img src="/iconos/file-pdf.png" alt="PDF" style={{ width: '18px', height: '18px', marginRight: '8px', filter: 'brightness(0) invert(1)' }} />
                Descargar PDF
              </button>

              {/* BOTÓN NUEVO: ELIMINAR REGISTRO */}
              <button
                className={`${styles.btn} ${styles.btnDelete}`}
                onClick={() => handleDeleteRecord(modalData._id)}
                disabled={deletingId === modalData._id}
                title="Eliminar este registro permanentemente"
              >
                {deletingId === modalData._id ? (
                  <>⏳ Eliminando...</>
                ) : (
                  <>
                    <img src="/iconos/trash.png" alt="Eliminar" style={{ width: '18px', height: '18px', marginRight: '8px', filter: 'brightness(0) invert(1)' }} />
                    Eliminar Registro
                  </>
                )}
              </button>

              <button
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={handleCloseModal}
                title="Cerrar ventana de detalles"
              >
                ✕ Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
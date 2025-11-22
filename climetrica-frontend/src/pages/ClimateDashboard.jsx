import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, Polygon, useMap } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import domtoimage from "dom-to-image-more";
import jsPDF from "jspdf";
import { Chart } from "chart.js/auto";
import "leaflet/dist/leaflet.css";
import API from "../api/api";
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
    apiKey: "d2f1e6e2af677293a7fc4e832214a09c",
    maxNativeZoom: 18
  },
  "Temperatura del mar": {
    type: "wmts",
    layer: "GHRSST_L4_MUR_Sea_Surface_Temperature",
    format: "png",
    opacity: 0.9,
    maxNativeZoom: 7,
    baseUrl: "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/GHRSST_L4_MUR_Sea_Surface_Temperature/default/{time}/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png"
  },
  "Precipitación": {
    type: "wmts",
    layer: "GPM_3IMERGHH_V07B_Precipitation",
    format: "png",
    opacity: 0.7,
    maxNativeZoom: 9,
    baseUrl: "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/GPM_3IMERGHH_V07B_Precipitation/default/{time}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png"
  },
  "Vientos (OWM)": {
    type: "openweathermap",
    layer: "wind_new",
    opacity: 0.7,
    apiKey: "d2f1e6e2af677293a7fc4e832214a09c",
    maxNativeZoom: 18
  }
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
        navigate("/");
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
        let url = "/api/climate-data/";
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
            serieTemporal: serieTemporal || []
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
        setError("No se pudo conectar al servidor.");
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
      if (modalCanvasRef.current && modalCanvasRef.current._chartInstance) {
        try {
          modalCanvasRef.current._chartInstance.destroy();
          modalCanvasRef.current._chartInstance = null;
        } catch (e) {
          console.warn('Error destroying chart on cleanup:', e);
        }
      }
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
      const response = await API.delete(`/api/climate-data/${id}/`);

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
      console.error('Detalles del error:', error.response?.data);

      const errorMsg = error.response?.data?.error || error.message || 'Error desconocido';
      alert(`❌ Error al eliminar: ${errorMsg}\n\nPor favor intente nuevamente.`);
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
    
    const colors = ["#1a1a6e", "#2929cc", "#00bfff", "#00ff7f", "#ffff00", "#ffa500", "#ff4500", "#8b0000"];
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
          backgroundColor: grad, 
          fill: true, 
          tension: 0.25, 
          pointRadius: 3,
          pointBackgroundColor: colors[Math.floor(colors.length / 2)],
          borderWidth: 2
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
      
      const colors = ["#1a1a6e", "#2929cc", "#00bfff", "#00ff7f", "#ffff00", "#ffa500", "#ff4500", "#8b0000"];
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
   * FUNCIÓN MEJORADA: Descargar PDF del modal SIN ERRORES DE Ñ
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

      // IMPORTANTE: Configurar fuente que soporte caracteres especiales
      doc.setFont("helvetica");

      let y = 15;

      // Cargar logo
      const logoBase64 = await loadLogoAsBase64();

      // ========================================
      // ENCABEZADO
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
      doc.text('Reporte Climatico Detallado', 120, 18, { align: 'center' });

      // Subtítulo con variable
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      doc.text('Variable: ' + modalData.variable, 120, 27, { align: 'center' });

      // Estado de los datos
      const statusMsg = modalData.estadoDatos?.mensaje || 'Estado desconocido';
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
      doc.text(`Nombre: ${modalData.nombre}`, 14, y);
      y += 5;
      doc.text(`Rol: ${modalData.rol}`, 14, y);
      y += 5;
      doc.text(`Email: ${modalData.email}`, 14, y);
      y += 5;
      doc.text(`Fecha de consulta: ${modalData.fecha} ${modalData.hora}`, 14, y);
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
      doc.text(`Lugar: ${modalData.lugar}`, 14, y);
      y += 5;
      doc.text(`Tipo de consulta: ${modalData.tipoConsulta}`, 14, y);
      y += 5;
      
      if (modalData.puntosMuestreados && modalData.puntosMuestreados.length > 0) {
        doc.text(`Centro: ${modalData.latitud}, ${modalData.longitud}`, 14, y);
        y += 5;
        doc.text(`Puntos muestreados: ${modalData.puntosMuestreados.length}`, 14, y);
        y += 5;
      } else {
        doc.text(`Coordenadas: ${modalData.latitud}, ${modalData.longitud}`, 14, y);
        y += 5;
      }
      
      doc.text(`Rango temporal: ${modalData.rangoTemporal}`, 14, y);
      y += 5;
      if (modalData.fechaInicio && modalData.fechaFin) {
        doc.text(`Periodo: ${modalData.fechaInicio} a ${modalData.fechaFin}`, 14, y);
        y += 5;
      }
      y += 5;
      
      // ========================================
      // ESTADÍSTICAS
      // ========================================
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Estadisticas Climatologicas', 14, y);
      y += 7;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Valor actual: ${modalData.valorActual} ${modalData.unidad}`, 14, y);
      y += 5;
      doc.text(`Promedio: ${modalData.promedio} ${modalData.unidad}`, 14, y);
      y += 5;
      doc.text(`Maximo: ${modalData.maximo} ${modalData.unidad}`, 14, y);
      y += 5;
      doc.text(`Minimo: ${modalData.minimo} ${modalData.unidad}`, 14, y);
      y += 10;

      // ========================================
      // PUNTOS DEL POLÍGONO (si aplica)
      // ========================================
      if (modalData.puntosMuestreados && modalData.puntosMuestreados.length > 0) {
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Puntos del Poligono', 14, y);
        y += 7;
        
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        
        modalData.puntosMuestreados.forEach((punto, index) => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          doc.text(`${index + 1}. Lat: ${punto.latitud}, Lng: ${punto.longitud}`, 14, y);
          y += 4;
        });
        
        y += 10;
      }

      // Nueva página para el mapa
      if (y > 180) {
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

      // Nueva página para la serie temporal
      if (y > 180 || mapSnapshot) {
        doc.addPage();
        y = 20;
      }

      // ========================================
      // SERIE TEMPORAL (GRÁFICO)
      // ========================================
      if (modalData.serieTemporal && modalData.serieTemporal.length > 0) {
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Serie Temporal', 14, y);
        y += 5;
        
        const chartImage = await createChartImageForPDF(modalData.serieTemporal);
        if (chartImage) {
          const chartWidth = 180;
          const chartHeight = 70;
          doc.addImage(chartImage, 'PNG', 14, y, chartWidth, chartHeight);
          y += chartHeight + 10;
        }

        // Nueva página para datos detallados
        if (y > 200) {
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
        doc.text(`Valor (${modalData.unidad})`, 60, y);
        y += 5;
        doc.setFont(undefined, 'normal');
        
        // Filas de datos
        modalData.serieTemporal.forEach((s) => {
          if (y > 280) {
            doc.addPage();
            y = 20;
            doc.setFont(undefined, 'bold');
            doc.text('Fecha', 14, y);
            doc.text(`Valor (${modalData.unidad})`, 60, y);
            y += 5;
            doc.setFont(undefined, 'normal');
          }
          doc.text(s.date, 14, y);
          doc.text(s.value.toString(), 60, y);
          y += 4.5;
        });
      }

      // ========================================
      // PIE DE PÁGINA EN TODAS LAS PÁGINAS
      // ========================================
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(`Pagina ${i} de ${pageCount}`, 105, 290, { align: 'center' });
        doc.text('Generado por Sistema de Monitoreo Climatico-Climetrica', 105, 285, { align: 'center' });
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
                <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>
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

            {/* Cuerpo del modal */}
            <div className={styles.modalBody}>
              {/* MAPA Y SERIE TEMPORAL AL INICIO */}
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

              {/* INFORMACIÓN COMPLETA DESPUÉS DEL MAPA */}
              <div className={styles.detailsGrid}>
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
// src/components/PolygonDrawer.jsx
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

/**
 * PolygonDrawer Component
 * Permite al usuario dibujar polígonos en el mapa clickeando puntos
 * y obtener datos agregados del área seleccionada
 */
export default function PolygonDrawer({ 
  map, 
  isActive, 
  onPolygonComplete,
  activeVariable,
  onClearPolygon // Nueva prop para limpiar desde el padre
}) {
  const [points, setPoints] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const polygonLayerRef = useRef(null);
  const markersRef = useRef([]);
  const tempLineRef = useRef(null);
  const completedPolygonRef = useRef(null); // Guardar el polígono completado

  // Limpiar solo el polígono completado (no afecta el dibujo en progreso)
  const clearCompletedPolygon = () => {
    if (completedPolygonRef.current && map) {
      try {
        map.removeLayer(completedPolygonRef.current);
        completedPolygonRef.current = null;
        console.log('Polígono completado eliminado');
      } catch (e) {
        console.warn('Error al eliminar polígono:', e);
      }
    }

    // También limpiar la referencia del polígono en progreso
    if (polygonLayerRef.current && map) {
      try {
        map.removeLayer(polygonLayerRef.current);
        polygonLayerRef.current = null;
      } catch (e) {
        console.warn('Error al eliminar polígono en progreso:', e);
      }
    }

    // Limpiar puntos y estado
    clearTemporaryMarkers();
    setPoints([]);
    setIsDrawing(false);
  };

  // Limpiar marcadores temporales
  const clearTemporaryMarkers = () => {
    // Limpiar marcadores circulares guardados en la referencia
    markersRef.current.forEach(marker => {
      if (map && map.hasLayer(marker)) {
        try {
          map.removeLayer(marker);
        } catch (e) {
          console.warn('Error eliminando marcador:', e);
        }
      }
    });
    markersRef.current = [];

    // Limpiar línea temporal
    if (tempLineRef.current && map) {
      try {
        map.removeLayer(tempLineRef.current);
      } catch (e) {
        console.warn('Error eliminando línea temporal:', e);
      }
      tempLineRef.current = null;
    }

    // Forzar limpieza de TODAS las polylines y CircleMarkers del mapa
    if (map) {
      const layersToRemove = [];
      map.eachLayer((layer) => {
        // Eliminar líneas temporales (polylines que no sean polígonos)
        if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
          layersToRemove.push(layer);
        }
        // Eliminar TODOS los CircleMarkers (puntos azules del dibujo)
        if (layer instanceof L.CircleMarker) {
          layersToRemove.push(layer);
        }
      });

      // Eliminar todas las capas encontradas
      layersToRemove.forEach(layer => {
        try {
          map.removeLayer(layer);
        } catch (e) {
          console.warn('Error eliminando capa:', e);
        }
      });
    }
  };

  // Limpiar todo el dibujo (incluyendo puntos temporales)
  const clearDrawing = () => {
    clearTemporaryMarkers();

    // Remover polígono en progreso (pero NO el completado)
    if (polygonLayerRef.current && map && polygonLayerRef.current !== completedPolygonRef.current) {
      map.removeLayer(polygonLayerRef.current);
      polygonLayerRef.current = null;
    }

    setPoints([]);
    setIsDrawing(false);
  };

  // Limpiar cuando el componente se desmonta o se desactiva
  useEffect(() => {
    if (!isActive) {
      clearDrawing();
      // Asegurarse de que los puntos se limpian
      setPoints([]);
      setIsDrawing(false);
    }
  }, [isActive]);

  // Exponer función de limpieza al padre
  useEffect(() => {
    if (onClearPolygon && map) {
      // Esta función será llamada desde el padre
      window.__clearPolygon = () => {
        clearCompletedPolygon();
      };
    }
    return () => {
      delete window.__clearPolygon;
    };
  }, [map, onClearPolygon]);

  // Manejar los clicks en el mapa
  useEffect(() => {
    if (!map || !isActive) return;

    const handleMapClick = (e) => {
      if (!isActive) return;
      
      // Detener la propagación para que no interfiera con otros handlers
      L.DomEvent.stopPropagation(e);
      
      const { lat, lng } = e.latlng;
      const newPoint = [lat, lng];
      
      // Agregar punto
      setPoints(prev => [...prev, newPoint]);
      
      // Crear marcador visual
      const marker = L.circleMarker([lat, lng], {
        radius: 6,
        fillColor: '#3b82f6',
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
      }).addTo(map);
      
      markersRef.current.push(marker);
      
      // Dibujar líneas temporales
      if (points.length > 0) {
        if (tempLineRef.current) {
          map.removeLayer(tempLineRef.current);
        }
        
        const allPoints = [...points, newPoint];
        tempLineRef.current = L.polyline(allPoints, {
          color: '#3b82f6',
          weight: 2,
          opacity: 0.6,
          dashArray: '5, 5'
        }).addTo(map);
      }
      
      setIsDrawing(true);
    };

    // Usar captura de eventos para tener prioridad
    map.on('click', handleMapClick, { capture: true });

    return () => {
      map.off('click', handleMapClick);
    };
  }, [map, isActive, points]);

  // Función para completar el polígono
  const completePolygon = async () => {
    if (points.length < 3) {
      alert('Necesitas al menos 3 puntos para crear un polígono');
      return;
    }

    // Crear polígono final
    if (polygonLayerRef.current) {
      map.removeLayer(polygonLayerRef.current);
    }

    const polygon = L.polygon(points, {
      color: '#3b82f6',
      fillColor: '#3b82f6',
      fillOpacity: 0.2,
      weight: 2
    }).addTo(map);

    polygonLayerRef.current = polygon;
    completedPolygonRef.current = polygon; // Guardar referencia del polígono completado

    // Calcular centro del polígono
    const bounds = polygon.getBounds();
    const center = bounds.getCenter();

    // Calcular área del polígono en km²
    const areaInKm2 = calculatePolygonArea(points);

    // Calcular número de puntos de muestreo basándose en el área
    // Áreas pequeñas (< 100 km²): 3-5 puntos
    // Áreas medianas (100-1000 km²): 5-10 puntos
    // Áreas grandes (> 1000 km²): 10-20 puntos
    let numSamples;
    if (areaInKm2 < 100) {
      numSamples = Math.max(3, Math.min(5, Math.floor(areaInKm2 / 20) + 3));
    } else if (areaInKm2 < 1000) {
      numSamples = Math.max(5, Math.min(10, Math.floor(areaInKm2 / 100) + 5));
    } else {
      numSamples = Math.max(10, Math.min(20, Math.floor(areaInKm2 / 500) + 10));
    }

    console.log(`Área del polígono: ${areaInKm2.toFixed(2)} km² - Puntos de muestreo: ${numSamples}`);

    // Calcular puntos de muestreo dentro del polígono
    const samplePoints = generateSamplePoints(points, numSamples);

    // Obtener lugar representativo (centro)
    const place = await reverseGeocode(center.lat, center.lng);

    // Notificar al componente padre
    if (onPolygonComplete) {
      onPolygonComplete({
        polygon: points,
        center: [center.lat, center.lng],
        place,
        samplePoints
      });
    }

    // Limpiar marcadores temporales pero MANTENER el polígono
    clearTemporaryMarkers();
    setIsDrawing(false);
    setPoints([]); // Limpiar puntos para permitir nuevo dibujo
  };

  // Función para cancelar el dibujo
  const cancelDrawing = () => {
    clearDrawing();
    setIsDrawing(false);
  };

  // Calcular área del polígono en km² usando la fórmula de Shoelace
  const calculatePolygonArea = (polygonPoints) => {
    if (polygonPoints.length < 3) return 0;

    // Radio de la Tierra en km
    const R = 6371;

    // Convertir coordenadas a radianes
    const toRad = (deg) => deg * Math.PI / 180;

    let area = 0;
    const numPoints = polygonPoints.length;

    for (let i = 0; i < numPoints; i++) {
      const p1 = polygonPoints[i];
      const p2 = polygonPoints[(i + 1) % numPoints];

      const lat1 = toRad(p1[0]);
      const lat2 = toRad(p2[0]);
      const lon1 = toRad(p1[1]);
      const lon2 = toRad(p2[1]);

      // Fórmula del área esférica
      area += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
    }

    area = Math.abs(area * R * R / 2);
    return area;
  };

  // Generar puntos de muestreo dentro del polígono
  const generateSamplePoints = (polygonPoints, numSamples) => {
    if (polygonPoints.length < 3) return [];

    const samples = [];
    const bounds = L.polygon(polygonPoints).getBounds();
    
    const latMin = bounds.getSouth();
    const latMax = bounds.getNorth();
    const lngMin = bounds.getWest();
    const lngMax = bounds.getEast();

    let attempts = 0;
    const maxAttempts = numSamples * 10;

    while (samples.length < numSamples && attempts < maxAttempts) {
      const lat = latMin + Math.random() * (latMax - latMin);
      const lng = lngMin + Math.random() * (lngMax - lngMin);
      
      if (isPointInPolygon([lat, lng], polygonPoints)) {
        samples.push([lat, lng]);
      }
      attempts++;
    }

    return samples;
  };

  // Verificar si un punto está dentro del polígono (ray casting algorithm)
  const isPointInPolygon = (point, polygon) => {
    const [x, y] = point;
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];

      const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      
      if (intersect) inside = !inside;
    }

    return inside;
  };

  // Geocodificación inversa
  const reverseGeocode = async (lat, lon) => {
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`
      );
      const j = await r.json();
      return j.display_name || "Área seleccionada";
    } catch {
      return "Área seleccionada";
    }
  };

  if (!isActive) return null;

  return (
    <div style={{
      position: 'absolute',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(255, 255, 255, 0.95)',
      padding: '12px 20px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      display: 'flex',
      gap: '10px',
      alignItems: 'center',
      zIndex: 1000,
      border: '2px solid #3b82f6'
    }}>
      <span style={{ 
        fontSize: '14px', 
        fontWeight: '600',
        color: '#1e40af'
      }}>
        {points.length === 0 
          ? '🖱️ Click en el mapa para comenzar' 
          : `📍 ${points.length} punto${points.length > 1 ? 's' : ''} marcado${points.length > 1 ? 's' : ''}`
        }
      </span>
      
      {points.length >= 3 && (
        <button
          onClick={completePolygon}
          style={{
            padding: '6px 14px',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '13px'
          }}
        >
          ✓ Completar
        </button>
      )}
      
      {points.length > 0 && (
        <button
          onClick={cancelDrawing}
          style={{
            padding: '6px 14px',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '13px'
          }}
        >
          ✕ Cancelar
        </button>
      )}
    </div>
  );
}
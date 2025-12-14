/**
 * AnimatedLayer Component
 *
 * Componente profesional para renderizar capas climáticas animadas
 * con efectos basados en datos reales de las APIs y colores del degradado
 */

import React, { useEffect, useRef, useState } from 'react';
import { ANIMATION_TEMPLATES } from '../config/animationTemplates';
import '../styles/AnimatedLayer.css';

/**
 * Configuración base de animaciones por tipo de capa
 * Ahora se usa como fallback si no hay configuración en BD
 */
const LAYER_ANIMATIONS = {
  "Temperatura terrestre": {
    animationType: 'thermal-flow',
    baseLineCount: 80,
    lineSpeed: 0.5,
    lineLength: { min: 60, max: 150 },
    lineWidth: { min: 1.5, max: 3.5 },
    glowIntensity: 8,
    flowPattern: 'thermal-streamline',
    curvature: 0.08,
    dataDependent: true,
    intensityMultiplier: 3.0,
    waveAmplitude: 10,
    waveFrequency: 0.004,
    landOnly: false
  },
  "Temperatura del mar": {
    animationType: 'ocean-thermal',
    baseLineCount: 120,
    lineSpeed: 0.25,
    lineLength: { min: 150, max: 350 },
    lineWidth: { min: 1.2, max: 3 },
    glowIntensity: 12,
    flowPattern: 'ocean-current',
    curvature: 0.04,
    dataDependent: true,
    oceanOnly: true,
    intensityMultiplier: 3.5,
    waveAmplitude: 8,
    waveFrequency: 0.0015,
    fadeSpeed: { min: 0.008, max: 0.015 }
  },
  "Corrientes Oceánicas": {
    animationType: 'flow-vectors',
    baseLineCount: 150,
    lineSpeed: 0.35,
    lineLength: { min: 180, max: 400 },
    lineWidth: { min: 1.5, max: 4 },
    glowIntensity: 15,
    flowPattern: 'ocean-current',
    curvature: 0.08,
    dataDependent: true,
    oceanOnly: true,
    intensityMultiplier: 4.0,
    waveAmplitude: 12,
    waveFrequency: 0.002,
    fadeSpeed: { min: 0.006, max: 0.012 }
  },
  "Precipitación": {
    animationType: 'rain-drops',
    baseLineCount: 200,
    lineSpeed: 1.2,
    lineLength: { min: 30, max: 70 },
    lineWidth: { min: 1.8, max: 3.5 },
    glowIntensity: 12,
    flowPattern: 'rain-streamline',
    curvature: 0.01,
    dataDependent: true,
    intensityMultiplier: 8.0,
    fadeSpeed: { min: 0.015, max: 0.025 },
    windInfluence: 0.08,
    waveAmplitude: 1.5,
    waveFrequency: 0.008,
    rainOnly: true,
    minRainThreshold: 0.03
  },
  "Vientos": {
    animationType: 'thermal-flow',
    baseLineCount: 80,
    lineSpeed: 0.5,
    lineLength: { min: 60, max: 150 },
    lineWidth: { min: 1.5, max: 3.5 },
    glowIntensity: 8,
    flowPattern: 'thermal-streamline',
    curvature: 0.08,
    dataDependent: true,
    intensityMultiplier: 3.0,
    waveAmplitude: 8,
    waveFrequency: 0.004,
    landOnly: false
  },
  "Vientos (OWM)": {
    animationType: 'wind-streams',
    baseLineCount: 100,
    lineSpeed: 0.6,
    lineLength: { min: 60, max: 140 },
    lineWidth: { min: 1.5, max: 3.5 },
    glowIntensity: 8,
    flowPattern: 'wind-streamline',
    curvature: 0.06,
    dataDependent: true,
    windDirection: true,
    intensityMultiplier: 3.0,
    waveAmplitude: 8,
    waveFrequency: 0.003
  }
};

/**
 * Convierte color hex a rgba con opacidad
 */
function hexToRgba(hex, alpha = 1) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(255, 255, 255, ${alpha})`;

  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

class FlowLine {
  constructor(canvas, config, mapBounds, tileData, legendColors, legendMin, legendMax) {
    this.canvas = canvas;
    this.config = config;
    this.mapBounds = mapBounds;
    this.tileData = tileData;
    this.legendColors = legendColors || [];
    this.legendMin = legendMin || 0;
    this.legendMax = legendMax || 100;
    this.points = [];
    this.reset();
  }

  // Método para actualizar mapBounds y forzar reposicionamiento si la partícula está fuera de vista
  updateMapBounds(newMapBounds) {
    this.mapBounds = newMapBounds;
    // Si la partícula está activa, verificar si sigue en una región válida
    if (this.active && this.mapBounds) {
      const latLng = this.pixelToLatLng(this.x, this.y);
      const isOutOfBounds =
        latLng.lat < this.mapBounds.south ||
        latLng.lat > this.mapBounds.north ||
        latLng.lng < this.mapBounds.west ||
        latLng.lng > this.mapBounds.east;

      // Si está fuera de los bounds actuales o en zona incorrecta (tierra/océano), resetear
      if (isOutOfBounds ||
          (this.config.oceanOnly && !this.isOverOcean(this.x, this.y)) ||
          (this.config.landOnly && !this.isOverLand(this.x, this.y))) {
        this.reset();
      }
    }
  }

  reset() {
    // Posición aleatoria inicial
    this.x = Math.random() * this.canvas.width;
    this.y = Math.random() * this.canvas.height;

    // Verificar restricción oceánica
    let attempts = 0;
    if (this.config.oceanOnly && this.mapBounds) {
      while (!this.isOverOcean(this.x, this.y) && attempts < 30) {
        this.x = Math.random() * this.canvas.width;
        this.y = Math.random() * this.canvas.height;
        attempts++;
      }
    }

    // Verificar restricción terrestre (SOLO sobre tierra)
    if (this.config.landOnly && this.mapBounds) {
      while (!this.isOverLand(this.x, this.y) && attempts < 30) {
        this.x = Math.random() * this.canvas.width;
        this.y = Math.random() * this.canvas.height;
        attempts++;
      }
    }

    // 🌧️ Verificar restricción de precipitación (SOLO donde hay lluvia)
    if (this.config.rainOnly && this.tileData && this.tileData.length > 0) {
      // Solo aplicar restricción si HAY datos disponibles
      let rainAttempts = 0;
      while (!this.hasRainData(this.x, this.y) && rainAttempts < 50) {
        this.x = Math.random() * this.canvas.width;
        this.y = Math.random() * this.canvas.height;
        rainAttempts++;
      }

      // Si después de 50 intentos NO encuentra lluvia, desactivar partícula
      if (!this.hasRainData(this.x, this.y)) {
        this.active = false;
        return;
      }
    }

    this.active = true;

    // Obtener valor real de datos en esta posición
    const dataValue = this.getDataValueAt(this.x, this.y);
    const normalizedValue = this.normalizeDataValue(dataValue);
    const intensity = this.calculateIntensity(normalizedValue);

    // Calcular gradiente (cambios bruscos) en esta posición
    const gradientMagnitude = this.getGradientMagnitude(this.x, this.y);

    // Amplificar intensidad en zonas de alto gradiente (cambios bruscos)
    const gradientBoost = 1 + (gradientMagnitude * 3); // Hasta 4x más intenso en cambios bruscos
    const boostedIntensity = Math.min(1, intensity * gradientBoost);

    // Guardar intensidad para usarla en el render
    this.intensity = boostedIntensity;
    this.gradientMagnitude = gradientMagnitude;

    // Longitud basada en intensidad (más intenso = más largo)
    const lengthRange = this.config.lineLength.max - this.config.lineLength.min;
    this.length = this.config.lineLength.min + (lengthRange * boostedIntensity);

    // Grosor basado en intensidad + gradiente (más grueso en cambios bruscos)
    const widthRange = this.config.lineWidth.max - this.config.lineWidth.min;
    this.lineWidth = this.config.lineWidth.min + (widthRange * boostedIntensity) + (gradientMagnitude * 2);

    // COLOR DEL DEGRADADO - Esto hace las animaciones más llamativas
    this.color = this.getColorFromGradient(normalizedValue);

    // Opacidad basada en intensidad y gradiente - Muy visible en cambios bruscos
    this.baseOpacity = 0.75 + (boostedIntensity * 0.25);
    this.opacity = this.baseOpacity;
    this.fadeSpeed = 0.008 + Math.random() * 0.012;

    // Vida - Líneas más largas en zonas intensas y con gradiente alto
    this.life = 0;
    this.maxLife = 120 + Math.random() * 80 + (boostedIntensity * 150) + (gradientMagnitude * 100);

    // Velocidad basada en intensidad - Movimiento más rápido en zonas intensas
    this.speedMultiplier = 0.5 + (boostedIntensity * 2.5);

    // Patrón de flujo
    this.setupFlowPattern(normalizedValue);

    // Generar puntos
    this.points = [];
    this.generatePoints();
  }

  getColorFromGradient(normalizedValue) {
    if (!this.legendColors || this.legendColors.length === 0) {
      return 'rgba(255, 255, 255, 0.8)';
    }

    // Mapear el valor normalizado (0-1) al índice del degradado
    const index = Math.min(
      Math.floor(normalizedValue * this.legendColors.length),
      this.legendColors.length - 1
    );

    const color = this.legendColors[index];

    // Convertir a RGBA con transparencia para mejor blend
    if (color.startsWith('#')) {
      return hexToRgba(color, 0.85);
    }

    // Si ya es rgba/rgb, ajustar opacidad
    if (color.includes('rgba')) {
      return color.replace(/[\d.]+\)$/g, '0.85)');
    }

    return color;
  }

  normalizeDataValue(dataValue) {
    // Normalizar el valor de datos entre 0 y 1 basado en min/max de la leyenda
    if (this.legendMin === undefined || this.legendMax === undefined) {
      return dataValue; // Ya está normalizado
    }

    const range = this.legendMax - this.legendMin;
    if (range === 0) return 0.5;

    const normalized = (dataValue - this.legendMin) / range;
    return Math.max(0, Math.min(1, normalized));
  }

  isOverOcean(x, y) {
    if (!this.mapBounds) return false;

    const latLng = this.pixelToLatLng(x, y);
    const lat = latLng.lat;
    const lng = latLng.lng;

    // 🌍 Definir regiones de TIERRA principales (ajustadas para océanos)
    const landRegions = [
      // América del Norte
      { latMin: 20, latMax: 70, lngMin: -165, lngMax: -55 },
      // América Central
      { latMin: 8, latMax: 22, lngMin: -105, lngMax: -78 },
      // América del Sur
      { latMin: -55, latMax: 12, lngMin: -80, lngMax: -36 },
      // Europa
      { latMin: 38, latMax: 70, lngMin: -8, lngMax: 38 },
      // África
      { latMin: -33, latMax: 36, lngMin: -15, lngMax: 50 },
      // Asia occidental
      { latMin: 10, latMax: 72, lngMin: 42, lngMax: 98 },
      // Asia oriental
      { latMin: -5, latMax: 53, lngMin: 98, lngMax: 143 },
      // Australia
      { latMin: -43, latMax: -12, lngMin: 113, lngMax: 153 },
      // Groenlandia
      { latMin: 62, latMax: 82, lngMin: -70, lngMax: -15 },
      // Madagascar
      { latMin: -25, latMax: -13, lngMin: 44, lngMax: 50 },
      // Nueva Zelanda
      { latMin: -47, latMax: -35, lngMin: 167, lngMax: 178 },
      // Japón
      { latMin: 31, latMax: 45, lngMin: 130, lngMax: 145 },
      // Reino Unido e Irlanda
      { latMin: 51, latMax: 60, lngMin: -10, lngMax: 1 },
      // Islandia
      { latMin: 63.5, latMax: 66.5, lngMin: -24, lngMax: -14 },
      // Península Arábiga
      { latMin: 14, latMax: 30, lngMin: 36, lngMax: 58 },
      // India
      { latMin: 10, latMax: 34, lngMin: 70, lngMax: 87 },
      // Península Ibérica
      { latMin: 37, latMax: 43, lngMin: -9, lngMax: 3 },
      // Italia
      { latMin: 37, latMax: 46, lngMin: 7, lngMax: 18 },
      // Escandinavia
      { latMin: 56, latMax: 70, lngMin: 5, lngMax: 30 }
    ];

    // Si está sobre alguna región de tierra, retornar false
    const isOverLand = landRegions.some(region =>
      lat >= region.latMin && lat <= region.latMax &&
      lng >= region.lngMin && lng <= region.lngMax
    );

    return !isOverLand;
  }

  hasRainData(x, y) {
    // 🌧️ Si no hay datos de tile, permitir animación genérica
    if (!this.tileData || this.tileData.length === 0) {
      return true; // 🌧️ Mostrar animación mientras esperamos datos
    }

    const tileX = Math.floor((x / this.canvas.width) * this.tileData[0].length);
    const tileY = Math.floor((y / this.canvas.height) * this.tileData.length);

    if (tileY >= 0 && tileY < this.tileData.length &&
        tileX >= 0 && tileX < this.tileData[0].length) {
      const dataValue = this.tileData[tileY][tileX];

      // 🌧️ Si el valor es NaN, null o undefined, considerar que SÍ hay precipitación (tile sin info)
      if (dataValue === null || dataValue === undefined || isNaN(dataValue)) {
        return true; // Permitir animación en áreas sin info específica
      }

      const normalizedValue = this.normalizeDataValue(dataValue);

      // 🌧️ Verificar si hay precipitación significativa (umbral configurable)
      const threshold = this.config.minRainThreshold || 0.05;
      return normalizedValue >= threshold;
    }

    return true; // 🌧️ Permitir por defecto
  }

  isOverLand(x, y) {
    if (!this.mapBounds) return false;

    const latLng = this.pixelToLatLng(x, y);
    const lat = latLng.lat;
    const lng = latLng.lng;

    // 🌍 Definir regiones de TIERRA principales (mismo array que isOverOcean)
    const landRegions = [
      // América del Norte
      { latMin: 20, latMax: 70, lngMin: -165, lngMax: -55 },
      // América Central
      { latMin: 8, latMax: 22, lngMin: -105, lngMax: -78 },
      // América del Sur
      { latMin: -55, latMax: 12, lngMin: -80, lngMax: -36 },
      // Europa
      { latMin: 38, latMax: 70, lngMin: -8, lngMax: 38 },
      // África
      { latMin: -33, latMax: 36, lngMin: -15, lngMax: 50 },
      // Asia occidental
      { latMin: 10, latMax: 72, lngMin: 42, lngMax: 98 },
      // Asia oriental
      { latMin: -5, latMax: 53, lngMin: 98, lngMax: 143 },
      // Australia
      { latMin: -43, latMax: -12, lngMin: 113, lngMax: 153 },
      // Groenlandia
      { latMin: 62, latMax: 82, lngMin: -70, lngMax: -15 },
      // Madagascar
      { latMin: -25, latMax: -13, lngMin: 44, lngMax: 50 },
      // Nueva Zelanda
      { latMin: -47, latMax: -35, lngMin: 167, lngMax: 178 },
      // Japón
      { latMin: 31, latMax: 45, lngMin: 130, lngMax: 145 },
      // Reino Unido e Irlanda
      { latMin: 51, latMax: 60, lngMin: -10, lngMax: 1 },
      // Islandia
      { latMin: 63.5, latMax: 66.5, lngMin: -24, lngMax: -14 },
      // Península Arábiga
      { latMin: 14, latMax: 30, lngMin: 36, lngMax: 58 },
      // India
      { latMin: 10, latMax: 34, lngMin: 70, lngMax: 87 },
      // Península Ibérica
      { latMin: 37, latMax: 43, lngMin: -9, lngMax: 3 },
      // Italia
      { latMin: 37, latMax: 46, lngMin: 7, lngMax: 18 },
      // Escandinavia
      { latMin: 56, latMax: 70, lngMin: 5, lngMax: 30 }
    ];

    // Verificar si está sobre alguna región de tierra
    const isOverLand = landRegions.some(region =>
      lat >= region.latMin && lat <= region.latMax &&
      lng >= region.lngMin && lng <= region.lngMax
    );

    return isOverLand;
  }

  pixelToLatLng(x, y) {
    if (!this.mapBounds) {
      return { lat: 0, lng: 0 };
    }

    const bounds = this.mapBounds;
    const lat = bounds.north - (y / this.canvas.height) * (bounds.north - bounds.south);
    const lng = bounds.west + (x / this.canvas.width) * (bounds.east - bounds.west);

    return { lat, lng };
  }

  getDataValueAt(x, y) {
    if (!this.tileData || this.tileData.length === 0) {
      // Sin datos, usar valor medio del rango
      return (this.legendMin + this.legendMax) / 2;
    }

    const tileX = Math.floor((x / this.canvas.width) * this.tileData[0].length);
    const tileY = Math.floor((y / this.canvas.height) * this.tileData.length);

    if (tileY >= 0 && tileY < this.tileData.length &&
        tileX >= 0 && tileX < this.tileData[0].length) {
      return this.tileData[tileY][tileX];
    }

    return (this.legendMin + this.legendMax) / 2;
  }

  // Calcular el gradiente (cambio brusco) en una posición
  getGradientMagnitude(x, y) {
    if (!this.tileData || this.tileData.length === 0) {
      return 0;
    }

    const tileX = Math.floor((x / this.canvas.width) * this.tileData[0].length);
    const tileY = Math.floor((y / this.canvas.height) * this.tileData.length);

    if (tileY < 1 || tileY >= this.tileData.length - 1 ||
        tileX < 1 || tileX >= this.tileData[0].length - 1) {
      return 0;
    }

    // Obtener valores vecinos para calcular gradiente
    const center = this.tileData[tileY][tileX];
    const left = this.tileData[tileY][tileX - 1];
    const right = this.tileData[tileY][tileX + 1];
    const top = this.tileData[tileY - 1][tileX];
    const bottom = this.tileData[tileY + 1][tileX];

    // Calcular gradiente usando diferencias centrales (Sobel)
    const dx = (right - left) / 2;
    const dy = (bottom - top) / 2;

    // Magnitud del gradiente
    const gradient = Math.sqrt(dx * dx + dy * dy);

    // Normalizar por el rango de la leyenda
    const range = this.legendMax - this.legendMin;
    return range > 0 ? gradient / range : 0;
  }

  calculateIntensity(normalizedValue) {
    // Función cuadrática para amplificar las diferencias
    // Los valores bajos se mantienen bajos, los altos se amplifican
    const amplified = Math.pow(normalizedValue, 0.7);
    return Math.max(0, Math.min(1, amplified));
  }

  getColorFromGradient(normalizedValue) {
    if (!this.legendColors || this.legendColors.length === 0) {
      console.warn('⚠️ No legend colors available, using white');
      return 'rgba(255, 255, 255, 0.9)';
    }

    // Asegurar que el valor esté entre 0 y 1
    const value = Math.max(0, Math.min(1, normalizedValue));

    // Calcular el índice en el array de colores
    const colorIndex = value * (this.legendColors.length - 1);
    const lowerIndex = Math.floor(colorIndex);
    const upperIndex = Math.ceil(colorIndex);

    // Si estamos exactamente en un índice, devolver ese color
    if (lowerIndex === upperIndex) {
      return hexToRgba(this.legendColors[lowerIndex], 0.95);
    }

    // Interpolación entre dos colores
    const t = colorIndex - lowerIndex;
    const color1 = this.legendColors[lowerIndex];
    const color2 = this.legendColors[upperIndex];

    // Convertir hex a RGB
    const hex1 = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color1);
    const hex2 = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color2);

    if (!hex1 || !hex2) {
      return hexToRgba(this.legendColors[0], 0.95);
    }

    const r1 = parseInt(hex1[1], 16);
    const g1 = parseInt(hex1[2], 16);
    const b1 = parseInt(hex1[3], 16);

    const r2 = parseInt(hex2[1], 16);
    const g2 = parseInt(hex2[2], 16);
    const b2 = parseInt(hex2[3], 16);

    // Interpolar
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return `rgba(${r}, ${g}, ${b}, 0.95)`;
  }

  setupFlowPattern(dataValue) {
    const pattern = this.config.flowPattern;
    const speed = this.config.lineSpeed * this.speedMultiplier;

    if (pattern === 'thermal-current' || pattern === 'thermal-streamline') {
      // Patrón tipo Zoom.earth - líneas de corriente organizadas y uniformes
      this.waveOffset = Math.random() * Math.PI * 2;
      this.waveAmplitude = this.config.waveAmplitude || 12; // Ondulación muy suave
      this.waveFrequency = this.config.waveFrequency || 0.004; // Frecuencia baja

      // Obtener posición geográfica
      const latLng = this.pixelToLatLng(this.x, this.y);
      const lat = latLng.lat;
      const lng = latLng.lng;

      // Sistema de circulación global simplificado (como patrones de viento reales)
      // Similar a Zoom.earth pero adaptado a temperatura terrestre
      const latAbs = Math.abs(lat);

      // Dirección base según zona climática
      let baseAngle;
      if (latAbs < 10) {
        // Zona ecuatorial (ITCZ) - flujo principalmente horizontal con ligera convergencia
        baseAngle = (lng / 180) * Math.PI * 0.3 + Math.PI / 6;
      } else if (latAbs < 30) {
        // Zona subtropical - circulación hacia el oeste (vientos alisios)
        baseAngle = lat > 0 ? -Math.PI / 4 : Math.PI / 4;
      } else if (latAbs < 60) {
        // Zona templada - circulación hacia el este (vientos del oeste)
        baseAngle = lat > 0 ? Math.PI / 6 : -Math.PI / 6;
      } else {
        // Zona polar - circulación hacia el oeste
        baseAngle = lat > 0 ? -Math.PI / 5 : Math.PI / 5;
      }

      // Pequeña variación para evitar líneas perfectamente paralelas
      this.angle = baseAngle + (Math.random() - 0.5) * 0.2;

      // Velocidad uniforme y constante
      this.velocityX = Math.cos(this.angle) * speed;
      this.velocityY = Math.sin(this.angle) * speed;

    } else if (pattern === 'wind-streamline') {
      // Patrón tipo Zoom.earth para vientos - líneas de corriente organizadas
      this.waveOffset = Math.random() * Math.PI * 2;
      this.waveAmplitude = this.config.waveAmplitude || 10;
      this.waveFrequency = this.config.waveFrequency || 0.003;

      // Obtener posición geográfica
      const latLng = this.pixelToLatLng(this.x, this.y);
      const lat = latLng.lat;
      const lng = latLng.lng;

      // Patrones de viento globales realistas basados en latitud
      const latAbs = Math.abs(lat);

      let baseAngle;
      if (latAbs < 10) {
        // Zona de convergencia intertropical (ITCZ) - vientos débiles variables
        baseAngle = (lng / 180) * Math.PI * 0.2 + Math.PI / 8;
      } else if (latAbs < 30) {
        // Vientos alisios - hacia el oeste
        baseAngle = lat > 0 ? -Math.PI / 3 : Math.PI / 3;
      } else if (latAbs < 60) {
        // Vientos del oeste predominantes
        baseAngle = lat > 0 ? Math.PI / 5 : -Math.PI / 5;
      } else {
        // Vientos polares del este
        baseAngle = lat > 0 ? -Math.PI / 4 : Math.PI / 4;
      }

      // Si hay datos de viento reales, usarlos para modular la dirección
      if (this.config.windDirection && dataValue > 0.1) {
        // Mezclar dirección basada en datos con patrón base
        const dataAngle = (dataValue * Math.PI * 2) - Math.PI;
        this.angle = baseAngle * 0.3 + dataAngle * 0.7; // 70% datos, 30% patrón
      } else {
        // Pequeña variación para evitar líneas perfectamente paralelas
        this.angle = baseAngle + (Math.random() - 0.5) * 0.15;
      }

      // Velocidad uniforme
      this.velocityX = Math.cos(this.angle) * speed;
      this.velocityY = Math.sin(this.angle) * speed;

    } else if (pattern === 'rain-streamline') {
      // Patrón tipo Zoom.earth para precipitación - gotas cayendo con influencia de viento
      this.waveOffset = Math.random() * Math.PI * 2;
      this.waveAmplitude = this.config.waveAmplitude || 3;
      this.waveFrequency = this.config.waveFrequency || 0.008;

      // Obtener posición geográfica para variación ligera
      const latLng = this.pixelToLatLng(this.x, this.y);
      const lng = latLng.lng;

      // Influencia del viento lateral basada en intensidad de datos
      const windInfluence = this.config.windInfluence || 0.15;
      const lateralDrift = (Math.random() - 0.5) * windInfluence;

      // Variación basada en intensidad - lluvia más intensa cae más vertical
      const intensityFactor = Math.max(0.3, dataValue);
      const angleVariation = (1 - intensityFactor) * 0.15; // Menos variación en lluvia intensa

      // Ángulo predominantemente vertical con ligera inclinación
      this.angle = Math.PI / 2 + lateralDrift + (Math.random() - 0.5) * angleVariation;

      // Velocidad basada en intensidad - más rápido cuando es más intenso
      const speedMultiplier = 0.7 + (intensityFactor * 0.6);
      this.velocityX = Math.cos(this.angle) * speed * 0.3; // Poca velocidad horizontal
      this.velocityY = Math.sin(this.angle) * speed * speedMultiplier; // Alta velocidad vertical

    } else if (pattern === 'vertical') {
      this.velocityX = (Math.random() - 0.5) * 0.3;
      this.velocityY = speed + Math.random() * 1.2;
      this.angle = Math.PI / 2 + (Math.random() - 0.5) * 0.25;

    } else if (pattern === 'horizontal') {
      if (this.config.windDirection && dataValue > 0.1) {
        this.angle = (dataValue * Math.PI * 2) - Math.PI;
      } else {
        this.angle = (Math.random() - 0.5) * 0.4;
      }
      this.velocityX = Math.cos(this.angle) * speed + Math.random() * 0.4;
      this.velocityY = Math.sin(this.angle) * speed + (Math.random() - 0.5) * 0.3;

    } else if (pattern === 'ocean-current') {
      // Patrón específico para corrientes oceánicas - movimiento muy lento y fluido
      this.waveOffset = Math.random() * Math.PI * 2;
      this.waveAmplitude = 15 + Math.random() * 25; // Ondulación muy suave
      this.waveFrequency = 0.002 + Math.random() * 0.003; // Muy baja frecuencia

      // Dirección predominante basada en posición
      const latLng = this.pixelToLatLng(this.x, this.y);
      const baseAngle = (latLng.lng / 180) * Math.PI; // Flujo basado en longitud

      // Velocidad extremadamente lenta
      this.velocityX = Math.cos(baseAngle) * speed * 0.3;
      this.velocityY = Math.sin(baseAngle) * speed * 0.3;
      this.angle = Math.atan2(this.velocityY, this.velocityX);

    } else if (pattern === 'circular') {
      this.centerX = this.x;
      this.centerY = this.y;
      this.radius = 100 + Math.random() * 180;
      this.angle = Math.random() * Math.PI * 2;
      this.angleSpeed = ((Math.random() - 0.5) * 0.02) * this.speedMultiplier;
      this.velocityX = speed * Math.cos(this.angle);
      this.velocityY = speed * Math.sin(this.angle);

    } else if (pattern === 'wave' || pattern === 'smooth-wave') {
      this.waveOffset = Math.random() * Math.PI * 2;
      this.waveAmplitude = (25 + Math.random() * 40) * (0.6 + dataValue * 0.8);
      this.waveFrequency = 0.005 + Math.random() * 0.005;

      const baseAngle = Math.random() * Math.PI * 2;
      this.velocityX = Math.cos(baseAngle) * speed;
      this.velocityY = Math.sin(baseAngle) * speed;
      this.angle = Math.atan2(this.velocityY, this.velocityX);

    } else if (pattern === 'horizontal-flow') {
      // Flujo horizontal rápido de izquierda a derecha
      this.waveOffset = Math.random() * Math.PI * 2;
      this.waveAmplitude = this.config.waveAmplitude || 8;
      this.waveFrequency = this.config.waveFrequency || 0.004;

      const lateralVariation = (Math.random() - 0.5) * 0.2;
      this.angle = lateralVariation;
      this.velocityX = Math.cos(this.angle) * speed;
      this.velocityY = Math.sin(this.angle) * speed * 0.3;

    } else if (pattern === 'vortex') {
      // Movimiento en espiral para huracanes/tornados
      this.centerX = this.canvas.width / 2;
      this.centerY = this.canvas.height / 2;
      this.radius = Math.random() * (Math.min(this.canvas.width, this.canvas.height) * 0.4);
      this.angle = Math.random() * Math.PI * 2;
      this.angularVelocity = (0.03 + Math.random() * 0.02) * this.speedMultiplier;

      // Velocidad radial hacia adentro del vórtice
      const spiralForce = 0.3;
      this.velocityX = Math.cos(this.angle) * speed * spiralForce;
      this.velocityY = Math.sin(this.angle) * speed * spiralForce;

    } else if (pattern === 'snow') {
      // Nieve cayendo con bamboleo lateral
      this.swayPhase = Math.random() * Math.PI * 2;
      this.swayAmplitude = 15 + Math.random() * 10;
      this.swaySpeed = 0.08;

      const lateralDrift = (Math.random() - 0.5) * 0.1;
      this.angle = Math.PI / 2 + lateralDrift;
      this.velocityX = Math.cos(this.angle) * speed * 0.3;
      this.velocityY = Math.sin(this.angle) * speed * 0.5; // Caída lenta

    } else if (pattern === 'fire') {
      // Fuego: ascenso turbulento
      this.turbulence = Math.random();
      this.turbulenceSpeed = 0.1 + Math.random() * 0.05;

      const lateralDrift = (Math.random() - 0.5) * 0.4;
      this.angle = -Math.PI / 2 + lateralDrift; // Hacia arriba
      this.velocityX = Math.cos(this.angle) * speed * (0.5 + this.turbulence);
      this.velocityY = Math.sin(this.angle) * speed;

    } else if (pattern === 'static-pulse') {
      // Partículas estáticas con efecto de pulso
      this.pulsePhase = Math.random() * Math.PI * 2;
      this.pulseSpeed = 0.05;
      this.pulseAmplitude = 2;
      this.staticX = this.x;
      this.staticY = this.y;

      this.velocityX = 0;
      this.velocityY = 0;
      this.angle = 0;
    }
  }

  generatePoints() {
    this.points = [];
    const segments = 10; // Más segmentos para líneas más suaves

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const distance = this.length * t;

      let px = this.x + Math.cos(this.angle) * distance;
      let py = this.y + Math.sin(this.angle) * distance;

      if (this.config.flowPattern === 'thermal-current' || this.config.flowPattern === 'thermal-streamline') {
        // Ondulación muy sutil tipo Zoom.earth - líneas casi rectas
        const wave = Math.sin(distance * this.waveFrequency + this.waveOffset) *
                     this.waveAmplitude * 0.5; // Ondulación mínima
        px += Math.cos(this.angle + Math.PI / 2) * wave;
        py += Math.sin(this.angle + Math.PI / 2) * wave;
      } else if (this.config.flowPattern === 'wind-streamline') {
        // Ondulación muy sutil para vientos - líneas de flujo suaves
        const wave = Math.sin(distance * this.waveFrequency + this.waveOffset) *
                     this.waveAmplitude * 0.6; // Ondulación mínima
        px += Math.cos(this.angle + Math.PI / 2) * wave;
        py += Math.sin(this.angle + Math.PI / 2) * wave;
      } else if (this.config.flowPattern === 'rain-streamline') {
        // Gotas de lluvia - líneas casi perfectamente rectas (caída vertical)
        const wave = Math.sin(distance * this.waveFrequency + this.waveOffset) *
                     this.waveAmplitude * 0.3; // Ondulación muy mínima
        px += Math.cos(this.angle + Math.PI / 2) * wave;
        // Sin ondulación vertical, caída recta
      } else if (this.config.flowPattern === 'wave' || this.config.flowPattern === 'smooth-wave') {
        const wave = Math.sin(distance * this.waveFrequency + this.waveOffset) *
                     this.waveAmplitude * this.config.curvature;
        px += Math.cos(this.angle + Math.PI / 2) * wave;
        py += Math.sin(this.angle + Math.PI / 2) * wave;
      } else if (this.config.flowPattern === 'horizontal-flow') {
        // Flujo horizontal con ligera ondulación
        const wave = Math.sin(distance * this.waveFrequency + this.waveOffset) *
                     this.waveAmplitude * 0.4;
        px += Math.cos(this.angle + Math.PI / 2) * wave;
        py += Math.sin(this.angle + Math.PI / 2) * wave;
      } else if (this.config.flowPattern === 'snow') {
        // Nieve con trayectoria ondulante
        const sway = Math.sin((this.swayPhase + distance * 0.02)) * this.swayAmplitude * 0.3;
        px += sway;
      } else if (this.config.flowPattern === 'fire') {
        // Fuego con ondulación turbulenta
        const turbulence = Math.sin(distance * 0.1 + this.turbulence) * 5;
        px += turbulence;
      } else if (this.config.flowPattern === 'vortex') {
        // Vórtice en espiral
        const spiralAngle = this.angle + (t * Math.PI * 0.5);
        const spiralRadius = this.radius * (1 - t * 0.3);
        px = this.centerX + Math.cos(spiralAngle) * spiralRadius;
        py = this.centerY + Math.sin(spiralAngle) * spiralRadius;
      } else if (this.config.flowPattern === 'static-pulse') {
        // Partículas estáticas - mismo punto
        px = this.staticX;
        py = this.staticY;
      } else if (this.config.curvature > 0) {
        const curve = Math.sin(t * Math.PI) * this.length * this.config.curvature;
        px += Math.cos(this.angle + Math.PI / 2) * curve;
        py += Math.sin(this.angle + Math.PI / 2) * curve;
      }

      // Si oceanOnly está activo, verificar que el punto esté sobre el océano
      if (this.config.oceanOnly && !this.isOverOcean(px, py)) {
        // Si encontramos un punto sobre tierra, truncar la línea aquí
        break;
      }

      // Si landOnly está activo, verificar que el punto esté sobre tierra
      if (this.config.landOnly && !this.isOverLand(px, py)) {
        // Si encontramos un punto sobre mar, truncar la línea aquí
        break;
      }

      // Si rainOnly está activo, verificar que el punto esté sobre área con precipitación
      // Solo verificar si hay datos de tile disponibles
      if (this.config.rainOnly && this.tileData && this.tileData.length > 0 && !this.hasRainData(px, py)) {
        // Si encontramos un punto sin precipitación, truncar la línea aquí
        break;
      }

      this.points.push({ x: px, y: py });
    }

    // Si no hay suficientes puntos válidos, marcar como inactiva para que se reposicione
    if (this.config.oceanOnly && this.points.length < 3) {
      this.active = false;
      this.life = this.maxLife; // Forzar reinicio en el próximo update
    }

    // Si no hay suficientes puntos válidos para landOnly, marcar como inactiva
    if (this.config.landOnly && this.points.length < 3) {
      this.active = false;
      this.life = this.maxLife; // Forzar reinicio en el próximo update
    }

    // Si no hay suficientes puntos válidos para rainOnly, marcar como inactiva
    if (this.config.rainOnly && this.points.length < 2) {
      this.active = false;
      this.life = this.maxLife; // Forzar reinicio en el próximo update
    }
  }

  update() {
    if (!this.active) return;

    this.life++;

    if (this.config.oceanOnly && !this.isOverOcean(this.x, this.y)) {
      this.reset();
      return;
    }

    if (this.config.landOnly && !this.isOverLand(this.x, this.y)) {
      this.reset();
      return;
    }

    // Verificar que siga sobre área con precipitación (solo si hay datos de tile)
    if (this.config.rainOnly && this.tileData && this.tileData.length > 0) {
      // Dar un margen - solo resetear ocasionalmente, no en cada frame
      if (this.life % 30 === 0 && !this.hasRainData(this.x, this.y)) {
        this.reset();
        return;
      }
    }

    if (this.config.flowPattern === 'thermal-current' || this.config.flowPattern === 'thermal-streamline') {
      // Movimiento uniforme tipo Zoom.earth - muy poco caótico
      this.waveOffset += 0.015; // Ondulación muy lenta
      const waveInfluence = Math.sin(this.x * this.waveFrequency + this.waveOffset);
      // Influencia de onda MÍNIMA para mantener flujo organizado
      this.x += this.velocityX + waveInfluence * 0.1;
      this.y += this.velocityY + waveInfluence * 0.08;

    } else if (this.config.flowPattern === 'wind-streamline') {
      // Movimiento de vientos tipo Zoom.earth - organizado y fluido
      this.waveOffset += 0.018; // Ligeramente más rápido que thermal
      const waveInfluence = Math.sin(this.x * this.waveFrequency + this.waveOffset);
      // Ondulación muy sutil para flujo suave
      this.x += this.velocityX + waveInfluence * 0.12;
      this.y += this.velocityY + waveInfluence * 0.09;

    } else if (this.config.flowPattern === 'rain-streamline') {
      // Movimiento de lluvia tipo Zoom.earth - caída rápida y vertical
      this.waveOffset += 0.025; // Ondulación rápida para efecto de gotas
      const waveInfluence = Math.sin(this.y * this.waveFrequency + this.waveOffset);
      // Muy poca ondulación lateral, principalmente caída vertical
      this.x += this.velocityX + waveInfluence * 0.05;
      this.y += this.velocityY; // Caída vertical constante sin ondulación

    } else if (this.config.flowPattern === 'ocean-current') {
      // Movimiento suave y lento para corrientes oceánicas
      this.waveOffset += 0.01; // Muy lento
      const waveInfluence = Math.sin(this.x * this.waveFrequency + this.waveOffset);
      this.x += this.velocityX + waveInfluence * 0.15;
      this.y += this.velocityY + waveInfluence * 0.1;

    } else if (this.config.flowPattern === 'circular') {
      this.angle += this.angleSpeed;
      const dx = this.x - this.centerX;
      const dy = this.y - this.centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 50 || dist > 400) {
        this.radius = 100 + Math.random() * 180;
      }

      this.x = this.centerX + Math.cos(this.angle) * this.radius;
      this.y = this.centerY + Math.sin(this.angle) * this.radius;

      this.centerX += this.velocityX * 0.15;
      this.centerY += this.velocityY * 0.15;

    } else if (this.config.flowPattern === 'wave' || this.config.flowPattern === 'smooth-wave') {
      this.waveOffset += 0.04;
      const waveInfluence = Math.sin(this.x * this.waveFrequency + this.waveOffset);
      this.x += this.velocityX + waveInfluence * 0.4;
      this.y += this.velocityY;

    } else if (this.config.flowPattern === 'horizontal-flow') {
      // Flujo horizontal rápido con ligera ondulación
      this.waveOffset += 0.02;
      const waveInfluence = Math.sin(this.y * this.waveFrequency + this.waveOffset);
      this.x += this.velocityX + waveInfluence * 0.08;
      this.y += this.velocityY;

    } else if (this.config.flowPattern === 'vortex') {
      // Movimiento en espiral hacia el centro
      this.angle += this.angularVelocity;
      const spiralForce = 1 - (this.life / this.maxLife) * 0.3;
      this.x = this.centerX + Math.cos(this.angle) * this.radius * spiralForce;
      this.y = this.centerY + Math.sin(this.angle) * this.radius * spiralForce;

    } else if (this.config.flowPattern === 'snow') {
      // Nieve con bamboleo lateral
      this.swayPhase += this.swaySpeed;
      const sway = Math.sin(this.swayPhase) * this.swayAmplitude;
      this.x += this.velocityX + sway * 0.1;
      this.y += this.velocityY;

    } else if (this.config.flowPattern === 'fire') {
      // Fuego con turbulencia
      this.turbulence += this.turbulenceSpeed;
      const turbulence = Math.sin(this.turbulence) * 0.8;
      this.x += this.velocityX + turbulence;
      this.y += this.velocityY + (Math.random() - 0.5) * 0.3;

    } else if (this.config.flowPattern === 'static-pulse') {
      // Partículas estáticas con pulso
      this.pulsePhase += this.pulseSpeed;
      const pulse = Math.sin(this.pulsePhase) * this.pulseAmplitude;
      this.x = this.staticX + pulse;
      this.y = this.staticY + pulse;

    } else {
      this.x += this.velocityX;
      this.y += this.velocityY;
    }

    // Fade in/out
    if (this.life < 40) {
      this.opacity = Math.min(this.baseOpacity, this.opacity + this.fadeSpeed);
    } else if (this.life > this.maxLife - 40) {
      this.opacity = Math.max(0, this.opacity - this.fadeSpeed);
    }

    this.generatePoints();

    if (this.x < -this.length || this.x > this.canvas.width + this.length ||
        this.y < -this.length || this.y > this.canvas.height + this.length ||
        this.life > this.maxLife || this.opacity <= 0) {
      this.reset();
    }
  }

  draw(ctx) {
    if (!this.active || this.points.length < 2) return;

    ctx.save();

    // ⚡ OPTIMIZADO: Glow simplificado - solo para partículas intensas
    if (this.config.glowIntensity > 0 && this.intensity > 0.5) {
      const glowAmount = this.config.glowIntensity * (1 + this.intensity);
      ctx.shadowBlur = glowAmount;
      ctx.shadowColor = this.color;
    }

    ctx.globalAlpha = this.opacity;
    ctx.strokeStyle = this.color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // ⚡ OPTIMIZADO: Dibujar línea completa de una vez (sin loop)
    ctx.lineWidth = this.lineWidth;
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);

    for (let i = 1; i < this.points.length; i++) {
      ctx.lineTo(this.points[i].x, this.points[i].y);
    }

    ctx.stroke();

    // ⚡ OPTIMIZADO: Punto brillante solo si intensidad alta
    if (this.intensity > 0.6) {
      const head = this.points[this.points.length - 1];
      ctx.shadowBlur = this.config.glowIntensity * 1.5;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(head.x, head.y, this.lineWidth * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

/**
 * AnimatedLayerOverlay - Overlay principal
 */
const AnimatedLayerOverlay = ({
  activeVariable,
  isVisible,
  mapBounds,
  tileData,
  legendColors,
  legendMin,
  legendMax,
  animationConfig // 🔧 Configuración dinámica desde MongoDB
}) => {
  const canvasRef = useRef(null);
  const linesRef = useRef([]);
  const animationFrameRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // 🔧 Aplicar configuración completa desde MongoDB o templates
  const config = React.useMemo(() => {
    console.log(`🎨 AnimatedLayer recibió para "${activeVariable}":`, animationConfig);

    // Si hay configuración desde BD y está habilitada, usarla directamente
    if (animationConfig && animationConfig.habilitada !== undefined && animationConfig.habilitada) {
      // Verificar si tiene tipo_animacion definido (viene de las plantillas)
      if (animationConfig.animationType || animationConfig.tipo_animacion) {
        const templateKey = animationConfig.tipo_animacion || animationConfig.animationType;
        const template = ANIMATION_TEMPLATES[templateKey];

        if (template) {
          console.log(`✅ Usando plantilla "${templateKey}" desde BD`);
          // Usar plantilla completa, aplicando solo opacidad/velocidad si están definidos
          return {
            ...template,
            // Sobrescribir opacidad si está definida
            opacity: animationConfig.opacidad !== undefined ? animationConfig.opacidad : 1.0
          };
        }
      }

      // Si no hay plantilla válida pero hay configuración completa, usarla
      if (animationConfig.baseLineCount || animationConfig.flowPattern) {
        console.log(`✅ Usando configuración completa desde BD`);
        return {
          ...animationConfig,
          opacity: animationConfig.opacidad !== undefined ? animationConfig.opacidad : 1.0
        };
      }
    }

    // Fallback: usar configuración hardcoded por nombre de variable
    console.log(`⚠️ Usando fallback LAYER_ANIMATIONS para "${activeVariable}"`);
    return LAYER_ANIMATIONS[activeVariable] || LAYER_ANIMATIONS["Temperatura del mar"];
  }, [activeVariable, animationConfig]);

  // 🔧 Usar refs para mantener valores actualizados sin reiniciar la animación
  const configRef = useRef(config);
  const mapBoundsRef = useRef(mapBounds);
  const tileDataRef = useRef(tileData);
  const legendColorsRef = useRef(legendColors);
  const legendMinRef = useRef(legendMin);
  const legendMaxRef = useRef(legendMax);

  // Actualizar refs cuando cambien los valores
  useEffect(() => {
    configRef.current = config;
    mapBoundsRef.current = mapBounds;
    tileDataRef.current = tileData;
    legendColorsRef.current = legendColors;
    legendMinRef.current = legendMin;
    legendMaxRef.current = legendMax;
  }, [config, mapBounds, tileData, legendColors, legendMin, legendMax]);

  useEffect(() => {
    let resizeTimeout;
    const updateDimensions = () => {
      if (canvasRef.current && canvasRef.current.parentElement) {
        const parent = canvasRef.current.parentElement;

        // Actualizar inmediatamente sin debounce si dimensions.width es 0
        if (dimensions.width === 0) {
          setDimensions({
            width: parent.offsetWidth,
            height: parent.offsetHeight
          });

          console.log('📐 Initial dimensions set:', {
            width: parent.offsetWidth,
            height: parent.offsetHeight
          });
        } else {
          // Debounce para evitar múltiples actualizaciones en resize
          clearTimeout(resizeTimeout);
          resizeTimeout = setTimeout(() => {
            setDimensions({
              width: parent.offsetWidth,
              height: parent.offsetHeight
            });

            console.log('📐 Dimensions updated on resize:', {
              width: parent.offsetWidth,
              height: parent.offsetHeight
            });
          }, 150); // Esperar 150ms después del último resize
        }
      }
    };

    // Actualizar inmediatamente
    updateDimensions();

    // También actualizar después de un pequeño delay para asegurar que el DOM esté listo
    const immediateTimeout = setTimeout(updateDimensions, 100);

    window.addEventListener('resize', updateDimensions);

    return () => {
      window.removeEventListener('resize', updateDimensions);
      clearTimeout(resizeTimeout);
      clearTimeout(immediateTimeout);
    };
  }, []);

  // useEffect separado para actualizar mapBounds en partículas existentes
  useEffect(() => {
    if (!mapBounds || linesRef.current.length === 0) return;

    console.log('🗺️ Actualizando mapBounds en partículas existentes');

    // Actualizar mapBounds en todas las partículas sin recrearlas
    linesRef.current.forEach(line => {
      line.updateMapBounds(mapBounds);
    });
  }, [mapBounds]);

  useEffect(() => {
    console.log('🔍 AnimatedLayer useEffect triggered:', {
      isVisible,
      hasCanvas: !!canvasRef.current,
      dimensions,
      activeVariable,
      mapBounds: mapBoundsRef.current
    });

    if (!isVisible || !canvasRef.current || dimensions.width === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    console.log('🎨 AnimatedLayer initialized:', {
      variable: activeVariable,
      dimensions: `${dimensions.width}x${dimensions.height}`,
      legendColors: legendColorsRef.current?.length || 0,
      range: `${legendMinRef.current} - ${legendMaxRef.current}`,
      mapBounds: mapBoundsRef.current
    });

    const lineCount = tileDataRef.current && tileDataRef.current.length > 0
      ? configRef.current.baseLineCount
      : Math.floor(configRef.current.baseLineCount * 0.7);

    console.log(`✨ Creating ${lineCount} flow lines with gradient colors`);

    linesRef.current = [];
    for (let i = 0; i < lineCount; i++) {
      linesRef.current.push(new FlowLine(
        canvas,
        configRef.current,
        mapBoundsRef.current,
        tileDataRef.current,
        legendColorsRef.current,
        legendMinRef.current,
        legendMaxRef.current
      ));
    }

    let frameCount = 0;
    let lastTime = performance.now();
    const targetFPS = 45; // ⚡ OPTIMIZADO: Limitar a 45 FPS para mejor rendimiento
    const frameInterval = 1000 / targetFPS;

    const animate = (currentTime) => {
      // ⚡ OPTIMIZADO: Throttling de frame rate
      const elapsed = currentTime - lastTime;

      if (elapsed < frameInterval) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      lastTime = currentTime - (elapsed % frameInterval);

      // ⚡ OPTIMIZADO: Motion blur más agresivo para mejor rendimiento
      const isStreamline = configRef.current.flowPattern === 'thermal-streamline' ||
                          configRef.current.flowPattern === 'wind-streamline';
      const isRain = configRef.current.flowPattern === 'rain-streamline';

      let blurAlpha;
      if (isRain) {
        blurAlpha = 0.15; // ⚡ Más rápido para gotas
      } else if (isStreamline) {
        blurAlpha = 0.08; // ⚡ Más rápido pero visible
      } else {
        blurAlpha = 0.06; // ⚡ Más rápido en general
      }

      ctx.fillStyle = `rgba(0, 0, 0, ${blurAlpha})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // ⚡ OPTIMIZADO: Usar for loop en lugar de forEach (más rápido)
      for (let i = 0; i < linesRef.current.length; i++) {
        linesRef.current[i].update();
        linesRef.current[i].draw(ctx);
      }

      frameCount++;
      if (frameCount === 120) {
        const activeLines = linesRef.current.filter(l => l.active).length;
        console.log(`🌊 ${activeLines}/${linesRef.current.length} lines active @ ${targetFPS}fps`);
        frameCount = 0;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isVisible, dimensions.width, dimensions.height, activeVariable]);

  if (!isVisible) return null;

  return (
    <div className="animated-layer-overlay">
      <canvas
        ref={canvasRef}
        className="animation-canvas"
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none'
        }}
      />
    </div>
  );
};

export default AnimatedLayerOverlay;

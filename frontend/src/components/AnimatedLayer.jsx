/**
 * AnimatedLayer Component
 *
 * Componente profesional para renderizar capas climáticas animadas
 * con efectos basados en datos reales de las APIs y colores del degradado
 */

import React, { useEffect, useRef, useState } from 'react';
import './AnimatedLayer.css';

/**
 * Configuración base de animaciones por tipo de capa
 */
const LAYER_ANIMATIONS = {
  "Temperatura terrestre": {
    animationType: 'heat-flow',
    baseLineCount: 80, // Mayor densidad base
    lineSpeed: 0.3,
    lineLength: { min: 80, max: 300 }, // Rango más amplio
    lineWidth: { min: 1.5, max: 6 }, // Líneas más gruesas en zonas calientes
    glowIntensity: 20, // Brillo más intenso
    flowPattern: 'wave',
    curvature: 0.35,
    dataDependent: true,
    intensityMultiplier: 2.5 // Multiplicador para zonas de alta intensidad
  },
  "Temperatura del mar": {
    animationType: 'ocean-current',
    baseLineCount: 70, // Más líneas
    lineSpeed: 0.25,
    lineLength: { min: 120, max: 300 },
    lineWidth: { min: 1.5, max: 3.5 },
    glowIntensity: 15,
    flowPattern: 'smooth-wave',
    curvature: 0.25,
    dataDependent: true,
    oceanOnly: true
  },
  "Corrientes Oceánicas (Color)": {
    animationType: 'flow-vectors',
    baseLineCount: 100, // Más denso para compensar movimiento lento
    lineSpeed: 0.3,
    lineLength: { min: 100, max: 220 },
    lineWidth: { min: 2, max: 4 },
    glowIntensity: 14,
    flowPattern: 'ocean-current',
    curvature: 0.1,
    dataDependent: true,
    oceanOnly: true
  },
  "Precipitación": {
    animationType: 'rain-drops',
    baseLineCount: 200, // Más densidad para efecto profesional
    lineSpeed: 1.2, // Velocidad más realista de caída de lluvia
    lineLength: { min: 25, max: 80 }, // Gotas más cortas y realistas
    lineWidth: { min: 0.8, max: 2.5 }, // Gotas más delgadas y elegantes
    glowIntensity: 8, // Brillo más sutil y profesional
    flowPattern: 'vertical',
    curvature: 0.03, // Muy poca curvatura para caída vertical natural
    dataDependent: true,
    intensityMultiplier: 3.5, // Alta respuesta a intensidad de datos
    fadeSpeed: { min: 0.015, max: 0.025 } // Fade más rápido para efecto de gotas
  },
  "Vientos (OWM)": {
    animationType: 'wind-streams',
    baseLineCount: 75,
    lineSpeed: 0.5,
    lineLength: { min: 100, max: 220 },
    lineWidth: { min: 1.5, max: 3.5 },
    glowIntensity: 14,
    flowPattern: 'horizontal',
    curvature: 0.2,
    dataDependent: true,
    windDirection: true
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

    // Definir regiones de TIERRA (núcleo reducido para permitir animaciones en costas)
    const landRegions = [
      // América del Norte (núcleo)
      { latMin: 20, latMax: 70, lngMin: -165, lngMax: -55 },
      // América Central
      { latMin: 8, latMax: 18, lngMin: -105, lngMax: -78 },
      // América del Sur (núcleo)
      { latMin: -55, latMax: 12, lngMin: -80, lngMax: -36 },
      // Europa (núcleo)
      { latMin: 38, latMax: 70, lngMin: -8, lngMax: 38 },
      // África (núcleo)
      { latMin: -33, latMax: 36, lngMin: -15, lngMax: 50 },
      // Asia occidental (núcleo)
      { latMin: 8, latMax: 72, lngMin: 42, lngMax: 98 },
      // Asia oriental (núcleo)
      { latMin: -8, latMax: 53, lngMin: 98, lngMax: 143 },
      // Australia (núcleo)
      { latMin: -43, latMax: -12, lngMin: 113, lngMax: 153 },
      // Groenlandia (núcleo)
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

    if (pattern === 'vertical') {
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

      if (this.config.flowPattern === 'wave' || this.config.flowPattern === 'smooth-wave') {
        const wave = Math.sin(distance * this.waveFrequency + this.waveOffset) *
                     this.waveAmplitude * this.config.curvature;
        px += Math.cos(this.angle + Math.PI / 2) * wave;
        py += Math.sin(this.angle + Math.PI / 2) * wave;
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

      this.points.push({ x: px, y: py });
    }

    // Si no hay suficientes puntos válidos, marcar como inactiva para que se reposicione
    if (this.config.oceanOnly && this.points.length < 3) {
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

    if (this.config.flowPattern === 'ocean-current') {
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

    // Glow más intenso en zonas de alta intensidad y gradiente
    if (this.config.glowIntensity > 0) {
      const intensityBoost = 1.5 + (this.intensity * 1.5); // Hasta 3x más glow
      const gradientBoost = 1 + (this.gradientMagnitude * 2); // Extra glow en cambios bruscos
      ctx.shadowBlur = this.config.glowIntensity * intensityBoost * gradientBoost;
      ctx.shadowColor = this.color;
    }

    ctx.globalAlpha = this.opacity;
    ctx.strokeStyle = this.color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Dibujar línea con degradado de grosor
    for (let i = 0; i < this.points.length - 1; i++) {
      const t = i / (this.points.length - 1);
      const tapering = Math.sin(t * Math.PI);
      const currentWidth = this.lineWidth * tapering * 1.2; // Más grueso

      ctx.lineWidth = Math.max(currentWidth, 0.8);

      ctx.beginPath();
      ctx.moveTo(this.points[i].x, this.points[i].y);

      if (i < this.points.length - 2) {
        const xc = (this.points[i].x + this.points[i + 1].x) / 2;
        const yc = (this.points[i].y + this.points[i + 1].y) / 2;
        ctx.quadraticCurveTo(this.points[i].x, this.points[i].y, xc, yc);
      } else {
        ctx.lineTo(this.points[i + 1].x, this.points[i + 1].y);
      }

      ctx.stroke();
    }

    // Punto brillante más grande
    const head = this.points[this.points.length - 1];
    ctx.shadowBlur = this.config.glowIntensity * 2.5;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(head.x, head.y, this.lineWidth * 1.2, 0, Math.PI * 2);
    ctx.fill();

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
  legendMax
}) => {
  const canvasRef = useRef(null);
  const linesRef = useRef([]);
  const animationFrameRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const config = LAYER_ANIMATIONS[activeVariable] || LAYER_ANIMATIONS["Temperatura del mar"];

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

  useEffect(() => {
    console.log('🔍 AnimatedLayer useEffect triggered:', {
      isVisible,
      hasCanvas: !!canvasRef.current,
      dimensions,
      activeVariable
    });

    if (!isVisible || !canvasRef.current || dimensions.width === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    console.log('🎨 AnimatedLayer initialized:', {
      variable: activeVariable,
      dimensions: `${dimensions.width}x${dimensions.height}`,
      legendColors: legendColors?.length || 0,
      range: `${legendMin} - ${legendMax}`
    });

    const lineCount = tileData && tileData.length > 0
      ? config.baseLineCount
      : Math.floor(config.baseLineCount * 0.7);

    console.log(`✨ Creating ${lineCount} flow lines with gradient colors`);

    linesRef.current = [];
    for (let i = 0; i < lineCount; i++) {
      linesRef.current.push(new FlowLine(
        canvas,
        config,
        mapBounds,
        tileData,
        legendColors,
        legendMin,
        legendMax
      ));
    }

    let frameCount = 0;
    const animate = () => {
      // Motion blur muy sutil para permitir ver los colores
      ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      linesRef.current.forEach(line => {
        line.update();
        line.draw(ctx);
      });

      frameCount++;
      if (frameCount === 120) {
        const activeLines = linesRef.current.filter(l => l.active).length;
        console.log(`🌊 ${activeLines}/${linesRef.current.length} lines active`);
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
  }, [isVisible, dimensions, config, activeVariable, mapBounds, tileData, legendColors, legendMin, legendMax]);

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

/**
 * Plantillas de Animación para Variables Climáticas
 *
 * Este archivo contiene todas las configuraciones de animación predefinidas
 * que pueden ser asignadas a las variables desde el panel de administración.
 */

export const ANIMATION_TEMPLATES = {
  "thermal-flow": {
    nombre: "Flujo Térmico",
    descripcion: "Líneas fluidas que representan transferencia de calor",
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

  "ocean-thermal": {
    nombre: "Térmico Oceánico",
    descripcion: "Flujo térmico suave y continuo para temperatura del mar",
    animationType: 'ocean-thermal',
    baseLineCount: 120,          // ⚡ Más partículas para mayor densidad visual
    lineSpeed: 0.25,              // 🌊 Movimiento lento y suave como el océano
    lineLength: { min: 150, max: 350 }, // 🌊 Líneas más largas para efecto fluido
    lineWidth: { min: 1.2, max: 3 },    // 🌊 Líneas más delgadas y elegantes
    glowIntensity: 12,            // ✨ Mayor brillo para efecto profesional
    flowPattern: 'ocean-current',
    curvature: 0.04,              // 🌊 Menor curvatura para flujo más suave
    dataDependent: true,
    oceanOnly: true,
    intensityMultiplier: 3.5,     // 🌡️ Mayor respuesta a diferencias de temperatura
    waveAmplitude: 8,             // 🌊 Ondulación sutil
    waveFrequency: 0.0015,        // 🌊 Frecuencia baja para movimiento orgánico
    fadeSpeed: { min: 0.008, max: 0.015 } // ✨ Fade suave
  },

  "ocean-currents": {
    nombre: "Corrientes Oceánicas",
    descripcion: "Vectores de flujo dinámico para corrientes marinas",
    animationType: 'flow-vectors',
    baseLineCount: 150,           // ⚡ Alta densidad para visualización completa
    lineSpeed: 0.35,              // 🌊 Velocidad moderada para corrientes
    lineLength: { min: 180, max: 400 }, // 🌊 Líneas largas para mostrar trayectorias
    lineWidth: { min: 1.5, max: 4 },    // 🌊 Variación de grosor por intensidad
    glowIntensity: 15,            // ✨ Brillo intenso para destacar corrientes
    flowPattern: 'ocean-current',
    curvature: 0.08,              // 🌊 Curvatura moderada para flujo realista
    dataDependent: true,
    oceanOnly: true,
    intensityMultiplier: 4.0,     // 🌊 Alta respuesta a velocidad de corrientes
    waveAmplitude: 12,            // 🌊 Ondulación visible
    waveFrequency: 0.002,         // 🌊 Frecuencia que simula turbulencia
    fadeSpeed: { min: 0.006, max: 0.012 } // ✨ Fade gradual
  },

  "rain-drops": {
    nombre: "Lluvia",
    descripcion: "Gotas de lluvia cayendo",
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

  "wind-streams": {
    nombre: "Corrientes de Viento",
    descripcion: "Líneas de flujo mostrando dirección del viento",
    animationType: 'wind-streams',
    baseLineCount: 100,
    lineSpeed: 0.6,
    lineLength: { min: 60, max: 140 },
    lineWidth: { min: 1.5, max: 3.5 },
    glowIntensity: 8,
    flowPattern: 'wind-streamline',
    curvature: 0.06,
    dataDependent: true,
    intensityMultiplier: 3.0,
    waveAmplitude: 8,
    waveFrequency: 0.005
  },

  "clouds-dynamic": {
    nombre: "Nubes Dinámicas",
    descripcion: "Partículas que simulan movimiento de nubes",
    animationType: 'cloud-particles',
    baseLineCount: 150,
    lineSpeed: 0.2,
    lineLength: { min: 40, max: 100 },
    lineWidth: { min: 3, max: 6 },
    glowIntensity: 15,
    flowPattern: 'cloud-drift',
    curvature: 0.03,
    dataDependent: true,
    intensityMultiplier: 5.0,
    fadeSpeed: { min: 0.005, max: 0.015 },
    waveAmplitude: 5,
    waveFrequency: 0.002
  },

  "snow-fall": {
    nombre: "Nevada",
    descripcion: "Copos de nieve cayendo suavemente",
    animationType: 'snow-particles',
    baseLineCount: 120,
    lineSpeed: 0.3,
    lineLength: { min: 20, max: 50 },
    lineWidth: { min: 2, max: 5 },
    glowIntensity: 18,
    flowPattern: 'snow-drift',
    curvature: 0.04,
    dataDependent: true,
    intensityMultiplier: 6.0,
    windInfluence: 0.1,
    waveAmplitude: 4,
    waveFrequency: 0.006
  },

  "pressure-flow": {
    nombre: "Flujo de Presión",
    descripcion: "Movimiento de sistemas de alta/baja presión",
    animationType: 'pressure-contours',
    baseLineCount: 60,
    lineSpeed: 0.3,
    lineLength: { min: 80, max: 200 },
    lineWidth: { min: 2, max: 4 },
    glowIntensity: 10,
    flowPattern: 'pressure-gradient',
    curvature: 0.12,
    dataDependent: true,
    intensityMultiplier: 2.0,
    waveAmplitude: 12,
    waveFrequency: 0.003
  },

  "humidity-flow": {
    nombre: "Flujo de Humedad",
    descripcion: "Transporte de vapor de agua",
    animationType: 'vapor-flow',
    baseLineCount: 90,
    lineSpeed: 0.4,
    lineLength: { min: 50, max: 120 },
    lineWidth: { min: 1.5, max: 3 },
    glowIntensity: 12,
    flowPattern: 'moisture-transport',
    curvature: 0.07,
    dataDependent: true,
    intensityMultiplier: 4.0,
    waveAmplitude: 6,
    waveFrequency: 0.005
  },

  "static-pulse": {
    nombre: "Pulso Estático",
    descripcion: "Partículas pulsantes sin movimiento direccional",
    animationType: 'static-pulse',
    baseLineCount: 25,
    lineSpeed: 0.1,
    lineLength: { min: 10, max: 25 },
    lineWidth: { min: 2.5, max: 5 },
    glowIntensity: 20,
    flowPattern: 'static-pulse',
    curvature: 0,
    dataDependent: true,
    intensityMultiplier: 5.0,
    waveAmplitude: 2,
    waveFrequency: 0.02
  },

  "vortex": {
    nombre: "Vórtice",
    descripcion: "Patrón rotacional para huracanes/tornados",
    animationType: 'vortex',
    baseLineCount: 20,
    lineSpeed: 0.8,
    lineLength: { min: 40, max: 90 },
    lineWidth: { min: 1.5, max: 3 },
    glowIntensity: 10,
    flowPattern: 'vortex',
    curvature: 0.15,
    dataDependent: true,
    intensityMultiplier: 3.5,
    waveAmplitude: 15,
    waveFrequency: 0.006
  },

  "fire": {
    nombre: "Fuego/Calor Intenso",
    descripcion: "Efecto de calor extremo o incendios",
    animationType: 'fire',
    baseLineCount: 22,
    lineSpeed: 0.7,
    lineLength: { min: 25, max: 65 },
    lineWidth: { min: 2, max: 4.5 },
    glowIntensity: 18,
    flowPattern: 'fire',
    curvature: 0.12,
    dataDependent: true,
    intensityMultiplier: 7.0,
    waveAmplitude: 12,
    waveFrequency: 0.007
  },

  "ocean-deep": {
    nombre: "Océano Profundo",
    descripcion: "Movimiento lento y majestuoso de aguas profundas",
    animationType: 'ocean-deep',
    baseLineCount: 100,           // 🌊 Densidad moderada
    lineSpeed: 0.15,              // 🌊 Muy lento, como aguas profundas
    lineLength: { min: 200, max: 450 }, // 🌊 Líneas muy largas
    lineWidth: { min: 1, max: 2.5 },    // 🌊 Líneas delgadas y sutiles
    glowIntensity: 18,            // ✨ Alto brillo para profundidad
    flowPattern: 'ocean-current',
    curvature: 0.03,              // 🌊 Curvatura mínima, muy suave
    dataDependent: true,
    oceanOnly: true,
    intensityMultiplier: 2.8,
    waveAmplitude: 5,             // 🌊 Ondulación muy sutil
    waveFrequency: 0.001,         // 🌊 Frecuencia ultra baja
    fadeSpeed: { min: 0.005, max: 0.01 }
  },

  "ocean-surface": {
    nombre: "Superficie Oceánica",
    descripcion: "Ondas y movimiento de superficie del mar",
    animationType: 'ocean-surface',
    baseLineCount: 180,           // 🌊 Alta densidad para superficie activa
    lineSpeed: 0.4,               // 🌊 Velocidad moderada-alta
    lineLength: { min: 120, max: 280 }, // 🌊 Líneas de longitud media
    lineWidth: { min: 1.3, max: 3.5 },  // 🌊 Variación moderada
    glowIntensity: 10,            // ✨ Brillo moderado
    flowPattern: 'ocean-current',
    curvature: 0.1,               // 🌊 Curvatura notable para simular olas
    dataDependent: true,
    oceanOnly: true,
    intensityMultiplier: 5.0,     // 🌊 Alta respuesta a vientos superficiales
    waveAmplitude: 15,            // 🌊 Ondulación visible
    waveFrequency: 0.003,         // 🌊 Frecuencia media
    fadeSpeed: { min: 0.01, max: 0.02 }
  },

  "ocean-gradient": {
    nombre: "Gradiente Oceánico",
    descripcion: "Transiciones suaves de temperatura o salinidad",
    animationType: 'ocean-gradient',
    baseLineCount: 140,           // 🌊 Densidad alta
    lineSpeed: 0.2,               // 🌊 Movimiento muy lento
    lineLength: { min: 250, max: 500 }, // 🌊 Líneas extra largas
    lineWidth: { min: 0.8, max: 2 },    // 🌊 Líneas muy delgadas
    glowIntensity: 20,            // ✨ Brillo máximo para gradientes
    flowPattern: 'ocean-current',
    curvature: 0.02,              // 🌊 Casi sin curvatura
    dataDependent: true,
    oceanOnly: true,
    intensityMultiplier: 6.0,     // 🌡️ Máxima respuesta a gradientes
    waveAmplitude: 3,             // 🌊 Ondulación mínima
    waveFrequency: 0.0008,        // 🌊 Frecuencia ultra baja
    fadeSpeed: { min: 0.003, max: 0.008 }
  }
};

/**
 * Obtiene una lista de opciones para selector dropdown
 */
export const getAnimationOptions = () => {
  return Object.entries(ANIMATION_TEMPLATES).map(([key, template]) => ({
    value: key,
    label: template.nombre,
    descripcion: template.descripcion
  }));
};

/**
 * Obtiene la configuración de una animación por su clave
 */
export const getAnimationConfig = (key) => {
  return ANIMATION_TEMPLATES[key] || ANIMATION_TEMPLATES['thermal-flow'];
};

/**
 * Configuración por defecto para nuevas variables
 */
export const DEFAULT_ANIMATION_CONFIG = {
  habilitada: true,
  opacidad: 0.9,
  velocidad: "normal",
  tipo_animacion: "thermal-flow",
  ...ANIMATION_TEMPLATES['thermal-flow']
};

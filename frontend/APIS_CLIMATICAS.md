# APIs Climáticas Utilizadas en el Frontend

Documentación completa de todas las APIs externas utilizadas para obtener datos climáticos en tiempo real y capas de visualización satelital.

---

## 📋 Tabla de Contenidos

1. [Open-Meteo API](#1-open-meteo-api)
2. [NASA GIBS (Global Imagery Browse Services)](#2-nasa-gibs)
3. [Servicios de Mapas Base](#3-servicios-de-mapas-base)
4. [Resumen Comparativo](#4-resumen-comparativo)

---

## 1. Open-Meteo API

### 🌐 Descripción General
Open-Meteo es una API gratuita de código abierto que proporciona datos meteorológicos y climáticos históricos, actuales y de pronóstico sin necesidad de API key.

### 🔗 URLs Base

#### API de Pronóstico (Datos Recientes)
```
https://api.open-meteo.com/v1/forecast
```

#### API Climática (Datos Históricos 1991-2020)
```
https://climate-api.open-meteo.com/v1/climate
```

### 📊 Variables Disponibles

#### Variables Diarias (Daily Parameters)

| Variable | Parámetro API | Unidad | Descripción |
|----------|--------------|--------|-------------|
| Temperatura Máxima | `temperature_2m_max` | °C | Temperatura máxima diaria a 2 metros |
| Temperatura Mínima | `temperature_2m_min` | °C | Temperatura mínima diaria a 2 metros |
| Temperatura Media | `temperature_2m_mean` | °C | Temperatura promedio diaria |
| Precipitación | `precipitation_sum` | mm | Suma total de precipitación diaria |
| Humedad Relativa | `relativehumidity_2m_mean` | % | Humedad relativa promedio |
| Velocidad del Viento | `windspeed_10m_max` | km/h | Velocidad máxima del viento a 10m |
| Evapotranspiración | `et0_fao_evapotranspiration` | mm | ET₀ según FAO-56 |
| Radiación Solar | `shortwave_radiation_sum` | MJ/m² | Radiación de onda corta acumulada |

### 🔧 Uso en el Código

**Ubicación:** `frontend/src/pages/UserMapDashboard.jsx:959`

```javascript
/**
 * EJEMPLO: Obtener serie temporal de temperatura máxima
 */
const lat = 4.6097;    // Bogotá
const lon = -74.0817;
const start = '2025-01-01';
const end = '2025-01-15';
const variable = 'temperature_2m_max';

const url = `https://api.open-meteo.com/v1/forecast?` +
            `latitude=${lat}&` +
            `longitude=${lon}&` +
            `start_date=${start}&` +
            `end_date=${end}&` +
            `daily=${variable}&` +
            `timezone=UTC`;

const response = await fetch(url);
const data = await response.json();

// Formato de respuesta:
{
  "daily": {
    "time": ["2025-01-01", "2025-01-02", ...],
    "temperature_2m_max": [23.5, 24.1, ...]
  }
}
```

**Datos Climáticos Históricos (1991-2020):**

```javascript
/**
 * EJEMPLO: Obtener datos históricos de precipitación
 * Modelo: CMCC_CM2_VHR4 (alta resolución)
 */
const url = `https://climate-api.open-meteo.com/v1/climate?` +
            `latitude=${lat}&` +
            `longitude=${lon}&` +
            `start_date=1991-01-01&` +
            `end_date=2020-12-31&` +
            `models=CMCC_CM2_VHR4&` +
            `daily=precipitation_sum`;
```

### 📈 Limitaciones y Cuotas

| Característica | Límite |
|----------------|--------|
| **Requests por día** | 10,000 (gratis) |
| **Requests por segundo** | Sin límite estricto |
| **API Key** | ❌ No requerida |
| **Autenticación** | ❌ No requerida |
| **Costo** | ✅ Gratuito |
| **Rango temporal forecast** | Últimos 7-16 días + 7 días de pronóstico |
| **Rango temporal histórico** | Depende del modelo (ej. 1991-2020) |
| **Latencia** | ~500-1000ms |

### 🎯 Variables Configuradas en Climétrica

```javascript
// Mapeo de variables internas a parámetros de Open-Meteo
const VARIABLE_CONFIG = {
  temperatura_max: {
    displayName: "Temperatura Máxima",
    apiParam: "temperature_2m_max",
    unit: "°C",
    chartColor: "rgba(255, 99, 132, 1)",
    historical: true
  },
  temperatura_min: {
    displayName: "Temperatura Mínima",
    apiParam: "temperature_2m_min",
    unit: "°C",
    chartColor: "rgba(54, 162, 235, 1)",
    historical: true
  },
  precipitacion: {
    displayName: "Precipitación",
    apiParam: "precipitation_sum",
    unit: "mm",
    chartColor: "rgba(75, 192, 192, 1)",
    historical: true
  },
  humedad: {
    displayName: "Humedad Relativa",
    apiParam: "relativehumidity_2m_mean",
    unit: "%",
    chartColor: "rgba(153, 102, 255, 1)",
    historical: false
  },
  viento: {
    displayName: "Velocidad del Viento",
    apiParam: "windspeed_10m_max",
    unit: "km/h",
    chartColor: "rgba(255, 206, 86, 1)",
    historical: false
  },
  evapotranspiracion: {
    displayName: "Evapotranspiración",
    apiParam: "et0_fao_evapotranspiration",
    unit: "mm",
    chartColor: "rgba(255, 159, 64, 1)",
    historical: false
  },
  radiacion_solar: {
    displayName: "Radiación Solar",
    apiParam: "shortwave_radiation_sum",
    unit: "MJ/m²",
    chartColor: "rgba(255, 205, 86, 1)",
    historical: false
  }
};
```

### ⚠️ Manejo de Errores

```javascript
try {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.status}`);
  }

  const data = await response.json();

  // Validar que los datos existan
  if (!data.daily || !data.daily.time) {
    console.warn("⚠️ No hay datos disponibles para esta ubicación/fecha");
    // Fallback a datos simulados si es necesario
    return generateFallbackData();
  }

  return data.daily;

} catch (error) {
  console.error("❌ Error obteniendo datos de Open-Meteo:", error);

  // Estrategia de fallback
  if (error.message.includes('network')) {
    alert("Error de conexión. Verifica tu internet.");
  } else {
    alert("No se pudieron obtener datos climáticos. Intenta de nuevo.");
  }

  return null;
}
```

### 📚 Documentación Oficial
- **API Docs:** https://open-meteo.com/en/docs
- **Climate API:** https://open-meteo.com/en/docs/climate-api
- **GitHub:** https://github.com/open-meteo/open-meteo

---

## 2. NASA GIBS

### 🌐 Descripción General
NASA GIBS (Global Imagery Browse Services) proporciona acceso a más de 1000 productos satelitales de observación de la Tierra, incluyendo imágenes en tiempo casi real de misiones como MODIS, VIIRS, Landsat, etc.

### 🔗 URL Base (WMTS Service)

```
https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/{LAYER}/default/{TIME}/{TILEMATRIXSET}/{z}/{y}/{x}.{FORMAT}
```

### 🛰️ Capas Satelitales Utilizadas

#### 1. Temperatura Superficial del Mar (SST)

**Layer ID:** `GHRSST_L4_MUR_Sea_Surface_Temperature`

```javascript
{
  name: "Temperatura Superficial del Mar",
  layer: "GHRSST_L4_MUR_Sea_Surface_Temperature",
  tileMatrixSet: "GoogleMapsCompatible_Level7",
  format: "png",
  temporalResolution: "daily",
  spatialResolution: "1 km",
  source: "MODIS + AVHRR + AMSR-E",
  description: "Temperatura de la superficie del mar con resolución de 1km"
}
```

**URL Ejemplo:**
```
https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/GHRSST_L4_MUR_Sea_Surface_Temperature/default/2025-01-15/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png
```

**Ubicación en código:** `frontend/src/pages/ClimateDashboard.jsx:47`

#### 2. Precipitación (GPM)

**Layer ID:** `GPM_3IMERGHH_V07B_Precipitation`

```javascript
{
  name: "Precipitación GPM",
  layer: "GPM_3IMERGHH_V07B_Precipitation",
  tileMatrixSet: "GoogleMapsCompatible_Level9",
  format: "png",
  temporalResolution: "30 minutes",
  spatialResolution: "10 km",
  source: "GPM (Global Precipitation Measurement)",
  description: "Precipitación global con actualización cada 30 minutos"
}
```

**Ubicación en código:** `frontend/src/pages/ClimateDashboard.jsx:58`

#### 3. Capas Adicionales Disponibles

**Configuración completa en:** `UserMapDashboard.jsx:3258`

```javascript
const NASA_LAYERS = {
  // TEMPERATURA
  viirs_sst: {
    layer: "VIIRS_SNPP_SST",
    tileMatrixSet: "GoogleMapsCompatible_Level7",
    format: "png",
    description: "Temperatura superficial del mar (VIIRS)"
  },

  modis_lst_day: {
    layer: "MODIS_Terra_Land_Surface_Temp_Day",
    tileMatrixSet: "GoogleMapsCompatible_Level7",
    format: "png",
    description: "Temperatura superficial terrestre diurna"
  },

  // PRECIPITACIÓN Y HUMEDAD
  gpm_precipitation: {
    layer: "GPM_3IMERGHH_V07B_Precipitation",
    tileMatrixSet: "GoogleMapsCompatible_Level9",
    format: "png",
    description: "Precipitación GPM (30 min)"
  },

  // VEGETACIÓN
  modis_ndvi: {
    layer: "MODIS_Terra_NDVI_8Day",
    tileMatrixSet: "GoogleMapsCompatible_Level9",
    format: "png",
    description: "Índice de vegetación NDVI (8 días)"
  },

  // AEROSOLES Y CALIDAD DEL AIRE
  modis_aod: {
    layer: "MODIS_Combined_Value_Added_AOD",
    tileMatrixSet: "GoogleMapsCompatible_Level6",
    format: "png",
    description: "Profundidad óptica de aerosoles"
  },

  // NIEVE Y HIELO
  modis_snow_cover: {
    layer: "MODIS_Terra_Snow_Cover",
    tileMatrixSet: "GoogleMapsCompatible_Level8",
    format: "png",
    description: "Cobertura de nieve"
  }
};
```

### 🔧 Integración con Leaflet

```javascript
/**
 * EJEMPLO: Agregar capa animada de NASA GIBS
 */
import L from 'leaflet';

// Función para generar URL de tile por fecha
const makeUrl = (date) => {
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD

  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/` +
         `GHRSST_L4_MUR_Sea_Surface_Temperature/` +
         `default/${dateStr}/` +
         `GoogleMapsCompatible_Level7/` +
         `{z}/{y}/{x}.png`;
};

// Crear capa de tiles
const layer = L.tileLayer(makeUrl(new Date()), {
  attribution: '&copy; NASA GIBS',
  maxZoom: 7,
  opacity: 0.7
});

// Agregar al mapa
layer.addTo(map);

// Actualizar fecha (animación)
function updateDate(newDate) {
  layer.setUrl(makeUrl(newDate));
}
```

### 📈 Limitaciones y Cuotas

| Característica | Detalle |
|----------------|---------|
| **Requests** | ✅ Ilimitados |
| **API Key** | ❌ No requerida |
| **Autenticación** | ❌ No requerida |
| **Costo** | ✅ Completamente gratuito |
| **Disponibilidad temporal** | Varía por capa (algunas desde 2000, otras desde 2012) |
| **Latencia** | ~200-500ms por tile |
| **Formato de tiles** | PNG, JPEG |
| **Proyección soportada** | EPSG:3857 (Web Mercator) |
| **Nivel de zoom máximo** | Varía (Level 6-9 típicamente) |

### 📅 Formato de Fechas

NASA GIBS acepta diferentes formatos temporales:

```javascript
// Formato diario
const dailyDate = "2025-01-15";

// Algunos productos usan timestamps completos
const timestampDate = "2025-01-15T00:00:00Z";

// Para capas con menor frecuencia (ej. 8 días)
const eightDayDate = "2025-01-01"; // Primer día del periodo
```

### ⚠️ Manejo de Errores

```javascript
/**
 * Las capas de GIBS pueden fallar si:
 * 1. La fecha solicitada no tiene datos disponibles
 * 2. La capa está temporalmente fuera de servicio
 * 3. El nivel de zoom es demasiado alto para esa capa
 */

layer.on('tileerror', function(error) {
  console.warn('⚠️ Error cargando tile de NASA GIBS:', error);

  // Estrategias de manejo:
  // 1. Usar fecha más reciente conocida
  // 2. Reducir opacidad de la capa
  // 3. Mostrar mensaje al usuario

  if (attempts < 3) {
    // Reintentar con fecha anterior
    const previousDate = new Date(currentDate);
    previousDate.setDate(previousDate.getDate() - 1);
    updateDate(previousDate);
  }
});

// Verificar disponibilidad de datos antes de cargar
async function checkDataAvailability(layer, date) {
  const testUrl = makeUrl(date).replace('{z}/{y}/{x}', '0/0/0');

  try {
    const response = await fetch(testUrl, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}
```

### 🎨 Capas con Paletas de Color Personalizadas

Algunas capas NASA GIBS incluyen paletas de color específicas:

```javascript
// Ejemplo: Temperatura con paleta Rainbow
const layerWithPalette = {
  layer: "MODIS_Terra_Land_Surface_Temp_Day",
  palette: "default",  // Opciones: default, rainbow, grayscale, etc.
  min: -50,  // Temperatura mínima en °C
  max: 50    // Temperatura máxima en °C
};
```

### 📚 Recursos Adicionales

- **Catálogo de Capas:** https://nasa-gibs.github.io/gibs-api-docs/available-visualizations/
- **WMTS Capabilities:** https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml
- **Worldview (Visualizador):** https://worldview.earthdata.nasa.gov/
- **GitHub:** https://github.com/nasa-gibs
- **API Documentation:** https://nasa-gibs.github.io/gibs-api-docs/

---

## 3. Servicios de Mapas Base

### 🗺️ Proveedores de Tiles Base

#### 1. OpenStreetMap (OSM)

```javascript
{
  name: "OpenStreetMap",
  url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: "&copy; OpenStreetMap contributors",
  maxZoom: 19,
  subdomains: ['a', 'b', 'c'],
  license: "Open Database License (ODbL)",
  cost: "Gratuito",
  restrictions: "Fair use policy - no más de 2 requests/segundo"
}
```

**Políticas de Uso:**
- ✅ Uso gratuito para aplicaciones no comerciales
- ⚠️ Recomendado implementar caché de tiles
- ⚠️ No más de 2 requests por segundo por IP
- ⚠️ User-Agent personalizado requerido para tráfico alto

#### 2. CartoDB Voyager

```javascript
{
  name: "Voyager",
  url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
  attribution: "&copy; OpenStreetMap, &copy; CartoDB",
  maxZoom: 19,
  subdomains: ['a', 'b', 'c', 'd'],
  cost: "Gratuito",
  style: "Estilo equilibrado entre claro y detallado"
}
```

**Características:**
- ✅ Diseño limpio y moderno
- ✅ Buena legibilidad de etiquetas
- ✅ Soporte para retina displays (`{r}` = `@2x`)

#### 3. ESRI World Imagery

```javascript
{
  name: "Satélite ESRI",
  url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  attribution: "Tiles &copy; Esri",
  maxZoom: 18,
  source: "Landsat + comerciales",
  resolution: "Hasta 30cm en áreas urbanas",
  cost: "Gratuito"
}
```

**Características:**
- ✅ Imágenes satelitales de alta resolución
- ✅ Actualización frecuente
- ✅ Cobertura global

### 📊 Comparativa de Proveedores

| Proveedor | Max Zoom | Actualización | Restricciones | Mejor Para |
|-----------|----------|---------------|---------------|------------|
| **OSM** | 19 | Continua | 2 req/s | Mapas urbanos, rutas |
| **CartoDB** | 19 | Frecuente | Fair use | Visualizaciones profesionales |
| **ESRI** | 18 | Mensual | Fair use | Análisis territorial, agricultura |

### 🔧 Implementación en Climétrica

```javascript
// Configuración de mapas base
const BASE_MAPS = {
  osm: {
    name: "OpenStreetMap",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19
  },
  cartodb_voyager: {
    name: "Voyager",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap, &copy; CartoDB",
    maxZoom: 19
  },
  esri_world: {
    name: "Satélite ESRI",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
    maxZoom: 18
  }
};

// Crear capa base
const baseLayer = L.tileLayer(BASE_MAPS.osm.url, {
  attribution: BASE_MAPS.osm.attribution,
  maxZoom: BASE_MAPS.osm.maxZoom
});
```

---

## 4. Resumen Comparativo

### 📊 Tabla Comparativa General

| API/Servicio | Tipo | Autenticación | Límite de Requests | Costo | Datos en Tiempo Real |
|--------------|------|---------------|-------------------|-------|---------------------|
| **Open-Meteo** | Datos numéricos | ❌ No | 10,000/día | ✅ Gratis | ✅ Sí (últimos 7-16 días) |
| **NASA GIBS** | Tiles satelitales | ❌ No | ✅ Ilimitado | ✅ Gratis | ✅ Sí (delay ~3-24h) |
| **OpenStreetMap** | Tiles de mapa | ❌ No | ~2 req/s | ✅ Gratis | N/A |
| **CartoDB** | Tiles de mapa | ❌ No | Fair use | ✅ Gratis | N/A |
| **ESRI** | Tiles satelitales | ❌ No | Fair use | ✅ Gratis | N/A |

### 🎯 Casos de Uso por API

#### Open-Meteo
- ✅ Series temporales de variables climáticas
- ✅ Pronósticos meteorológicos (7 días)
- ✅ Datos históricos (1991-2020)
- ✅ Análisis de cultivos (temperatura, precipitación, ET₀)
- ✅ Gráficos y estadísticas

#### NASA GIBS
- ✅ Visualización de capas satelitales
- ✅ Animaciones temporales
- ✅ Análisis visual de patrones climáticos
- ✅ Temperatura superficial
- ✅ Precipitación en tiempo casi real
- ✅ Índices de vegetación (NDVI)

#### Mapas Base
- ✅ Contexto geográfico
- ✅ Referencias urbanas y rurales
- ✅ Ubicación de cultivos
- ✅ Análisis territorial

### 🔄 Flujo de Datos Típico

```
Usuario selecciona ubicación en mapa
         ↓
1. Mapa Base (OSM/CartoDB/ESRI)
   → Muestra contexto geográfico
         ↓
2. NASA GIBS
   → Carga capas satelitales (SST, precipitación, etc.)
   → Visualización overlay sobre mapa base
         ↓
3. Open-Meteo API
   → Obtiene serie temporal de variables
   → lat, lon, fecha_inicio, fecha_fin, variable
         ↓
4. Procesamiento en Frontend
   → Calcula estadísticas (media, máx, mín, tendencia)
   → Genera gráficos con Chart.js
   → Análisis de cultivos
         ↓
5. Almacenamiento (Opcional)
   → Guarda datos en MongoDB vía backend
   → POST /api/climate-data/save/
```

### ⚡ Optimizaciones Implementadas

#### 1. Caché de Tiles
```javascript
// Leaflet automáticamente cachea tiles en memoria
// Para persistencia, usar plugin offline:
// https://github.com/allartk/leaflet.offline
```

#### 2. Debouncing de Requests
```javascript
// Evitar múltiples requests al mover el mapa
let debounceTimer;
map.on('moveend', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    fetchClimateData(map.getCenter());
  }, 500); // 500ms de espera
});
```

#### 3. Lazy Loading de Capas
```javascript
// Cargar capas solo cuando el usuario las active
const layers = {
  sst: null,
  precipitation: null
};

function enableLayer(layerName) {
  if (!layers[layerName]) {
    layers[layerName] = createNASALayer(layerName);
    layers[layerName].addTo(map);
  }
}
```

### 🐛 Troubleshooting Común

#### Problema: CORS Errors
```javascript
// Open-Meteo y NASA GIBS tienen CORS habilitado
// Si hay problemas, verificar:
// 1. Formato correcto de URL
// 2. Fecha válida
// 3. Parámetros correctos
```

#### Problema: Tiles No Cargan
```javascript
// Verificar:
layer.on('tileerror', (e) => {
  console.error('Tile error:', e);
  // 1. URL correcta
  // 2. Fecha disponible
  // 3. Nivel de zoom soportado
  // 4. Conexión a internet
});
```

#### Problema: Datos de Open-Meteo Vacíos
```javascript
// Posibles causas:
// 1. Ubicación en océano (algunas variables no disponibles)
// 2. Rango de fechas inválido
// 3. Variable no soportada para esa ubicación
// 4. Parámetro 'daily' mal especificado

// Solución: Implementar fallback
if (!data.daily || data.daily.time.length === 0) {
  return generateSimulatedData(variable, days);
}
```

---

## 📞 Soporte y Recursos

### Open-Meteo
- 📧 Email: info@open-meteo.com
- 💬 GitHub Issues: https://github.com/open-meteo/open-meteo/issues
- 📖 Docs: https://open-meteo.com/en/docs

### NASA GIBS
- 📧 Email: support@earthdata.nasa.gov
- 💬 GitHub: https://github.com/nasa-gibs/gibs-api-docs
- 📖 Docs: https://nasa-gibs.github.io/gibs-api-docs/

### Comunidad
- Stack Overflow: Tag `open-meteo`, `nasa-gibs`, `leaflet`
- GIS Stack Exchange: Para consultas de mapas y tiles

---

## 🔐 Seguridad y Privacidad

### Datos Enviados a APIs Externas

| API | Datos Enviados | Riesgo de Privacidad |
|-----|----------------|---------------------|
| **Open-Meteo** | Coordenadas (lat, lon), fechas | ⚠️ Bajo (ubicaciones pueden rastrearse) |
| **NASA GIBS** | Ninguno (solo tiles estáticos) | ✅ Muy bajo |
| **Mapas Base** | Coordenadas de tiles solicitados | ⚠️ Bajo |

### Recomendaciones

1. **No enviar información personal** a estas APIs
2. **Implementar rate limiting** en el frontend
3. **Caché agresivo** para reducir requests
4. **Proxy opcional** si se requiere ocultar IPs de usuarios

```javascript
// Ejemplo de proxy para Open-Meteo (opcional)
const proxyUrl = 'https://tu-backend.com/api/climate-proxy';
const response = await fetch(proxyUrl, {
  method: 'POST',
  body: JSON.stringify({ lat, lon, variable })
});
```

---

## 📝 Notas de Implementación

### Variables de Entorno NO Requeridas

A diferencia de otras APIs meteorológicas (OpenWeatherMap, WeatherAPI), **ninguna de las APIs utilizadas requiere API keys**, por lo que no es necesario configurar variables de entorno para su uso.

### Archivos Clave del Proyecto

| Archivo | Descripción | APIs Utilizadas |
|---------|-------------|----------------|
| `UserMapDashboard.jsx` | Dashboard principal con mapa y gráficos | Open-Meteo, NASA GIBS |
| `ClimateDashboard.jsx` | Visualizador de capas satelitales | NASA GIBS |
| `AnimatedLayer.jsx` | Componente para animación de capas | NASA GIBS |
| `Save_climate_data_helper.js` | Helper para guardar datos en BD | Backend interno |

---

**Última actualización:** 2025-01-15
**Versión del documento:** 1.0
**Autor:** Sistema Climétrica


# Documentación de APIs Externas - Frontend Climétrica

## Índice

1. [APIs Internas (Backend Propio)](#apis-internas-backend-propio)
2. [APIs Externas de Clima](#apis-externas-de-clima)
3. [Configuración y Claves](#configuración-y-claves)
4. [Limitaciones y Cuotas](#limitaciones-y-cuotas)
5. [Manejo de Errores](#manejo-de-errores)

---

## APIs Internas (Backend Propio)

### 1. API de Autenticación

#### Base URL
```
http://localhost:8000/api
```

#### Endpoints Disponibles

##### POST /register/
Registro de nuevos usuarios.

**Parámetros del Body:**
```json
{
  "first_name": "string (requerido)",
  "last_name": "string (requerido)",
  "email": "string (requerido, único)",
  "password": "string (requerido, mínimo nivel 'Media')",
  "phone": "string (opcional)",
  "identification": "string (requerido, único, solo números)",
  "role": "string (opcional, default: 'productor')"
}
```

**Respuesta Exitosa (201):**
```json
{
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "first_name": "Juan",
    "last_name": "Pérez",
    "email": "juan@ejemplo.com",
    "phone": "1234567890",
    "role": "productor"
  }
}
```

**Errores:**
- `400`: Email o identificación duplicados
- `500`: Error del servidor

**Limitaciones:**
- Email debe ser único (case-insensitive)
- Identificación debe ser única
- Contraseña debe cumplir requisitos de seguridad

---

##### POST /login/
Inicio de sesión con credenciales encriptadas.

**Parámetros del Body:**
```json
{
  "email": "string encriptado AES",
  "password": "string encriptado AES"
}
```

**Respuesta Exitosa (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "usuario@ejemplo.com",
    "role": "productor"
  },
  "role": "productor"
}
```

**Errores:**
- `400`: Error al procesar credenciales encriptadas
- `401`: Credenciales inválidas
- `404`: Usuario no encontrado

**Notas:**
- Las credenciales deben encriptarse con AES en el frontend
- El token JWT expira según configuración del servidor
- El token debe incluirse en header `Authorization: Bearer <token>`

---

##### GET /profile/
Obtener perfil del usuario autenticado.

**Headers Requeridos:**
```
Authorization: Bearer <token_jwt>
```

**Respuesta Exitosa (200):**
```json
{
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "first_name": "Juan",
    "last_name": "Pérez",
    "email": "juan@ejemplo.com",
    "phone": "1234567890",
    "identification": "12345678",
    "role": "productor",
    "status": "active"
  }
}
```

**Errores:**
- `401`: Token no válido o expirado
- `404`: Usuario no encontrado

---

##### PUT /profile/update/
Actualizar perfil propio.

**Headers Requeridos:**
```
Authorization: Bearer <token_jwt>
```

**Parámetros del Body:**
```json
{
  "first_name": "string (opcional)",
  "last_name": "string (opcional)",
  "email": "string (opcional, único)",
  "phone": "string (opcional)",
  "password": "string (opcional)"
}
```

**Limitaciones:**
- No puede modificar: role, identification, status
- Email debe ser único si se cambia

---

### 2. API de Datos Climáticos

##### GET /climate-data/
Obtener registros de datos climáticos guardados.

**Query Parameters:**
```
userId: string (opcional) - Filtrar por usuario
fecha: string (opcional, formato YYYY-MM-DD) - Filtrar por fecha
lugar: string (opcional) - Filtrar por lugar
variable: string (opcional) - Filtrar por variable climática
```

**Ejemplo:**
```
GET /api/climate-data/?userId=507f1f77bcf86cd799439011&variable=temperature
```

**Respuesta Exitosa (200):**
```json
{
  "status": "success",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "usuario": {
        "_id": "507f1f77bcf86cd799439011",
        "first_name": "Juan",
        "last_name": "Pérez",
        "email": "juan@ejemplo.com"
      },
      "consulta": {
        "lugar": "Bogotá, Colombia",
        "variable": "temperature",
        "tipoSeleccion": "point"
      },
      "datosClimaticos": {
        "serieTemporal": [
          {"date": "2025-01-01", "value": "18.5"},
          {"date": "2025-01-02", "value": "19.2"}
        ],
        "estadisticas": {
          "promedio": 18.85,
          "max": 19.2,
          "min": 18.5
        }
      },
      "estadoDatos": {
        "fechaDatos": "2025-01-15",
        "tiempoReal": true,
        "fuente": "Open-Meteo"
      },
      "createdAt": "2025-01-15T10:30:00Z"
    }
  ]
}
```

---

##### POST /climate-data/save/
Guardar nuevo registro de datos climáticos.

**Headers Requeridos:**
```
Authorization: Bearer <token_jwt>
```

**Parámetros del Body:**
```json
{
  "usuario": {
    "_id": "string",
    "first_name": "string",
    "last_name": "string",
    "email": "string"
  },
  "consulta": {
    "lugar": "string",
    "variable": "string",
    "tipoSeleccion": "string"
  },
  "datosClimaticos": {
    "serieTemporal": [],
    "estadisticas": {}
  },
  "estadoDatos": {
    "fechaDatos": "string",
    "tiempoReal": "boolean",
    "fuente": "string"
  }
}
```

**Limitaciones:**
- El usuario debe estar autenticado
- Se sobrescribe el _id del usuario con el del token JWT

---

##### DELETE /climate-data/:id/
Eliminar registro de datos climáticos.

**Headers Requeridos:**
```
Authorization: Bearer <token_jwt>
```

**Permisos:**
- Solo el dueño del registro o un admin pueden eliminar
- Retorna 403 si no tiene permisos

---

### 3. API de Administración

##### GET /users/
Listar todos los usuarios (solo admin).

**Headers Requeridos:**
```
Authorization: Bearer <token_jwt>
```

**Permisos:** Solo usuarios con `role: "admin"`

---

##### PUT /users/:id/
Actualizar usuario por ID (solo admin).

**Headers Requeridos:**
```
Authorization: Bearer <token_jwt>
```

**Permisos:** Solo usuarios con `role: "admin"`

---

##### DELETE /users/:id/
Eliminar usuario (solo admin).

**Headers Requeridos:**
```
Authorization: Bearer <token_jwt>
```

**Permisos:** Solo usuarios con `role: "admin"`

---

## APIs Externas de Clima

### 1. OpenWeatherMap

#### Descripción
API para capas climáticas en tiempo real (temperatura, precipitación, vientos, etc.)

#### Base URL
```
https://tile.openweathermap.org/map/
```

#### Endpoint de Tiles
```
https://tile.openweathermap.org/map/{layer}/{z}/{x}/{y}.png?appid={API_KEY}
```

#### Parámetros
- `layer`: Capa climática (temp_new, precipitation_new, wind_new, clouds_new)
- `z`: Nivel de zoom
- `x`, `y`: Coordenadas del tile
- `appid`: API Key (almacenada en `REACT_APP_OWM_KEY`)

#### Capas Disponibles
```javascript
{
  'temp_new': 'Temperatura',
  'precipitation_new': 'Precipitación',
  'wind_new': 'Viento',
  'clouds_new': 'Nubes',
  'pressure_new': 'Presión'
}
```

#### Limitaciones
- **Plan Gratuito**: 60 llamadas/minuto, 1,000,000 llamadas/mes
- **Resolución**: Tiles de 256x256 píxeles
- **Actualización**: Cada 3 horas
- **Cobertura**: Global

#### Configuración
```javascript
// .env
REACT_APP_OWM_KEY=tu_api_key_aqui
```

#### Ejemplo de Uso
```javascript
const layer = L.tileLayer(
  `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${API_KEY}`,
  {
    attribution: 'Weather data © OpenWeatherMap',
    maxZoom: 18,
    opacity: 0.5
  }
);
```

#### Manejo de Errores
```javascript
layer.on('tileerror', function(error) {
  console.warn('Error cargando tile de OpenWeatherMap:', error);
  // Mostrar capa alternativa o mensaje al usuario
});
```

---

### 2. NASA GIBS (Global Imagery Browse Services)

#### Descripción
Servicio de imágenes satelitales de la NASA para datos históricos y en tiempo casi real.

#### Base URL
```
https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/
```

#### Endpoint de Tiles (WMTS)
```
https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/{LAYER}/default/{TIME}/{TILE_MATRIX_SET}/{z}/{y}/{x}.{FORMAT}
```

#### Parámetros
- `LAYER`: Nombre de la capa (ej: MODIS_Terra_CorrectedReflectance_TrueColor)
- `TIME`: Fecha en formato YYYY-MM-DD
- `TILE_MATRIX_SET`: Matriz de tiles (GoogleMapsCompatible_Level9)
- `z`, `y`, `x`: Coordenadas del tile
- `FORMAT`: Formato de imagen (png, jpg)

#### Capas Principales Usadas

**1. Temperatura Superficial del Mar (SST)**
```javascript
{
  layer: 'GHRSST_L4_MUR_Sea_Surface_Temperature',
  format: 'png',
  tileMatrixSet: 'GoogleMapsCompatible_Level7',
  temporal: true,
  description: 'Temperatura de la superficie del mar'
}
```

**2. Precipitación (GPM)**
```javascript
{
  layer: 'GPM_3IMERGHH_V07B_Precipitation',
  format: 'png',
  tileMatrixSet: 'GoogleMapsCompatible_Level9',
  temporal: true,
  description: 'Precipitación global cada 30 minutos'
}
```

**3. Índice de Vegetación (NDVI)**
```javascript
{
  layer: 'MODIS_Terra_NDVI_8Day',
  format: 'png',
  tileMatrixSet: 'GoogleMapsCompatible_Level9',
  temporal: true,
  description: 'Índice de vegetación cada 8 días'
}
```

#### Limitaciones
- **Sin límite de llamadas** (servicio público)
- **Datos históricos**: Disponibles desde 2000 según la capa
- **Actualización**: Variable según la capa (30 min a 8 días)
- **Formato de fecha**: Estricto YYYY-MM-DD
- **Sin autenticación requerida**

#### Ejemplo de Uso
```javascript
const gibsLayer = L.tileLayer(
  `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/2025-01-15/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
  {
    attribution: 'NASA EOSDIS GIBS',
    maxZoom: 9,
    tileSize: 256
  }
);
```

#### Manejo de Fechas
```javascript
// Función para formatear fecha para GIBS
const formatGIBSDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
```

---

### 3. Open-Meteo

#### Descripción
API gratuita de datos meteorológicos y climáticos históricos y de pronóstico.

#### Base URLs

**Forecast API (Pronóstico)**
```
https://api.open-meteo.com/v1/forecast
```

**Climate API (Datos Históricos)**
```
https://climate-api.open-meteo.com/v1/climate
```

#### Parámetros Principales

**Forecast API:**
```javascript
{
  latitude: number,      // Latitud (-90 a 90)
  longitude: number,     // Longitud (-180 a 180)
  start_date: string,    // Formato YYYY-MM-DD
  end_date: string,      // Formato YYYY-MM-DD
  daily: string,         // Variables separadas por coma
  timezone: string       // Zona horaria (ej: 'UTC', 'America/Bogota')
}
```

**Variables Disponibles (daily):**
- `temperature_2m_max`: Temperatura máxima a 2m
- `temperature_2m_min`: Temperatura mínima a 2m
- `temperature_2m_mean`: Temperatura media a 2m
- `precipitation_sum`: Precipitación total
- `rain_sum`: Lluvia total
- `snowfall_sum`: Nieve total
- `windspeed_10m_max`: Velocidad máxima del viento a 10m
- `et0_fao_evapotranspiration`: Evapotranspiración

#### Ejemplo de Llamada
```javascript
const url = `https://api.open-meteo.com/v1/forecast?` +
  `latitude=4.6097&longitude=-74.0817&` +
  `start_date=2025-01-01&end_date=2025-01-31&` +
  `daily=temperature_2m_max,temperature_2m_min,precipitation_sum&` +
  `timezone=America/Bogota`;

const response = await fetch(url);
const data = await response.json();
```

#### Respuesta Típica
```json
{
  "latitude": 4.6097,
  "longitude": -74.0817,
  "generationtime_ms": 0.123,
  "utc_offset_seconds": -18000,
  "timezone": "America/Bogota",
  "daily_units": {
    "time": "iso8601",
    "temperature_2m_max": "°C",
    "temperature_2m_min": "°C",
    "precipitation_sum": "mm"
  },
  "daily": {
    "time": ["2025-01-01", "2025-01-02", ...],
    "temperature_2m_max": [24.5, 25.1, ...],
    "temperature_2m_min": [14.2, 15.0, ...],
    "precipitation_sum": [0.0, 2.5, ...]
  }
}
```

#### Limitaciones
- **Sin API Key requerida**
- **Límite de llamadas**: 10,000 por día (uso personal gratuito)
- **Sin límite comercial**: Planes de pago disponibles
- **Rango de fechas**: Máximo 92 días en una llamada
- **Datos históricos**: Desde 1940 (depende de la variable)
- **Resolución temporal**: Horaria o diaria

#### Climate API (Datos Históricos)
```javascript
const climateUrl = `https://climate-api.open-meteo.com/v1/climate?` +
  `latitude=${lat}&longitude=${lon}&` +
  `start_date=1991-01-01&end_date=2020-12-31&` +
  `models=CMCC_CM2_VHR4&` +
  `daily=precipitation_sum`;
```

**Modelos Disponibles:**
- `CMCC_CM2_VHR4`: Alta resolución
- `FGOALS_f3_H`: Modelo chino
- `HiRAM_SIT_HR`: Modelo NOAA
- `MRI_AGCM3_2_S`: Modelo japonés
- `EC_Earth3P_HR`: Modelo europeo

---

## Configuración y Claves

### Variables de Entorno (.env)

```env
# OpenWeatherMap API Key
REACT_APP_OWM_KEY=d2f1e6e2af677293a7fc4e832214a09c

# Clave de encriptación (debe coincidir con backend)
REACT_APP_ENCRYPTION_KEY=ClimetricaSecretKey2024

# URL del backend (opcional, default: http://localhost:8000)
REACT_APP_API_BASE_URL=http://localhost:8000
```

### Obtención de API Keys

**OpenWeatherMap:**
1. Crear cuenta en https://openweathermap.org/
2. Ir a API Keys en el dashboard
3. Copiar la clave predeterminada o crear una nueva
4. Agregar a `.env` como `REACT_APP_OWM_KEY`

**NASA GIBS:**
- No requiere API Key
- Servicio público sin autenticación

**Open-Meteo:**
- No requiere API Key para uso personal
- Para uso comercial: https://open-meteo.com/en/pricing

---

## Limitaciones y Cuotas

### Resumen de Límites

| API | Límite Gratuito | Requiere Key | Costo |
|-----|-----------------|--------------|-------|
| OpenWeatherMap | 1M llamadas/mes, 60/min | Sí | Gratis/$0 |
| NASA GIBS | Ilimitado | No | Gratis |
| Open-Meteo | 10K llamadas/día | No | Gratis |
| Backend Propio | Según servidor | No (JWT) | N/A |

### Recomendaciones

1. **Caché de Datos:**
   ```javascript
   // Guardar en localStorage para evitar llamadas repetidas
   const cachedData = localStorage.getItem(`weather_${lat}_${lon}_${date}`);
   if (cachedData) {
     return JSON.parse(cachedData);
   }
   ```

2. **Debounce en Búsquedas:**
   ```javascript
   const debouncedSearch = useDebounce(searchQuery, 500);
   ```

3. **Manejo de Errores por Límite:**
   ```javascript
   if (error.response?.status === 429) {
     alert('Límite de llamadas excedido. Intenta más tarde.');
   }
   ```

---

## Manejo de Errores

### Estrategia General

```javascript
try {
  const response = await API.get('/endpoint');
  return response.data;
} catch (error) {
  // Usar el manejador centralizado
  const errorMessage = handleAPIError(error, 'descripción de operación');

  // Mostrar al usuario
  setError(errorMessage);

  // Log para debugging
  console.error('Error detallado:', error.response?.data || error.message);
}
```

### Errores Comunes

**1. CORS Error**
```
Access to fetch at 'API_URL' from origin 'http://localhost:3000' has been blocked by CORS policy
```
**Solución:** Configurar CORS en el backend Django

**2. Network Error**
```
Network Error
```
**Solución:** Verificar que el backend esté corriendo, revisar URL

**3. 401 Unauthorized**
```
{error: "Token inválido o expirado"}
```
**Solución:** Renovar sesión, redirigir a login

**4. 429 Too Many Requests**
```
Rate limit exceeded
```
**Solución:** Implementar caché, reducir frecuencia de llamadas

---

## Mejores Prácticas

1. ✅ **Siempre validar respuestas**
   ```javascript
   if (response.data && Array.isArray(response.data.daily.time)) {
     // Procesar datos
   }
   ```

2. ✅ **Usar try/catch en todas las llamadas async**

3. ✅ **Implementar timeouts**
   ```javascript
   axios.create({
     timeout: 10000 // 10 segundos
   });
   ```

4. ✅ **Caché de datos costosos**

5. ✅ **Feedback visual durante carga**
   ```javascript
   setLoading(true);
   try {
     // API call
   } finally {
     setLoading(false);
   }
   ```

---

## Actualización

- **Última actualización:** Diciembre 5, 2025
- **Mantenedor:** Sistema Climétrica
- **Revisión:** Recomendada cada 3 meses

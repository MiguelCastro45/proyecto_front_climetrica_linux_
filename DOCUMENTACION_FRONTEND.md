# Documentación Frontend - Sistema Climétrica

## Tabla de Contenidos

1. [Descripción General](#descripción-general)
2. [Arquitectura](#arquitectura)
3. [Componentes](#componentes)
4. [Páginas](#páginas)
5. [Servicios API](#servicios-api)
6. [Estilos](#estilos)
7. [Configuración](#configuración)
8. [Características](#características)

---

## Descripción General

El frontend de Climétrica está construido con **React 19** y proporciona una interfaz web moderna y responsive para el monitoreo y análisis de datos climáticos.

### Tecnologías Principales

- **Framework**: React 19.2.0
- **Routing**: React Router DOM 7.9.4
- **Mapas**: Leaflet 1.9.4 + React Leaflet 5.0.0
- **Gráficos**: Chart.js 4.5.1 + React Chart.js 2 + Recharts 3.3.0
- **HTTP Client**: Axios 1.12.2
- **PDF Export**: jsPDF 3.0.3
- **Encriptación**: crypto-js 4.2.0
- **Estilos**: Tailwind CSS 4.1.16 + CSS Modules

---

## Arquitectura

### Estructura de Directorios

```
frontend/
├── public/
│   ├── iconos/              # Iconos de la aplicación
│   ├── index.html           # HTML principal
│   └── manifest.json        # PWA manifest
│
├── src/
│   ├── api/                 # Servicios de API
│   │   ├── api.js           # Cliente Axios configurado
│   │   ├── climateAPI.js    # API de datos climáticos
│   │   ├── groqCropAI.js    # Integración IA (Groq)
│   │   └── Save_climate_data_helper.js
│   │
│   ├── components/          # Componentes reutilizables
│   │   ├── AdminCrops.jsx   # Admin: gestión de cultivos
│   │   ├── AdminUsers.jsx   # Admin: gestión de usuarios
│   │   ├── AdminVariables.jsx # Admin: gestión de variables
│   │   └── AnimatedLayer.jsx  # Capas animadas del mapa
│   │
│   ├── pages/               # Páginas principales
│   │   ├── AdminDashboard.jsx    # Dashboard administrativo
│   │   ├── ClimateDashboard.jsx  # Dashboard climático
│   │   ├── ForgotPassword.jsx    # Recuperación de contraseña
│   │   ├── Login.jsx            # Inicio de sesión
│   │   ├── PolygonDrawer.jsx    # Dibujador de polígonos
│   │   ├── Register.jsx         # Registro de usuarios
│   │   ├── UserMapDashboard.jsx # Dashboard de usuario
│   │   └── UserPanel.jsx        # Panel de usuario
│   │
│   ├── styles/              # Archivos CSS
│   │   ├── ClimateDashboard.module.css
│   │   ├── ForgotPassword.css
│   │   ├── Login.css
│   │   ├── register.css
│   │   ├── UserMapDashboard.css
│   │   └── UserPanel.css
│   │
│   ├── utils/               # Utilidades
│   │   └── errorHandler.js  # Manejo de errores
│   │
│   ├── App.js               # Componente principal
│   ├── index.js             # Punto de entrada
│   └── reportWebVitals.js   # Métricas de rendimiento
│
├── .env                     # Variables de entorno
├── package.json             # Dependencias npm
├── tailwind.config.js       # Configuración Tailwind
└── postcss.config.js        # Configuración PostCSS
```

---

## Componentes

### AnimatedLayer.jsx

Componente para renderizar capas animadas en el mapa Leaflet con series temporales.

**Props**:
```javascript
{
  variable: {
    nombre: String,
    clave: String,
    capa_mapa: {
      tipo: String,      // "wmts" | "wms" | "tile"
      url: String,
      capas: String,
      formato: String,
      transparente: Boolean
    }
  },
  timeRange: {
    start: Date,
    end: Date
  },
  isPlaying: Boolean,
  speed: Number,
  onTimeChange: Function
}
```

**Características**:
- Soporte para capas WMTS, WMS y Tile
- Animación temporal automática
- Control de velocidad de animación
- Actualización dinámica de capas

**Uso**:
```jsx
import AnimatedLayer from '../components/AnimatedLayer';

<AnimatedLayer
  variable={selectedVariable}
  timeRange={{ start: startDate, end: endDate }}
  isPlaying={isAnimating}
  speed={animationSpeed}
  onTimeChange={(time) => setCurrentTime(time)}
/>
```

---

### AdminUsers.jsx

Componente para gestión administrativa de usuarios.

**Características**:
- Listar todos los usuarios
- Editar información de usuario
- Cambiar roles (admin/productor)
- Cambiar estado (activo/inactivo)
- Eliminar usuarios
- Búsqueda y filtrado
- Paginación

**Estado**:
```javascript
{
  users: Array,
  loading: Boolean,
  error: String,
  editingUser: Object,
  searchTerm: String,
  currentPage: Number,
  usersPerPage: Number
}
```

**Funciones principales**:
```javascript
fetchUsers()           // Obtener lista de usuarios
handleEdit(user)       // Editar usuario
handleDelete(userId)   // Eliminar usuario
handleSearch(term)     // Buscar usuarios
handlePageChange(page) // Cambiar página
```

---

### AdminVariables.jsx

Componente para gestión de variables climáticas.

**Características**:
- CRUD completo de variables
- Configuración de APIs
- Configuración de capas de mapa
- Activar/desactivar variables
- Ordenamiento de variables
- Preview de configuración

**Campos de Variable**:
```javascript
{
  nombre: String,              // Nombre descriptivo
  clave: String,               // ID único
  descripcion: String,         // Descripción
  categoria: String,           // meteorologica/oceanica/agricola
  unidad: String,              // Unidad de medida
  icono: String,               // Nombre del icono
  activa: Boolean,             // Estado
  orden: Number,               // Orden de visualización
  api_config: {                // Config API
    provider: String,
    endpoint: String,
    parametro: String,
    transformacion: String
  },
  capa_mapa: {                 // Config capa
    tipo: String,
    url: String,
    capas: String,
    formato: String,
    transparente: Boolean
  }
}
```

---

### AdminCrops.jsx

Componente para gestión de cultivos.

**Características**:
- CRUD de cultivos
- Definición de requerimientos climáticos
- Análisis de aptitud con IA
- Gestión de imágenes
- Activar/desactivar cultivos

**Campos de Cultivo**:
```javascript
{
  nombre: String,
  nombre_cientifico: String,
  descripcion: String,
  requerimientos: {
    temperatura_min: Number,
    temperatura_max: Number,
    temperatura_optima: Number,
    precipitacion_min: Number,
    precipitacion_max: Number,
    altitud_min: Number,
    altitud_max: Number,
    humedad_min: Number,
    humedad_max: Number
  },
  imagen_url: String,
  activo: Boolean
}
```

---

## Páginas

### Login.jsx

Página de inicio de sesión con encriptación de credenciales.

**Características**:
- Encriptación AES de email y contraseña
- Validación de campos
- Recordar usuario
- Autocompletado de dominio de email
- Mensajes de error amigables
- Redirección según rol

**Flujo**:
1. Usuario ingresa email y contraseña
2. Datos se encriptan con crypto-js
3. Se envían al backend
4. Backend desencripta y valida
5. Retorna JWT token
6. Token se guarda en localStorage
7. Redirección a dashboard según rol

**Código**:
```jsx
const handleSubmit = async (e) => {
  e.preventDefault();

  // Encriptar credenciales
  const encryptedEmail = CryptoJS.AES.encrypt(
    email,
    process.env.REACT_APP_ENCRYPTION_KEY
  ).toString();

  const encryptedPassword = CryptoJS.AES.encrypt(
    password,
    process.env.REACT_APP_ENCRYPTION_KEY
  ).toString();

  // Enviar al backend
  const response = await api.post('/api/login/', {
    email: encryptedEmail,
    password: encryptedPassword
  });

  // Guardar token
  localStorage.setItem('token', response.data.token);
  localStorage.setItem('user', JSON.stringify(response.data.user));

  // Redireccionar
  if (response.data.user.role === 'admin') {
    navigate('/admin');
  } else {
    navigate('/user');
  }
};
```

---

### Register.jsx

Página de registro de nuevos usuarios.

**Características**:
- Formulario completo de registro
- Validación de campos en tiempo real
- Encriptación de datos sensibles
- Verificación de unicidad de email
- Validación de contraseña fuerte
- Confirmación de contraseña

**Validaciones**:
```javascript
{
  first_name: required, min 2 chars,
  last_name: required, min 2 chars,
  email: required, valid email, unique,
  phone: required, 10 digits,
  identification: required, unique,
  password: required, min 8 chars, 1 uppercase, 1 number, 1 special,
  confirmPassword: match password
}
```

---

### ForgotPassword.jsx

Página de recuperación de contraseña.

**Características**:
- Verificación de email
- Envío de correo de recuperación
- Cambio de contraseña
- Validación de nueva contraseña

**Flujo**:
1. Usuario ingresa email
2. Sistema verifica si existe
3. Se envía correo con link/código
4. Usuario ingresa nueva contraseña
5. Contraseña se actualiza
6. Redirección a login

---

### UserPanel.jsx

Panel principal del usuario productor.

**Características**:
- Información del perfil
- Edición de datos personales
- Visualización de avatar
- Estadísticas de uso
- Acceso rápido a funciones
- Cerrar sesión

**Secciones**:
```javascript
{
  perfil: {
    avatar: Image,
    nombre: String,
    email: String,
    rol: String
  },
  estadisticas: {
    consultasRealizadas: Number,
    cultivosAnalizados: Number,
    registrosGuardados: Number
  },
  accionesRapidas: [
    'Nueva Consulta',
    'Ver Historial',
    'Analizar Cultivo',
    'Exportar Datos'
  ]
}
```

---

### UserMapDashboard.jsx

Dashboard principal con mapa interactivo y análisis climático.

**Características**:
- Mapa Leaflet interactivo
- Múltiples capas climáticas
- Selector de variables
- Selector de cultivos
- Búsqueda de lugares
- Selección por punto o polígono
- Gráficos de series temporales
- Estadísticas calculadas
- Exportación JSON/PDF
- Análisis con IA
- Guardado de consultas

**Estado principal**:
```javascript
{
  // Mapa
  center: [lat, lng],
  zoom: Number,
  layers: Array,

  // Selección
  selectedVariable: Object,
  selectedCrop: Object,
  selectedLocation: String,
  selectionType: 'point' | 'polygon',
  coordinates: Object | Array,

  // Datos
  climateData: {
    serieTemporal: Array,
    estadisticas: Object,
    zona: String
  },

  // UI
  isLoading: Boolean,
  showGraphs: Boolean,
  showCropAnalysis: Boolean,
  animationPlaying: Boolean
}
```

**Funciones principales**:
```javascript
handleLocationSearch(place)      // Buscar lugar
handleVariableSelect(variable)   // Seleccionar variable
handleCropSelect(crop)           // Seleccionar cultivo
handlePointSelect(latlng)        // Seleccionar punto
handlePolygonComplete(polygon)   // Completar polígono
fetchClimateData()               // Obtener datos climáticos
analyzeCrop()                    // Analizar cultivo con IA
saveData()                       // Guardar consulta
exportJSON()                     // Exportar a JSON
exportPDF()                      // Exportar a PDF
```

**Integración con APIs**:
```javascript
// OpenWeatherMap
const weatherData = await fetchWeatherData(lat, lon);

// NASA POWER
const solarData = await fetchNASAPowerData(lat, lon, 'ALLSKY_SFC_SW_DWN');

// Open-Meteo
const climateData = await fetchOpenMeteoData(lat, lon, variables);
```

---

### ClimateDashboard.jsx

Dashboard especializado para análisis climático avanzado.

**Características**:
- Visualización avanzada de datos
- Comparación de variables
- Análisis de tendencias
- Pronósticos
- Alertas climáticas
- Mapas de calor
- Exportación de informes

---

### AdminDashboard.jsx

Dashboard administrativo del sistema.

**Características**:
- Gestión de usuarios (AdminUsers)
- Gestión de variables (AdminVariables)
- Gestión de cultivos (AdminCrops)
- Estadísticas del sistema
- Logs y auditoría
- Configuración global

**Tabs**:
```jsx
<Tabs>
  <Tab label="Usuarios">
    <AdminUsers />
  </Tab>
  <Tab label="Variables">
    <AdminVariables />
  </Tab>
  <Tab label="Cultivos">
    <AdminCrops />
  </Tab>
  <Tab label="Estadísticas">
    <SystemStats />
  </Tab>
</Tabs>
```

---

## Servicios API

### api.js

Cliente Axios configurado con interceptores.

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor de request - agregar token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de response - manejo de errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

### climateAPI.js

Servicios para datos climáticos de múltiples proveedores.

**Funciones**:

```javascript
/**
 * OpenWeatherMap API
 */
export const fetchCurrentWeather = async (lat, lon) => {
  const response = await axios.get(
    `https://api.openweathermap.org/data/2.5/weather`,
    {
      params: {
        lat,
        lon,
        appid: process.env.REACT_APP_OWM_KEY,
        units: 'metric'
      }
    }
  );
  return response.data;
};

/**
 * NASA POWER API
 */
export const fetchNASAPowerData = async (lat, lon, parameters, start, end) => {
  const response = await axios.get(
    `https://power.larc.nasa.gov/api/temporal/daily/point`,
    {
      params: {
        parameters,
        community: 'AG',
        longitude: lon,
        latitude: lat,
        start: start.format('YYYYMMDD'),
        end: end.format('YYYYMMDD'),
        format: 'JSON'
      }
    }
  );
  return response.data;
};

/**
 * Open-Meteo API
 */
export const fetchOpenMeteoData = async (lat, lon, variables) => {
  const response = await axios.get(
    `https://api.open-meteo.com/v1/forecast`,
    {
      params: {
        latitude: lat,
        longitude: lon,
        hourly: variables.join(','),
        timezone: 'auto'
      }
    }
  );
  return response.data;
};

/**
 * Procesar datos para gráficos
 */
export const processTimeSeriesData = (data, variable) => {
  return Object.entries(data.properties.parameter[variable]).map(
    ([date, value]) => ({
      date,
      value: parseFloat(value)
    })
  );
};

/**
 * Calcular estadísticas
 */
export const calculateStatistics = (timeSeries) => {
  const values = timeSeries.map(d => d.value);

  return {
    promedio: values.reduce((a, b) => a + b, 0) / values.length,
    maximo: Math.max(...values),
    minimo: Math.min(...values),
    desviacion: calculateStdDev(values)
  };
};
```

---

### groqCropAI.js

Integración con IA (Groq) para análisis de cultivos.

```javascript
import axios from 'axios';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY;

/**
 * Analizar aptitud de cultivo con IA
 */
export const analyzeCropSuitability = async (cropData, climateData, location) => {
  const prompt = `
Analiza la aptitud del cultivo ${cropData.nombre} (${cropData.nombre_cientifico})
en la ubicación ${location} con las siguientes condiciones climáticas:

REQUERIMIENTOS DEL CULTIVO:
- Temperatura óptima: ${cropData.requerimientos.temperatura_optima}°C
- Rango temperatura: ${cropData.requerimientos.temperatura_min}°C - ${cropData.requerimientos.temperatura_max}°C
- Precipitación: ${cropData.requerimientos.precipitacion_min}-${cropData.requerimientos.precipitacion_max} mm/año
- Altitud: ${cropData.requerimientos.altitud_min}-${cropData.requerimientos.altitud_max} m.s.n.m.
- Humedad: ${cropData.requerimientos.humedad_min}-${cropData.requerimientos.humedad_max}%

CONDICIONES ACTUALES:
- Temperatura promedio: ${climateData.temperatura}°C
- Precipitación anual: ${climateData.precipitacion} mm
- Altitud: ${climateData.altitud} m.s.n.m.
- Humedad: ${climateData.humedad}%

Proporciona:
1. Nivel de aptitud (Excelente/Bueno/Regular/Inadecuado)
2. Score numérico de 0-100
3. Recomendaciones específicas (3-5 puntos)
4. Riesgos identificados (2-4 puntos)
5. Mejores prácticas para esta zona
`;

  const response = await axios.post(
    GROQ_API_URL,
    {
      model: 'mixtral-8x7b-32768',
      messages: [
        {
          role: 'system',
          content: 'Eres un experto agrónomo especializado en análisis de aptitud de cultivos.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    },
    {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return parseAIResponse(response.data.choices[0].message.content);
};

/**
 * Parsear respuesta de IA
 */
const parseAIResponse = (text) => {
  // Extraer información estructurada
  return {
    aptitud: extractAptitud(text),
    score: extractScore(text),
    recomendaciones: extractList(text, 'recomendaciones'),
    riesgos: extractList(text, 'riesgos'),
    mejoresPracticas: extractList(text, 'mejores prácticas')
  };
};
```

---

### Save_climate_data_helper.js

Helper para guardar datos climáticos.

```javascript
import api from './api';

/**
 * Guardar consulta climática
 */
export const saveClimateData = async (data) => {
  const user = JSON.parse(localStorage.getItem('user'));

  const payload = {
    usuario: {
      _id: user._id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email
    },
    consulta: data.consulta,
    datosClimaticos: data.datosClimaticos,
    estadoDatos: {
      fechaDatos: new Date().toISOString(),
      tiempoReal: data.tiempoReal || false,
      fuente: data.fuente,
      apiUtilizada: data.apiUtilizada
    },
    createdAt: new Date().toISOString()
  };

  const response = await api.post('/api/climate-data/save/', payload);
  return response.data;
};

/**
 * Obtener historial de consultas
 */
export const getClimateHistory = async (userId) => {
  const response = await api.get('/api/climate-data/', {
    params: { usuario_id: userId }
  });
  return response.data;
};

/**
 * Eliminar consulta
 */
export const deleteClimateData = async (dataId) => {
  const response = await api.delete(`/api/climate-data/${dataId}/`);
  return response.data;
};
```

---

## Estilos

### Sistema de Estilos

El proyecto usa una combinación de:
- **Tailwind CSS**: Utilidades y diseño responsive
- **CSS Modules**: Estilos específicos de componentes
- **CSS Global**: Estilos base y variables

### Tailwind Configuration

```javascript
// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e3f2fd',
          500: '#2196f3',
          700: '#1976d2',
        },
        secondary: {
          500: '#4caf50',
        }
      },
      spacing: {
        '128': '32rem',
      }
    },
  },
  plugins: [],
}
```

### Variables CSS

```css
:root {
  --primary-color: #2196f3;
  --secondary-color: #4caf50;
  --danger-color: #f44336;
  --warning-color: #ff9800;
  --success-color: #4caf50;

  --text-primary: #212121;
  --text-secondary: #757575;
  --divider: #bdbdbd;

  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;

  --border-radius: 8px;
  --box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
```

---

## Configuración

### Variables de Entorno (.env)

```env
# API Backend
REACT_APP_API_URL=http://localhost:8000

# APIs Externas
REACT_APP_OWM_KEY=tu_api_key_openweathermap
REACT_APP_GROQ_API_KEY=tu_api_key_groq

# Encriptación
REACT_APP_ENCRYPTION_KEY=tu_clave_de_encriptacion_compartida_con_backend

# Configuración de Mapa
REACT_APP_MAP_DEFAULT_CENTER_LAT=4.6097
REACT_APP_MAP_DEFAULT_CENTER_LNG=-74.0817
REACT_APP_MAP_DEFAULT_ZOOM=12

# Feature Flags
REACT_APP_ENABLE_AI_ANALYSIS=true
REACT_APP_ENABLE_PDF_EXPORT=true
```

### package.json - Scripts

```json
{
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject",
    "lint": "eslint src/",
    "format": "prettier --write src/"
  }
}
```

---

## Características

### Mapas Interactivos

**Leaflet con React Leaflet**:
```jsx
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

<MapContainer center={[4.6, -74.08]} zoom={12}>
  <TileLayer
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    attribution='&copy; OpenStreetMap contributors'
  />
  <Marker position={[4.6, -74.08]}>
    <Popup>Bogotá, Colombia</Popup>
  </Marker>
</MapContainer>
```

**Capas Climáticas**:
- Temperatura
- Precipitación
- Nubes
- Viento
- Presión
- Humedad

---

### Gráficos

**Chart.js**:
```jsx
import { Line } from 'react-chartjs-2';

<Line
  data={{
    labels: dates,
    datasets: [{
      label: 'Temperatura (°C)',
      data: temperatures,
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.1
    }]
  }}
  options={{
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Serie Temporal' }
    }
  }}
/>
```

---

### Exportación PDF

**jsPDF + html2canvas**:
```javascript
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const exportPDF = async () => {
  const element = document.getElementById('dashboard');
  const canvas = await html2canvas(element);
  const imgData = canvas.toDataURL('image/png');

  const pdf = new jsPDF('p', 'mm', 'a4');
  pdf.addImage(imgData, 'PNG', 10, 10, 190, 0);
  pdf.save('reporte-climatico.pdf');
};
```

---

### Encriptación

**CryptoJS**:
```javascript
import CryptoJS from 'crypto-js';

const key = process.env.REACT_APP_ENCRYPTION_KEY;

// Encriptar
const encrypted = CryptoJS.AES.encrypt(data, key).toString();

// Desencriptar
const decrypted = CryptoJS.AES.decrypt(encrypted, key)
  .toString(CryptoJS.enc.Utf8);
```

---

## Flujos Principales

### Flujo de Consulta Climática

1. Usuario selecciona variable climática
2. Usuario selecciona ubicación (búsqueda o click en mapa)
3. Usuario elige tipo de selección (punto o polígono)
4. Sistema obtiene coordenadas
5. Sistema consulta API correspondiente
6. Sistema procesa y formatea datos
7. Sistema muestra datos en gráficos
8. Sistema calcula estadísticas
9. Usuario puede guardar/exportar

### Flujo de Análisis de Cultivo

1. Usuario selecciona cultivo
2. Usuario selecciona ubicación
3. Sistema obtiene datos climáticos de la zona
4. Sistema consulta requerimientos del cultivo
5. Sistema envía datos a IA (Groq)
6. IA analiza y genera recomendaciones
7. Sistema muestra resultados
8. Usuario puede guardar análisis

---

## Testing

### Jest + React Testing Library

```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import Login from './pages/Login';

test('renders login form', () => {
  render(<Login />);
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
});

test('submits login form', async () => {
  render(<Login />);

  fireEvent.change(screen.getByLabelText(/email/i), {
    target: { value: 'test@example.com' }
  });

  fireEvent.change(screen.getByLabelText(/contraseña/i), {
    target: { value: 'password123' }
  });

  fireEvent.click(screen.getByText(/iniciar sesión/i));

  // Assertions...
});
```

---

## Build y Deployment

### Build de Producción

```bash
npm run build
```

Genera carpeta `build/` con archivos optimizados.

### Deployment en Netlify/Vercel

```bash
# Netlify
netlify deploy --prod

# Vercel
vercel --prod
```

### Variables de Entorno en Producción

Configurar en el panel de hosting:
- `REACT_APP_API_URL`
- `REACT_APP_OWM_KEY`
- `REACT_APP_GROQ_API_KEY`
- `REACT_APP_ENCRYPTION_KEY`

---

## Performance

### Optimizaciones Implementadas

1. **Code Splitting**: Rutas cargadas dinámicamente
2. **Lazy Loading**: Componentes pesados cargados bajo demanda
3. **Memoization**: React.memo en componentes
4. **Debouncing**: En búsquedas y filtros
5. **Image Optimization**: Lazy loading de imágenes
6. **Bundle Analysis**: Análisis de tamaño de bundles

---

## Autor

Sistema de Monitoreo Climático - Climétrica

## Fecha

Diciembre 2025

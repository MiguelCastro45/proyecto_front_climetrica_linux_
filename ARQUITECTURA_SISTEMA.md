# Arquitectura del Sistema - Climétrica

## Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Arquitectura de Alto Nivel](#arquitectura-de-alto-nivel)
3. [Componentes del Sistema](#componentes-del-sistema)
4. [Flujo de Datos](#flujo-de-datos)
5. [Integraciones Externas](#integraciones-externas)
6. [Seguridad](#seguridad)
7. [Escalabilidad](#escalabilidad)
8. [Diagramas](#diagramas)

---

## Visión General

Climétrica es un sistema web de monitoreo climático diseñado con una arquitectura de **cliente-servidor** moderna, utilizando tecnologías web estándar y servicios en la nube para proporcionar datos climáticos en tiempo real y análisis agroclimáticos.

### Características Arquitectónicas Principales

- **Arquitectura de 3 capas**: Presentación, Lógica de Negocio, Datos
- **API RESTful**: Comunicación stateless entre cliente y servidor
- **Single Page Application (SPA)**: Frontend React con routing del lado del cliente
- **Base de datos NoSQL**: MongoDB para flexibilidad y escalabilidad
- **Microservicios externos**: Integración con múltiples APIs climáticas
- **Autenticación basada en tokens**: JWT para sesiones stateless

---

## Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────┐
│                        USUARIOS                              │
│          (Productores Agrícolas / Administradores)          │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                   CAPA DE PRESENTACIÓN                       │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │         React 19 SPA (Frontend)                    │    │
│  │  ┌──────────────┐  ┌──────────────┐              │    │
│  │  │   Páginas    │  │ Componentes  │              │    │
│  │  └──────────────┘  └──────────────┘              │    │
│  │  ┌──────────────┐  ┌──────────────┐              │    │
│  │  │  Servicios   │  │   Estilos    │              │    │
│  │  │  API         │  │   CSS/Tailw  │              │    │
│  │  └──────────────┘  └──────────────┘              │    │
│  └────────────────────────────────────────────────────┘    │
│                           │                                  │
│                           │ HTTP/JSON                        │
│                           │ JWT Token                        │
└───────────────────────────┼──────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────┐
│                  CAPA DE LÓGICA DE NEGOCIO                    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         Django 4.2 API (Backend)                    │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │    │
│  │  │ Autenticación│  │  Validación  │  │   CORS   │ │    │
│  │  │ JWT/bcrypt   │  │  Datos       │  │  Config  │ │    │
│  │  └──────────────┘  └──────────────┘  └──────────┘ │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │    │
│  │  │  Endpoints   │  │  Servicios   │  │ Utilid.  │ │    │
│  │  │  REST API    │  │  Email/IA    │  │ Crypto   │ │    │
│  │  └──────────────┘  └──────────────┘  └──────────┘ │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                   │
│                           │ MongoDB Driver                    │
│                           │ (PyMongo)                         │
└───────────────────────────┼───────────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────────┐
│                     CAPA DE DATOS                             │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │            MongoDB 6.0 (NoSQL)                      │    │
│  │  ┌──────────────┐  ┌──────────────┐               │    │
│  │  │    users     │  │    crops     │               │    │
│  │  └──────────────┘  └──────────────┘               │    │
│  │  ┌──────────────┐  ┌──────────────┐               │    │
│  │  │climate_data  │  │  dashboard   │               │    │
│  │  │              │  │  _variables  │               │    │
│  │  └──────────────┘  └──────────────┘               │    │
│  └─────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│                 SERVICIOS EXTERNOS (APIs)                     │
│  ┌──────────────┐ ┌──────────────┐ ┌───────────────────┐    │
│  │OpenWeatherMap│ │  NASA POWER  │ │   Open-Meteo      │    │
│  └──────────────┘ └──────────────┘ └───────────────────┘    │
│  ┌──────────────┐ ┌──────────────┐ ┌───────────────────┐    │
│  │    Groq AI   │ │  Leaflet     │ │  Nominatim        │    │
│  │   (Mixtral)  │ │  Tile Srv    │ │  (Geocoding)      │    │
│  └──────────────┘ └──────────────┘ └───────────────────┘    │
└───────────────────────────────────────────────────────────────┘
```

---

## Componentes del Sistema

### 1. Frontend (React SPA)

**Responsabilidades**:
- Renderizado de interfaz de usuario
- Gestión de estado de aplicación
- Validación de entrada del lado del cliente
- Encriptación de credenciales
- Comunicación con backend vía API REST
- Visualización de mapas y gráficos
- Exportación de datos (JSON, PDF)

**Tecnologías**:
- React 19.2.0
- React Router DOM 7.9.4
- Axios (HTTP client)
- Leaflet + React Leaflet (Mapas)
- Chart.js + Recharts (Gráficos)
- crypto-js (Encriptación cliente)
- jsPDF (Exportación PDF)
- Tailwind CSS (Estilos)

**Módulos principales**:
```
src/
├── pages/          # Vistas principales
├── components/     # Componentes reutilizables
├── api/           # Servicios de comunicación
├── utils/         # Utilidades
└── styles/        # Estilos
```

---

### 2. Backend (Django REST API)

**Responsabilidades**:
- Autenticación y autorización
- Validación de datos del lado del servidor
- Lógica de negocio
- Acceso a base de datos
- Servicios de email
- Integración con APIs externas (proxy)
- Logging y auditoría

**Tecnologías**:
- Django 4.2+
- Django REST Framework
- PyMongo (driver MongoDB)
- PyJWT (autenticación)
- bcrypt (hashing contraseñas)
- PyCryptodome (encriptación)
- Gunicorn (servidor WSGI)

**Módulos principales**:
```
api/
├── views.py          # Endpoints principales
├── admin_views.py    # Endpoints admin
├── public_views.py   # Endpoints públicos
├── auth_utils.py     # Utilidades autenticación
├── crypto_utils.py   # Encriptación/desencriptación
├── email_service.py  # Servicio de correo
├── decorators.py     # Decoradores personalizados
└── mongodb.py        # Conexión DB
```

---

### 3. Base de Datos (MongoDB)

**Responsabilidades**:
- Almacenamiento persistente de datos
- Indexación para búsquedas rápidas
- Integridad referencial
- Respaldo y recuperación

**Colecciones**:

#### users
```javascript
{
  _id, first_name, last_name, email,
  phone, identification, role, status,
  password_hash, created_at, updated_at
}
```
**Índices**: email (único), identification (único)

#### dashboard_variables
```javascript
{
  _id, nombre, clave, descripcion, activa,
  categoria, unidad, icono, orden,
  api_config { provider, endpoint, parametro },
  capa_mapa { tipo, url, capas, formato }
}
```
**Índices**: clave (único)

#### crops
```javascript
{
  _id, nombre, nombre_cientifico, descripcion,
  requerimientos { temperatura, precipitacion, altitud, humedad },
  imagen_url, activo
}
```

#### climate_data
```javascript
{
  _id, usuario { _id, email, nombre },
  consulta { lugar, variable, coordenadas, fechas },
  datosClimaticos { serieTemporal, estadisticas },
  estadoDatos { fuente, tiempoReal, apiUtilizada },
  createdAt
}
```
**Índices**: usuario._id

---

## Flujo de Datos

### 1. Autenticación (Login)

```
┌─────────┐                ┌─────────┐                ┌─────────┐
│ Cliente │                │ Backend │                │   DB    │
└────┬────┘                └────┬────┘                └────┬────┘
     │                          │                          │
     │ POST /api/login/         │                          │
     │ {email†, password†}      │                          │
     ├─────────────────────────>│                          │
     │                          │                          │
     │                          │ Desencriptar datos       │
     │                          │                          │
     │                          │ users.findOne({email})   │
     │                          ├─────────────────────────>│
     │                          │                          │
     │                          │      Usuario encontrado  │
     │                          │<─────────────────────────┤
     │                          │                          │
     │                          │ verify_password()        │
     │                          │                          │
     │                          │ generate_jwt_token()     │
     │                          │                          │
     │ 200 OK                   │                          │
     │ {token, user}            │                          │
     │<─────────────────────────┤                          │
     │                          │                          │
     │ Guardar token            │                          │
     │ localStorage             │                          │
     │                          │                          │

† = Datos encriptados AES
```

---

### 2. Consulta de Datos Climáticos

```
┌─────────┐         ┌─────────┐         ┌─────────┐         ┌─────────┐
│ Cliente │         │ Backend │         │   DB    │         │ API Ext │
└────┬────┘         └────┬────┘         └────┬────┘         └────┬────┘
     │                   │                   │                   │
     │ 1. Seleccionar    │                   │                   │
     │    variable +     │                   │                   │
     │    ubicación      │                   │                   │
     │                   │                   │                   │
     │ 2. GET /api/      │                   │                   │
     │    dashboard-     │                   │                   │
     │    variables/     │                   │                   │
     ├──────────────────>│                   │                   │
     │                   │ dashboard_        │                   │
     │                   │ variables.find()  │                   │
     │                   ├──────────────────>│                   │
     │                   │                   │                   │
     │                   │   Variables       │                   │
     │<──────────────────┤<──────────────────┤                   │
     │                   │                   │                   │
     │ 3. Consultar API  │                   │                   │
     │    climática      │                   │                   │
     │    directamente   │                   │                   │
     ├──────────────────────────────────────────────────────────>│
     │                   │                   │                   │
     │                   │                   │    Datos          │
     │<──────────────────────────────────────────────────────────┤
     │                   │                   │                   │
     │ 4. Procesar datos │                   │                   │
     │    (gráficos,     │                   │                   │
     │    estadísticas)  │                   │                   │
     │                   │                   │                   │
     │ 5. POST /api/     │                   │                   │
     │    climate-data/  │                   │                   │
     │    save/          │                   │                   │
     ├──────────────────>│                   │                   │
     │                   │                   │                   │
     │                   │ climate_data.     │                   │
     │                   │ insertOne()       │                   │
     │                   ├──────────────────>│                   │
     │                   │                   │                   │
     │  200 OK           │                   │                   │
     │<──────────────────┤                   │                   │
     │                   │                   │                   │
```

---

### 3. Análisis de Cultivo con IA

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ Cliente │    │ Backend │    │   DB    │    │ Groq AI │    │NASA/OWM │
└────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘
     │              │              │              │              │
     │ 1. Select    │              │              │              │
     │    cultivo   │              │              │              │
     │              │              │              │              │
     │ 2. GET /api/ │              │              │              │
     │    crops/    │              │              │              │
     ├─────────────>│              │              │              │
     │              │ crops.find() │              │              │
     │              ├─────────────>│              │              │
     │              │              │              │              │
     │    Cultivos  │              │              │              │
     │<─────────────┤<─────────────┤              │              │
     │              │              │              │              │
     │ 3. Obtener   │              │              │              │
     │    datos     │              │              │              │
     │    climáticos│              │              │              │
     ├───────────────────────────────────────────────────────────>│
     │              │              │              │              │
     │  Datos       │              │              │              │
     │  climáticos  │              │              │              │
     │<───────────────────────────────────────────────────────────┤
     │              │              │              │              │
     │ 4. Analizar  │              │              │              │
     │    con IA    │              │              │              │
     ├─────────────────────────────────────────────────────────>│
     │              │              │              │              │
     │  (Prompt:    │              │              │              │
     │   cultivo +  │              │              │              │
     │   clima +    │              │              │              │
     │   ubicación) │              │              │              │
     │              │              │              │              │
     │              │              │   Análisis   │              │
     │              │              │   (recomend, │              │
     │              │              │    riesgos,  │              │
     │              │              │    score)    │              │
     │<─────────────────────────────────────────────────────────┤
     │              │              │              │              │
     │ 5. Mostrar   │              │              │              │
     │    resultados│              │              │              │
     │              │              │              │              │
```

---

## Integraciones Externas

### APIs Climáticas

#### 1. OpenWeatherMap

**Propósito**: Datos meteorológicos en tiempo real y capas de mapa

**Endpoints utilizados**:
- `/data/2.5/weather` - Tiempo actual
- `/data/2.5/forecast` - Pronóstico
- Tile Server - Capas de mapa (temperatura, precipitación, nubes)

**Datos obtenidos**:
- Temperatura actual
- Precipitación
- Humedad
- Viento
- Presión
- Capas visuales

**Configuración**:
```javascript
const API_KEY = process.env.REACT_APP_OWM_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/2.5';
```

**Limitaciones**:
- 60 llamadas/minuto (plan gratuito)
- 1,000,000 llamadas/mes

---

#### 2. NASA POWER

**Propósito**: Datos históricos de alta calidad

**Endpoints utilizados**:
- `/temporal/daily/point` - Datos diarios por punto
- `/temporal/monthly/point` - Datos mensuales

**Datos obtenidos**:
- Radiación solar
- Temperatura (min, max, promedio)
- Precipitación histórica
- Evapotranspiración
- Humedad relativa

**Configuración**:
```javascript
const BASE_URL = 'https://power.larc.nasa.gov/api';
const PARAMETERS = 'T2M,PRECTOTCORR,RH2M,ALLSKY_SFC_SW_DWN';
```

**Ventajas**:
- Sin API key requerida
- Datos globales de alta calidad
- Histórico desde 1981

---

#### 3. Open-Meteo

**Propósito**: Datos meteorológicos open-source

**Endpoints utilizados**:
- `/v1/forecast` - Pronóstico
- `/v1/historical` - Datos históricos

**Datos obtenidos**:
- Múltiples variables meteorológicas
- Alta resolución temporal
- Modelos meteorológicos múltiples

**Configuración**:
```javascript
const BASE_URL = 'https://api.open-meteo.com/v1';
```

**Ventajas**:
- Completamente gratuito
- Sin límites de rate
- Sin API key

---

### Servicios de IA

#### Groq (Mixtral)

**Propósito**: Análisis agroclimático con IA

**Modelo**: `mixtral-8x7b-32768`

**Uso**:
```javascript
const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${GROQ_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'mixtral-8x7b-32768',
    messages: [
      {
        role: 'system',
        content: 'Eres un experto agrónomo...'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 1000
  })
});
```

**Análisis proporcionados**:
- Aptitud de cultivo para ubicación
- Recomendaciones específicas
- Identificación de riesgos
- Mejores prácticas agrícolas
- Score numérico de aptitud

---

### Servicios de Mapas

#### Leaflet + OpenStreetMap

**Propósito**: Mapa base interactivo

**Configuración**:
```javascript
<MapContainer center={[4.6, -74.08]} zoom={12}>
  <TileLayer
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    attribution='&copy; OpenStreetMap contributors'
  />
</MapContainer>
```

---

#### Nominatim (Geocoding)

**Propósito**: Búsqueda de lugares y geocoding

**Uso**:
```javascript
const response = await fetch(
  `https://nominatim.openstreetmap.org/search?format=json&q=${query}`
);
```

---

## Seguridad

### 1. Autenticación y Autorización

**Flujo de autenticación**:
```
┌─────────┐                    ┌─────────┐
│ Cliente │                    │ Backend │
└────┬────┘                    └────┬────┘
     │                              │
     │ 1. Encriptar credenciales    │
     │    (AES-256)                 │
     │                              │
     │ 2. POST /api/login/          │
     │    {email†, password†}       │
     ├─────────────────────────────>│
     │                              │
     │                              │ 3. Desencriptar
     │                              │
     │                              │ 4. Verificar bcrypt
     │                              │
     │                              │ 5. Generar JWT
     │                              │
     │ 6. {token, user}             │
     │<─────────────────────────────┤
     │                              │
     │ 7. Guardar token             │
     │                              │
     │ 8. Incluir en requests       │
     │    Authorization: Bearer ... │
     ├─────────────────────────────>│
     │                              │
     │                              │ 9. Validar JWT
     │                              │
     │                              │ 10. Verificar rol
     │                              │
     │ 11. Respuesta                │
     │<─────────────────────────────┤
     │                              │
```

**Capas de seguridad**:
1. **Encriptación en tránsito**: AES-256 para credenciales
2. **Hashing de contraseñas**: bcrypt con salt
3. **Tokens JWT**: Firmados con HS256
4. **Decoradores de autorización**: `@require_auth`, `@require_admin`
5. **CORS**: Restricción de orígenes permitidos

---

### 2. Validación de Datos

**Cliente (Frontend)**:
```javascript
// Validación de email
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Validación de contraseña
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
```

**Servidor (Backend)**:
```python
def validate_password_strength(password):
    """Valida fortaleza de contraseña."""
    if len(password) < 8:
        return False, "Mínimo 8 caracteres"
    if not re.search(r'[A-Z]', password):
        return False, "Requiere mayúscula"
    if not re.search(r'\d', password):
        return False, "Requiere número"
    if not re.search(r'[@$!%*?&]', password):
        return False, "Requiere carácter especial"
    return True, "Contraseña válida"
```

---

### 3. Protección de Datos Sensibles

**Variables de entorno**:
- JWT_SECRET
- ENCRYPTION_KEY
- EMAIL_HOST_PASSWORD
- API_KEYS

**Nunca en código fuente**:
- Contraseñas
- Claves privadas
- Tokens de API
- Secrets

**Buenas prácticas**:
```bash
# .gitignore
.env
*.key
secrets/
```

---

## Escalabilidad

### Escalabilidad Horizontal

**Frontend**:
- Static hosting (CDN)
- Múltiples instancias
- Load balancing

**Backend**:
```bash
# Múltiples workers Gunicorn
gunicorn backend.wsgi:application \
  --workers 4 \
  --threads 2 \
  --worker-class gthread
```

**Base de Datos**:
- Replica Set de MongoDB
- Sharding para grandes volúmenes

---

### Optimizaciones

**Frontend**:
- Code splitting
- Lazy loading
- Memoization
- Service Workers (PWA)

**Backend**:
- Caching (Redis)
- Query optimization
- Connection pooling
- Rate limiting

**Base de Datos**:
- Índices optimizados
- Agregaciones eficientes
- Proyecciones selectivas

---

## Diagramas

### Diagrama de Componentes

```
┌──────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                       │
├──────────────────────────────────────────────────────────────┤
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │   Login    │  │  Register  │  │   Forgot   │            │
│  │            │  │            │  │  Password  │            │
│  └────────────┘  └────────────┘  └────────────┘            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │    User    │  │   Admin    │  │  Climate   │            │
│  │   Panel    │  │ Dashboard  │  │ Dashboard  │            │
│  └────────────┘  └────────────┘  └────────────┘            │
│  ┌────────────────────────────────────────────────────┐    │
│  │               Map Dashboard                         │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐         │    │
│  │  │  Leaflet │  │ Charts   │  │ Controls │         │    │
│  │  └──────────┘  └──────────┘  └──────────┘         │    │
│  └────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────┐    │
│  │               API Services                          │    │
│  │  api.js | climateAPI.js | groqCropAI.js           │    │
│  └────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
                              │
                              │ REST API (JSON)
                              │ JWT Token
                              │
┌──────────────────────────────▼───────────────────────────────┐
│                      BACKEND (Django)                         │
├──────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────┐     │
│  │                  API Endpoints                      │     │
│  │  /api/login | /api/register | /api/profile        │     │
│  │  /api/users | /api/crops | /api/variables         │     │
│  │  /api/climate-data                                  │     │
│  └────────────────────────────────────────────────────┘     │
│  ┌────────────────────────────────────────────────────┐     │
│  │                    Services                         │     │
│  │  auth_utils | crypto_utils | email_service        │     │
│  └────────────────────────────────────────────────────┘     │
│  ┌────────────────────────────────────────────────────┐     │
│  │                  Decorators                         │     │
│  │  @require_auth | @require_admin | @validate_json   │     │
│  └────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────┘
                              │
                              │ PyMongo
                              │
┌──────────────────────────────▼───────────────────────────────┐
│                       DATABASE (MongoDB)                      │
├──────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │    users     │  │    crops     │  │  dashboard   │       │
│  │              │  │              │  │  _variables  │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│  ┌──────────────┐                                            │
│  │ climate_data │                                            │
│  │              │                                            │
│  └──────────────┘                                            │
└──────────────────────────────────────────────────────────────┘
```

---

### Diagrama de Despliegue

```
┌──────────────────────────────────────────────────────────────┐
│                       PRODUCTION                              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────┐          ┌──────────────────┐
│   Netlify/Vercel │          │    VPS/Cloud     │
│                  │          │                  │
│  ┌────────────┐  │          │  ┌────────────┐  │
│  │  Frontend  │  │          │  │   Nginx    │  │
│  │   React    │  │          │  │ (Reverse   │  │
│  │   Build    │  │          │  │  Proxy)    │  │
│  └────────────┘  │          │  └─────┬──────┘  │
│                  │          │        │         │
│  CDN Distribution│          │  ┌─────▼──────┐  │
│                  │          │  │  Gunicorn  │  │
└──────────────────┘          │  │   Django   │  │
                              │  │   Backend  │  │
                              │  └─────┬──────┘  │
                              │        │         │
                              │  ┌─────▼──────┐  │
                              │  │  MongoDB   │  │
                              │  │  (Local/   │  │
                              │  │  Atlas)    │  │
                              │  └────────────┘  │
                              └──────────────────┘
```

---

## Mejores Prácticas Implementadas

### Código

- ✅ Separación de responsabilidades (SoC)
- ✅ DRY (Don't Repeat Yourself)
- ✅ KISS (Keep It Simple, Stupid)
- ✅ Comentarios y documentación
- ✅ Nombres descriptivos
- ✅ Manejo de errores consistente

### Seguridad

- ✅ Encriptación de datos sensibles
- ✅ Validación de entrada
- ✅ Autenticación y autorización
- ✅ CORS configurado
- ✅ HTTPS en producción
- ✅ Secrets en variables de entorno

### Performance

- ✅ Lazy loading
- ✅ Code splitting
- ✅ Caching
- ✅ Índices de base de datos
- ✅ Paginación
- ✅ Optimización de queries

### Mantenibilidad

- ✅ Código modular
- ✅ Versionado (Git)
- ✅ Documentación completa
- ✅ Scripts de utilidad
- ✅ Backups automatizados
- ✅ Logs estructurados

---

## Autor

Sistema de Monitoreo Climático - Climétrica

## Fecha

Diciembre 2025

# Documentación Backend - Sistema Climétrica

## Tabla de Contenidos

1. [Descripción General](#descripción-general)
2. [Arquitectura](#arquitectura)
3. [Base de Datos](#base-de-datos)
4. [API Endpoints](#api-endpoints)
5. [Módulos y Servicios](#módulos-y-servicios)
6. [Scripts de Utilidad](#scripts-de-utilidad)
7. [Configuración](#configuración)
8. [Seguridad](#seguridad)

---

## Descripción General

El backend de Climétrica está construido con **Django 4.2+** y **MongoDB**, proporcionando una API RESTful para el sistema de monitoreo climático.

### Tecnologías Principales

- **Framework**: Django 4.2+
- **Base de Datos**: MongoDB
- **Driver DB**: PyMongo
- **Autenticación**: JWT (PyJWT)
- **Seguridad**: bcrypt, PyCryptodome
- **Servidor**: Gunicorn (producción)

---

## Arquitectura

### Estructura de Directorios

```
backend/
├── api/                      # Aplicación principal Django
│   ├── admin_views.py        # Vistas administrativas
│   ├── auth_utils.py         # Utilidades de autenticación
│   ├── crypto_utils.py       # Encriptación/desencriptación
│   ├── dataset_utils.py      # Manejo de datasets climáticos
│   ├── decorators.py         # Decoradores personalizados
│   ├── email_service.py      # Servicio de correo electrónico
│   ├── mongodb.py            # Conexión y configuración MongoDB
│   ├── public_views.py       # Vistas públicas
│   ├── urls.py               # Rutas de la API
│   └── views.py              # Vistas principales
│
├── database_exports/         # Exportaciones de base de datos
├── venv/                     # Entorno virtual Python
│
├── add_new_variable.py       # Script: agregar nuevas variables
├── app.py                    # Aplicación Flask (alternativa)
├── export_database.py        # Script: exportar base de datos
├── fix_variables_layers.py   # Script: corregir capas de variables
├── import_database.py        # Script: importar base de datos
├── init_dashboard_data.py    # Script: inicializar datos
├── manage.py                 # Comando Django
├── migrate_from_frontend.py  # Script: migración de datos
├── requirements.txt          # Dependencias Python
├── settings.py               # Configuración Django
├── urls.py                   # URLs principales
└── verify_database.py        # Script: verificar base de datos
```

---

## Base de Datos

### Conexión MongoDB

**Archivo**: `api/mongodb.py`

```python
from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
client = MongoClient(MONGO_URI)
db = client['climetricadb']

# Colecciones
users_col = db['users']
climate_data_col = db['climate_data']
crops_col = db['crops']
dashboard_variables_col = db['dashboard_variables']
```

### Colecciones

#### 1. users

Almacena información de usuarios del sistema.

```javascript
{
  _id: ObjectId,
  first_name: String,          // Nombre
  last_name: String,           // Apellido
  email: String,               // Único, validado
  phone: String,               // Teléfono de contacto
  identification: String,      // Cédula/ID único
  role: String,                // "admin" | "productor"
  status: String,              // "active" | "inactive" | "pending"
  password_hash: String,       // Hash bcrypt
  created_at: DateTime,        // Fecha de creación
  updated_at: DateTime,        // Última actualización
  must_change_password: Boolean // Requiere cambio de contraseña
}
```

**Índices**:
- `email` (único)
- `identification` (único)

---

#### 2. climate_data

Registros de consultas climáticas de usuarios.

```javascript
{
  _id: ObjectId,
  usuario: {                   // Información del usuario
    _id: String,
    first_name: String,
    last_name: String,
    email: String
  },
  consulta: {                  // Detalles de la consulta
    lugar: String,             // Ubicación consultada
    variable: String,          // Variable climática
    tipoSeleccion: String,     // "punto" | "poligono"
    coordenadas: {             // Coordenadas geográficas
      lat: Number,
      lng: Number
    } | Array,                 // O array para polígonos
    fechaInicio: String,       // Fecha inicio consulta
    fechaFin: String          // Fecha fin consulta
  },
  datosClimaticos: {           // Datos obtenidos
    serieTemporal: [{          // Serie de tiempo
      date: String,
      value: Number
    }],
    estadisticas: {            // Estadísticas calculadas
      promedio: Number,
      maximo: Number,
      minimo: Number,
      desviacion: Number
    },
    zona: String               // Descripción de la zona
  },
  estadoDatos: {               // Metadata de los datos
    fechaDatos: String,        // Fecha de los datos
    tiempoReal: Boolean,       // ¿Datos en tiempo real?
    fuente: String,            // API fuente
    apiUtilizada: String       // Nombre de la API
  },
  createdAt: String            // Timestamp de creación
}
```

---

#### 3. crops

Catálogo de cultivos con sus requerimientos climáticos.

```javascript
{
  _id: ObjectId,
  nombre: String,              // Nombre común
  nombre_cientifico: String,   // Nombre científico
  descripcion: String,         // Descripción del cultivo
  requerimientos: {            // Requerimientos climáticos
    temperatura_min: Number,   // °C
    temperatura_max: Number,   // °C
    temperatura_optima: Number,// °C
    precipitacion_min: Number, // mm/año
    precipitacion_max: Number, // mm/año
    altitud_min: Number,       // m.s.n.m.
    altitud_max: Number,       // m.s.n.m.
    humedad_min: Number,       // %
    humedad_max: Number       // %
  },
  imagen_url: String,          // URL de imagen
  activo: Boolean,             // Cultivo activo
  created_at: DateTime,
  updated_at: DateTime
}
```

**Cultivos Predefinidos**:
- Café (Coffea arabica)
- Banano (Musa paradisiaca)
- Cacao (Theobroma cacao)
- Arroz (Oryza sativa)
- Maíz (Zea mays)
- Papa (Solanum tuberosum)
- Aguacate (Persea americana)
- Plátano (Musa paradisiaca)

---

#### 4. dashboard_variables

Variables climáticas disponibles en el sistema.

```javascript
{
  _id: ObjectId,
  nombre: String,              // Nombre descriptivo
  clave: String,               // Identificador único
  descripcion: String,         // Descripción detallada
  activa: Boolean,             // Variable activa
  categoria: String,           // "meteorologica" | "oceanica" | "agricola"
  unidad: String,              // Unidad de medida
  icono: String,               // Nombre del icono
  orden: Number,               // Orden de visualización
  api_config: {                // Configuración API
    provider: String,          // Proveedor de datos
    endpoint: String,          // Endpoint API
    parametro: String,         // Parámetro API
    transformacion: String    // Función de transformación
  },
  capa_mapa: {                 // Configuración de capa
    tipo: String,              // "wmts" | "wms" | "tile"
    url: String,               // URL de la capa
    capas: String,             // Capas a mostrar
    formato: String,           // Formato de imagen
    transparente: Boolean      // Transparencia
  },
  created_at: DateTime,
  updated_at: DateTime
}
```

**Variables Predefinidas**:
1. Temperatura terrestre (°C)
2. Temperatura del mar (°C)
3. Precipitación (mm)
4. Humedad relativa (%)
5. Velocidad del viento (m/s)
6. Dirección del viento (°)
7. Presión atmosférica (hPa)
8. Radiación solar (W/m²)
9. Evapotranspiración (mm)
10. Altura de olas (m)

---

## API Endpoints

### Autenticación

#### Registro de Usuario

```http
POST /api/register/
Content-Type: application/json

{
  "first_name": "encrypted_string",
  "last_name": "encrypted_string",
  "email": "encrypted_string",
  "phone": "encrypted_string",
  "identification": "encrypted_string",
  "password": "encrypted_string"
}

Response 201:
{
  "success": true,
  "message": "Usuario registrado exitosamente",
  "user": {
    "_id": "...",
    "email": "usuario@ejemplo.com",
    "role": "productor"
  }
}
```

---

#### Inicio de Sesión

```http
POST /api/login/
Content-Type: application/json

{
  "email": "encrypted_string",
  "password": "encrypted_string"
}

Response 200:
{
  "success": true,
  "message": "Inicio de sesión exitoso",
  "token": "jwt_token_here",
  "user": {
    "_id": "...",
    "first_name": "Juan",
    "last_name": "Pérez",
    "email": "juan@ejemplo.com",
    "role": "productor"
  }
}
```

---

#### Verificar Email

```http
POST /api/check-email/
Content-Type: application/json

{
  "email": "encrypted_string"
}

Response 200:
{
  "exists": true,
  "message": "Email encontrado"
}
```

---

#### Restablecer Contraseña

```http
POST /api/reset-password/
Content-Type: application/json

{
  "email": "encrypted_string",
  "new_password": "encrypted_string"
}

Response 200:
{
  "success": true,
  "message": "Contraseña actualizada exitosamente"
}
```

---

### Perfil de Usuario

#### Obtener Perfil

```http
GET /api/profile/
Authorization: Bearer <token>

Response 200:
{
  "_id": "...",
  "first_name": "Juan",
  "last_name": "Pérez",
  "email": "juan@ejemplo.com",
  "phone": "3001234567",
  "identification": "123456789",
  "role": "productor",
  "status": "active",
  "created_at": "2025-01-15T10:30:00"
}
```

---

#### Actualizar Perfil

```http
PUT /api/profile/update/
Authorization: Bearer <token>
Content-Type: application/json

{
  "first_name": "Juan Carlos",
  "last_name": "Pérez García",
  "phone": "3009876543"
}

Response 200:
{
  "success": true,
  "message": "Perfil actualizado exitosamente",
  "user": { ... }
}
```

---

### Datos Climáticos

#### Obtener Datos Climáticos

```http
GET /api/climate-data/?usuario_id=<id>
Authorization: Bearer <token>

Response 200:
[
  {
    "_id": "...",
    "usuario": { ... },
    "consulta": { ... },
    "datosClimaticos": { ... },
    "estadoDatos": { ... },
    "createdAt": "2025-01-15T14:30:00"
  }
]
```

---

#### Guardar Datos Climáticos

```http
POST /api/climate-data/save/
Authorization: Bearer <token>
Content-Type: application/json

{
  "usuario": {
    "_id": "...",
    "first_name": "Juan",
    "last_name": "Pérez",
    "email": "juan@ejemplo.com"
  },
  "consulta": {
    "lugar": "Bogotá, Colombia",
    "variable": "Temperatura terrestre",
    "tipoSeleccion": "punto",
    "coordenadas": {
      "lat": 4.6097,
      "lng": -74.0817
    },
    "fechaInicio": "2025-01-01",
    "fechaFin": "2025-01-15"
  },
  "datosClimaticos": {
    "serieTemporal": [
      {"date": "2025-01-01", "value": 18.5},
      {"date": "2025-01-02", "value": 19.2}
    ],
    "estadisticas": {
      "promedio": 18.8,
      "maximo": 22.5,
      "minimo": 15.3
    }
  },
  "estadoDatos": {
    "fechaDatos": "2025-01-15",
    "tiempoReal": true,
    "fuente": "OpenWeatherMap",
    "apiUtilizada": "OpenWeatherMap API"
  }
}

Response 201:
{
  "success": true,
  "message": "Datos guardados exitosamente",
  "id": "..."
}
```

---

#### Eliminar Datos Climáticos

```http
DELETE /api/climate-data/<id>/
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "message": "Registro eliminado exitosamente"
}
```

---

### Variables del Dashboard

#### Listar Variables

```http
GET /api/dashboard-variables/
Authorization: Bearer <token>

Response 200:
[
  {
    "_id": "...",
    "nombre": "Temperatura terrestre",
    "clave": "temperatura_terrestre",
    "descripcion": "...",
    "activa": true,
    "categoria": "meteorologica",
    "unidad": "°C",
    "icono": "thermometer"
  }
]
```

---

#### Crear Variable (Admin)

```http
POST /api/admin/variables/
Authorization: Bearer <token>
Content-Type: application/json

{
  "nombre": "Nueva Variable",
  "clave": "nueva_variable",
  "descripcion": "Descripción de la variable",
  "categoria": "meteorologica",
  "unidad": "unit",
  "icono": "icon-name",
  "activa": true
}

Response 201:
{
  "success": true,
  "message": "Variable creada exitosamente",
  "variable": { ... }
}
```

---

#### Actualizar Variable (Admin)

```http
PUT /api/admin/variables/<id>/
Authorization: Bearer <token>
Content-Type: application/json

{
  "nombre": "Nombre actualizado",
  "activa": false
}

Response 200:
{
  "success": true,
  "message": "Variable actualizada exitosamente"
}
```

---

#### Eliminar Variable (Admin)

```http
DELETE /api/admin/variables/<id>/
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "message": "Variable eliminada exitosamente"
}
```

---

### Cultivos

#### Listar Cultivos

```http
GET /api/crops/
Authorization: Bearer <token>

Response 200:
[
  {
    "_id": "...",
    "nombre": "Café",
    "nombre_cientifico": "Coffea arabica",
    "descripcion": "...",
    "requerimientos": { ... },
    "activo": true
  }
]
```

---

#### Analizar Aptitud de Cultivo

```http
POST /api/crops/analyze/
Authorization: Bearer <token>
Content-Type: application/json

{
  "crop_id": "...",
  "location": {
    "lat": 4.6097,
    "lng": -74.0817
  },
  "climate_data": {
    "temperatura_promedio": 18.5,
    "precipitacion_anual": 1200,
    "altitud": 2600,
    "humedad_promedio": 75
  }
}

Response 200:
{
  "apto": true,
  "score": 85,
  "recomendaciones": [
    "Temperatura adecuada para el cultivo",
    "Considerar sistema de riego complementario"
  ],
  "riesgos": [
    "Precipitación ligeramente baja en algunos meses"
  ]
}
```

---

#### Crear Cultivo (Admin)

```http
POST /api/admin/crops/
Authorization: Bearer <token>
Content-Type: application/json

{
  "nombre": "Tomate",
  "nombre_cientifico": "Solanum lycopersicum",
  "descripcion": "Cultivo de tomate...",
  "requerimientos": {
    "temperatura_min": 15,
    "temperatura_max": 30,
    "temperatura_optima": 22,
    "precipitacion_min": 500,
    "precipitacion_max": 1000,
    "altitud_min": 0,
    "altitud_max": 2000,
    "humedad_min": 60,
    "humedad_max": 80
  }
}

Response 201:
{
  "success": true,
  "message": "Cultivo creado exitosamente",
  "crop": { ... }
}
```

---

### Administración de Usuarios (Solo Admin)

#### Listar Usuarios

```http
GET /api/users/
Authorization: Bearer <token>

Response 200:
[
  {
    "_id": "...",
    "first_name": "Juan",
    "last_name": "Pérez",
    "email": "juan@ejemplo.com",
    "role": "productor",
    "status": "active",
    "created_at": "2025-01-15T10:30:00"
  }
]
```

---

#### Actualizar Usuario

```http
PUT /api/users/<id>/
Authorization: Bearer <token>
Content-Type: application/json

{
  "role": "admin",
  "status": "active"
}

Response 200:
{
  "success": true,
  "message": "Usuario actualizado exitosamente"
}
```

---

#### Eliminar Usuario

```http
DELETE /api/users/<id>/
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "message": "Usuario eliminado exitosamente"
}
```

---

## Módulos y Servicios

### auth_utils.py

Utilidades de autenticación con JWT y bcrypt.

**Funciones principales**:

```python
def hash_password(password: str) -> str:
    """Genera hash bcrypt de una contraseña."""

def verify_password(password: str, password_hash: str) -> bool:
    """Verifica una contraseña contra su hash."""

def generate_jwt_token(user_data: dict) -> str:
    """Genera un token JWT para un usuario."""

def decode_jwt_token(token: str) -> dict:
    """Decodifica y valida un token JWT."""

def validate_password_strength(password: str) -> tuple:
    """Valida la fortaleza de una contraseña."""
```

---

### crypto_utils.py

Encriptación y desencriptación AES-256.

**Funciones principales**:

```python
def encrypt_data(data: str, key: str) -> str:
    """Encripta datos con AES-256-CBC."""

def decrypt_data(encrypted_data: str, key: str) -> str:
    """Desencripta datos AES-256-CBC."""
```

**Uso**:
```python
from api.crypto_utils import decrypt_data
import os

ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY')
decrypted_email = decrypt_data(encrypted_email, ENCRYPTION_KEY)
```

---

### email_service.py

Servicio de envío de correos electrónicos.

**Funciones principales**:

```python
def send_password_reset_email(to_email: str, reset_link: str) -> bool:
    """Envía correo de restablecimiento de contraseña."""

def send_welcome_email(to_email: str, user_name: str) -> bool:
    """Envía correo de bienvenida."""

def send_notification_email(to_email: str, subject: str, message: str) -> bool:
    """Envía correo de notificación genérico."""
```

**Configuración** (`.env`):
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=tu_email@gmail.com
EMAIL_HOST_PASSWORD=tu_app_password
EMAIL_USE_TLS=True
DEFAULT_FROM_EMAIL=noreply@climetrica.com
```

---

### decorators.py

Decoradores personalizados para vistas.

**Decoradores disponibles**:

```python
@require_auth
def my_view(request):
    """Vista que requiere autenticación."""
    user = request.user
    # ...

@require_admin
def admin_view(request):
    """Vista que requiere rol de administrador."""
    # ...

@validate_json
def json_view(request):
    """Vista que valida JSON en el body."""
    data = request.json_data
    # ...
```

---

### dataset_utils.py

Utilidades para manejo de datasets climáticos.

**Funciones principales**:

```python
def process_climate_data(raw_data: dict) -> dict:
    """Procesa datos climáticos crudos."""

def calculate_statistics(time_series: list) -> dict:
    """Calcula estadísticas de una serie temporal."""

def format_coordinates(coords: dict|list) -> dict:
    """Formatea coordenadas geográficas."""
```

---

## Scripts de Utilidad

### export_database.py

Exporta todas las colecciones de MongoDB a archivos JSON.

**Uso**:
```bash
cd backend
source venv/bin/activate
python export_database.py
```

**Salida**:
```
database_exports/
└── export_20251215_235456/
    ├── users.json
    ├── crops.json
    ├── climate_data.json
    ├── dashboard_variables.json
    └── export_summary.json
```

---

### import_database.py

Importa colecciones desde archivos JSON exportados.

**Uso**:
```bash
# Modo agregar (por defecto)
python import_database.py database_exports/export_20251215_235456

# Modo reemplazo (elimina datos existentes)
python import_database.py database_exports/export_20251215_235456 --replace
```

---

### init_dashboard_data.py

Inicializa la base de datos con variables y cultivos predefinidos.

**Uso**:
```bash
python init_dashboard_data.py
```

**Datos creados**:
- 10 variables climáticas
- 8 cultivos colombianos

---

### verify_database.py

Verifica la conexión y estado de la base de datos.

**Uso**:
```bash
python verify_database.py
```

**Información mostrada**:
- Estado de conexión
- Colecciones existentes
- Conteo de documentos
- Índices configurados

---

### migrate_from_frontend.py

Migra datos desde colecciones antiguas del frontend.

**Uso**:
```bash
python migrate_from_frontend.py
```

---

### add_new_variable.py

Script interactivo para agregar nuevas variables climáticas.

**Uso**:
```bash
python add_new_variable.py
```

---

### fix_variables_layers.py

Corrige configuración de capas en variables existentes.

**Uso**:
```bash
python fix_variables_layers.py
```

---

## Configuración

### Variables de Entorno (.env)

```env
# MongoDB
MONGO_URI=mongodb://localhost:27017/
DB_NAME=climetricadb

# JWT
JWT_SECRET=tu_clave_secreta_muy_larga_y_segura
JWT_ALGORITHM=HS256
JWT_EXP_DAYS=7

# Encriptación
ENCRYPTION_KEY=clave_aes_256_bits_en_base64

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=tu_email@gmail.com
EMAIL_HOST_PASSWORD=tu_app_password_de_gmail
EMAIL_USE_TLS=True
DEFAULT_FROM_EMAIL=noreply@climetrica.com

# Django
DEBUG=False
SECRET_KEY=tu_secret_key_de_django
ALLOWED_HOSTS=localhost,127.0.0.1,tu-dominio.com

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://tu-dominio.com
```

---

### settings.py

Configuración principal de Django.

**Configuraciones importantes**:

```python
# Base de datos (MongoDB vía PyMongo, no ORM Django)
DATABASES = {}  # No usado

# CORS
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://tu-dominio.com"
]

# Seguridad
SECURE_SSL_REDIRECT = True  # En producción
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
```

---

## Seguridad

### Autenticación y Autorización

1. **Encriptación de Credenciales**:
   - Email y contraseña encriptados con AES-256 en tránsito
   - Clave de encriptación en variable de entorno

2. **Tokens JWT**:
   - Expiración configurable (default: 7 días)
   - Firmados con HS256
   - Incluyen datos del usuario y timestamp

3. **Hashing de Contraseñas**:
   - bcrypt con salt automático
   - Nunca se almacenan contraseñas en texto plano

4. **Validación de Contraseñas**:
   - Mínimo 8 caracteres
   - Al menos una mayúscula
   - Al menos un número
   - Al menos un carácter especial

### Protección de Endpoints

```python
# Decorador de autenticación
@require_auth
def protected_view(request):
    # Solo usuarios autenticados
    user = request.user
    # ...

# Decorador de rol admin
@require_admin
def admin_only_view(request):
    # Solo administradores
    # ...
```

### CORS y Seguridad Web

- Orígenes permitidos configurables
- Headers seguros configurados
- Protección CSRF habilitada

### Validación de Datos

- Validación de formato de email
- Unicidad de email e identificación
- Sanitización de entradas
- Validación de tipos de datos

---

## Manejo de Errores

### Códigos de Error Comunes

| Código | Descripción | Solución |
|--------|-------------|----------|
| 400 | Datos inválidos | Verificar formato de datos enviados |
| 401 | No autenticado | Incluir token JWT válido |
| 403 | Sin permisos | Verificar rol de usuario |
| 404 | Recurso no encontrado | Verificar ID del recurso |
| 409 | Conflicto (email/ID duplicado) | Usar datos únicos |
| 500 | Error del servidor | Contactar administrador |

### Formato de Respuesta de Error

```json
{
  "success": false,
  "error": "Descripción del error",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

---

## Pruebas

### Ejecutar Tests

```bash
cd backend
source venv/bin/activate
python manage.py test
```

### Cobertura de Tests

- Autenticación y autorización
- CRUD de usuarios
- CRUD de datos climáticos
- Validaciones de datos
- Servicios de email

---

## Deployment

### Desarrollo

```bash
cd backend
source venv/bin/activate
python manage.py runserver
```

### Producción con Gunicorn

```bash
# Instalar gunicorn
pip install gunicorn

# Ejecutar
gunicorn backend.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers 4 \
  --timeout 120
```

### Variables de Entorno en Producción

```bash
export DEBUG=False
export ALLOWED_HOSTS=tu-dominio.com
export CORS_ALLOWED_ORIGINS=https://tu-dominio.com
```

---

## Monitoreo y Logs

### Logs de Django

Configurados en `settings.py`:

```python
LOGGING = {
    'version': 1,
    'handlers': {
        'file': {
            'class': 'logging.FileHandler',
            'filename': 'logs/django.log',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file'],
            'level': 'INFO',
        },
    },
}
```

---

## Autor

Sistema de Monitoreo Climático - Climétrica

## Fecha

Diciembre 2025

---

## Recursos Adicionales

- [Documentación Django](https://docs.djangoproject.com/)
- [Documentación MongoDB](https://www.mongodb.com/docs/)
- [PyJWT](https://pyjwt.readthedocs.io/)
- [bcrypt](https://github.com/pyca/bcrypt/)

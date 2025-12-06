# Estructura del Proyecto Climétrica

## Descripción General

Sistema de monitoreo climático con frontend en React y backend en Django/MongoDB.

## Estructura de Directorios

```
climetrica/
├── backend/                    # Backend Django
│   ├── api/                   # Aplicación Django principal
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── auth_utils.py      # Utilidades de autenticación (JWT, bcrypt)
│   │   ├── crypto_utils.py    # Encriptación/desencriptación AES
│   │   ├── dataset_utils.py   # Utilidades para datasets
│   │   ├── decorators.py      # Decoradores de autenticación
│   │   ├── email_service.py   # Servicio de envío de correos
│   │   ├── migrations/        # Migraciones de Django
│   │   ├── models.py          # Modelos (no usado, se usa MongoDB)
│   │   ├── mongodb.py         # Conexión a MongoDB
│   │   ├── tests.py           # Tests
│   │   ├── urls.py            # Rutas de la API
│   │   └── views.py           # Vistas/endpoints de la API
│   │
│   ├── backend/               # Configuración Django
│   │   ├── __init__.py
│   │   ├── app.py
│   │   ├── asgi.py
│   │   ├── climate_routes.py
│   │   ├── database.py
│   │   ├── settings.py        # Configuración Django
│   │   ├── urls.py            # URLs principales
│   │   └── wsgi.py
│   │
│   ├── venv/                  # Entorno virtual Python (git-ignored)
│   ├── .env                   # Variables de entorno (git-ignored)
│   ├── manage.py              # Comando de Django
│   ├── requirements.txt       # Dependencias Python
│   └── CONFIGURACION_CORREO.md # Documentación de configuración de correo
│
├── frontend/                  # Frontend React
│   ├── public/                # Archivos públicos
│   │   ├── iconos/           # Iconos de la aplicación
│   │   └── index.html
│   │
│   ├── src/                   # Código fuente React
│   │   ├── api/              # Servicios de API
│   │   │   ├── api.js        # Cliente Axios configurado
│   │   │   ├── climateAPI.js # API de datos climáticos
│   │   │   └── Save_climate_data_helper.js
│   │   │
│   │   ├── components/       # Componentes React reutilizables
│   │   │   └── AnimatedLayer.jsx
│   │   │
│   │   ├── pages/            # Páginas/vistas principales
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── ClimateDashboard.jsx
│   │   │   ├── ForgotPassword.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── PolygonDrawer.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── UserMapDashboard.jsx
│   │   │   └── UserPanel.jsx
│   │   │
│   │   ├── styles/           # Archivos CSS
│   │   │   ├── ClimateDashboard.module.css
│   │   │   ├── ForgotPassword.css
│   │   │   ├── Login.css
│   │   │   ├── UserMapDashboard.css
│   │   │   ├── UserPanel.css
│   │   │   └── register.css
│   │   │
│   │   ├── utils/            # Utilidades
│   │   │   └── errorHandler.js # Manejo centralizado de errores
│   │   │
│   │   ├── App.js            # Componente principal
│   │   ├── index.js          # Punto de entrada
│   │   └── reportWebVitals.js
│   │
│   ├── build/                # Build de producción (git-ignored)
│   ├── node_modules/         # Dependencias npm (git-ignored)
│   ├── .env                  # Variables de entorno (git-ignored)
│   ├── .gitignore
│   ├── package.json          # Dependencias y scripts npm
│   ├── package-lock.json
│   ├── README.md
│   └── MANEJO_ERRORES.md    # Documentación de manejo de errores
│
├── .gitignore                # Archivos ignorados por git
├── README.md                 # Documentación principal
└── ESTRUCTURA_PROYECTO.md   # Este archivo
```

## Tecnologías Utilizadas

### Backend
- **Django 4.2+** - Framework web
- **MongoDB** - Base de datos NoSQL
- **PyMongo** - Driver de MongoDB para Python
- **JWT** - Autenticación basada en tokens
- **bcrypt** - Hashing de contraseñas
- **PyCryptodome** - Encriptación AES

### Frontend
- **React 18** - Librería de UI
- **React Router** - Enrutamiento
- **Axios** - Cliente HTTP
- **Leaflet** - Mapas interactivos
- **Chart.js** - Gráficos
- **jsPDF** - Generación de PDFs
- **crypto-js** - Encriptación en cliente

## Variables de Entorno

### Backend (.env)
```env
MONGO_URI=mongodb://localhost:27017/climetricadb
JWT_SECRET=tu_clave_secreta_jwt
JWT_ALGORITHM=HS256
JWT_EXP_DAYS=7
ENCRYPTION_KEY=tu_clave_de_encriptacion
```

### Frontend (.env)
```env
REACT_APP_OWM_KEY=tu_api_key_openweathermap
REACT_APP_ENCRYPTION_KEY=tu_clave_de_encriptacion
```

## Comandos Principales

### Backend

```bash
# Acceder al directorio backend
cd backend

# Activar entorno virtual
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Ejecutar servidor de desarrollo
python manage.py runserver

# Ejecutar en otro puerto
python manage.py runserver 8001
```

### Frontend

```bash
# Acceder al directorio frontend
cd frontend

# Instalar dependencias
npm install

# Ejecutar servidor de desarrollo
npm start

# Compilar para producción
npm run build
```

## Endpoints Principales de la API

### Autenticación
- `POST /api/register/` - Registro de usuario
- `POST /api/login/` - Inicio de sesión
- `POST /api/check-email/` - Verificar email
- `POST /api/reset-password/` - Restablecer contraseña

### Usuario
- `GET /api/profile/` - Obtener perfil
- `PUT /api/profile/update/` - Actualizar perfil

### Datos Climáticos
- `GET /api/climate-data/` - Obtener datos climáticos
- `POST /api/climate-data/save/` - Guardar datos
- `DELETE /api/climate-data/<id>/` - Eliminar registro

### Admin
- `GET /api/users/` - Listar usuarios (admin)
- `PUT /api/users/<id>/` - Actualizar usuario (admin)
- `DELETE /api/users/<id>/` - Eliminar usuario (admin)

## Rutas del Frontend

- `/` - Login
- `/register` - Registro
- `/forgot` - Recuperar contraseña
- `/user` - Panel de usuario
- `/admin` - Panel de administrador
- `/climate` - Dashboard de datos climáticos

## Base de Datos MongoDB

### Colecciones

**users**
```javascript
{
  _id: ObjectId,
  first_name: String,
  last_name: String,
  email: String (único),
  phone: String,
  identification: String (único),
  role: String ("admin" | "productor"),
  status: String,
  password_hash: String,
  created_at: DateTime,
  updated_at: DateTime,
  must_change_password: Boolean
}
```

**climate_data**
```javascript
{
  _id: ObjectId,
  usuario: {
    _id: String,
    first_name: String,
    last_name: String,
    email: String
  },
  consulta: {
    lugar: String,
    variable: String,
    tipoSeleccion: String
  },
  datosClimaticos: {
    serieTemporal: [{
      date: String,
      value: String
    }],
    estadisticas: Object
  },
  estadoDatos: {
    fechaDatos: String,
    tiempoReal: Boolean,
    fuente: String
  },
  createdAt: String
}
```

## Seguridad Implementada

1. **Encriptación de credenciales**: Email y contraseña se encriptan con AES antes de enviarse al backend
2. **JWT**: Tokens de autenticación con expiración configurable
3. **Bcrypt**: Hashing seguro de contraseñas en base de datos
4. **CORS**: Configurado para permitir solo orígenes autorizados
5. **Validación**: Email y identificación únicos, contraseñas seguras requeridas

## Características Principales

1. **Sistema de autenticación completo**
   - Registro con validación de datos
   - Login con encriptación
   - Recuperación de contraseña por email
   - Gestión de perfiles

2. **Visualización de datos climáticos**
   - Mapas interactivos con Leaflet
   - Series temporales con gráficos
   - Múltiples capas climáticas
   - Selección por puntos o polígonos

3. **Análisis de cultivos**
   - Evaluación de aptitud climática
   - Recomendaciones personalizadas
   - Identificación de riesgos

4. **Gestión de datos**
   - Guardar registros en base de datos
   - Exportar a JSON y PDF
   - Filtrado por fecha, lugar y variable
   - Historial de consultas

5. **Panel de administración**
   - Gestión de usuarios
   - Roles y permisos
   - Estadísticas del sistema

## Documentación Adicional

- [MANEJO_ERRORES.md](frontend/MANEJO_ERRORES.md) - Sistema de manejo de errores
- [CONFIGURACION_CORREO.md](backend/CONFIGURACION_CORREO.md) - Configuración de correo electrónico
- [SEGURIDAD_ENCRIPTACION.md](SEGURIDAD_ENCRIPTACION.md) - Sistema de encriptación

## Autor

Sistema de Monitoreo Climático - Climétrica

## Fecha

Diciembre 2025

# Guía del Desarrollador — Climétrica

> Documento de arranque para quien se incorpora al proyecto (especialmente al **backend**).
> Complementa a `ARQUITECTURA_SISTEMA.md`, `DOCUMENTACION_BACKEND.md` y `DOCUMENTACION_FRONTEND.md`.
> Última revisión: 2026-09-07.

---

## 1. Qué es Climétrica

Aplicación web para **monitoreo climático y análisis de aptitud de cultivos**.
El usuario elige una variable climática y una ubicación (un punto o un polígono) sobre un mapa,
la app trae series de datos de APIs climáticas externas, las grafica, dibuja capas sobre el
mapa, opcionalmente evalúa qué tan apto es un cultivo para esas condiciones, y permite
**guardar** la consulta en base de datos y exportarla a PDF/JSON.

Hay dos roles:

| Rol | Qué ve |
|-----|--------|
| `productor` / `vendedor` (no admin) | El mapa climático (`UserMapDashboard`) |
| `admin` | Panel de administración: usuarios, variables del dashboard, cultivos |

---

## 2. Arquitectura en una frase

```
React (CRA, puerto 3000)  ──HTTP/JSON──>  Django (puerto 8000)  ──PyMongo──>  MongoDB (puerto 27017)
        │
        └──HTTP──>  APIs externas de clima (Open-Meteo, OpenWeatherMap, NASA GIBS, Nominatim…)
```

- **Django NO usa su ORM ni su base de datos relacional.** Se usa sólo como framework HTTP
  (routing + vistas). Toda la persistencia es **MongoDB accedido con PyMongo**.
- No hay Django REST Framework en uso (está instalado pero las vistas son `JsonResponse` planas).
- Autenticación propia con **JWT** (no `django.contrib.auth` para la API).

---

## 3. Requisitos

| Herramienta | Versión probada | Notas |
|-------------|-----------------|-------|
| Python | 3.11 – 3.14 | El `venv` actual usa 3.14 |
| Node.js | 18+ (LTS) | Para el frontend (CRA / react-scripts 5) |
| MongoDB | 6.x / 7.x | Local en `mongodb://localhost:27017` o MongoDB Atlas |
| Git | cualquiera reciente | |

---

## 4. Puesta en marcha local (paso a paso)

### 4.1 Clonar y ubicarse

```bash
git clone https://github.com/MiguelCastro45/proyecto_front_climetrica_linux_.git
cd proyecto_front_climetrica_linux_
```

### 4.2 MongoDB

Arranca un MongoDB local. Opciones:

- **Servicio instalado** (Windows): normalmente ya corre en `localhost:27017`.
- **Docker**: `docker run -d -p 27017:27017 --name climetrica-mongo mongo:7`

La base de datos se llama **`climetricadb`** (se crea sola al primer insert).

### 4.3 Backend (Django)

```bash
cd backend

# 1. Entorno virtual
python -m venv venv
# Windows PowerShell:
venv\Scripts\Activate.ps1
# Windows Git Bash:
source venv/Scripts/activate
# Linux/Mac:
source venv/bin/activate

# 2. Dependencias
pip install -r requirements.txt

# 3. Variables de entorno
cp .env.example .env        # (Windows: copy .env.example .env)
#   -> edita backend/.env y pon valores reales (ver sección 5)

# 4. Arrancar
python manage.py runserver 8000
```

El backend queda en `http://localhost:8000`.
Verifica: `http://localhost:8000/public/variables/` debe responder `{"success": true, "variables": [...]}`.

> **Ojo con las URLs**: en `urls.py` las rutas de la API cuelgan de la **raíz**, no de `/api/`.
> El endpoint de login es `POST http://localhost:8000/login/` (no `/api/login/`).
> Los endpoints de admin de variables/cultivos sí llevan el prefijo literal `api/admin/...`
> porque está escrito así en la cadena de la ruta. Es inconsistente — ver "Deuda técnica".

### 4.4 Frontend (React)

```bash
cd frontend

npm install

cp .env.example .env        # (Windows: copy .env.example .env)
#   -> REACT_APP_ENCRYPTION_KEY debe ser IGUAL a ENCRYPTION_KEY del backend

npm start
```

El frontend queda en `http://localhost:3000` y habla con `http://localhost:8000` (hardcodeado en `src/api/api.js`).

### 4.5 Cargar datos de ejemplo (opcional pero recomendado)

El repo trae un respaldo en `backend/database_exports/export_20251215_235456/`
(usuarios, cultivos, variables del dashboard, registros climáticos):

```bash
cd backend
python import_database.py database_exports/export_20251215_235456
```

> Ese respaldo contiene **datos personales reales** (nombres, correos, teléfonos, cédulas y
> hashes de contraseña). Ya **no** se versiona (está en `.gitignore`). No lo subas al repo ni
> lo compartas. Para desarrollo, lo ideal es generar tu propio set de datos ficticios.

### 4.6 Crear un usuario administrador

Si no importaste el respaldo, no habrá admin. Crea uno con un script rápido:

```bash
cd backend
venv/Scripts/python -c "from api.mongodb import users_col; from api.auth_utils import hash_password; from datetime import datetime; users_col.insert_one({'first_name':'Admin','last_name':'.','email':'admin@local.dev','phone':'0','identification':'0','role':'admin','status':'active','password_hash':hash_password('Admin123!'),'created_at':datetime.utcnow(),'updated_at':datetime.utcnow(),'must_change_password':False}); print('admin creado: admin@local.dev / Admin123!')"
```

Login en `http://localhost:3000` con `admin@local.dev` / `Admin123!`.

---

## 5. Variables de entorno

### `backend/.env`  (nunca se sube — ver `backend/.env.example`)

| Variable | Para qué | Cómo generar |
|----------|----------|--------------|
| `MONGO_URI` | Conexión a Mongo | `mongodb://localhost:27017/climetricadb` en local |
| `JWT_SECRET` | Firma de los tokens JWT | `python -c "import secrets;print(secrets.token_hex(32))"` |
| `JWT_ALGORITHM` | Algoritmo JWT | `HS256` |
| `JWT_EXP_DAYS` | (declarada, hoy no se usa en la firma — la expiración real es de 60 min, ver `create_jwt`) | `7` |
| `ENCRYPTION_KEY` | Clave AES para descifrar las credenciales del login | **debe coincidir con `REACT_APP_ENCRYPTION_KEY`** |
| `DJANGO_SECRET_KEY` | Secret de Django | `python -c "from django.core.management.utils import get_random_secret_key;print(get_random_secret_key())"` |
| `DJANGO_DEBUG` | `True` en dev, `False` en prod | |
| `DJANGO_ALLOWED_HOSTS` | Hosts permitidos (coma) | `localhost,127.0.0.1` |
| `DJANGO_CORS_ALLOW_ALL` | `True` en dev | en prod `False` |
| `DJANGO_CORS_ORIGINS` | Orígenes permitidos en prod (coma) | `https://tu-dominio.com` |

> Las cuatro `DJANGO_*` y el uso de `JWT_SECRET` se añadieron el 2026-09-07. Antes estaban
> hardcodeadas en `settings.py` / `auth_utils.py`. Si no defines las `DJANGO_*`, el código cae
> a valores por defecto de desarrollo (funciona en local, **no** apto para producción).

### `frontend/.env`  (nunca se sube — ver `frontend/.env.example`)

| Variable | Para qué |
|----------|----------|
| `REACT_APP_ENCRYPTION_KEY` | Clave AES del login (igual que el backend) |
| `REACT_APP_OWM_KEY` | API key de OpenWeatherMap para las capas raster de temperatura/viento |
| `REACT_APP_GROQ_API_KEY` | API key de Groq para el análisis IA de cultivos (opcional; hoy no está cableado) |

> En una app de React **todo `REACT_APP_*` termina en el bundle público**. No pongas ahí
> secretos de servidor. La `REACT_APP_OWM_KEY` es de cliente por naturaleza (va en la URL del
> tile), pero conviene rotarla si se filtró.

---

## 6. Backend en detalle

### 6.1 Estructura

```
backend/
├── manage.py            # entrypoint Django
├── settings.py          # config (lee .env)
├── urls.py              # router raíz -> incluye api/urls.py
├── wsgi.py / asgi.py    # despliegue
├── requirements.txt
├── .env                 # (no versionado)
│
├── api/
│   ├── urls.py          # todas las rutas de la API
│   ├── views.py         # auth, perfil, usuarios (admin), registros climáticos, reset password
│   ├── admin_views.py   # CRUD de variables del dashboard y de cultivos (solo admin)
│   ├── public_views.py  # variables y cultivos activos (sin login) — los consume el frontend
│   ├── admin_views.py
│   ├── decorators.py    # @jwt_required, @admin_required
│   ├── auth_utils.py    # hash_password/check_password (bcrypt), create_jwt/decode_jwt (JWT)
│   ├── crypto_utils.py  # decrypt_data: AES compatible con CryptoJS del frontend
│   ├── mongodb.py       # conexión PyMongo + handles de colecciones + esquemas documentados
│   ├── email_service.py # envío de correo (reset password) — ver backend/CONFIGURACION_CORREO.md
│   ├── dataset_utils.py
│   ├── models.py        # VACÍO (no se usa el ORM)
│   └── migrations/      # vacío (no se usa el ORM)
│
├── database_exports/    # respaldos JSON (no versionado)
└── *.py (raíz)          # scripts de mantenimiento — ver 6.6
```

### 6.2 Flujo de una petición

```
Request
  -> urls.py  (path('', include('api.urls')))
  -> api/urls.py  (mapea la URL a una función)
  -> @csrf_exempt        (las vistas son API, sin sesión Django)
  -> @jwt_required       (lee "Authorization: Bearer <token>", valida, pone request.user = payload)
  -> @admin_required     (comprueba request.user['role'] == 'admin')
  -> la vista            (usa las colecciones de mongodb.py, devuelve JsonResponse)
```

`request.user` **no** es un usuario de Django: es el diccionario del payload del JWT
(`{user_id, email, role, exp}`).

### 6.3 Colecciones MongoDB

Definidas y **documentadas con su esquema** en `api/mongodb.py`:

| Handle | Colección | Contenido |
|--------|-----------|-----------|
| `users_col` | `users` | usuarios (bcrypt en `password_hash`, `role`, `status`) |
| `dashboard_variables_col` | `dashboard_variables` | variables climáticas configurables (capa/API, animación, leyenda) |
| `crops_col` | `crops` | cultivos y sus requerimientos agronómicos (temp/precip/altitud) |
| `climate_data_col` | `climate_data` | **registros guardados** por los usuarios (consulta + serie temporal + análisis) |
| `config_col` | `system_config` | configuración del sistema (poco uso) |
| `fs` | GridFS | archivos grandes (poco uso) |

No hay validación de esquema en Mongo: la forma de los documentos la impone el código.

### 6.4 Autenticación (importante)

1. El frontend cifra `email` y `password` con **AES (CryptoJS)** usando `REACT_APP_ENCRYPTION_KEY`
   y los manda a `POST /login/`.
2. `crypto_utils.decrypt_data()` los descifra con `ENCRYPTION_KEY` (misma clave). Reimplementa
   el formato `Salted__` + `EVP_BytesToKey` (MD5) de OpenSSL/CryptoJS.
3. Se busca el usuario por email (case-insensitive con regex) y se verifica la contraseña con
   **bcrypt** (`check_password`).
4. Se emite un **JWT HS256** firmado con `JWT_SECRET`, con payload `{user_id, email, role, exp}`
   y expiración de **60 minutos** (`create_jwt(payload, exp_minutes=60)`).
5. El frontend guarda el token en `localStorage` y lo manda en cada request como
   `Authorization: Bearer <token>`.

> El cifrado AES del login **no** sustituye a HTTPS: la clave viaja en el bundle. En producción,
> servir todo por TLS.

### 6.5 Endpoints

Ruta base: `http://localhost:8000`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET  | `/public/variables/` | — | Variables del dashboard activas |
| GET  | `/public/crops/` | — | Cultivos activos |
| POST | `/register/` | — | Crear usuario |
| POST | `/login/` | — | Login (credenciales cifradas AES) → JWT |
| GET  | `/profile/` | JWT | Perfil propio |
| PUT  | `/profile/update/` | JWT | Actualizar perfil propio (permite cambio de contraseña con verificación) |
| POST | `/check-email/` | — | ¿Existe este correo? (flujo "olvidé contraseña") |
| POST | `/reset-password/` | — | ⚠️ Restablece la contraseña de cualquier email **sin verificar identidad** (ver deuda técnica) |
| GET  | `/users/` | JWT + admin | Listar usuarios |
| PUT  | `/users/<id>/` | JWT + admin | Editar usuario |
| DELETE | `/users/delete/<id>/` | JWT + admin | Borrar usuario |
| GET/POST/PUT/DELETE/PATCH | `/api/admin/variables/...` | JWT + admin | CRUD + toggle de variables del dashboard |
| GET/POST/PUT/DELETE/PATCH | `/api/admin/crops/...` | JWT + admin | CRUD + toggle de cultivos |
| GET  | `/climate-data/` | — | Registros guardados (filtros: `userId`, `fecha`, `lugar`, `variable`) |
| POST | `/climate-data/save/` | JWT | Guardar un registro (el `usuario._id` se fuerza al del JWT) |
| DELETE | `/climate-data/<id>/` | JWT | Borrar un registro (dueño o admin) |

### 6.6 Scripts de mantenimiento (`backend/*.py`)

Se ejecutan con el venv activo, desde `backend/`:

| Script | Para qué |
|--------|----------|
| `export_database.py` | Exporta todas las colecciones a `database_exports/export_<timestamp>/` |
| `import_database.py <dir>` | Importa un export a Mongo |
| `verify_database.py` | Comprueba integridad / cuenta documentos |
| `show_current_config.py` | Muestra la config efectiva (env, conexión…) |
| `init_dashboard_data.py` | Siembra datos iniciales del dashboard |
| `add_new_variable.py` | Alta de una variable del dashboard (ver `COMO_AGREGAR_VARIABLES.md`) |
| `fix_variables_layers.py`, `restore_original_variables.py`, `update_variables_to_wmts.py`, `update_precipitation_to_owm.py` | Migraciones puntuales de la config de variables |
| `migrate_from_frontend.py` | Migración única de datos que antes vivían en el frontend |

---

## 7. Frontend en detalle

### 7.1 Stack

- **React 19** + **Create React App** (`react-scripts` 5.0.1). No hay TypeScript.
- **react-router-dom v7** — enrutado.
- **react-leaflet 5 / leaflet 1.9** + `leaflet-timedimension`, `leaflet-terminator` — mapa y capas.
- **chart.js** + `react-chartjs-2`, y **recharts** — gráficas (conviven las dos librerías).
- **jspdf** + **html2canvas** + **dom-to-image-more** — exportar a PDF/imagen.
- **crypto-js** — cifrado AES del login.
- **axios** — HTTP.
- **Tailwind v4** instalado (`devDependencies`), uso parcial; el grueso del estilo es CSS por
  página en `src/styles/`.

### 7.2 Rutas (`src/App.js`)

| Ruta | Componente | Notas |
|------|-----------|-------|
| `/` | `Login` | Tras login siempre redirige a `/user` |
| `/register` | `Register` | |
| `/forgot` | `ForgotPassword` | |
| `/user` | `UserPanel` | **Contenedor principal tras login** |
| `/admin` | `AdminDashboard` | Panel admin "suelto" (mismo contenido que las pestañas admin de `UserPanel`) |
| `/climate` | `ClimateDashboard` | Dashboard alternativo/legacy de registros; nada navega aquí por defecto |

No hay guardas de ruta reales: cada página comprueba el token en `localStorage` en un
`useEffect` y redirige a `/` si no hay.

### 7.3 Jerarquía de componentes

```
UserPanel  (lee /profile/, decide por user.role)
│
├─ role != "admin"  ─────────────►  UserMapDashboard   ← el corazón de la app (~4700 líneas)
│                                     ├─ PolygonDrawer            (dibujar polígono en el mapa)
│                                     └─ AnimatedLayer            (overlay animado de capas)
│
└─ role == "admin"  ─────────────►  pestañas:
                                      ├─ AdminUsers      (CRUD usuarios     → /users/…)
                                      ├─ AdminVariables  (CRUD variables    → /api/admin/variables/…)
                                      └─ AdminCrops      (CRUD cultivos     → /api/admin/crops/…)
```

`AdminDashboard` (ruta `/admin`) monta esos mismos tres componentes admin de forma
independiente.

### 7.4 Capa de acceso a datos (`src/api/`)

| Archivo | Estado | Qué hace |
|---------|--------|----------|
| `api.js` | **en uso** | Instancia axios, `baseURL: http://localhost:8000`, interceptor que añade `Authorization: Bearer` desde `localStorage`. Lo usan Login, Register, UserPanel, AdminUsers/Variables/Crops, etc. |
| `Save_climate_data_helper.js` | **en uso** (lo importa `UserMapDashboard`) | `saveClimateData()`, `getClimateDataByUser()`, `deleteClimateData()` contra `/climate-data/…`. Arma el documento grande que se guarda en Mongo. |
| `climateAPI.js` | **muerto** | No lo importa nadie. Apunta a rutas `/api/climate/*` y `/api/download/*` que ya no existen (eran del backend Flask viejo). |
| `groqCropAI.js` | **muerto / aspiracional** | No lo importa nadie. El análisis de cultivos actual es **local/heurístico** (rangos de temp/precip/altitud), no llama a Groq pese a lo que digan los mensajes de commit. |

`errorHandler.js` (`src/utils/`) centraliza el manejo de errores de axios y el redirect al login
cuando el token expira (401).

### 7.5 De dónde vienen los datos

**A. Backend propio** (Django/Mongo, vía `api.js` / `Save_climate_data_helper.js`):
auth, perfil, gestión de usuarios, variables del dashboard, cultivos, y los **registros
climáticos guardados**.

**B. APIs externas de clima** (el frontend las llama directamente desde el navegador):

| Servicio | URL | Para qué | API key |
|----------|-----|----------|---------|
| **Open-Meteo Forecast** | `api.open-meteo.com/v1/forecast` | Series diarias recientes / pronóstico por lat-lon | No |
| **Open-Meteo Archive** | `archive-api.open-meteo.com/v1/archive` | Series históricas (ERA5) | No |
| **Open-Meteo Climate** | `climate-api.open-meteo.com/v1/climate` | Normales climáticas 1991-2020 (modelo CMCC_CM2_VHR4) | No |
| **OpenWeatherMap tiles** | `tile.openweathermap.org/map/{layer}/…` | Capas raster de temperatura (`temp_new`) y viento (`wind_new`) sobre el mapa | **Sí** → `REACT_APP_OWM_KEY` |
| **NASA GIBS (WMTS)** | `gibs.earthdata.nasa.gov/wmts/…` | Capa de temperatura del mar (GHRSST L4 MUR) y precipitación (GPM IMERG) | No |
| **Nominatim (OSM)** | `nominatim.openstreetmap.org/search` y `/reverse` | Buscar un lugar por nombre y geocodificación inversa (lat-lon → nombre) | No (respetar rate-limit) |
| **Open-Elevation** | `api.open-elevation.com/api/v1/lookup` | Altitud de un punto (usada en el análisis de cultivos) | No |
| **RainViewer** | `api.rainviewer.com` + `tilecache.rainviewer.com` | Radar de precipitación animado | No |
| **ArcGIS World Imagery** | `server.arcgisonline.com/…/World_Imagery/…` | Mapa base satélite | No |

**C. Groq (IA)**: `api.groq.com/openai/v1/chat/completions` — **sólo en `groqCropAI.js`, que no
está conectado**. Si se reactiva, requiere `REACT_APP_GROQ_API_KEY`.

### 7.6 Flujo típico de uso (productor)

```
1. Usuario elige una VARIABLE (de /public/variables/) y una UBICACIÓN
   (clic en el mapa = punto, o dibuja un POLÍGONO con PolygonDrawer).
2. UserMapDashboard llama a Open-Meteo (y/o pone la capa OWM / GIBS sobre el mapa).
3. Se dibuja la serie temporal (chart.js) + estadísticas (min/máx/promedio).
4. Opcional: elige un CULTIVO -> análisis LOCAL de aptitud (temp/precip/altitud vs requerimientos).
5. "Guardar" -> saveClimateData() -> POST /climate-data/save/ -> documento en climate_data.
6. Exportar a PDF/JSON (jsPDF / html2canvas).
7. La sección "Registros" lee GET /climate-data/?userId=... y permite ver/borrar.
```

### 7.7 Estado y estilos

- **Sin estado global** (no Redux, no Context de app). Cada página maneja lo suyo con
  `useState`/`useRef`/`useEffect`. `UserMapDashboard` concentra mucha complejidad.
- El token y el `role` viven en `localStorage`.
- Estilos: un `.css` por página en `src/styles/`, más `ClimateDashboard.module.css` (CSS
  modules) y algo de Tailwind. `config/animationTemplates.js` define presets de animación de capas.

---

## 8. Cambios de seguridad ya aplicados (2026-09-07)

| # | Cambio | Archivo |
|---|--------|---------|
| 1 | `JWT_SECRET` se lee de `.env` (antes: constante `"CLIMETRICA_SECRET_KEY_2025"` en el código) | `api/auth_utils.py` |
| 2 | `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS`, CORS desde `.env` con defaults de dev | `settings.py` |
| 3 | API key de OpenWeatherMap movida de código a `REACT_APP_OWM_KEY` | `pages/ClimateDashboard.jsx`, `frontend/.env` |
| 4 | `backend/database_exports/` y `backend/mongodb_data/` sacados del control de versiones | `.gitignore` |
| 5 | Eliminado backend Flask muerto (`app.py`, `climate_routes.py`, `database.py`) | — |
| 6 | Fix `UnicodeEncodeError` en consola Windows (los `print()` con emojis rompían `/climate-data/`) | `settings.py` |
| 7 | Añadidos `backend/.env.example` y `frontend/.env.example` | — |

> **Efecto colateral esperado del cambio 1**: al cambiar la clave de firma, los tokens JWT
> emitidos antes dejan de ser válidos. Los usuarios simplemente vuelven a iniciar sesión una vez.

### 8.1 Pendiente e importante (no resuelto)

1. **El repositorio de GitHub es PÚBLICO** y su historial todavía contiene `users.json` con
   datos personales y las claves antiguas. Hay que **hacer el repo privado** y/o **purgar el
   historial** (`git filter-repo --path backend/database_exports --invert-paths` + `push --force`,
   coordinándolo con quien tenga clones).
2. **Rotar** las credenciales que estuvieron expuestas: `JWT_SECRET`, `ENCRYPTION_KEY`, la API
   key de OpenWeatherMap y (si aplica) el usuario/clave de Mongo.
3. Tras rotar `ENCRYPTION_KEY` hay que actualizar el valor en **los dos** `.env` a la vez.

---

## 9. Deuda técnica conocida

| Tema | Detalle |
|------|---------|
| `POST /reset-password/` | Permite fijar nueva contraseña para **cualquier** correo existente sin token ni verificación. Debe pasar por un token de un solo uso enviado por email. |
| Inconsistencia de rutas | Unas cuelgan de la raíz (`/login/`) y otras llevan `api/` literal en la cadena (`/api/admin/variables/`). Unificar bajo un único prefijo `/api/`. |
| `print()` de depuración | `views.py` tiene muchísimos `print(...)` con emojis. Migrar a `logging`. |
| DRF sin usar | `rest_framework` está en `INSTALLED_APPS` pero las vistas son `JsonResponse` a mano. O se adopta DRF, o se quita. |
| `models.py` / `migrations/` vacíos | No se usa el ORM; se pueden dejar (Django los espera) pero conviene un comentario. |
| `JWT_EXP_DAYS` | Declarada en `.env` y `settings.py` pero `create_jwt` usa 60 min fijos. Decidir cuál manda. |
| Dos librerías de charts | `chart.js` y `recharts` a la vez. Elegir una. |
| `climateAPI.js` / `groqCropAI.js` | Código muerto en el frontend. Borrar o reconectar. |
| `UserMapDashboard.jsx` | ~4700 líneas en un solo archivo. Candidato a partir en hooks/subcomponentes. |
| Muchos warnings de ESLint | Variables sin usar y dependencias de `useEffect` incompletas. No rompen el build. |
| Versión de Django | `requirements.txt` dice `Django>=4.2`; el venv tiene 6.1.x; comentarios mencionan 5.2. Fijar rango. |

---

## 10. Checklist para producción (resumen)

- [ ] Repo privado / historial purgado / credenciales rotadas
- [ ] `backend/.env` con `DJANGO_DEBUG=False`, `DJANGO_SECRET_KEY` real, `DJANGO_ALLOWED_HOSTS` con el dominio
- [ ] `DJANGO_CORS_ALLOW_ALL=False` + `DJANGO_CORS_ORIGINS` con el dominio del frontend
- [ ] `JWT_SECRET` y `ENCRYPTION_KEY` aleatorios y sincronizados con el frontend
- [ ] Servir detrás de HTTPS (TLS) — nginx / Caddy + `gunicorn backend.wsgi` (gunicorn ya está en requirements)
- [ ] MongoDB con autenticación y no expuesto a internet
- [ ] `npm run build` del frontend servido como estáticos; `REACT_APP_API` apuntando al backend real
      (hoy la URL del backend está **hardcodeada** en `src/api/api.js` — parametrizarla)
- [ ] Servicio de correo configurado (`backend/CONFIGURACION_CORREO.md`) para el reset de contraseña
- [ ] Reemplazar `/reset-password/` por un flujo con token

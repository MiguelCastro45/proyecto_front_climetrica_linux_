# Guía de Instalación y Configuración - Sistema Climétrica

## Tabla de Contenidos

1. [Requisitos Previos](#requisitos-previos)
2. [Instalación del Backend](#instalación-del-backend)
3. [Instalación del Frontend](#instalación-del-frontend)
4. [Configuración de MongoDB](#configuración-de-mongodb)
5. [Configuración de Variables de Entorno](#configuración-de-variables-de-entorno)
6. [Inicialización de Datos](#inicialización-de-datos)
7. [Ejecución del Sistema](#ejecución-del-sistema)
8. [Verificación](#verificación)
9. [Solución de Problemas](#solución-de-problemas)
10. [Deployment en Producción](#deployment-en-producción)

---

## Requisitos Previos

### Software Necesario

#### 1. Python 3.12+

**Windows**:
```bash
# Descargar desde python.org
# Verificar instalación
python --version
```

**Linux (Ubuntu/Debian)**:
```bash
sudo apt update
sudo apt install python3.12 python3.12-venv python3-pip
python3 --version
```

**macOS**:
```bash
brew install python@3.12
python3 --version
```

---

#### 2. Node.js 16+ y npm

**Windows/macOS**:
- Descargar desde [nodejs.org](https://nodejs.org/)

**Linux (Ubuntu/Debian)**:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node --version
npm --version
```

---

#### 3. MongoDB 4.4+

**Windows**:
- Descargar MongoDB Community Server desde [mongodb.com](https://www.mongodb.com/try/download/community)

**Linux (Ubuntu/Debian)**:
```bash
# Importar clave pública
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Crear lista de fuentes
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Actualizar e instalar
sudo apt update
sudo apt install -y mongodb-org

# Iniciar servicio
sudo systemctl start mongod
sudo systemctl enable mongod

# Verificar
sudo systemctl status mongod
mongosh --version
```

**macOS**:
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
mongosh --version
```

---

#### 4. Git

**Verificar instalación**:
```bash
git --version
```

Si no está instalado:

**Linux**:
```bash
sudo apt install git
```

**macOS**:
```bash
brew install git
```

**Windows**:
- Descargar desde [git-scm.com](https://git-scm.com/)

---

## Instalación del Backend

### 1. Clonar el Repositorio

```bash
# Clonar
git clone <url-del-repositorio>
cd climetrica
```

### 2. Crear Entorno Virtual

```bash
cd backend

# Crear entorno virtual
python3 -m venv venv

# Activar entorno virtual
# Linux/macOS:
source venv/bin/activate

# Windows:
venv\Scripts\activate
```

**Nota**: Cuando el entorno está activado, verás `(venv)` al inicio de tu línea de comando.

### 3. Instalar Dependencias

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Verificar Instalación de Dependencias

```bash
pip list
```

Deberías ver:
- Django >= 4.2
- pymongo
- python-dotenv
- PyJWT
- bcrypt
- pandas
- geopandas
- gunicorn
- pycryptodome

---

## Instalación del Frontend

### 1. Navegar al Directorio Frontend

```bash
cd ../frontend
```

### 2. Instalar Dependencias

```bash
npm install
```

Este proceso puede tardar varios minutos.

### 3. Verificar Instalación

```bash
npm list --depth=0
```

Deberías ver:
- react >= 19.2.0
- react-dom >= 19.2.0
- react-router-dom >= 7.9.4
- axios >= 1.12.2
- leaflet >= 1.9.4
- chart.js >= 4.5.1
- jspdf >= 3.0.3
- crypto-js >= 4.2.0
- tailwindcss >= 4.1.16

---

## Configuración de MongoDB

### 1. Verificar MongoDB está Ejecutándose

```bash
# Verificar servicio
sudo systemctl status mongod

# O intentar conectar
mongosh
```

### 2. Crear Base de Datos y Usuario (Opcional pero Recomendado)

```bash
mongosh

# Dentro de mongosh:
use climetricadb

# Crear usuario con permisos
db.createUser({
  user: "climetrica_user",
  pwd: "tu_contraseña_segura",
  roles: [
    { role: "readWrite", db: "climetricadb" }
  ]
})

# Salir
exit
```

### 3. URI de Conexión

**Sin autenticación** (desarrollo):
```
mongodb://localhost:27017/
```

**Con autenticación** (recomendado):
```
mongodb://climetrica_user:tu_contraseña_segura@localhost:27017/climetricadb
```

---

## Configuración de Variables de Entorno

### Backend (.env)

```bash
cd backend
nano .env  # o usa tu editor preferido
```

**Contenido del archivo .env**:

```env
# ===========================================
# CONFIGURACIÓN DE BASE DE DATOS
# ===========================================

# MongoDB URI - Ajusta según tu configuración
MONGO_URI=mongodb://localhost:27017/
DB_NAME=climetricadb

# Si configuraste autenticación:
# MONGO_URI=mongodb://climetrica_user:tu_contraseña@localhost:27017/climetricadb


# ===========================================
# CONFIGURACIÓN DE JWT
# ===========================================

# Clave secreta para firmar tokens JWT
# Genera una clave segura con: python -c "import secrets; print(secrets.token_hex(32))"
JWT_SECRET=tu_clave_secreta_muy_larga_y_segura_aqui

# Algoritmo de encriptación
JWT_ALGORITHM=HS256

# Días de expiración del token
JWT_EXP_DAYS=7


# ===========================================
# CONFIGURACIÓN DE ENCRIPTACIÓN
# ===========================================

# Clave de encriptación AES (debe ser la misma en frontend)
# Genera con: python -c "import base64; import os; print(base64.b64encode(os.urandom(32)).decode())"
ENCRYPTION_KEY=tu_clave_de_encriptacion_base64


# ===========================================
# CONFIGURACIÓN DE EMAIL
# ===========================================

# Servidor SMTP
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True

# Credenciales
EMAIL_HOST_USER=tu_email@gmail.com
EMAIL_HOST_PASSWORD=tu_app_password_de_gmail

# Email remitente
DEFAULT_FROM_EMAIL=noreply@climetrica.com


# ===========================================
# CONFIGURACIÓN DE DJANGO
# ===========================================

# Debug (True solo en desarrollo)
DEBUG=True

# Secret Key de Django
# Genera con: python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
SECRET_KEY=tu_django_secret_key

# Hosts permitidos (separados por coma)
ALLOWED_HOSTS=localhost,127.0.0.1


# ===========================================
# CONFIGURACIÓN DE CORS
# ===========================================

# Orígenes permitidos para CORS (separados por coma)
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

---

### Frontend (.env)

```bash
cd ../frontend
nano .env
```

**Contenido del archivo .env**:

```env
# ===========================================
# CONFIGURACIÓN DE API BACKEND
# ===========================================

# URL del backend
REACT_APP_API_URL=http://localhost:8000


# ===========================================
# CONFIGURACIÓN DE APIs EXTERNAS
# ===========================================

# OpenWeatherMap API Key
# Obtener en: https://openweathermap.org/api
REACT_APP_OWM_KEY=tu_api_key_de_openweathermap

# Groq API Key (para análisis con IA)
# Obtener en: https://console.groq.com/
REACT_APP_GROQ_API_KEY=tu_api_key_de_groq


# ===========================================
# CONFIGURACIÓN DE ENCRIPTACIÓN
# ===========================================

# Clave de encriptación (DEBE SER LA MISMA que en backend)
REACT_APP_ENCRYPTION_KEY=la_misma_clave_del_backend


# ===========================================
# CONFIGURACIÓN DE MAPA
# ===========================================

# Centro del mapa por defecto (Bogotá, Colombia)
REACT_APP_MAP_DEFAULT_CENTER_LAT=4.6097
REACT_APP_MAP_DEFAULT_CENTER_LNG=-74.0817
REACT_APP_MAP_DEFAULT_ZOOM=12


# ===========================================
# FEATURE FLAGS
# ===========================================

# Habilitar análisis con IA
REACT_APP_ENABLE_AI_ANALYSIS=true

# Habilitar exportación a PDF
REACT_APP_ENABLE_PDF_EXPORT=true

# Habilitar modo debug
REACT_APP_DEBUG=false
```

---

### Generar Claves Seguras

#### JWT Secret

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

#### Django Secret Key

```bash
python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

#### Encryption Key

```bash
python3 -c "import base64; import os; print(base64.b64encode(os.urandom(32)).decode())"
```

**Importante**: La `ENCRYPTION_KEY` debe ser exactamente la misma en backend y frontend.

---

### Configurar Email (Gmail)

#### 1. Habilitar Autenticación de 2 Factores

1. Ir a [Google Account](https://myaccount.google.com/)
2. Security > 2-Step Verification
3. Activar

#### 2. Generar App Password

1. Security > App passwords
2. Seleccionar app: Mail
3. Seleccionar dispositivo: Other (Climétrica)
4. Generar
5. Copiar la contraseña de 16 caracteres
6. Usar en `EMAIL_HOST_PASSWORD`

---

### Obtener API Keys

#### OpenWeatherMap

1. Ir a [OpenWeatherMap](https://openweathermap.org/api)
2. Sign up / Login
3. API keys
4. Crear nueva key
5. Copiar y usar en `REACT_APP_OWM_KEY`

#### Groq (IA)

1. Ir a [Groq Console](https://console.groq.com/)
2. Sign up / Login
3. API Keys
4. Create API Key
5. Copiar y usar en `REACT_APP_GROQ_API_KEY`

---

## Inicialización de Datos

### 1. Verificar Conexión a MongoDB

```bash
cd backend
source venv/bin/activate  # Linux/macOS
# o
venv\Scripts\activate     # Windows

python verify_database.py
```

Deberías ver:
```
✓ Conexión a MongoDB exitosa
Base de datos: climetricadb
Colecciones encontradas: 0
```

---

### 2. Inicializar Variables y Cultivos

```bash
python init_dashboard_data.py
```

Este script creará:
- 10 variables climáticas predefinidas
- 8 cultivos colombianos con requerimientos

Salida esperada:
```
==================================================
  INICIALIZACIÓN DE DATOS DEL DASHBOARD
==================================================

🔧 Inicializando variables del dashboard...
✅ 10 variables creadas exitosamente.

🌱 Inicializando cultivos...
✅ 8 cultivos creados exitosamente.

==================================================
✨ Inicialización completada exitosamente
==================================================
```

---

### 3. Crear Usuario Administrador (Opcional)

```bash
python -c "
from api.mongodb import users_col
from api.auth_utils import hash_password
from datetime import datetime

admin_user = {
    'first_name': 'Admin',
    'last_name': 'Sistema',
    'email': 'admin@climetrica.com',
    'phone': '3001234567',
    'identification': '000000000',
    'role': 'admin',
    'status': 'active',
    'password_hash': hash_password('Admin123!'),
    'created_at': datetime.utcnow(),
    'updated_at': datetime.utcnow(),
    'must_change_password': False
}

users_col.insert_one(admin_user)
print('✅ Usuario administrador creado')
print('Email: admin@climetrica.com')
print('Contraseña: Admin123!')
"
```

---

## Ejecución del Sistema

### Opción 1: Ejecución Manual (Dos Terminales)

#### Terminal 1 - Backend

```bash
cd backend
source venv/bin/activate  # Linux/macOS
# o
venv\Scripts\activate     # Windows

python manage.py runserver
```

Salida esperada:
```
Django version 4.2.x, using settings 'backend.settings'
Starting development server at http://127.0.0.1:8000/
Quit the server with CONTROL-C.
```

#### Terminal 2 - Frontend

```bash
cd frontend
npm start
```

Salida esperada:
```
Compiled successfully!

You can now view climetrica-frontend in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000
```

---

### Opción 2: Script de Inicio (Recomendado)

Crear archivo `start.sh` en la raíz del proyecto:

```bash
#!/bin/bash

echo "🚀 Iniciando Sistema Climétrica..."

# Verificar MongoDB
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB no está ejecutándose"
    echo "Iniciando MongoDB..."
    sudo systemctl start mongod
fi

# Iniciar backend
echo "📡 Iniciando backend..."
cd backend
source venv/bin/activate
python manage.py runserver &
BACKEND_PID=$!
cd ..

# Esperar a que backend inicie
sleep 3

# Iniciar frontend
echo "🎨 Iniciando frontend..."
cd frontend
npm start &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Sistema iniciado exitosamente"
echo ""
echo "📡 Backend: http://localhost:8000"
echo "🎨 Frontend: http://localhost:3000"
echo ""
echo "Para detener: Ctrl+C en ambas ventanas o:"
echo "  kill $BACKEND_PID $FRONTEND_PID"
```

Dar permisos y ejecutar:

```bash
chmod +x start.sh
./start.sh
```

---

## Verificación

### 1. Verificar Backend

Abrir navegador en: `http://localhost:8000/api/`

Deberías ver la página de la API REST de Django.

**Probar endpoint**:
```bash
curl http://localhost:8000/api/dashboard-variables/
```

---

### 2. Verificar Frontend

Abrir navegador en: `http://localhost:3000`

Deberías ver la página de login.

---

### 3. Verificar MongoDB

```bash
mongosh

use climetricadb
show collections
db.users.countDocuments()
db.dashboard_variables.countDocuments()
db.crops.countDocuments()

exit
```

---

### 4. Verificar Conexión Frontend-Backend

1. Abrir `http://localhost:3000`
2. Abrir Developer Tools (F12)
3. Ir a Console
4. Intentar login
5. Verificar que no hay errores de CORS
6. Verificar requests en Network tab

---

### 5. Prueba End-to-End

1. **Registrar Usuario**:
   - Ir a `http://localhost:3000/register`
   - Completar formulario
   - Verificar registro exitoso

2. **Iniciar Sesión**:
   - Usar credenciales registradas
   - Verificar redirección a dashboard

3. **Consultar Datos Climáticos**:
   - Seleccionar variable
   - Buscar ubicación
   - Verificar datos se cargan

4. **Guardar Consulta**:
   - Guardar datos
   - Verificar en MongoDB:
     ```bash
     mongosh
     use climetricadb
     db.climate_data.find().pretty()
     ```

---

## Solución de Problemas

### Problema: Puerto 8000 ya en uso

```bash
# Linux/macOS
lsof -ti:8000 | xargs kill -9

# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

---

### Problema: Puerto 3000 ya en uso

```bash
# Linux/macOS
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

---

### Problema: MongoDB no se conecta

```bash
# Verificar servicio
sudo systemctl status mongod

# Reiniciar
sudo systemctl restart mongod

# Ver logs
sudo journalctl -u mongod -f
```

---

### Problema: Errores de CORS

**Verificar**:
1. `CORS_ALLOWED_ORIGINS` en `backend/.env` incluye `http://localhost:3000`
2. Frontend está ejecutándose en puerto 3000
3. Reiniciar backend después de cambiar `.env`

---

### Problema: Módulos de Python no encontrados

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

---

### Problema: Módulos de npm no encontrados

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

---

### Problema: Error de encriptación

**Verificar**:
1. `ENCRYPTION_KEY` es exactamente la misma en backend y frontend
2. La clave es válida base64
3. Generar nueva clave si es necesario

---

### Problema: Email no se envía

**Verificar**:
1. Credenciales de Gmail correctas
2. App Password (no contraseña normal)
3. 2FA habilitado en Gmail
4. Variables `EMAIL_*` correctas en `.env`

---

### Problema: API Keys no funcionan

**Verificar**:
1. Keys válidas y activas
2. Quotas no excedidos
3. Variables `REACT_APP_*` en frontend `.env`
4. Reiniciar frontend después de cambiar `.env`

---

## Deployment en Producción

### Preparación

#### 1. Configuración de Variables de Entorno

**Backend**:
```env
DEBUG=False
ALLOWED_HOSTS=tu-dominio.com,www.tu-dominio.com
CORS_ALLOWED_ORIGINS=https://tu-dominio.com,https://www.tu-dominio.com
```

**Frontend**:
```env
REACT_APP_API_URL=https://api.tu-dominio.com
```

---

#### 2. Build del Frontend

```bash
cd frontend
npm run build
```

Esto genera `frontend/build/` con archivos optimizados.

---

### Deployment Backend

#### Opción 1: Gunicorn + Nginx

**Instalar Gunicorn**:
```bash
cd backend
source venv/bin/activate
pip install gunicorn
```

**Crear servicio systemd** (`/etc/systemd/system/climetrica-backend.service`):
```ini
[Unit]
Description=Climetrica Backend
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/path/to/climetrica/backend
Environment="PATH=/path/to/climetrica/backend/venv/bin"
ExecStart=/path/to/climetrica/backend/venv/bin/gunicorn \
          --workers 4 \
          --bind unix:/tmp/climetrica-backend.sock \
          --timeout 120 \
          backend.wsgi:application

[Install]
WantedBy=multi-user.target
```

**Iniciar servicio**:
```bash
sudo systemctl daemon-reload
sudo systemctl start climetrica-backend
sudo systemctl enable climetrica-backend
```

**Configurar Nginx** (`/etc/nginx/sites-available/climetrica-backend`):
```nginx
server {
    listen 80;
    server_name api.tu-dominio.com;

    location / {
        proxy_pass http://unix:/tmp/climetrica-backend.sock;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Activar sitio**:
```bash
sudo ln -s /etc/nginx/sites-available/climetrica-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

### Deployment Frontend

#### Opción 1: Netlify

```bash
cd frontend

# Instalar Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod --dir=build
```

Configurar variables de entorno en Netlify Dashboard.

---

#### Opción 2: Vercel

```bash
cd frontend

# Instalar Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

Configurar variables de entorno en Vercel Dashboard.

---

#### Opción 3: Nginx (Servidor Propio)

**Configurar Nginx** (`/etc/nginx/sites-available/climetrica-frontend`):
```nginx
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;

    root /path/to/climetrica/frontend/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Activar sitio**:
```bash
sudo ln -s /etc/nginx/sites-available/climetrica-frontend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

### SSL/HTTPS (Let's Encrypt)

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obtener certificados
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
sudo certbot --nginx -d api.tu-dominio.com

# Renovación automática
sudo systemctl status certbot.timer
```

---

## Mantenimiento

### Backup de Base de Datos

```bash
# Usar script de exportación
cd backend
source venv/bin/activate
python export_database.py

# O usar mongodump
mongodump --db climetricadb --out backup/$(date +%Y%m%d)
```

### Restauración de Base de Datos

```bash
# Usar script de importación
python import_database.py database_exports/export_20251215_235456 --replace

# O usar mongorestore
mongorestore --db climetricadb backup/20251215/climetricadb/
```

---

## Recursos Adicionales

- [Documentación Backend](DOCUMENTACION_BACKEND.md)
- [Documentación Frontend](DOCUMENTACION_FRONTEND.md)
- [Documentación de Código](DOCUMENTACION_CODIGO.md)
- [Sistema de Animaciones](SISTEMA_ANIMACIONES.md)
- [Integración IA](INTEGRACION_IA_CULTIVOS.md)

---

## Soporte

Para problemas o preguntas:
1. Revisar esta guía
2. Revisar logs del sistema
3. Contactar al equipo de desarrollo

---

## Autor

Sistema de Monitoreo Climático - Climétrica

## Fecha

Diciembre 2025

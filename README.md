# Climétrica - Sistema de Monitoreo Climático

Sistema web integral para monitoreo, análisis y visualización de datos climáticos con enfoque en producción agrícola.

## 🚀 Inicio Rápido

### Prerequisitos

- Python 3.12+
- Node.js 16+
- MongoDB 4.4+

### Instalación

#### 1. Backend

```bash
cd backend

# Crear y activar entorno virtual
python3 -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones

# Ejecutar servidor
python manage.py runserver
```

El backend estará disponible en `http://localhost:8000`

#### 2. Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus API keys

# Ejecutar servidor de desarrollo
npm start
```

El frontend estará disponible en `http://localhost:3000`

## 📁 Estructura del Proyecto

```
climetrica/
├── backend/          # Backend Django + MongoDB
│   ├── api/         # API REST
│   ├── backend/     # Configuración Django
│   └── venv/        # Entorno virtual Python
│
└── frontend/        # Frontend React
    ├── public/      # Archivos estáticos
    └── src/         # Código fuente React
```

Ver [ESTRUCTURA_PROYECTO.md](ESTRUCTURA_PROYECTO.md) para más detalles.

## ✨ Características

- 🔐 **Autenticación segura** con encriptación AES y JWT
- 🗺️ **Mapas interactivos** con múltiples capas climáticas
- 📊 **Visualización de datos** con gráficos y series temporales
- 🌾 **Análisis de cultivos** con recomendaciones personalizadas
- 📥 **Exportación** a JSON y PDF
- 👥 **Panel de administración** para gestión de usuarios
- 🔔 **Sistema de notificaciones** y alertas
- 📱 **Diseño responsive** para todos los dispositivos

## 🛠️ Tecnologías

### Backend
- Django 4.2+
- MongoDB con PyMongo
- JWT para autenticación
- bcrypt para hashing
- PyCryptodome para encriptación

### Frontend
- React 18
- React Router
- Axios
- Leaflet (mapas)
- Chart.js (gráficos)
- jsPDF (exportación PDF)

## 📚 Documentación

- [Estructura del Proyecto](ESTRUCTURA_PROYECTO.md)
- [Manejo de Errores](frontend/MANEJO_ERRORES.md)
- [Configuración de Correo](backend/CONFIGURACION_CORREO.md)
- [Sistema de Encriptación](SEGURIDAD_ENCRIPTACION.md)

## 🔒 Seguridad

- Encriptación AES de credenciales en tránsito
- Tokens JWT con expiración configurable
- Hashing bcrypt de contraseñas
- Validación de email e identificación únicos
- Contraseñas seguras obligatorias
- CORS configurado

## 🌐 API Endpoints

### Autenticación
- `POST /api/register/` - Registro
- `POST /api/login/` - Inicio de sesión
- `POST /api/reset-password/` - Recuperar contraseña

### Datos Climáticos
- `GET /api/climate-data/` - Obtener datos
- `POST /api/climate-data/save/` - Guardar
- `DELETE /api/climate-data/<id>/` - Eliminar

### Usuarios (Admin)
- `GET /api/users/` - Listar
- `PUT /api/users/<id>/` - Actualizar
- `DELETE /api/users/<id>/` - Eliminar

## 🧪 Testing

```bash
# Backend
cd backend
python manage.py test

# Frontend
cd frontend
npm test
```

## 🚢 Deployment

### Backend (Django)

```bash
cd backend

# Instalar gunicorn
pip install gunicorn

# Ejecutar con gunicorn
gunicorn backend.wsgi:application --bind 0.0.0.0:8000
```

### Frontend (React)

```bash
cd frontend

# Build de producción
npm run build

# Los archivos estarán en frontend/build/
```

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto es privado y de uso exclusivo para Climétrica.

## 👥 Autores

Sistema de Monitoreo Climático - Climétrica

## 📧 Contacto

Para más información, contacta al equipo de desarrollo.

---

Desarrollado con ❤️ por el equipo de Climétrica

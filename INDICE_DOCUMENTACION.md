# Índice de Documentación - Sistema Climétrica

> Documentación completa del sistema de monitoreo climático Climétrica

---

## 📖 Guía de Lectura

### Para Nuevos Desarrolladores

1. Comienza con [README.md](README.md) para visión general
2. Lee [GUIA_INSTALACION.md](GUIA_INSTALACION.md) para configurar el ambiente
3. Revisa [ARQUITECTURA_SISTEMA.md](ARQUITECTURA_SISTEMA.md) para entender el diseño
4. Explora [DOCUMENTACION_CODIGO.md](DOCUMENTACION_CODIGO.md) para detalles de implementación

### Para Administradores de Sistema

1. [GUIA_INSTALACION.md](GUIA_INSTALACION.md) - Deployment y configuración
2. [DOCUMENTACION_SCRIPTS.md](DOCUMENTACION_SCRIPTS.md) - Mantenimiento y backups
3. [DOCUMENTACION_BACKEND.md](DOCUMENTACION_BACKEND.md) - Configuración de backend

### Para Desarrolladores Frontend

1. [DOCUMENTACION_FRONTEND.md](DOCUMENTACION_FRONTEND.md) - Componentes y páginas
2. [SISTEMA_ANIMACIONES.md](SISTEMA_ANIMACIONES.md) - Mapas y animaciones
3. [INTEGRACION_IA_CULTIVOS.md](INTEGRACION_IA_CULTIVOS.md) - Integración con IA

### Para Desarrolladores Backend

1. [DOCUMENTACION_BACKEND.md](DOCUMENTACION_BACKEND.md) - API y servicios
2. [DOCUMENTACION_SCRIPTS.md](DOCUMENTACION_SCRIPTS.md) - Scripts de utilidad
3. [backend/CONFIGURACION_CORREO.md](backend/CONFIGURACION_CORREO.md) - Email

---

## 📚 Documentación por Categoría

### 🎯 Documentación Principal

| Documento | Descripción | Audiencia |
|-----------|-------------|-----------|
| [README.md](README.md) | Visión general del proyecto | Todos |
| [GUIA_INSTALACION.md](GUIA_INSTALACION.md) | Instalación paso a paso completa | Desarrolladores, SysAdmins |
| [ARQUITECTURA_SISTEMA.md](ARQUITECTURA_SISTEMA.md) | Diseño y arquitectura del sistema | Arquitectos, Desarrolladores |
| [ESTRUCTURA_PROYECTO.md](ESTRUCTURA_PROYECTO.md) | Organización de archivos | Desarrolladores |

---

### 💻 Documentación Técnica

#### Backend

| Documento | Descripción | Temas Principales |
|-----------|-------------|-------------------|
| [DOCUMENTACION_BACKEND.md](DOCUMENTACION_BACKEND.md) | API REST completa | • Endpoints<br>• Base de datos MongoDB<br>• Autenticación JWT<br>• Servicios<br>• Seguridad |
| [backend/CONFIGURACION_CORREO.md](backend/CONFIGURACION_CORREO.md) | Configuración de email | • SMTP<br>• Gmail App Password<br>• Templates |
| [DOCUMENTACION_SCRIPTS.md](DOCUMENTACION_SCRIPTS.md) | Scripts de utilidad | • Backup/Restore<br>• Migración<br>• Mantenimiento |

#### Frontend

| Documento | Descripción | Temas Principales |
|-----------|-------------|-------------------|
| [DOCUMENTACION_FRONTEND.md](DOCUMENTACION_FRONTEND.md) | React SPA completo | • Componentes<br>• Páginas<br>• Servicios API<br>• Estilos |
| [frontend/MANEJO_ERRORES.md](frontend/MANEJO_ERRORES.md) | Sistema de errores | • ErrorHandler<br>• Códigos de error<br>• Mensajes |

---

### ⚙️ Características Específicas

| Documento | Descripción | Contenido |
|-----------|-------------|-----------|
| [SISTEMA_ANIMACIONES.md](SISTEMA_ANIMACIONES.md) | Capas animadas de mapa | • Leaflet<br>• Series temporales<br>• Capas WMTS/WMS |
| [INTEGRACION_IA_CULTIVOS.md](INTEGRACION_IA_CULTIVOS.md) | Análisis con IA | • Groq API<br>• Mixtral<br>• Recomendaciones |
| [COMO_AGREGAR_VARIABLES.md](COMO_AGREGAR_VARIABLES.md) | Agregar variables | • Configuración<br>• APIs<br>• Capas |
| [DOCUMENTACION_CODIGO.md](DOCUMENTACION_CODIGO.md) | Código documentado | • Funciones<br>• Clases<br>• Módulos |

---

### 🔒 Seguridad y Configuración

| Documento | Descripción | Contenido |
|-----------|-------------|-----------|
| [SEGURIDAD_ENCRIPTACION.md](SEGURIDAD_ENCRIPTACION.md) | Sistema de encriptación | • AES-256<br>• JWT<br>• bcrypt |
| **Variables de Entorno** | `.env` configuración | • MongoDB<br>• APIs<br>• Email |

---

### 💾 Base de Datos

| Recurso | Descripción | Ubicación |
|---------|-------------|-----------|
| **Exportación** | Backup completo de BD | `backend/database_exports/` |
| **Script Export** | Exportar colecciones | `backend/export_database.py` |
| **Script Import** | Importar colecciones | `backend/import_database.py` |
| **Script Init** | Inicializar datos | `backend/init_dashboard_data.py` |
| **Script Verify** | Verificar BD | `backend/verify_database.py` |

**Última exportación**: 15 de diciembre de 2025
- **Colecciones**: 4 (users, crops, climate_data, dashboard_variables)
- **Documentos**: 27 totales
- **Ubicación**: `backend/database_exports/export_20251215_235456/`

---

## 📋 Contenido Detallado por Documento

### README.md
```
• Visión general del proyecto
• Inicio rápido
• Características principales
• Stack tecnológico
• Enlaces a documentación
```

### GUIA_INSTALACION.md
```
• Requisitos previos
  - Python 3.12+
  - Node.js 16+
  - MongoDB 4.4+
• Instalación del backend
• Instalación del frontend
• Configuración de MongoDB
• Variables de entorno
• Inicialización de datos
• Ejecución del sistema
• Verificación
• Solución de problemas
• Deployment en producción
```

### ARQUITECTURA_SISTEMA.md
```
• Visión general
• Arquitectura de alto nivel
  - Diagrama de 3 capas
  - Flujo de datos
• Componentes del sistema
  - Frontend React
  - Backend Django
  - Base de datos MongoDB
• Integraciones externas
  - OpenWeatherMap
  - NASA POWER
  - Open-Meteo
  - Groq AI
• Seguridad
  - Autenticación
  - Encriptación
  - Validación
• Escalabilidad
• Diagramas
```

### DOCUMENTACION_BACKEND.md
```
• Arquitectura backend
• Base de datos
  - Colecciones y esquemas
  - Índices
• API Endpoints
  - Autenticación
  - Perfil de usuario
  - Datos climáticos
  - Variables
  - Cultivos
  - Administración
• Módulos y servicios
  - auth_utils.py
  - crypto_utils.py
  - email_service.py
  - decorators.py
  - dataset_utils.py
• Scripts de utilidad
• Configuración
• Seguridad
• Deployment
```

### DOCUMENTACION_FRONTEND.md
```
• Arquitectura frontend
• Componentes
  - AnimatedLayer
  - AdminUsers
  - AdminVariables
  - AdminCrops
• Páginas
  - Login
  - Register
  - UserPanel
  - UserMapDashboard
  - ClimateDashboard
  - AdminDashboard
• Servicios API
  - api.js
  - climateAPI.js
  - groqCropAI.js
• Estilos
  - Tailwind CSS
  - CSS Modules
• Configuración
• Testing
• Build y deployment
```

### DOCUMENTACION_SCRIPTS.md
```
• Scripts de base de datos
  - export_database.py
  - import_database.py
  - init_dashboard_data.py
  - verify_database.py
• Scripts de configuración
  - show_current_config.py
• Scripts de migración
  - migrate_from_frontend.py
• Scripts de mantenimiento
  - fix_variables_layers.py
  - add_new_variable.py
  - update_variables_to_wmts.py
• Uso y ejemplos
• Automatización
• Mejores prácticas
```

### SISTEMA_ANIMACIONES.md
```
• Sistema de capas animadas
• Leaflet con series temporales
• Configuración de capas
  - WMTS
  - WMS
  - Tile layers
• Componente AnimatedLayer
• APIs utilizadas
• Implementación
```

### INTEGRACION_IA_CULTIVOS.md
```
• Integración con Groq
• Modelo Mixtral 8x7b
• Análisis de aptitud de cultivos
• Generación de recomendaciones
• Identificación de riesgos
• Mejores prácticas agrícolas
• Prompts y configuración
```

### DOCUMENTACION_CODIGO.md
```
• Backend
  - Vistas y endpoints
  - Servicios
  - Utilidades
• Frontend
  - Componentes
  - Páginas
  - Servicios
• Convenciones de código
• Comentarios y documentación
```

---

## 🗂️ Estructura de Archivos del Proyecto

```
climetrica/
│
├── README.md                           # Visión general
├── INDICE_DOCUMENTACION.md            # Este archivo
├── GUIA_INSTALACION.md                # Instalación completa
├── ARQUITECTURA_SISTEMA.md            # Diseño del sistema
├── ESTRUCTURA_PROYECTO.md             # Organización de archivos
│
├── DOCUMENTACION_BACKEND.md           # Doc backend
├── DOCUMENTACION_FRONTEND.md          # Doc frontend
├── DOCUMENTACION_SCRIPTS.md           # Doc scripts
├── DOCUMENTACION_CODIGO.md            # Doc código
│
├── SISTEMA_ANIMACIONES.md             # Animaciones y mapas
├── INTEGRACION_IA_CULTIVOS.md         # IA para cultivos
├── COMO_AGREGAR_VARIABLES.md          # Agregar variables
├── SEGURIDAD_ENCRIPTACION.md          # Seguridad
├── README_IA.md                       # Info sobre IA
│
├── backend/
│   ├── api/
│   │   ├── views.py
│   │   ├── admin_views.py
│   │   ├── public_views.py
│   │   ├── auth_utils.py
│   │   ├── crypto_utils.py
│   │   ├── email_service.py
│   │   ├── decorators.py
│   │   ├── mongodb.py
│   │   └── ...
│   │
│   ├── database_exports/              # Backups BD
│   │   └── export_20251215_235456/
│   │       ├── users.json
│   │       ├── crops.json
│   │       ├── climate_data.json
│   │       ├── dashboard_variables.json
│   │       └── export_summary.json
│   │
│   ├── export_database.py             # Script export
│   ├── import_database.py             # Script import
│   ├── init_dashboard_data.py         # Script init
│   ├── verify_database.py             # Script verify
│   ├── migrate_from_frontend.py       # Script migración
│   ├── fix_variables_layers.py        # Script fix
│   ├── add_new_variable.py            # Script agregar var
│   ├── show_current_config.py         # Script config
│   │
│   ├── requirements.txt               # Dependencias Python
│   ├── .env                           # Variables de entorno
│   ├── manage.py                      # Django manage
│   ├── settings.py                    # Configuración Django
│   │
│   ├── CONFIGURACION_CORREO.md        # Doc email
│   └── ...
│
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── UserPanel.jsx
    │   │   ├── UserMapDashboard.jsx
    │   │   ├── AdminDashboard.jsx
    │   │   └── ...
    │   │
    │   ├── components/
    │   │   ├── AnimatedLayer.jsx
    │   │   ├── AdminUsers.jsx
    │   │   ├── AdminVariables.jsx
    │   │   ├── AdminCrops.jsx
    │   │   └── ...
    │   │
    │   ├── api/
    │   │   ├── api.js
    │   │   ├── climateAPI.js
    │   │   ├── groqCropAI.js
    │   │   └── ...
    │   │
    │   ├── styles/
    │   ├── utils/
    │   └── App.js
    │
    ├── package.json                   # Dependencias npm
    ├── .env                           # Variables de entorno
    ├── tailwind.config.js             # Config Tailwind
    │
    ├── MANEJO_ERRORES.md              # Doc errores
    └── ...
```

---

## 🔍 Búsqueda Rápida

### Por Tema

**Instalación**: [GUIA_INSTALACION.md](GUIA_INSTALACION.md)

**APIs**: [DOCUMENTACION_BACKEND.md](DOCUMENTACION_BACKEND.md#api-endpoints)

**Componentes**: [DOCUMENTACION_FRONTEND.md](DOCUMENTACION_FRONTEND.md#componentes)

**Base de Datos**: [DOCUMENTACION_BACKEND.md](DOCUMENTACION_BACKEND.md#base-de-datos)

**Seguridad**: [SEGURIDAD_ENCRIPTACION.md](SEGURIDAD_ENCRIPTACION.md)

**Mapas**: [SISTEMA_ANIMACIONES.md](SISTEMA_ANIMACIONES.md)

**IA**: [INTEGRACION_IA_CULTIVOS.md](INTEGRACION_IA_CULTIVOS.md)

**Scripts**: [DOCUMENTACION_SCRIPTS.md](DOCUMENTACION_SCRIPTS.md)

**Deployment**: [GUIA_INSTALACION.md](GUIA_INSTALACION.md#deployment-en-producción)

---

### Por Tecnología

**Django**: [DOCUMENTACION_BACKEND.md](DOCUMENTACION_BACKEND.md)

**React**: [DOCUMENTACION_FRONTEND.md](DOCUMENTACION_FRONTEND.md)

**MongoDB**: [DOCUMENTACION_BACKEND.md](DOCUMENTACION_BACKEND.md#base-de-datos)

**Leaflet**: [SISTEMA_ANIMACIONES.md](SISTEMA_ANIMACIONES.md)

**JWT**: [SEGURIDAD_ENCRIPTACION.md](SEGURIDAD_ENCRIPTACION.md)

**Groq AI**: [INTEGRACION_IA_CULTIVOS.md](INTEGRACION_IA_CULTIVOS.md)

---

### Por Tarea

**Instalar el sistema**: [GUIA_INSTALACION.md](GUIA_INSTALACION.md)

**Agregar una variable**: [COMO_AGREGAR_VARIABLES.md](COMO_AGREGAR_VARIABLES.md)

**Hacer backup**: [DOCUMENTACION_SCRIPTS.md](DOCUMENTACION_SCRIPTS.md#export_databasepy)

**Configurar email**: [backend/CONFIGURACION_CORREO.md](backend/CONFIGURACION_CORREO.md)

**Crear componente**: [DOCUMENTACION_FRONTEND.md](DOCUMENTACION_FRONTEND.md#componentes)

**Agregar endpoint**: [DOCUMENTACION_BACKEND.md](DOCUMENTACION_BACKEND.md#api-endpoints)

**Solucionar errores**: [GUIA_INSTALACION.md](GUIA_INSTALACION.md#solución-de-problemas)

---

## 📊 Estadísticas de Documentación

- **Documentos totales**: 15
- **Documentos técnicos**: 8
- **Guías de instalación**: 1
- **Documentos de características**: 3
- **Archivos de configuración documentados**: 2
- **Scripts documentados**: 10
- **Páginas totales estimadas**: ~200

---

## 🆕 Última Actualización

**Fecha**: 15 de diciembre de 2025

**Cambios recientes**:
- ✅ Creada documentación completa del backend
- ✅ Creada documentación completa del frontend
- ✅ Creada guía de instalación detallada
- ✅ Creada documentación de arquitectura
- ✅ Documentados todos los scripts de utilidad
- ✅ Exportada base de datos completa
- ✅ Actualizado README principal
- ✅ Creado índice de documentación

---

## 👥 Contribuir a la Documentación

Para agregar o actualizar documentación:

1. Mantener formato Markdown consistente
2. Incluir ejemplos de código cuando sea posible
3. Actualizar este índice si se agrega nuevo documento
4. Usar enlaces relativos para referencias internas
5. Incluir fecha de última actualización
6. Mantener TOC (Tabla de Contenidos) en documentos largos

---

## 📝 Licencia

Este proyecto y su documentación son privados y de uso exclusivo para Climétrica.

---

## 📧 Contacto

Para preguntas sobre la documentación, contactar al equipo de desarrollo.

---

**Desarrollado con ❤️ por el equipo de Climétrica**

*Última actualización: Diciembre 15, 2025*

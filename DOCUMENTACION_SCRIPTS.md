# Documentación de Scripts de Utilidad - Sistema Climétrica

## Tabla de Contenidos

1. [Scripts de Base de Datos](#scripts-de-base-de-datos)
2. [Scripts de Configuración](#scripts-de-configuración)
3. [Scripts de Migración](#scripts-de-migración)
4. [Scripts de Mantenimiento](#scripts-de-mantenimiento)
5. [Uso y Ejemplos](#uso-y-ejemplos)

---

## Scripts de Base de Datos

### export_database.py

Exporta todas las colecciones de MongoDB a archivos JSON organizados por fecha.

**Ubicación**: `backend/export_database.py`

**Descripción**:
- Exporta todas las colecciones de la base de datos
- Serializa datos MongoDB (ObjectId, DateTime) a JSON
- Organiza exportaciones por timestamp
- Genera resumen de exportación

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
    ├── users.json                # Usuarios
    ├── crops.json                # Cultivos
    ├── climate_data.json         # Datos climáticos
    ├── dashboard_variables.json  # Variables del dashboard
    └── export_summary.json       # Resumen de la exportación
```

**Formato de export_summary.json**:
```json
{
  "timestamp": "20251215_235456",
  "date": "2025-12-15T23:54:56",
  "database": "climetricadb",
  "total_collections": 4,
  "total_documents": 27,
  "collections": [
    {
      "collection": "users",
      "documents": 3,
      "file": "users.json"
    },
    ...
  ]
}
```

**Funciones principales**:

```python
def serialize_document(doc):
    """
    Serializa un documento MongoDB a JSON.
    - Convierte ObjectId a string
    - Convierte DateTime a ISO string
    - Maneja diccionarios y listas anidados
    """

def export_collection(collection_name, output_dir):
    """
    Exporta una colección específica a JSON.
    Returns: (cantidad_documentos, nombre_archivo)
    """

def export_database():
    """
    Exporta todas las colecciones de la base de datos.
    """
```

**Casos de uso**:
- Backup periódico de datos
- Migración entre ambientes
- Auditoría de datos
- Recuperación ante desastres

---

### import_database.py

Importa colecciones desde archivos JSON exportados.

**Ubicación**: `backend/import_database.py`

**Descripción**:
- Importa colecciones desde directorio de exportación
- Deserializa datos JSON a formato MongoDB
- Soporta modo agregar y modo reemplazo
- Confirmación antes de ejecutar

**Uso**:

```bash
cd backend
source venv/bin/activate

# Modo agregar (mantiene datos existentes)
python import_database.py database_exports/export_20251215_235456

# Modo reemplazo (elimina datos existentes)
python import_database.py database_exports/export_20251215_235456 --replace
```

**Argumentos**:
- `<directorio>`: Ruta al directorio de exportación
- `--replace`: Flag opcional para reemplazar datos existentes

**Funciones principales**:

```python
def deserialize_document(doc):
    """
    Deserializa documento JSON a formato MongoDB.
    - Convierte strings a ObjectId
    - Convierte ISO strings a DateTime
    - Maneja estructuras anidadas
    """

def import_collection(collection_name, json_file, replace=False):
    """
    Importa una colección desde archivo JSON.
    Returns: cantidad_documentos_importados
    """

def import_database(export_dir, replace=False):
    """
    Importa todas las colecciones desde directorio.
    """
```

**Casos de uso**:
- Restauración de backups
- Migración de datos
- Población de ambientes de desarrollo/testing
- Recuperación de datos

**Precauciones**:
- Usa `--replace` con cuidado (elimina datos existentes)
- Verifica el contenido antes de importar
- Haz backup antes de reemplazar datos en producción

---

### init_dashboard_data.py

Inicializa la base de datos con variables climáticas y cultivos predefinidos.

**Ubicación**: `backend/init_dashboard_data.py`

**Descripción**:
- Inicializa colección `dashboard_variables` con 10 variables
- Inicializa colección `crops` con 8 cultivos colombianos
- Solicita confirmación si ya existen datos
- Permite reinicializar eliminando datos anteriores

**Uso**:
```bash
cd backend
source venv/bin/activate
python init_dashboard_data.py
```

**Datos creados**:

**Variables (10)**:
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

**Cultivos (8)**:
1. Café (Coffea arabica)
2. Banano (Musa paradisiaca)
3. Cacao (Theobroma cacao)
4. Arroz (Oryza sativa)
5. Maíz (Zea mays)
6. Papa (Solanum tuberosum)
7. Aguacate (Persea americana)
8. Plátano (Musa paradisiaca)

**Funciones principales**:

```python
def init_dashboard_variables():
    """
    Inicializa variables del dashboard.
    - Verifica si existen datos
    - Solicita confirmación para reinicializar
    - Inserta variables predefinidas
    """

def init_crops():
    """
    Inicializa cultivos.
    - Verifica si existen datos
    - Solicita confirmación para reinicializar
    - Inserta cultivos predefinidos con requerimientos
    """
```

**Casos de uso**:
- Primera instalación del sistema
- Resetear datos a valores por defecto
- Ambientes de desarrollo/testing
- Recuperación de datos esenciales

**Ejemplo de salida**:
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

### verify_database.py

Verifica la conexión y estado de la base de datos MongoDB.

**Ubicación**: `backend/verify_database.py`

**Descripción**:
- Verifica conexión a MongoDB
- Lista todas las colecciones
- Muestra conteo de documentos
- Muestra índices configurados
- Verifica integridad de datos

**Uso**:
```bash
cd backend
source venv/bin/activate
python verify_database.py
```

**Ejemplo de salida**:
```
==================================================
  VERIFICACIÓN DE BASE DE DATOS
==================================================

✓ Conexión a MongoDB exitosa
Base de datos: climetricadb

Colecciones encontradas: 4

📊 DETALLES DE COLECCIONES:
--------------------------------------------------

Collection: users
  Documentos: 3
  Índices:
    - _id_ (único)
    - email_1 (único)
    - identification_1 (único)

Collection: dashboard_variables
  Documentos: 10
  Índices:
    - _id_ (único)
    - clave_1 (único)

Collection: crops
  Documentos: 8
  Índices:
    - _id_ (único)

Collection: climate_data
  Documentos: 15
  Índices:
    - _id_ (único)
    - usuario._id_1

==================================================
✅ Verificación completada
==================================================
```

**Funciones de verificación**:

```python
def check_connection():
    """Verifica conexión a MongoDB."""

def list_collections():
    """Lista todas las colecciones."""

def count_documents(collection_name):
    """Cuenta documentos en colección."""

def list_indexes(collection_name):
    """Lista índices de colección."""

def verify_data_integrity():
    """Verifica integridad referencial de datos."""
```

**Casos de uso**:
- Diagnóstico de problemas
- Verificación post-instalación
- Auditoría de base de datos
- Monitoreo de salud del sistema

---

## Scripts de Configuración

### show_current_config.py

Muestra la configuración actual del sistema.

**Ubicación**: `backend/show_current_config.py`

**Descripción**:
- Muestra variables de entorno cargadas
- Oculta información sensible
- Verifica configuración de MongoDB
- Verifica configuración de email

**Uso**:
```bash
cd backend
source venv/bin/activate
python show_current_config.py
```

**Ejemplo de salida**:
```
==================================================
  CONFIGURACIÓN ACTUAL DEL SISTEMA
==================================================

BASE DE DATOS:
  MongoDB URI: mongodb://localhost:27017/
  Database: climetricadb
  Estado: ✓ Conectado

JWT:
  Algorithm: HS256
  Expiration: 7 días
  Secret: ******** (configurado)

ENCRIPTACIÓN:
  Key: ******** (configurado)
  Longitud: 44 caracteres

EMAIL:
  Host: smtp.gmail.com
  Port: 587
  TLS: True
  User: tu_email@gmail.com
  Password: ******** (configurado)

DJANGO:
  Debug: True
  Allowed Hosts: localhost, 127.0.0.1
  Secret Key: ******** (configurado)

CORS:
  Allowed Origins: http://localhost:3000

==================================================
```

**Casos de uso**:
- Verificar configuración
- Diagnóstico de problemas
- Documentación de ambiente
- Validación pre-deployment

---

## Scripts de Migración

### migrate_from_frontend.py

Migra datos desde colecciones antiguas del frontend a nuevo esquema.

**Ubicación**: `backend/migrate_from_frontend.py`

**Descripción**:
- Migra colecciones del esquema antiguo
- Transforma estructura de datos
- Valida datos migrados
- Genera reporte de migración

**Uso**:
```bash
cd backend
source venv/bin/activate
python migrate_from_frontend.py
```

**Proceso de migración**:
1. Identifica colecciones antiguas
2. Lee datos existentes
3. Transforma al nuevo esquema
4. Valida integridad
5. Inserta en nuevas colecciones
6. Genera reporte

**Funciones principales**:

```python
def find_old_collections():
    """Identifica colecciones del esquema antiguo."""

def migrate_collection(old_name, new_name, transform_fn):
    """
    Migra una colección con transformación.
    - old_name: Nombre de colección antigua
    - new_name: Nombre de colección nueva
    - transform_fn: Función de transformación
    """

def transform_user_data(old_doc):
    """Transforma documento de usuario."""

def transform_climate_data(old_doc):
    """Transforma documento de datos climáticos."""

def validate_migration():
    """Valida que la migración fue exitosa."""
```

**Casos de uso**:
- Actualización de versiones
- Cambio de esquema de datos
- Consolidación de datos
- Migración de sistemas legacy

**Reporte de migración**:
```json
{
  "timestamp": "2025-12-15T23:54:56",
  "collections_migrated": 2,
  "total_documents": 50,
  "migrations": [
    {
      "collection": "users",
      "old_count": 25,
      "new_count": 25,
      "status": "success"
    },
    {
      "collection": "climate_data",
      "old_count": 25,
      "new_count": 25,
      "status": "success"
    }
  ]
}
```

---

## Scripts de Mantenimiento

### fix_variables_layers.py

Corrige configuración de capas en variables climáticas.

**Ubicación**: `backend/fix_variables_layers.py`

**Descripción**:
- Actualiza configuración de capas de mapa
- Corrige URLs de servicios WMTS/WMS
- Actualiza parámetros de API
- Valida configuración resultante

**Uso**:
```bash
cd backend
source venv/bin/activate
python fix_variables_layers.py
```

**Correcciones aplicadas**:
- URLs de servicios de mapas
- Parámetros de capas
- Configuración de transparencia
- Formatos de imagen

**Funciones principales**:

```python
def get_correct_layer_config(variable_key):
    """
    Retorna configuración correcta de capa para variable.
    """

def fix_variable_layers():
    """
    Corrige capas de todas las variables.
    """

def validate_layer_config(config):
    """
    Valida que configuración de capa sea válida.
    """
```

**Casos de uso**:
- Actualización de servicios de mapas
- Corrección de configuraciones incorrectas
- Actualización de URLs de APIs
- Mantenimiento preventivo

---

### add_new_variable.py

Script interactivo para agregar nuevas variables climáticas.

**Ubicación**: `backend/add_new_variable.py`

**Descripción**:
- Interfaz interactiva para crear variables
- Validación de datos en tiempo real
- Generación de clave única
- Configuración completa de API y capas

**Uso**:
```bash
cd backend
source venv/bin/activate
python add_new_variable.py
```

**Proceso interactivo**:
```
==================================================
  AGREGAR NUEVA VARIABLE CLIMÁTICA
==================================================

Nombre de la variable: Índice UV
Descripción: Índice de radiación ultravioleta
Categoría (meteorologica/oceanica/agricola): meteorologica
Unidad de medida: UV Index
Icono: sun
¿Está activa? (s/n): s
Orden de visualización: 11

CONFIGURACIÓN DE API:
Proveedor (OpenWeatherMap/NASA/OpenMeteo/Otro): OpenWeatherMap
Endpoint: /data/2.5/uvi
Parámetro: uvi
Transformación (opcional):

CONFIGURACIÓN DE CAPA DE MAPA:
Tipo (wmts/wms/tile): wms
URL: https://maps.openweathermap.org/maps/2.0/weather
Capas: PA0
Formato: image/png
¿Transparente? (s/n): s

✓ Clave generada: indice_uv
¿Confirmar creación? (s/n): s

✅ Variable 'Índice UV' creada exitosamente
```

**Validaciones**:
- Nombre único
- Clave única
- Categoría válida
- Formato de URL
- Parámetros requeridos

**Casos de uso**:
- Agregar nuevas fuentes de datos
- Expandir variables disponibles
- Personalización del sistema
- Integración de nuevas APIs

---

### update_variables_to_wmts.py

Actualiza variables a usar servicios WMTS.

**Ubicación**: `backend/update_variables_to_wmts.py`

**Descripción**:
- Convierte capas WMS a WMTS
- Actualiza URLs de servicios
- Mantiene compatibilidad
- Mejora rendimiento de carga

**Uso**:
```bash
cd backend
source venv/bin/activate
python update_variables_to_wmts.py
```

**Transformaciones**:
```python
# Antes (WMS)
{
  "tipo": "wms",
  "url": "https://maps.openweathermap.org/maps/2.0/weather",
  "capas": "TA2",
  "formato": "image/png"
}

# Después (WMTS)
{
  "tipo": "wmts",
  "url": "https://tile.openweathermap.org/map/{layer}/{z}/{x}/{y}.png",
  "capas": "temp_new",
  "formato": "image/png"
}
```

**Casos de uso**:
- Optimización de rendimiento
- Migración a servicios modernos
- Reducción de carga del servidor
- Mejor experiencia de usuario

---

### update_precipitation_to_owm.py

Actualiza configuración de precipitación a OpenWeatherMap.

**Ubicación**: `backend/update_precipitation_to_owm.py`

**Descripción**:
- Actualiza fuente de datos de precipitación
- Configura capa de mapa correspondiente
- Actualiza parámetros de API

**Uso**:
```bash
cd backend
source venv/bin/activate
python update_precipitation_to_owm.py
```

**Configuración aplicada**:
```python
{
  "api_config": {
    "provider": "OpenWeatherMap",
    "endpoint": "/data/2.5/weather",
    "parametro": "rain.1h",
    "transformacion": "value || 0"
  },
  "capa_mapa": {
    "tipo": "wmts",
    "url": "https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png",
    "capas": "precipitation_new",
    "formato": "image/png",
    "transparente": true
  }
}
```

**Casos de uso**:
- Cambio de proveedor de datos
- Mejora de precisión de datos
- Actualización de fuentes
- Optimización de consultas

---

### restore_original_variables.py

Restaura variables a configuración original.

**Ubicación**: `backend/restore_original_variables.py`

**Descripción**:
- Restaura configuración original de variables
- Útil para recuperación de errores
- Mantiene datos de usuario

**Uso**:
```bash
cd backend
source venv/bin/activate
python restore_original_variables.py
```

**Proceso**:
1. Lee configuración original
2. Solicita confirmación
3. Restaura cada variable
4. Valida restauración

**Casos de uso**:
- Recuperación de errores de configuración
- Reseteo a valores por defecto
- Pruebas y desarrollo
- Troubleshooting

---

## Uso y Ejemplos

### Workflow de Backup y Restauración

```bash
# 1. Exportar base de datos
python export_database.py

# Output: database_exports/export_20251215_235456/

# 2. Copiar a ubicación segura
cp -r database_exports/export_20251215_235456 /path/to/backup/

# 3. Restaurar en otro ambiente
python import_database.py /path/to/backup/export_20251215_235456
```

---

### Workflow de Migración de Ambiente

```bash
# Ambiente Desarrollo
python export_database.py

# Copiar a servidor producción
scp -r database_exports/export_20251215_235456 user@prod-server:/tmp/

# En servidor producción
cd backend
source venv/bin/activate
python import_database.py /tmp/export_20251215_235456 --replace
```

---

### Workflow de Actualización de Variables

```bash
# 1. Verificar estado actual
python verify_database.py

# 2. Hacer backup
python export_database.py

# 3. Actualizar variables
python update_variables_to_wmts.py

# 4. Verificar cambios
python verify_database.py

# 5. Si hay problemas, restaurar
python restore_original_variables.py
```

---

### Workflow de Agregar Variable

```bash
# 1. Agregar variable interactivamente
python add_new_variable.py

# 2. Verificar creación
python verify_database.py

# 3. Probar en frontend
# (Reiniciar backend y frontend)

# 4. Si hay problemas, editar manualmente
mongosh
use climetricadb
db.dashboard_variables.find({clave: "nueva_variable"})
```

---

### Workflow de Primera Instalación

```bash
# 1. Verificar conexión
python verify_database.py

# 2. Inicializar datos
python init_dashboard_data.py

# 3. Verificar creación
python verify_database.py

# 4. Crear usuario admin (opcional)
python -c "..."  # Ver GUIA_INSTALACION.md

# 5. Exportar configuración inicial
python export_database.py
```

---

## Automatización

### Cron Jobs para Backups

```bash
# Editar crontab
crontab -e

# Backup diario a las 2 AM
0 2 * * * cd /path/to/climetrica/backend && /path/to/venv/bin/python export_database.py

# Backup semanal y comprimir
0 3 * * 0 cd /path/to/climetrica/backend && /path/to/venv/bin/python export_database.py && tar -czf database_exports/weekly_$(date +\%Y\%m\%d).tar.gz database_exports/export_*

# Limpiar backups antiguos (más de 30 días)
0 4 * * * find /path/to/climetrica/backend/database_exports -mtime +30 -delete
```

---

### Script de Mantenimiento Automático

Crear `maintenance.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/path/to/climetrica/backend/database_exports"
LOG_FILE="/var/log/climetrica_maintenance.log"

echo "[$(date)] Iniciando mantenimiento..." >> $LOG_FILE

# Backup
cd /path/to/climetrica/backend
source venv/bin/activate
python export_database.py >> $LOG_FILE 2>&1

# Verificar integridad
python verify_database.py >> $LOG_FILE 2>&1

# Limpiar backups antiguos
find $BACKUP_DIR -mtime +30 -type d -name "export_*" -exec rm -rf {} \;

echo "[$(date)] Mantenimiento completado" >> $LOG_FILE
```

Ejecutar semanalmente:
```bash
chmod +x maintenance.sh

# Agregar a crontab
0 5 * * 0 /path/to/maintenance.sh
```

---

## Mejores Prácticas

### 1. Backups
- Realizar backups antes de cambios mayores
- Mantener múltiples generaciones
- Probar restauración periódicamente
- Almacenar backups fuera del servidor

### 2. Migración
- Probar en ambiente de desarrollo primero
- Validar datos después de migración
- Mantener datos originales temporalmente
- Documentar cambios realizados

### 3. Mantenimiento
- Ejecutar scripts en horarios de baja actividad
- Monitorear logs de ejecución
- Validar resultados automáticamente
- Mantener historial de cambios

### 4. Seguridad
- No incluir credenciales en scripts
- Usar variables de entorno
- Restringir permisos de archivos
- Auditar cambios en base de datos

---

## Autor

Sistema de Monitoreo Climático - Climétrica

## Fecha

Diciembre 2025

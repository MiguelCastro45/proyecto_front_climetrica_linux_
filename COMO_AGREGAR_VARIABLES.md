# Cómo Agregar Nuevas Variables Climáticas

Esta guía te muestra cómo agregar nuevas capas climáticas al dashboard del sistema.

## 📋 Pasos para Agregar una Nueva Variable

### 1. Elige la Fuente de Datos

Tienes dos opciones:

#### **Opción A: OpenWeatherMap** (Requiere API key)
- ✅ Ya tienes la API key configurada en `.env`
- 🔗 Capas disponibles en: https://openweathermap.org/api/weathermaps

**Capas principales de OpenWeatherMap:**
```
temp_new           → Temperatura
precipitation_new  → Precipitación
wind_new           → Velocidad del viento
clouds_new         → Nubosidad
pressure_new       → Presión atmosférica
```

**Configuración para OpenWeatherMap:**
```python
"configuracion_api": {
    "tipo": "openweathermap",
    "layer": "clouds_new",  # Cambia según la capa que quieras
    "formato": "png",
    "tile_matrix_set": "",  # Siempre vacío para OpenWeatherMap
    "max_native_zoom": 10   # Siempre 10 para OpenWeatherMap
}
```

#### **Opción B: NASA GIBS (WMTS)** (Gratis, sin API key)
- ✅ Completamente gratuito
- 🔗 Catálogo de capas: https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml
- 🔗 Visualizador: https://worldview.earthdata.nasa.gov/

**Capas populares de NASA GIBS:**
```
MODIS_Terra_Land_Surface_Temp_Day          → Temperatura terrestre
GHRSST_L4_MUR_Sea_Surface_Temperature      → Temperatura del mar
GPM_3IMERGHH_V07B_Precipitation            → Precipitación
MODIS_Terra_Cloud_Fraction_Day             → Fracción de nubes
AIRS_L2_Surface_Relative_Humidity_Day      → Humedad relativa
OSCAR_L4_OC_third-deg                      → Corrientes oceánicas
VIIRS_NOAA20_Chlorophyll_A                 → Clorofila (algas)
MODIS_Terra_Aerosol_Optical_Depth          → Calidad del aire
```

**Configuración para NASA GIBS:**
```python
"configuracion_api": {
    "tipo": "wmts",
    "layer": "MODIS_Terra_Cloud_Fraction_Day",  # Cambia según la capa
    "formato": "png",
    "tile_matrix_set": "GoogleMapsCompatible_Level7",  # Varía según la capa
    "max_native_zoom": 7  # Varía según la capa (consulta WMTSCapabilities.xml)
}
```

---

### 2. Edita el Script de Configuración

Abre el archivo: `/backend/add_new_variable.py`

Edita la sección de configuración:

```python
nueva_variable = {
    # 1. Información básica
    "nombre": "Nubosidad",  # ← CAMBIA: Nombre que verás en el dashboard
    "unidad": "%",           # ← CAMBIA: Unidad de medida
    "descripcion": "Cobertura de nubes medida en porcentaje",  # ← CAMBIA
    "activo": True,          # True = aparece en el dashboard

    # 2. Configuración de API (elige OpenWeatherMap O NASA GIBS)
    "configuracion_api": {
        "tipo": "openweathermap",  # o "wmts" para NASA GIBS
        "layer": "clouds_new",      # ← CAMBIA según la capa
        "formato": "png",
        "tile_matrix_set": "",      # Vacío para OWM, "GoogleMapsCompatible_LevelX" para WMTS
        "max_native_zoom": 10       # 10 para OWM, varía para WMTS
    },

    # 3. Animación
    "configuracion_animacion": {
        "opacidad": 0.9,          # 0.0 (transparente) a 1.0 (opaco)
        "velocidad": "normal",    # "lenta", "normal", "rapida"
        "duracion_frames": None
    },

    # 4. Leyenda (colores del mapa)
    "leyenda": {
        "min": 0,    # ← CAMBIA: Valor mínimo
        "max": 100,  # ← CAMBIA: Valor máximo
        "colores": [  # ← CAMBIA: Lista de colores de menor a mayor
            "#FFFFFF",  # Blanco (valor bajo)
            "#CCCCCC",
            "#999999",
            "#666666",
            "#333333",
            "#000000"   # Negro (valor alto)
        ]
    }
}
```

---

### 3. Ejecuta el Script

Desde la carpeta `/backend`:

```bash
source venv/bin/activate
python add_new_variable.py
```

---

### 4. Recarga el Navegador

Presiona **F5** o **Ctrl+R** en el navegador para ver la nueva variable en el dashboard.

---

## 🎨 Cómo Elegir Colores para la Leyenda

Los colores se definen en formato hexadecimal (`#RRGGBB`).

**Ejemplos de paletas de colores:**

### Para Temperatura:
```python
"colores": [
    "#313695",  # Azul oscuro (frío)
    "#4575b4",
    "#74add1",
    "#abd9e9",
    "#e0f3f8",
    "#ffffbf",  # Amarillo (neutro)
    "#fee090",
    "#fdae61",
    "#f46d43",
    "#d73027",
    "#a50026"   # Rojo oscuro (caliente)
]
```

### Para Precipitación:
```python
"colores": [
    "#ffffff",  # Blanco (sin lluvia)
    "#c6dbef",
    "#9ecae1",
    "#6baed6",
    "#4292c6",
    "#2171b5",
    "#08519c",
    "#08306b"   # Azul oscuro (lluvia intensa)
]
```

### Para Viento:
```python
"colores": [
    "#ffffcc",  # Amarillo claro (viento suave)
    "#ffeda0",
    "#fed976",
    "#feb24c",
    "#fd8d3c",
    "#fc4e2a",
    "#e31a1c",
    "#bd0026",
    "#800026"   # Rojo oscuro (viento fuerte)
]
```

---

## 📊 Ejemplo Completo: Agregar Humedad Relativa

```python
nueva_variable = {
    "nombre": "Humedad Relativa",
    "unidad": "%",
    "descripcion": "Humedad relativa del aire medida en porcentaje",
    "activo": True,

    "configuracion_api": {
        "tipo": "wmts",
        "layer": "AIRS_L2_Surface_Relative_Humidity_Day",
        "formato": "png",
        "tile_matrix_set": "GoogleMapsCompatible_Level6",
        "max_native_zoom": 6
    },

    "configuracion_animacion": {
        "opacidad": 0.85,
        "velocidad": "normal",
        "duracion_frames": None
    },

    "leyenda": {
        "min": 0,
        "max": 100,
        "colores": [
            "#8B4513",  # Marrón (seco)
            "#CD853F",
            "#DEB887",
            "#F5DEB3",
            "#FFFACD",
            "#E0FFFF",
            "#AFEEEE",
            "#87CEEB",
            "#4682B4",
            "#0000CD"   # Azul oscuro (húmedo)
        ]
    }
}
```

---

## ❓ Preguntas Frecuentes

### ¿Cómo encuentro el `tile_matrix_set` correcto para NASA GIBS?

1. Ve a: https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml
2. Busca tu capa (Ctrl+F)
3. Encuentra la línea `<TileMatrixSet>GoogleMapsCompatible_LevelX</TileMatrixSet>`
4. Usa ese valor

### ¿Qué pasa si ya existe una variable con ese nombre?

El script te preguntará si deseas actualizarla o cancelar la operación.

### ¿Puedo eliminar una variable?

Sí, usa este script:

```python
from api.mongodb import dashboard_variables_col

# Eliminar una variable
dashboard_variables_col.delete_one({"nombre": "Nombre de la Variable"})
```

### ¿Cómo desactivo temporalmente una variable?

```python
from api.mongodb import dashboard_variables_col

# Desactivar (no se mostrará en el dashboard)
dashboard_variables_col.update_one(
    {"nombre": "Nombre de la Variable"},
    {"$set": {"activo": False}}
)
```

---

## 🔗 Enlaces Útiles

- **OpenWeatherMap API**: https://openweathermap.org/api/weathermaps
- **NASA GIBS Capabilities**: https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml
- **NASA Worldview** (visualizador): https://worldview.earthdata.nasa.gov/
- **Generador de paletas de colores**: https://colorbrewer2.org/

---

**¿Necesitas ayuda?** Revisa el código en:
- Frontend: `/frontend/src/pages/UserMapDashboard.jsx`
- Backend: `/backend/api/public_views.py` (endpoint `/public/variables/`)

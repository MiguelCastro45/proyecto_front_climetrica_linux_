"""
Script de Migración de Datos del Frontend

Este script migra los cultivos y variables existentes del frontend
a las colecciones de MongoDB con toda su configuración.

Uso:
    python migrate_from_frontend.py

Autor: Sistema Climétrica
Fecha: 2025
"""

from datetime import datetime
import sys
import os

# Agregar el directorio padre al path para poder importar
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from api.mongodb import dashboard_variables_col, crops_col


def migrate_crops():
    """Migra los cultivos del frontend a MongoDB."""

    print("🌱 Migrando cultivos del frontend...")

    # Verificar si ya existen cultivos
    existing_count = crops_col.count_documents({})
    if existing_count > 0:
        print(f"⚠️  Ya existen {existing_count} cultivos en la base de datos.")
        response = input("¿Deseas eliminarlos y reinicializar con los datos del frontend? (s/n): ")
        if response.lower() != 's':
            print("❌ Migración de cultivos cancelada.")
            return
        crops_col.delete_many({})
        print("🗑️  Cultivos anteriores eliminados.")

    # Cultivos del frontend con todos sus datos
    crops_frontend = [
        {
            "nombre": "Café",
            "nombre_cientifico": "Coffea arabica",
            "descripcion": "Cultivo de café arábica, principal producto de exportación agrícola de Colombia",
            "requerimientos": {
                "temperatura_min": 17.0,
                "temperatura_max": 23.0,
                "temperatura_optima": 20.0,  # Promedio
                "precipitacion_min": 1500.0,
                "precipitacion_max": 2500.0,
                "altitud_min": 1200.0,
                "altitud_max": 1800.0,
                "humedad_min": 70.0,
                "humedad_max": 85.0
            },
            "color": "#8B4513",
            "icono": "☕",
            "ciclo_siembra": "Mar-Abr, Sep-Oct",
            "ciclo_cosecha": "Oct-Ene, Abr-Jun",
            "imagen_url": "",
            "activo": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "nombre": "Maíz",
            "nombre_cientifico": "Zea mays",
            "descripcion": "Cultivo de maíz tradicional y tecnificado",
            "requerimientos": {
                "temperatura_min": 18.0,
                "temperatura_max": 30.0,
                "temperatura_optima": 24.0,
                "precipitacion_min": 400.0,
                "precipitacion_max": 800.0,
                "altitud_min": 0.0,
                "altitud_max": 2600.0,
                "humedad_min": 50.0,
                "humedad_max": 70.0
            },
            "color": "#FFD700",
            "icono": "🌽",
            "ciclo_siembra": "Feb-Mar, Ago-Sep",
            "ciclo_cosecha": "Jun-Jul, Dic-Ene",
            "imagen_url": "",
            "activo": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "nombre": "Arroz",
            "nombre_cientifico": "Oryza sativa",
            "descripcion": "Cultivo de arroz para consumo nacional",
            "requerimientos": {
                "temperatura_min": 22.0,
                "temperatura_max": 32.0,
                "temperatura_optima": 27.0,
                "precipitacion_min": 1200.0,
                "precipitacion_max": 2500.0,
                "altitud_min": 0.0,
                "altitud_max": 1000.0,
                "humedad_min": 60.0,
                "humedad_max": 80.0
            },
            "color": "#F5DEB3",
            "icono": "🌾",
            "ciclo_siembra": "Mar-Abr, Jul-Ago",
            "ciclo_cosecha": "Jul-Ago, Nov-Dic",
            "imagen_url": "",
            "activo": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "nombre": "Papa",
            "nombre_cientifico": "Solanum tuberosum",
            "descripcion": "Cultivo de papa en zonas altas",
            "requerimientos": {
                "temperatura_min": 10.0,
                "temperatura_max": 20.0,
                "temperatura_optima": 15.0,
                "precipitacion_min": 600.0,
                "precipitacion_max": 1000.0,
                "altitud_min": 2000.0,
                "altitud_max": 3500.0,
                "humedad_min": 60.0,
                "humedad_max": 80.0
            },
            "color": "#DEB887",
            "icono": "🥔",
            "ciclo_siembra": "Feb-Mar, Ago-Sep",
            "ciclo_cosecha": "Jun-Jul, Dic-Ene",
            "imagen_url": "",
            "activo": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "nombre": "Plátano",
            "nombre_cientifico": "Musa paradisiaca",
            "descripcion": "Cultivo de plátano para consumo nacional",
            "requerimientos": {
                "temperatura_min": 21.0,
                "temperatura_max": 29.0,
                "temperatura_optima": 25.0,
                "precipitacion_min": 1500.0,
                "precipitacion_max": 3000.0,
                "altitud_min": 0.0,
                "altitud_max": 1200.0,
                "humedad_min": 70.0,
                "humedad_max": 85.0
            },
            "color": "#FFE135",
            "icono": "🍌",
            "ciclo_siembra": "Todo el año",
            "ciclo_cosecha": "Todo el año (8-12 meses)",
            "imagen_url": "",
            "activo": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "nombre": "Cacao",
            "nombre_cientifico": "Theobroma cacao",
            "descripcion": "Cultivo de cacao fino de aroma",
            "requerimientos": {
                "temperatura_min": 23.0,
                "temperatura_max": 28.0,
                "temperatura_optima": 25.5,
                "precipitacion_min": 1500.0,
                "precipitacion_max": 2500.0,
                "altitud_min": 0.0,
                "altitud_max": 800.0,
                "humedad_min": 70.0,
                "humedad_max": 90.0
            },
            "color": "#7B3F00",
            "icono": "🍫",
            "ciclo_siembra": "Abr-May",
            "ciclo_cosecha": "Oct-Dic, Mar-Jun",
            "imagen_url": "",
            "activo": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "nombre": "Caña de Azúcar",
            "nombre_cientifico": "Saccharum officinarum",
            "descripcion": "Cultivo de caña de azúcar para industria azucarera",
            "requerimientos": {
                "temperatura_min": 20.0,
                "temperatura_max": 30.0,
                "temperatura_optima": 25.0,
                "precipitacion_min": 1100.0,
                "precipitacion_max": 1500.0,
                "altitud_min": 0.0,
                "altitud_max": 1800.0,
                "humedad_min": 60.0,
                "humedad_max": 80.0
            },
            "color": "#90EE90",
            "icono": "🎋",
            "ciclo_siembra": "Feb-Mar, Ago-Sep",
            "ciclo_cosecha": "12-18 meses después",
            "imagen_url": "",
            "activo": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "nombre": "Banano",
            "nombre_cientifico": "Musa × paradisiaca",
            "descripcion": "Cultivo tropical de banano para exportación",
            "requerimientos": {
                "temperatura_min": 20.0,
                "temperatura_max": 30.0,
                "temperatura_optima": 27.0,
                "precipitacion_min": 2000.0,
                "precipitacion_max": 3000.0,
                "altitud_min": 0.0,
                "altitud_max": 300.0,
                "humedad_min": 75.0,
                "humedad_max": 90.0
            },
            "color": "#FDD835",
            "icono": "🍌",
            "ciclo_siembra": "Todo el año",
            "ciclo_cosecha": "Todo el año (9-12 meses)",
            "imagen_url": "",
            "activo": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "nombre": "Aguacate",
            "nombre_cientifico": "Persea americana",
            "descripcion": "Cultivo de aguacate Hass para exportación",
            "requerimientos": {
                "temperatura_min": 15.0,
                "temperatura_max": 25.0,
                "temperatura_optima": 20.0,
                "precipitacion_min": 1000.0,
                "precipitacion_max": 1600.0,
                "altitud_min": 1800.0,
                "altitud_max": 2500.0,
                "humedad_min": 60.0,
                "humedad_max": 80.0
            },
            "color": "#568203",
            "icono": "🥑",
            "ciclo_siembra": "Feb-Mar, Ago-Sep",
            "ciclo_cosecha": "Todo el año (según variedad)",
            "imagen_url": "",
            "activo": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]

    result = crops_col.insert_many(crops_frontend)
    print(f"✅ {len(result.inserted_ids)} cultivos migrados exitosamente desde el frontend.")


def migrate_variables():
    """Migra las variables del frontend a MongoDB con configuración de API."""

    print("\n📊 Migrando variables con configuración de API...")

    # Verificar si ya existen variables
    existing_count = dashboard_variables_col.count_documents({})
    if existing_count > 0:
        print(f"⚠️  Ya existen {existing_count} variables en la base de datos.")
        response = input("¿Deseas eliminarlas y reinicializar con los datos del frontend? (s/n): ")
        if response.lower() != 's':
            print("❌ Migración de variables cancelada.")
            return
        dashboard_variables_col.delete_many({})
        print("🗑️  Variables anteriores eliminadas.")

    # Variables del frontend con toda la configuración de API y animación
    variables_frontend = [
        {
            "nombre": "Temperatura terrestre",
            "clave": "temperatura_terrestre",
            "descripcion": "Temperatura de la superficie terrestre medida en grados Celsius",
            "activa": True,
            "categoria": "meteorologica",
            "unidad": "°C",
            "icono": "thermometer",
            "orden": 1,
            "configuracion_api": {
                "tipo": "openweathermap",
                "layer": "temp_new",
                "formato": None,
                "tile_matrix_set": None,
                "parametro_open_meteo": "temperature_2m_mean",
                "max_native_zoom": None,
                "proveedores_alternativos": []
            },
            "configuracion_animacion": {
                "habilitada": True,
                "opacidad": 0.9,
                "velocidad": "normal",
                "tipo_animacion": "color"
            },
            "leyenda": {
                "min": -5,
                "max": 40,
                "colores": ["#1e1b4b", "#312e81", "#4338ca", "#6366f1", "#818cf8", "#a5b4fc", "#fef08a", "#fde047", "#facc15", "#fb923c", "#f97316", "#dc2626", "#991b1b"]
            },
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "nombre": "Temperatura del mar",
            "clave": "temperatura_mar",
            "descripcion": "Temperatura de la superficie del mar medida en grados Celsius",
            "activa": True,
            "categoria": "oceanica",
            "unidad": "°C",
            "icono": "water",
            "orden": 2,
            "configuracion_api": {
                "tipo": "wmts",
                "layer": "GHRSST_L4_MUR_Sea_Surface_Temperature",
                "formato": "png",
                "tile_matrix_set": "GoogleMapsCompatible_Level7",
                "parametro_open_meteo": None,
                "max_native_zoom": 7,
                "proveedores_alternativos": []
            },
            "configuracion_animacion": {
                "habilitada": True,
                "opacidad": 0.9,
                "velocidad": "normal",
                "tipo_animacion": "color"
            },
            "leyenda": {
                "min": 0,
                "max": 35,
                "colores": ["#0c4a6e", "#075985", "#0369a1", "#0284c7", "#0ea5e9", "#22d3ee", "#67e8f9", "#a5f3fc", "#e0f2fe", "#fef3c7", "#fde047", "#facc15", "#fb923c"]
            },
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "nombre": "Precipitación",
            "clave": "precipitacion",
            "descripcion": "Precipitación acumulada medida en milímetros",
            "activa": True,
            "categoria": "meteorologica",
            "unidad": "mm",
            "icono": "cloud-rain",
            "orden": 3,
            "configuracion_api": {
                "tipo": "wmts",
                "layer": "GPM_3IMERGHH_V07B_Precipitation",
                "formato": "png",
                "tile_matrix_set": "GoogleMapsCompatible_Level9",
                "parametro_open_meteo": "precipitation_sum",
                "max_native_zoom": 9,
                "proveedores_alternativos": [
                    {"nombre": "OpenWeatherMap", "tipo": "openweathermap", "layer": "precipitation_new"},
                    {"nombre": "RainViewer", "tipo": "rainviewer"}
                ]
            },
            "configuracion_animacion": {
                "habilitada": True,
                "opacidad": 1.0,
                "velocidad": "normal",
                "tipo_animacion": "particulas"
            },
            "leyenda": {
                "min": 0,
                "max": 50,
                "colores": ["#1e1b4b", "#1e3a8a", "#1e40af", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe", "#e0f2fe", "#a7f3d0", "#fef3c7", "#fde047", "#fb923c", "#ef4444"]
            },
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "nombre": "Vientos",
            "clave": "vientos",
            "descripcion": "Velocidad del viento medida en metros por segundo",
            "activa": True,
            "categoria": "meteorologica",
            "unidad": "m/s",
            "icono": "wind",
            "orden": 4,
            "configuracion_api": {
                "tipo": "openweathermap",
                "layer": "wind_new",
                "formato": None,
                "tile_matrix_set": None,
                "parametro_open_meteo": "windspeed_10m_max",
                "max_native_zoom": None,
                "proveedores_alternativos": []
            },
            "configuracion_animacion": {
                "habilitada": True,
                "opacidad": 1.0,
                "velocidad": "rapida",
                "tipo_animacion": "particulas"
            },
            "leyenda": {
                "min": 0,
                "max": 25,
                "colores": ["#064e3b", "#065f46", "#047857", "#059669", "#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#d1fae5", "#fef3c7", "#fde047", "#fbbf24", "#fb923c"]
            },
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "nombre": "Corrientes Oceánicas",
            "clave": "corrientes_oceanicas",
            "descripcion": "Corrientes y vientos oceánicos en metros por segundo",
            "activa": True,
            "categoria": "oceanica",
            "unidad": "m/s",
            "icono": "waves",
            "orden": 5,
            "configuracion_api": {
                "tipo": "openweathermap",
                "layer": "wind",
                "formato": None,
                "tile_matrix_set": None,
                "parametro_open_meteo": None,
                "max_native_zoom": 10,
                "proveedores_alternativos": []
            },
            "configuracion_animacion": {
                "habilitada": True,
                "opacidad": 0.85,
                "velocidad": "normal",
                "tipo_animacion": "ondas"
            },
            "leyenda": {
                "min": 0,
                "max": 25,
                "colores": ["#064e3b", "#065f46", "#047857", "#059669", "#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#d1fae5", "#fef3c7", "#fde047", "#fbbf24", "#fb923c"]
            },
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]

    result = dashboard_variables_col.insert_many(variables_frontend)
    print(f"✅ {len(result.inserted_ids)} variables migradas exitosamente desde el frontend.")


if __name__ == "__main__":
    print("=" * 60)
    print("  MIGRACIÓN DE DATOS DEL FRONTEND A MONGODB")
    print("=" * 60)

    migrate_crops()
    migrate_variables()

    print("\n" + "=" * 60)
    print("✨ Migración completada exitosamente")
    print("=" * 60)
    print("\nAhora puedes usar los endpoints para obtener estos datos:")
    print("  - GET /api/public/crops/ (cultivos activos)")
    print("  - GET /api/public/variables/ (variables activas)")

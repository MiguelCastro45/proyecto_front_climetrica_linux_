"""
Script de Inicialización de Datos del Dashboard

Este script inicializa las colecciones de variables del dashboard y cultivos
con datos predeterminados basados en las variables actuales del sistema.

Uso:
    python init_dashboard_data.py

Autor: Sistema Climétrica
Fecha: 2025
"""

from datetime import datetime
import sys
import os

# Agregar el directorio padre al path para poder importar
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from api.mongodb import dashboard_variables_col, crops_col


def init_dashboard_variables():
    """Inicializa las variables del dashboard con las actuales del sistema."""

    print("🔧 Inicializando variables del dashboard...")

    # Verificar si ya existen variables
    existing_count = dashboard_variables_col.count_documents({})
    if existing_count > 0:
        print(f"⚠️  Ya existen {existing_count} variables en la base de datos.")
        response = input("¿Deseas eliminarlas y reinicializar? (s/n): ")
        if response.lower() != 's':
            print("❌ Inicialización cancelada.")
            return
        dashboard_variables_col.delete_many({})
        print("🗑️  Variables anteriores eliminadas.")

    # Variables del dashboard basadas en el sistema actual
    variables = [
        {
            "nombre": "Temperatura terrestre",
            "clave": "temperatura_terrestre",
            "descripcion": "Temperatura de la superficie terrestre medida en grados Celsius",
            "activa": True,
            "categoria": "meteorologica",
            "unidad": "°C",
            "icono": "thermometer",
            "orden": 1,
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
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "nombre": "Humedad relativa",
            "clave": "humedad_relativa",
            "descripcion": "Porcentaje de humedad relativa en el aire",
            "activa": True,
            "categoria": "meteorologica",
            "unidad": "%",
            "icono": "droplet",
            "orden": 4,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "nombre": "Velocidad del viento",
            "clave": "velocidad_viento",
            "descripcion": "Velocidad del viento medida en metros por segundo",
            "activa": True,
            "categoria": "meteorologica",
            "unidad": "m/s",
            "icono": "wind",
            "orden": 5,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "nombre": "Dirección del viento",
            "clave": "direccion_viento",
            "descripcion": "Dirección del viento en grados",
            "activa": True,
            "categoria": "meteorologica",
            "unidad": "°",
            "icono": "compass",
            "orden": 6,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "nombre": "Presión atmosférica",
            "clave": "presion_atmosferica",
            "descripcion": "Presión atmosférica al nivel del mar medida en hectopascales",
            "activa": True,
            "categoria": "meteorologica",
            "unidad": "hPa",
            "icono": "gauge",
            "orden": 7,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "nombre": "Radiación solar",
            "clave": "radiacion_solar",
            "descripcion": "Radiación solar medida en W/m²",
            "activa": True,
            "categoria": "meteorologica",
            "unidad": "W/m²",
            "icono": "sun",
            "orden": 8,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "nombre": "Evapotranspiración",
            "clave": "evapotranspiracion",
            "descripcion": "Evapotranspiración potencial medida en milímetros",
            "activa": True,
            "categoria": "agricola",
            "unidad": "mm",
            "icono": "droplets",
            "orden": 9,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "nombre": "Altura de olas",
            "clave": "altura_olas",
            "descripcion": "Altura de las olas del mar medida en metros",
            "activa": True,
            "categoria": "oceanica",
            "unidad": "m",
            "icono": "waves",
            "orden": 10,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]

    result = dashboard_variables_col.insert_many(variables)
    print(f"✅ {len(result.inserted_ids)} variables creadas exitosamente.")


def init_crops():
    """Inicializa los cultivos con datos básicos."""

    print("\n🌱 Inicializando cultivos...")

    # Verificar si ya existen cultivos
    existing_count = crops_col.count_documents({})
    if existing_count > 0:
        print(f"⚠️  Ya existen {existing_count} cultivos en la base de datos.")
        response = input("¿Deseas eliminarlos y reinicializar? (s/n): ")
        if response.lower() != 's':
            print("❌ Inicialización cancelada.")
            return
        crops_col.delete_many({})
        print("🗑️  Cultivos anteriores eliminados.")

    # Cultivos básicos de Colombia
    crops = [
        {
            "nombre": "Café",
            "nombre_cientifico": "Coffea arabica",
            "descripcion": "Cultivo de café arábica, principal producto de exportación agrícola de Colombia",
            "requerimientos": {
                "temperatura_min": 17.0,
                "temperatura_max": 23.0,
                "temperatura_optima": 20.0,
                "precipitacion_min": 1500.0,
                "precipitacion_max": 2500.0,
                "altitud_min": 1200.0,
                "altitud_max": 1800.0,
                "humedad_min": 70.0,
                "humedad_max": 85.0
            },
            "imagen_url": "",
            "activo": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "nombre": "Banano",
            "nombre_cientifico": "Musa paradisiaca",
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
                "temperatura_min": 21.0,
                "temperatura_max": 32.0,
                "temperatura_optima": 25.0,
                "precipitacion_min": 1500.0,
                "precipitacion_max": 2500.0,
                "altitud_min": 0.0,
                "altitud_max": 800.0,
                "humedad_min": 70.0,
                "humedad_max": 90.0
            },
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
                "temperatura_min": 20.0,
                "temperatura_max": 35.0,
                "temperatura_optima": 30.0,
                "precipitacion_min": 1200.0,
                "precipitacion_max": 2500.0,
                "altitud_min": 0.0,
                "altitud_max": 1000.0,
                "humedad_min": 60.0,
                "humedad_max": 80.0
            },
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
                "temperatura_min": 15.0,
                "temperatura_max": 30.0,
                "temperatura_optima": 24.0,
                "precipitacion_min": 500.0,
                "precipitacion_max": 1000.0,
                "altitud_min": 0.0,
                "altitud_max": 2800.0,
                "humedad_min": 50.0,
                "humedad_max": 70.0
            },
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
                "temperatura_min": 20.0,
                "temperatura_max": 30.0,
                "temperatura_optima": 27.0,
                "precipitacion_min": 1800.0,
                "precipitacion_max": 2800.0,
                "altitud_min": 0.0,
                "altitud_max": 1000.0,
                "humedad_min": 70.0,
                "humedad_max": 85.0
            },
            "imagen_url": "",
            "activo": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]

    result = crops_col.insert_many(crops)
    print(f"✅ {len(result.inserted_ids)} cultivos creados exitosamente.")


if __name__ == "__main__":
    print("=" * 50)
    print("  INICIALIZACIÓN DE DATOS DEL DASHBOARD")
    print("=" * 50)

    init_dashboard_variables()
    init_crops()

    print("\n" + "=" * 50)
    print("✨ Inicialización completada exitosamente")
    print("=" * 50)

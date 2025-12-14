"""
Script de ejemplo para agregar una nueva variable climática al sistema

PASOS PARA AGREGAR UNA NUEVA VARIABLE:

1. Elige la fuente de datos:
   - OpenWeatherMap: Requiere tu API key (ya configurada en .env)
     Capas disponibles: temp_new, precipitation_new, wind_new, clouds_new, pressure_new

   - NASA GIBS (WMTS): Gratis, sin API key
     Explora capas en: https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml

2. Define la configuración de la variable (ver ejemplo abajo)

3. Ejecuta este script para agregarla a la base de datos

4. Recarga el navegador para ver la nueva variable en el dashboard
"""

from api.mongodb import dashboard_variables_col
from datetime import datetime

def add_variable():
    # ============================================
    # CONFIGURACIÓN DE LA NUEVA VARIABLE
    # ============================================

    nueva_variable = {
        # Información básica
        "nombre": "Humedad",  # CAMBIA ESTO - Nombre que aparecerá en el dashboard
        "unidad": "%",  # CAMBIA ESTO - Unidad de medida
        "descripcion": "Humedad relativa del aire medida en porcentaje",  # CAMBIA ESTO
        "activo": True,  # True para que aparezca en el dashboard

        # Configuración de API
        "configuracion_api": {
            # OPCIÓN 1: Usar OpenWeatherMap (requiere API key)
            "tipo": "openweathermap",
            "layer": "clouds_new",  # CAMBIA ESTO - Capas disponibles: temp_new, precipitation_new, wind_new, clouds_new, pressure_new
            "formato": "png",
            "tile_matrix_set": "",  # Vacío para OpenWeatherMap
            "max_native_zoom": 10

            # OPCIÓN 2: Usar NASA GIBS (WMTS - gratis)
            # "tipo": "wmts",
            # "layer": "MODIS_Terra_Cloud_Fraction_Day",  # CAMBIA ESTO - Busca capas en https://gibs.earthdata.nasa.gov
            # "formato": "png",
            # "tile_matrix_set": "GoogleMapsCompatible_Level7",
            # "max_native_zoom": 7
        },

        # Configuración de animación
        "configuracion_animacion": {
            "opacidad": 0.9,  # 0.0 a 1.0
            "velocidad": "normal",  # lenta, normal, rapida
            "duracion_frames": None
        },

        # Leyenda (colores y rangos)
        "leyenda": {
            "min": 0,  # CAMBIA ESTO - Valor mínimo
            "max": 100,  # CAMBIA ESTO - Valor máximo
            "colores": [  # CAMBIA ESTO - Colores de menor a mayor valor
                "#FFFFFF",
                "#E0E0E0",
                "#C0C0C0",
                "#A0A0A0",
                "#808080",
                "#606060",
                "#404040",
                "#202020",
                "#000000"
            ]
        },

        # Metadatos
        "fecha_creacion": datetime.now(),
        "fecha_actualizacion": datetime.now()
    }

    # ============================================
    # INSERTAR EN LA BASE DE DATOS
    # ============================================

    print("🔄 Agregando nueva variable al sistema...\n")

    # Verificar si ya existe
    existe = dashboard_variables_col.find_one({"nombre": nueva_variable["nombre"]})

    if existe:
        print(f"⚠️  La variable '{nueva_variable['nombre']}' ya existe en la base de datos")
        respuesta = input("¿Deseas actualizarla? (s/n): ")

        if respuesta.lower() == 's':
            resultado = dashboard_variables_col.update_one(
                {"nombre": nueva_variable["nombre"]},
                {"$set": nueva_variable}
            )
            print(f"\n✅ Variable '{nueva_variable['nombre']}' actualizada correctamente")
        else:
            print("\n❌ Operación cancelada")
            return
    else:
        resultado = dashboard_variables_col.insert_one(nueva_variable)
        print(f"✅ Variable '{nueva_variable['nombre']}' agregada correctamente")

    print(f"\n📋 RESUMEN DE LA NUEVA VARIABLE:")
    print(f"   Nombre: {nueva_variable['nombre']}")
    print(f"   Tipo API: {nueva_variable['configuracion_api']['tipo'].upper()}")
    print(f"   Layer: {nueva_variable['configuracion_api']['layer']}")
    print(f"   Unidad: {nueva_variable['unidad']}")
    print(f"   Rango: {nueva_variable['leyenda']['min']} - {nueva_variable['leyenda']['max']}")

    print(f"\n✅ COMPLETADO - Recarga el navegador para ver la nueva variable en el dashboard")

if __name__ == "__main__":
    # IMPORTANTE: Edita la configuración arriba antes de ejecutar
    add_variable()

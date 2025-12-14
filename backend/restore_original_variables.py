"""
Restaurar las variables a la configuración original que funcionaba
Usa combinación de WMTS (NASA GIBS) y OpenWeatherMap
"""

from api.mongodb import dashboard_variables_col

# Configuración original que funcionaba
ORIGINAL_CONFIGS = {
    "Temperatura terrestre": {
        "tipo": "openweathermap",
        "layer": "temp_new",
        "formato": "png",
        "tile_matrix_set": "",
        "max_native_zoom": 10
    },
    "Temperatura del mar": {
        "tipo": "wmts",
        "layer": "GHRSST_L4_MUR_Sea_Surface_Temperature",
        "formato": "png",
        "tile_matrix_set": "GoogleMapsCompatible_Level7",
        "max_native_zoom": 7
    },
    "Precipitación": {
        "tipo": "wmts",
        "layer": "GPM_3IMERGHH_V07B_Precipitation",
        "formato": "png",
        "tile_matrix_set": "GoogleMapsCompatible_Level9",
        "max_native_zoom": 9
    },
    "Vientos": {
        "tipo": "openweathermap",
        "layer": "wind_new",
        "formato": "png",
        "tile_matrix_set": "",
        "max_native_zoom": 10
    },
    "Corrientes Oceánicas": {
        "tipo": "openweathermap",
        "layer": "wind",
        "formato": "png",
        "tile_matrix_set": "",
        "max_native_zoom": 10
    }
}

def restore_variables():
    print("🔄 Restaurando configuración original de variables...\n")

    for nombre, config in ORIGINAL_CONFIGS.items():
        result = dashboard_variables_col.update_one(
            {"nombre": nombre},
            {
                "$set": {
                    "configuracion_api.tipo": config["tipo"],
                    "configuracion_api.layer": config["layer"],
                    "configuracion_api.formato": config["formato"],
                    "configuracion_api.tile_matrix_set": config["tile_matrix_set"],
                    "configuracion_api.max_native_zoom": config["max_native_zoom"]
                }
            }
        )

        tipo_display = "WMTS (NASA)" if config["tipo"] == "wmts" else "OpenWeatherMap"
        if result.modified_count > 0:
            print(f"✅ {nombre:25} → {tipo_display:20} ({config['layer']})")
        else:
            print(f"⚠️  {nombre:25} → No se encontró")

    print("\n✅ Restauración completada")
    print("\n📝 IMPORTANTE: Asegúrate de tener tu API key de OpenWeatherMap en:")
    print("   /frontend/.env → REACT_APP_OWM_KEY=tu_clave_aqui")

if __name__ == "__main__":
    restore_variables()

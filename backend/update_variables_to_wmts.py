"""
Script para actualizar las variables climáticas a usar capas WMTS de NASA GIBS
en lugar de OpenWeatherMap (que requiere API key)

NASA GIBS es gratuito y no requiere autenticación.
"""

from api.mongodb import dashboard_variables_col

# Configuración de capas WMTS de NASA GIBS
WMTS_CONFIGS = {
    "Temperatura terrestre": {
        "tipo": "wmts",
        "layer": "MODIS_Terra_Land_Surface_Temp_Day",
        "formato": "png",
        "tile_matrix_set": "GoogleMapsCompatible_Level7",
        "max_native_zoom": 7
    },
    "Precipitación": {
        "tipo": "wmts",
        "layer": "GPM_3IMERGM",
        "formato": "png",
        "tile_matrix_set": "GoogleMapsCompatible_Level7",
        "max_native_zoom": 7
    },
    "Vientos": {
        "tipo": "wmts",
        "layer": "AMSRU2_Surface_Wind_Speed_Day",
        "formato": "png",
        "tile_matrix_set": "GoogleMapsCompatible_Level7",
        "max_native_zoom": 7
    },
    "Corrientes Oceánicas": {
        "tipo": "wmts",
        "layer": "OSCAR_L4_OC_third-deg",
        "formato": "png",
        "tile_matrix_set": "GoogleMapsCompatible_Level7",
        "max_native_zoom": 7
    }
}

def update_variables():
    print("🔄 Actualizando variables a usar NASA GIBS (WMTS)...\n")

    for nombre, config in WMTS_CONFIGS.items():
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

        if result.modified_count > 0:
            print(f"✅ {nombre:30} → Actualizado a WMTS (NASA GIBS)")
        else:
            print(f"⚠️  {nombre:30} → No se encontró o ya estaba actualizado")

    print("\n✅ Actualización completada")
    print("\n📝 Nota: Reinicia el frontend para que los cambios surtan efecto")

if __name__ == "__main__":
    update_variables()

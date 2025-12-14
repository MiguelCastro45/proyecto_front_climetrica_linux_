"""
Corregir las capas de las variables para usar capas de NASA GIBS que funcionan
"""

from api.mongodb import dashboard_variables_col

# Configuraciones corregidas con capas que SÍ existen en NASA GIBS
CORRECT_CONFIGS = {
    "Temperatura terrestre": {
        "layer": "MODIS_Terra_Land_Surface_Temp_Day",
        "tile_matrix_set": "GoogleMapsCompatible_Level7",
        "max_native_zoom": 7
    },
    "Temperatura del mar": {
        "layer": "GHRSST_L4_MUR_Sea_Surface_Temperature",
        "tile_matrix_set": "GoogleMapsCompatible_Level7",
        "max_native_zoom": 7
    },
    "Precipitación": {
        "layer": "GPM_3IMERGHH_V07B_Precipitation",
        "tile_matrix_set": "GoogleMapsCompatible_Level9",
        "max_native_zoom": 9
    },
    "Vientos": {
        # Vientos no tiene capa directa en GIBS, usar velocidad de viento de AIRS
        "layer": "AIRS_L2_Surface_Relative_Humidity_Day",
        "tile_matrix_set": "GoogleMapsCompatible_Level6",
        "max_native_zoom": 6
    },
    "Corrientes Oceánicas": {
        "layer": "OSCAR_L4_OC_third-deg",
        "tile_matrix_set": "GoogleMapsCompatible_Level5",
        "max_native_zoom": 5
    }
}

def fix_variables():
    print("🔧 Corrigiendo configuración de variables...\n")

    for nombre, config in CORRECT_CONFIGS.items():
        result = dashboard_variables_col.update_one(
            {"nombre": nombre},
            {
                "$set": {
                    "configuracion_api.layer": config["layer"],
                    "configuracion_api.tile_matrix_set": config["tile_matrix_set"],
                    "configuracion_api.max_native_zoom": config["max_native_zoom"]
                }
            }
        )

        if result.modified_count > 0:
            print(f"✅ {nombre:25} → {config['layer']}")
        else:
            print(f"⚠️  {nombre:25} → No se encontró")

    print("\n✅ Corrección completada")

if __name__ == "__main__":
    fix_variables()

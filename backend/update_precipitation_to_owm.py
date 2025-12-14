"""
Script para cambiar la capa de Precipitación de WMTS (NASA GIBS)
a OpenWeatherMap para usar la API key del usuario
"""

from api.mongodb import dashboard_variables_col

def update_precipitation():
    print("🔄 Actualizando Precipitación a usar OpenWeatherMap...\n")

    result = dashboard_variables_col.update_one(
        {"nombre": "Precipitación"},
        {
            "$set": {
                "configuracion_api.tipo": "openweathermap",
                "configuracion_api.layer": "precipitation_new",
                "configuracion_api.formato": "png",
                "configuracion_api.tile_matrix_set": "",
                "configuracion_api.max_native_zoom": 10
            }
        }
    )

    if result.modified_count > 0:
        print("✅ Precipitación → Actualizado a OpenWeatherMap (precipitation_new)")
    else:
        print("⚠️  Precipitación → No se encontró o ya estaba actualizado")

    print("\n✅ Actualización completada")
    print("\n📝 Nota: Recarga el navegador para que los cambios surtan efecto")

if __name__ == "__main__":
    update_precipitation()

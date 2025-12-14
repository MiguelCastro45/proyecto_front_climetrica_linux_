"""
Mostrar la configuración actual de todas las variables
"""

from api.mongodb import dashboard_variables_col

def show_config():
    print("📋 Configuración actual de variables:\n")
    print(f"{'Variable':<30} {'Tipo':<20} {'Layer':<50}")
    print("=" * 100)

    variables = dashboard_variables_col.find({})

    for var in variables:
        nombre = var.get('nombre', 'N/A')
        config = var.get('configuracion_api', {})
        tipo = config.get('tipo', 'N/A')
        layer = config.get('layer', 'N/A')

        tipo_display = "WMTS (NASA GIBS)" if tipo == "wmts" else "OpenWeatherMap"

        print(f"{nombre:<30} {tipo_display:<20} {layer:<50}")

    print("\n" + "=" * 100)

if __name__ == "__main__":
    show_config()

"""
Verificar que todas las capas estén correctamente configuradas en la base de datos
"""

from api.mongodb import dashboard_variables_col
import json

def verify_database():
    print("🔍 VERIFICACIÓN COMPLETA DE LA BASE DE DATOS\n")
    print("=" * 100)

    variables = list(dashboard_variables_col.find({}))

    if not variables:
        print("❌ ERROR: No se encontraron variables en la base de datos")
        return

    print(f"✅ Total de variables encontradas: {len(variables)}\n")

    for idx, var in enumerate(variables, 1):
        print(f"\n{'='*100}")
        print(f"VARIABLE #{idx}: {var.get('nombre', 'SIN NOMBRE')}")
        print(f"{'='*100}")

        # Información básica
        print(f"\n📌 INFORMACIÓN BÁSICA:")
        print(f"   Nombre: {var.get('nombre', 'N/A')}")
        print(f"   Unidad: {var.get('unidad', 'N/A')}")
        print(f"   Descripción: {var.get('descripcion', 'N/A')}")

        # Configuración de API
        config = var.get('configuracion_api', {})
        print(f"\n🔌 CONFIGURACIÓN DE API:")
        print(f"   Tipo: {config.get('tipo', 'N/A').upper()}")
        print(f"   Layer: {config.get('layer', 'N/A')}")
        print(f"   Formato: {config.get('formato', 'N/A')}")
        print(f"   Tile Matrix Set: {config.get('tile_matrix_set', 'N/A') or 'No aplica (OpenWeatherMap)'}")
        print(f"   Max Native Zoom: {config.get('max_native_zoom', 'N/A')}")

        # Configuración de animación
        anim = var.get('configuracion_animacion', {})
        print(f"\n🎨 CONFIGURACIÓN DE ANIMACIÓN:")
        print(f"   Opacidad: {anim.get('opacidad', 'N/A')}")
        print(f"   Velocidad: {anim.get('velocidad', 'N/A')}")
        print(f"   Duración frames: {anim.get('duracion_frames', 'N/A')}")

        # Leyenda
        legend = var.get('leyenda', {})
        print(f"\n📊 LEYENDA:")
        print(f"   Mínimo: {legend.get('min', 'N/A')}")
        print(f"   Máximo: {legend.get('max', 'N/A')}")
        print(f"   Colores: {len(legend.get('colores', []))} definidos")

        # Estado
        print(f"\n✓ Estado: {'Activo' if var.get('activo', False) else 'Inactivo'}")

    print(f"\n\n{'='*100}")
    print("📋 RESUMEN DE CONFIGURACIÓN POR TIPO DE API:")
    print(f"{'='*100}\n")

    owm_vars = [v for v in variables if v.get('configuracion_api', {}).get('tipo') == 'openweathermap']
    wmts_vars = [v for v in variables if v.get('configuracion_api', {}).get('tipo') == 'wmts']

    print(f"🌐 OpenWeatherMap ({len(owm_vars)} variables):")
    for v in owm_vars:
        layer = v.get('configuracion_api', {}).get('layer', 'N/A')
        print(f"   • {v.get('nombre', 'N/A'):<30} → {layer}")

    print(f"\n🛰️  WMTS - NASA GIBS ({len(wmts_vars)} variables):")
    for v in wmts_vars:
        layer = v.get('configuracion_api', {}).get('layer', 'N/A')
        print(f"   • {v.get('nombre', 'N/A'):<30} → {layer}")

    print(f"\n{'='*100}")
    print("✅ VERIFICACIÓN COMPLETADA")
    print(f"{'='*100}\n")

if __name__ == "__main__":
    verify_database()

"""
Script de Importación de Base de Datos MongoDB

Este script importa colecciones desde archivos JSON exportados
previamente hacia la base de datos MongoDB.

Uso:
    python import_database.py <directorio_exportacion>

Ejemplo:
    python import_database.py database_exports/export_20251215_235456

Autor: Sistema Climétrica
Fecha: 2025
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path
from bson import ObjectId

# Agregar el directorio padre al path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from api.mongodb import db


def deserialize_document(doc):
    """
    Deserializa un documento JSON a formato MongoDB.

    Args:
        doc: Documento JSON

    Returns:
        dict: Documento deserializado
    """
    if doc is None:
        return None

    deserialized = {}
    for key, value in doc.items():
        if key == '_id':
            # Convertir string a ObjectId si es válido
            try:
                deserialized[key] = ObjectId(value)
            except:
                deserialized[key] = value
        elif isinstance(value, str):
            # Intentar convertir strings ISO a datetime
            try:
                if 'T' in value and (value.endswith('Z') or '+' in value or value.count(':') >= 2):
                    deserialized[key] = datetime.fromisoformat(value.replace('Z', '+00:00'))
                else:
                    deserialized[key] = value
            except:
                deserialized[key] = value
        elif isinstance(value, dict):
            # Recursivamente deserializar diccionarios anidados
            deserialized[key] = deserialize_document(value)
        elif isinstance(value, list):
            # Deserializar listas
            deserialized[key] = [
                deserialize_document(item) if isinstance(item, dict) else item
                for item in value
            ]
        else:
            deserialized[key] = value

    return deserialized


def import_collection(collection_name, json_file, replace=False):
    """
    Importa una colección desde un archivo JSON.

    Args:
        collection_name (str): Nombre de la colección
        json_file (Path): Archivo JSON a importar
        replace (bool): Si True, reemplaza la colección existente

    Returns:
        int: Cantidad de documentos importados
    """
    collection = db[collection_name]

    # Leer el archivo JSON
    with open(json_file, 'r', encoding='utf-8') as f:
        documents = json.load(f)

    if not documents:
        return 0

    # Deserializar documentos
    deserialized_docs = [deserialize_document(doc) for doc in documents]

    # Reemplazar o agregar
    if replace:
        # Eliminar colección existente
        collection.delete_many({})
        print(f"   🗑️  Colección '{collection_name}' limpiada")

    # Insertar documentos
    if len(deserialized_docs) > 0:
        collection.insert_many(deserialized_docs)

    return len(deserialized_docs)


def import_database(export_dir, replace=False):
    """
    Importa todas las colecciones desde un directorio de exportación.

    Args:
        export_dir (Path): Directorio con los archivos JSON
        replace (bool): Si True, reemplaza las colecciones existentes
    """

    print("=" * 70)
    print("  IMPORTACIÓN DE BASE DE DATOS - CLIMÉTRICA")
    print("=" * 70)
    print()

    if not export_dir.exists():
        print(f"❌ Error: El directorio '{export_dir}' no existe.")
        return

    # Buscar archivo de resumen
    summary_file = export_dir / "export_summary.json"
    if summary_file.exists():
        with open(summary_file, 'r', encoding='utf-8') as f:
            summary = json.load(f)
        print(f"📊 Resumen de exportación:")
        print(f"   • Fecha: {summary.get('date', 'N/A')}")
        print(f"   • Base de datos: {summary.get('database', 'N/A')}")
        print(f"   • Colecciones: {summary.get('total_collections', 'N/A')}")
        print(f"   • Documentos: {summary.get('total_documents', 'N/A')}")
        print()

    # Buscar archivos JSON
    json_files = list(export_dir.glob("*.json"))
    json_files = [f for f in json_files if f.name != "export_summary.json"]

    if not json_files:
        print("⚠️  No se encontraron archivos JSON para importar.")
        return

    print(f"📁 Directorio de importación: {export_dir}")
    print(f"📊 Se encontraron {len(json_files)} archivos:")
    for file in json_files:
        print(f"   • {file.name}")
    print()

    if replace:
        print("⚠️  MODO REEMPLAZO: Las colecciones existentes serán eliminadas")
    else:
        print("ℹ️  MODO AGREGAR: Los documentos se agregarán a las colecciones existentes")

    print()
    response = input("¿Deseas continuar? (s/n): ")
    if response.lower() != 's':
        print("❌ Importación cancelada.")
        return

    print()
    print("🔄 Importando colecciones...")
    print()

    # Importar cada archivo
    total_imported = 0
    results = []

    for json_file in json_files:
        collection_name = json_file.stem  # Nombre sin extensión

        try:
            count = import_collection(collection_name, json_file, replace)
            total_imported += count
            results.append({
                'collection': collection_name,
                'documents': count,
                'status': 'success'
            })

            print(f"✅ {collection_name:30} → {count:6} documentos importados")

        except Exception as e:
            print(f"❌ Error importando {collection_name}: {str(e)}")
            results.append({
                'collection': collection_name,
                'error': str(e),
                'status': 'error'
            })

    print()
    print("=" * 70)
    print("📊 RESUMEN DE IMPORTACIÓN")
    print("=" * 70)
    print(f"  Base de datos:       {db.name}")
    print(f"  Colecciones:         {len(json_files)}")
    print(f"  Documentos totales:  {total_imported}")
    print("=" * 70)
    print()
    print("✨ Importación completada")
    print()


def main():
    """Función principal."""

    if len(sys.argv) < 2:
        print("Uso: python import_database.py <directorio_exportacion> [--replace]")
        print()
        print("Ejemplo:")
        print("  python import_database.py database_exports/export_20251215_235456")
        print("  python import_database.py database_exports/export_20251215_235456 --replace")
        print()
        sys.exit(1)

    export_path = Path(sys.argv[1])
    replace = '--replace' in sys.argv

    try:
        import_database(export_path, replace)
    except Exception as e:
        print()
        print("=" * 70)
        print(f"❌ ERROR FATAL: {str(e)}")
        print("=" * 70)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

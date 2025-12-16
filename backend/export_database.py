"""
Script de Exportación de Base de Datos MongoDB

Este script exporta todas las colecciones de la base de datos MongoDB
a archivos JSON individuales, organizados por fecha.

Uso:
    python export_database.py

Autor: Sistema Climétrica
Fecha: 2025
"""

import json
import os
from datetime import datetime
from pathlib import Path
import sys

# Agregar el directorio padre al path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from api.mongodb import db


def serialize_document(doc):
    """
    Serializa un documento de MongoDB a formato JSON.

    Args:
        doc: Documento de MongoDB

    Returns:
        dict: Documento serializado
    """
    if doc is None:
        return None

    serialized = {}
    for key, value in doc.items():
        if key == '_id':
            # Convertir ObjectId a string
            serialized[key] = str(value)
        elif isinstance(value, datetime):
            # Convertir datetime a string ISO
            serialized[key] = value.isoformat()
        elif isinstance(value, dict):
            # Recursivamente serializar diccionarios anidados
            serialized[key] = serialize_document(value)
        elif isinstance(value, list):
            # Serializar listas
            serialized[key] = [
                serialize_document(item) if isinstance(item, dict) else item
                for item in value
            ]
        else:
            serialized[key] = value

    return serialized


def export_collection(collection_name, output_dir):
    """
    Exporta una colección a un archivo JSON.

    Args:
        collection_name (str): Nombre de la colección
        output_dir (Path): Directorio de salida

    Returns:
        tuple: (cantidad de documentos, nombre del archivo)
    """
    collection = db[collection_name]
    documents = list(collection.find())

    # Serializar todos los documentos
    serialized_docs = [serialize_document(doc) for doc in documents]

    # Crear nombre de archivo
    filename = output_dir / f"{collection_name}.json"

    # Escribir al archivo
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(serialized_docs, f, ensure_ascii=False, indent=2)

    return len(serialized_docs), filename


def export_database():
    """Exporta todas las colecciones de la base de datos."""

    print("=" * 70)
    print("  EXPORTACIÓN DE BASE DE DATOS - CLIMÉTRICA")
    print("=" * 70)
    print()

    # Crear directorio de exportación con timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    export_dir = Path(__file__).parent / "database_exports" / f"export_{timestamp}"
    export_dir.mkdir(parents=True, exist_ok=True)

    print(f"📁 Directorio de exportación: {export_dir}")
    print()

    # Obtener todas las colecciones
    collection_names = db.list_collection_names()

    if not collection_names:
        print("⚠️  No se encontraron colecciones en la base de datos.")
        return

    print(f"📊 Se encontraron {len(collection_names)} colecciones:")
    for name in collection_names:
        print(f"   • {name}")
    print()

    # Exportar cada colección
    total_documents = 0
    results = []

    print("🔄 Exportando colecciones...")
    print()

    for collection_name in collection_names:
        try:
            count, filename = export_collection(collection_name, export_dir)
            total_documents += count
            results.append({
                'collection': collection_name,
                'documents': count,
                'file': filename.name
            })

            print(f"✅ {collection_name:30} → {count:6} documentos → {filename.name}")

        except Exception as e:
            print(f"❌ Error exportando {collection_name}: {str(e)}")
            results.append({
                'collection': collection_name,
                'error': str(e)
            })

    print()
    print("=" * 70)

    # Crear archivo de resumen
    summary = {
        'timestamp': timestamp,
        'date': datetime.now().isoformat(),
        'database': db.name,
        'total_collections': len(collection_names),
        'total_documents': total_documents,
        'collections': results
    }

    summary_file = export_dir / "export_summary.json"
    with open(summary_file, 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    print()
    print("📊 RESUMEN DE EXPORTACIÓN")
    print("=" * 70)
    print(f"  Base de datos:       {db.name}")
    print(f"  Colecciones:         {len(collection_names)}")
    print(f"  Documentos totales:  {total_documents}")
    print(f"  Directorio:          {export_dir}")
    print("=" * 70)
    print()
    print("✨ Exportación completada exitosamente")
    print()
    print(f"📄 Resumen guardado en: {summary_file}")
    print()


if __name__ == "__main__":
    try:
        export_database()
    except Exception as e:
        print()
        print("=" * 70)
        print(f"❌ ERROR FATAL: {str(e)}")
        print("=" * 70)
        import traceback
        traceback.print_exc()
        sys.exit(1)

# api/dataset_utils.py
import os
import pandas as pd
import json
from datetime import datetime
from bson import ObjectId

# Si usas geopandas:
try:
    import geopandas as gpd
    HAS_GPD = True
except Exception:
    HAS_GPD = False

from .mongodb import db, datasets_col, observations_col  # define observations_col en mongodb.py

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), '..', 'uploads')
UPLOAD_DIR = os.path.abspath(UPLOAD_DIR)

def ensure_upload_dir():
    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR, exist_ok=True)

def save_uploaded_file(django_file):
    ensure_upload_dir()
    filename = django_file.name
    safe_path = os.path.join(UPLOAD_DIR, filename)
    # evitar sobreescribir: añadir timestamp si ya existe
    if os.path.exists(safe_path):
        base, ext = os.path.splitext(filename)
        filename = f"{base}_{int(datetime.utcnow().timestamp())}{ext}"
        safe_path = os.path.join(UPLOAD_DIR, filename)
    with open(safe_path, 'wb+') as dest:
        for chunk in django_file.chunks():
            dest.write(chunk)
    return safe_path, filename

def parse_csv_and_store(path, dataset_doc):
    """
    Lee CSV con pandas, extrae resumen y guarda observaciones en coleccion 'observations'.
    Se asume que hay una columna de fecha (name heurístico: 'date','timestamp','time').
    """
    df = pd.read_csv(path, parse_dates=True, infer_datetime_format=True)
    # detectar columna de fecha
    date_cols = [c for c in df.columns if c.lower() in ('date','timestamp','time','fecha')]
    if date_cols:
        date_col = date_cols[0]
        df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
        df = df.dropna(subset=[date_col])
        df = df.sort_values(by=date_col)
        dataset_doc['metadata']['date_column'] = date_col
        dataset_doc['metadata']['start_date'] = str(df[date_col].min())
        dataset_doc['metadata']['end_date'] = str(df[date_col].max())
    else:
        # si no hay fecha, crear índice incremental
        date_col = None

    # columnas numéricas (posibles variables climáticas)
    numeric_cols = df.select_dtypes(include=['number']).columns.tolist()

    # calcular estadísticas básicas
    stats = {}
    for col in numeric_cols:
        ser = df[col].dropna()
        stats[col] = {
            "mean": float(ser.mean()) if not ser.empty else None,
            "min": float(ser.min()) if not ser.empty else None,
            "max": float(ser.max()) if not ser.empty else None,
            "std": float(ser.std()) if not ser.empty else None
        }

    dataset_doc['metadata']['columns'] = df.columns.tolist()
    dataset_doc['stats'] = stats
    dataset_id = dataset_doc['_id']

    # Guardar observaciones: un documento por fila (optimizar para volumen)
    docs = []
    for _, row in df.iterrows():
        doc = {"dataset_id": dataset_id}
        if date_col:
            dt = row[date_col]
            if pd.isnull(dt):
                continue
            doc['timestamp'] = dt.to_pydatetime()
        # si tenemos lat/lon en columnas
        if 'lat' in df.columns and 'lon' in df.columns:
            try:
                doc['location'] = {"type": "Point", "coordinates": [float(row['lon']), float(row['lat'])]}
            except Exception:
                pass
        # añadir variables numéricas
        for col in numeric_cols:
            val = row[col]
            if pd.isnull(val):
                continue
            doc[col] = float(val)
        docs.append(doc)
        # Insert in batches para grandes archivos
        if len(docs) >= 1000:
            observations_col.insert_many(docs)
            docs = []
    if docs:
        observations_col.insert_many(docs)

    # Guardar back metadata en datasets_col
    datasets_col.update_one({"_id": dataset_id}, {"$set": {"metadata": dataset_doc['metadata'], "stats": dataset_doc['stats'], "row_count": len(df)}})

    return dataset_doc

def parse_geojson_and_store(path, dataset_doc):
    # si geopandas está disponible:
    if HAS_GPD:
        gdf = gpd.read_file(path)
        # similar: detectar fecha, columnas numéricas y guardar en observations
        date_cols = [c for c in gdf.columns if c.lower() in ('date','timestamp','time','fecha')]
        date_col = date_cols[0] if date_cols else None
        numeric_cols = gdf.select_dtypes(include=['number']).columns.tolist()
        stats = {}
        for col in numeric_cols:
            ser = gdf[col].dropna()
            stats[col] = {"mean": float(ser.mean()) if not ser.empty else None, "min": float(ser.min()) if not ser.empty else None}
        dataset_doc['metadata']['columns'] = gdf.columns.tolist()
        dataset_doc['stats'] = stats
        dataset_id = dataset_doc['_id']
        docs = []
        for _, row in gdf.iterrows():
            doc = {"dataset_id": dataset_id}
            if date_col:
                dt = row[date_col]
                doc['timestamp'] = pd.to_datetime(dt).to_pydatetime()
            # geometry
            geom = row.geometry
            if geom is not None:
                doc['geometry'] = json.loads(geom.to_json())
            for col in numeric_cols:
                val = row[col]
                if pd.isnull(val):
                    continue
                doc[col] = float(val)
            docs.append(doc)
            if len(docs) >= 500:
                observations_col.insert_many(docs)
                docs = []
        if docs:
            observations_col.insert_many(docs)
        datasets_col.update_one({"_id": dataset_id}, {"$set": {"metadata": dataset_doc['metadata'], "stats": dataset_doc['stats'], "row_count": len(gdf)}})
        return dataset_doc
    else:
        # Fallback: leer como JSON y guardar features
        with open(path, 'r', encoding='utf-8') as f:
            geo = json.load(f)
        features = geo.get('features', [])
        docs = []
        dataset_id = dataset_doc['_id']
        for feat in features:
            props = feat.get('properties', {})
            geom = feat.get('geometry', {})
            doc = {"dataset_id": dataset_id, "geometry": geom}
            # intentar detectar fecha en properties
            for k,v in props.items():
                # si parece numérico
                try:
                    doc[k] = float(v)
                except Exception:
                    doc[k] = v
            docs.append(doc)
            if len(docs) >= 500:
                observations_col.insert_many(docs)
                docs = []
        if docs:
            observations_col.insert_many(docs)
        dataset_doc['metadata']['columns'] = list(features[0].get('properties', {}).keys()) if features else []
        datasets_col.update_one({"_id": dataset_id}, {"$set": {"metadata": dataset_doc['metadata'], "row_count": len(features)}})
        return dataset_doc

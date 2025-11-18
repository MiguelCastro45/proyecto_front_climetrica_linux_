from flask import Blueprint, jsonify, request, send_file
from database import climate_collection
from datetime import datetime
import json
import io

climate_bp = Blueprint("climate", __name__)

@climate_bp.route("/<variable>", methods=["GET"])
def get_climate_data(variable):
    """Obtiene datos climáticos desde MongoDB."""
    data = list(climate_collection.find({"variable": variable}, {"_id": 0}))
    return jsonify(data)

@climate_bp.route("/update", methods=["POST"])
def update_climate_data():
    """Guarda nuevos datos climáticos (ejemplo para recibir JSON del frontend o API externa)."""
    payload = request.json
    payload["timestamp"] = datetime.utcnow().isoformat()
    climate_collection.insert_one(payload)
    return jsonify({"status": "ok", "message": "Datos insertados correctamente"})

@climate_bp.route("/download/<variable>", methods=["GET"])
def download_variable(variable):
    """Descarga los datos de una variable como archivo JSON."""
    data = list(climate_collection.find({"variable": variable}, {"_id": 0}))
    buffer = io.BytesIO()
    buffer.write(json.dumps(data, indent=2).encode('utf-8'))
    buffer.seek(0)
    return send_file(buffer, as_attachment=True, download_name=f"{variable}_data.json", mimetype="application/json")


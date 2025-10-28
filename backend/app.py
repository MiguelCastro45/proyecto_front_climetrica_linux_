# backend/app.py
from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient

# 🔹 1. Crear la aplicación Flask
app = Flask(__name__)
CORS(app)

# 🔹 2. Conexión con MongoDB
client = MongoClient("mongodb://localhost:27017/")
db = client["climetricabd"]
collection = db["datasets"]

# 🔹 3. Rutas de ejemplo para datos climáticos
@app.route("/api/climate/<layer>", methods=["GET"])
def get_climate_layer(layer):
    # Ejemplo de datos según tipo de capa
    if layer == "temperature":
        data = {"type": "FeatureCollection", "features": [{"id": 1, "value": 27.5}]}
    elif layer == "precipitation":
        data = {"type": "FeatureCollection", "features": [{"id": 2, "value": 15.2}]}
    elif layer == "soil_moisture":
        data = {"type": "FeatureCollection", "features": [{"id": 3, "value": 0.45}]}
    elif layer == "drought":
        data = {"type": "FeatureCollection", "features": [{"id": 4, "value": 0.3}]}
    else:
        return jsonify({"error": "Layer not found"}), 404

    # Guardamos el JSON en MongoDB
    collection.insert_one({"layer": layer, "data": data})
    return jsonify(data)

# 🔹 4. Ruta para descargar los datos desde la base
@app.route("/api/download/<layer>", methods=["GET"])
def download_layer(layer):
    doc = collection.find_one({"layer": layer})
    if doc:
        return jsonify(doc["data"])
    return jsonify({"error": "No data found for this layer"}), 404

# 🔹 5. Arranque del servidor
if __name__ == "__main__":
    app.run(debug=True, port=5000)

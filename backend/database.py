from pymongo import MongoClient

# Conexión a MongoDB local
client = MongoClient("mongodb://localhost:27017/")
db = client["climetricaBD"]
climate_collection = db["climate_data"]

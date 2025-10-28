# api/mongodb.py
from pymongo import MongoClient
import os
import gridfs
from dotenv import load_dotenv
load_dotenv()


MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/climetricadb")
client = MongoClient(MONGO_URI)
db = client.get_default_database()  # o client['climetrica_db']
users_col = db['users']
datasets_col = db['datasets']
reports_col = db['reports']
climate_records_col = db['climate_records']
config_col = db['system_config']
observations_col = db["observations"] 

# 🔹 GridFS handler
fs = gridfs.GridFS(db)
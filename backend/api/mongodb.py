"""
Configuración de MongoDB y PyMongo

Este módulo establece la conexión con MongoDB y expone las colecciones
y utilidades necesarias para el proyecto Climétrica.

Colecciones disponibles:
    - users_col: Usuarios del sistema
    - config_col: Configuraciones del sistema
    - climate_data_col: Datos climáticos guardados
    - fs: GridFS para almacenamiento de archivos grandes

Autor: Sistema Climétrica
Fecha: 2025
"""

from pymongo import MongoClient
import os
import gridfs
from dotenv import load_dotenv

# Cargar variables de entorno desde .env
load_dotenv()

# URI de conexión a MongoDB
# Default: mongodb://localhost:27017/climetricadb
# En producción, configurar MONGO_URI en .env con credenciales seguras
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/climetricadb")

# Cliente de MongoDB
client = MongoClient(MONGO_URI)

# Base de datos (usa la especificada en MONGO_URI o la default)
db = client.get_default_database()

# ============================
# COLECCIONES
# ============================

# Colección de usuarios
# Esquema: {
#     _id: ObjectId,
#     first_name: str,
#     last_name: str,
#     email: str (único, case-insensitive),
#     phone: str,
#     identification: str (único),
#     role: str ("admin" o "productor"),
#     status: str ("active", "inactive"),
#     password_hash: str (bcrypt),
#     created_at: datetime,
#     updated_at: datetime,
#     must_change_password: bool
# }
users_col = db['users']

# Colección de configuraciones del sistema
config_col = db['system_config']

# Colección de datos climáticos
# Esquema: {
#     _id: ObjectId,
#     usuario: {_id: str, nombre: str, email: str},
#     consulta: {lugar: str, variable: str, coordenadas: {lat, lon}},
#     datosClimaticos: {
#         serieTemporal: [{date: str, value: str}],
#         fuente: str,
#         tiempoReal: bool
#     },
#     estadoDatos: {fechaDatos: str},
#     createdAt: str (ISO format)
# }
climate_data_col = db["climate_data"]

# ============================
# GRIDFS (Almacenamiento de archivos grandes)
# ============================

# GridFS handler para almacenar archivos mayores a 16MB
# Útil para datasets grandes, imágenes, reportes PDF, etc.
fs = gridfs.GridFS(db)
import bcrypt
import jwt
from datetime import datetime, timedelta

# Clave secreta (usa una variable de entorno en producción)
SECRET_KEY = "CLIMETRICA_SECRET_KEY_2025"

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def check_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt(payload: dict, exp_minutes: int = 60):
    payload_copy = payload.copy()
    payload_copy["exp"] = datetime.utcnow() + timedelta(minutes=exp_minutes)
    return jwt.encode(payload_copy, SECRET_KEY, algorithm="HS256")

def decode_jwt(token: str):
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

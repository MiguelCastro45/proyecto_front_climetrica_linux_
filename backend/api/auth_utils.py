"""
Utilidades de Autenticación y Seguridad

Este módulo proporciona funciones para el manejo seguro de contraseñas
y tokens JWT para autenticación de usuarios.

Funciones principales:
    - hash_password: Genera hash bcrypt de contraseña
    - check_password: Verifica contraseña contra hash
    - create_jwt: Crea token JWT con expiración
    - decode_jwt: Decodifica y valida token JWT

Autor: Sistema Climétrica
Fecha: 2025
"""

import bcrypt
import jwt
from datetime import datetime, timedelta

# Clave secreta para JWT (usa una variable de entorno en producción)
# IMPORTANTE: Esta clave debe ser la misma que JWT_SECRET en .env
SECRET_KEY = "CLIMETRICA_SECRET_KEY_2025"


def hash_password(password: str) -> str:
    """
    Genera un hash bcrypt seguro de la contraseña.

    Utiliza bcrypt con salt generado automáticamente para crear
    un hash seguro de la contraseña que será almacenado en la BD.

    Args:
        password (str): Contraseña en texto plano

    Returns:
        str: Hash bcrypt de la contraseña en formato UTF-8

    Example:
        >>> hashed = hash_password("miPassword123")
        >>> print(hashed)
        $2b$12$abcdefghijklmnopqrstuvwxyz...

    Note:
        - Bcrypt incluye el salt en el hash generado
        - Cada vez que se ejecuta genera un hash diferente
        - El salt es único por cada contraseña
    """
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def check_password(password: str, hashed: str) -> bool:
    """
    Verifica si una contraseña coincide con su hash bcrypt.

    Compara la contraseña en texto plano con el hash almacenado
    en la base de datos de forma segura.

    Args:
        password (str): Contraseña en texto plano a verificar
        hashed (str): Hash bcrypt almacenado en la BD

    Returns:
        bool: True si la contraseña coincide, False si no

    Example:
        >>> hashed = hash_password("miPassword123")
        >>> check_password("miPassword123", hashed)
        True
        >>> check_password("otraPassword", hashed)
        False

    Note:
        Bcrypt extrae automáticamente el salt del hash
        para realizar la comparación
    """
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


def create_jwt(payload: dict, exp_minutes: int = 60):
    """
    Crea un token JWT firmado con tiempo de expiración.

    Genera un JSON Web Token que contiene la información del usuario
    y una fecha de expiración. El token es firmado con la SECRET_KEY.

    Args:
        payload (dict): Datos a incluir en el token (ej: user_id, email, role)
        exp_minutes (int, optional): Minutos hasta expiración. Default: 60

    Returns:
        str: Token JWT firmado

    Example:
        >>> payload = {
        ...     "user_id": "507f1f77bcf86cd799439011",
        ...     "email": "usuario@ejemplo.com",
        ...     "role": "admin"
        ... }
        >>> token = create_jwt(payload, exp_minutes=1440)  # 24 horas
        >>> print(token)
        eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

    Note:
        - No incluye información sensible en el payload
        - El token puede ser decodificado sin la clave
        - La firma solo puede ser verificada con SECRET_KEY
        - La expiración se agrega automáticamente al payload
    """
    payload_copy = payload.copy()
    payload_copy["exp"] = datetime.utcnow() + timedelta(minutes=exp_minutes)
    return jwt.encode(payload_copy, SECRET_KEY, algorithm="HS256")


def decode_jwt(token: str):
    """
    Decodifica y valida un token JWT.

    Verifica la firma del token y su fecha de expiración.
    Retorna los datos del payload si el token es válido.

    Args:
        token (str): Token JWT a decodificar

    Returns:
        dict or None: Payload del token si es válido, None si es inválido

    Example:
        >>> token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
        >>> payload = decode_jwt(token)
        >>> if payload:
        ...     print(f"Usuario: {payload['user_id']}")
        ... else:
        ...     print("Token inválido o expirado")

    Raises:
        None: No lanza excepciones, retorna None en caso de error

    Note:
        Maneja automáticamente:
        - Tokens expirados (ExpiredSignatureError)
        - Tokens con firma inválida (InvalidTokenError)
        - Tokens malformados
    """
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        # Token expirado
        return None
    except jwt.InvalidTokenError:
        # Token inválido (firma incorrecta o malformado)
        return None

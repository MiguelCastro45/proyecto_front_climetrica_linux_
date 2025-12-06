"""
Decoradores de Autenticación y Autorización

Este módulo contiene decoradores para proteger las vistas/endpoints
de Django que requieren autenticación JWT y/o permisos específicos.

Decoradores disponibles:
    - jwt_required: Requiere token JWT válido
    - admin_required: Requiere rol de administrador

Uso:
    @jwt_required
    @admin_required
    def mi_vista_protegida(request):
        ...

Autor: Sistema Climétrica
Fecha: 2025
"""

from functools import wraps
from django.http import JsonResponse
from .auth_utils import decode_jwt


def jwt_required(view_func):
    """
    Decorador que verifica la presencia y validez de un token JWT.

    Este decorador:
    1. Extrae el token del header Authorization
    2. Valida el formato "Bearer <token>"
    3. Decodifica y verifica el token
    4. Agrega el payload del token a request.user
    5. Permite que la vista se ejecute si todo es válido

    Args:
        view_func (function): Vista de Django a proteger

    Returns:
        function: Vista decorada con validación JWT

    Example:
        @jwt_required
        def profile(request):
            user_id = request.user['user_id']
            return JsonResponse({"user_id": user_id})

    Headers requeridos:
        Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

    Errores retornados:
        - 401: Token no proporcionado
        - 401: Token inválido o expirado

    Note:
        - Debe ser el primer decorador si se usa con admin_required
        - Agrega request.user con el payload del JWT
        - No valida el rol, solo la autenticación
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        # Obtener header de autorización
        auth_header = request.headers.get("Authorization")

        # Validar formato del header
        if not auth_header or not auth_header.startswith("Bearer "):
            return JsonResponse(
                {"error": "Token no proporcionado"},
                status=401
            )

        # Extraer token del header (formato: "Bearer <token>")
        token = auth_header.split(" ")[1]

        # Decodificar y validar token
        payload = decode_jwt(token)
        if not payload:
            return JsonResponse(
                {"error": "Token inválido o expirado"},
                status=401
            )

        # Agregar datos del usuario al request
        request.user = payload

        # Ejecutar vista protegida
        return view_func(request, *args, **kwargs)

    return wrapper


def admin_required(view_func):
    """
    Decorador que verifica que el usuario tenga rol de administrador.

    Este decorador:
    1. Verifica que el usuario esté autenticado (request.user existe)
    2. Valida que el rol del usuario sea "admin"
    3. Permite acceso solo si cumple ambas condiciones

    Args:
        view_func (function): Vista de Django a proteger

    Returns:
        function: Vista decorada con validación de rol admin

    Example:
        @jwt_required
        @admin_required
        def list_users(request):
            # Solo admins pueden ver esta lista
            return JsonResponse({"users": [...]})

    Errores retornados:
        - 401: Usuario no autenticado (sin request.user)
        - 403: Usuario autenticado pero sin rol admin

    Note:
        - DEBE usarse después de @jwt_required
        - No valida el token, solo el rol
        - Retorna 403 (Forbidden) si el rol no es admin

    Orden correcto:
        @jwt_required      # Primero valida el token
        @admin_required    # Luego valida el rol
        def vista(request):
            ...
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        # Verificar que el usuario esté autenticado
        user = getattr(request, "user", None)
        if not user:
            return JsonResponse(
                {"error": "No autorizado"},
                status=401
            )

        # Verificar que el rol sea admin
        if user.get("role") != "admin":
            return JsonResponse(
                {"error": "Acceso denegado: se requiere rol admin"},
                status=403
            )

        # Ejecutar vista protegida
        return view_func(request, *args, **kwargs)

    return wrapper

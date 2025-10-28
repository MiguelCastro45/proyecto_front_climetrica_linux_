from functools import wraps
from django.http import JsonResponse
from .auth_utils import decode_jwt

# ----------------------------
# Verifica que exista un JWT válido
# ----------------------------
def jwt_required(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return JsonResponse({"error": "Token no proporcionado"}, status=401)
        token = auth_header.split(" ")[1]
        payload = decode_jwt(token)
        if not payload:
            return JsonResponse({"error": "Token inválido o expirado"}, status=401)
        request.user = payload
        return view_func(request, *args, **kwargs)
    return wrapper


# ----------------------------
# Verifica que el usuario sea admin
# ----------------------------
def admin_required(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        user = getattr(request, "user", None)
        if not user:
            return JsonResponse({"error": "No autorizado"}, status=401)
        if user.get("role") != "admin":
            return JsonResponse({"error": "Acceso denegado: se requiere rol admin"}, status=403)
        return view_func(request, *args, **kwargs)
    return wrapper

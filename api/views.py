from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from datetime import datetime
from bson import ObjectId
from .mongodb import users_col
from .auth_utils import hash_password, check_password, create_jwt
from .decorators import jwt_required, admin_required
import traceback
from .mongodb import climate_data_col



# ----------------------------
# Limpieza del usuario antes de devolverlo
# ----------------------------
def sanitize_user(u):
    if not u:
        return None
    u.pop('password_hash', None)
    u['_id'] = str(u['_id'])
    return u


# ============================
# Registro de usuario
# ============================
@csrf_exempt
def register(request):
    if request.method != "POST":
        return JsonResponse({"error": "Método no permitido"}, status=405)
    try:
        body = json.loads(request.body)
        print("BODY RECIBIDO:", body)

        email = body.get("email")
        if users_col.find_one({"email": email}):
            return JsonResponse({"error": "Email ya registrado"}, status=400)

        password_hash = hash_password(body.get("password"))

        user = {
            "first_name": body.get("first_name"),
            "last_name": body.get("last_name"),
            "email": email,
            "phone": body.get("phone"),
            "identification": body.get("identification"),
            "role": body.get("role", "productor"),
            "status": "active",
            "password_hash": password_hash,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "must_change_password": False
        }

        result = users_col.insert_one(user)
        user["_id"] = str(result.inserted_id)
        user.pop("password_hash")
        return JsonResponse({"user": user}, status=201)

    except Exception as e:
        traceback.print_exc()
        return JsonResponse({"error": f"Error al registrar usuario: {str(e)}"}, status=500)


# ============================
# Login de usuario
# ============================
@csrf_exempt
def login(request):
    if request.method != "POST":
        return JsonResponse({"error": "Método no permitido"}, status=405)
    try:
        body = json.loads(request.body)
        email = body.get("email")
        password = body.get("password")

        user = users_col.find_one({"email": email})
        if not user or not check_password(password, user["password_hash"]):
            return JsonResponse({"error": "Credenciales inválidas"}, status=401)

        token = create_jwt({
            "user_id": str(user["_id"]),
            "email": user["email"],
            "role": user["role"]
        })

        sanitized_user = sanitize_user(user.copy())
        return JsonResponse({"token": token, "user": sanitized_user}, status=200)

    except Exception as e:
        traceback.print_exc()
        return JsonResponse({"error": f"Error al iniciar sesión: {str(e)}"}, status=500)


# ============================
# Perfil protegido
# ============================
@jwt_required
def profile(request):
    """
    Devuelve el usuario completo desde MongoDB usando el user_id del JWT.
    Esto incluye first_name y last_name.
    """
    try:
        user = users_col.find_one(
            {"_id": ObjectId(request.user["user_id"])},
            {"password_hash": 0}  # Excluir password
        )
        if not user:
            return JsonResponse({"error": "Usuario no encontrado"}, status=404)
        return JsonResponse({"user": sanitize_user(user)}, status=200)
    except Exception as e:
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=500)


# ============================
# Endpoints de administración
# ============================

# Listar todos los usuarios (solo admin)
@jwt_required
@admin_required
def list_users(request):
    if request.method != "GET":
        return JsonResponse({"error": "Método no permitido"}, status=405)
    try:
        users = [sanitize_user(u) for u in users_col.find()]
        return JsonResponse({"users": users}, status=200)
    except Exception as e:
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=500)


# Actualizar usuario por ID (solo admin)
@jwt_required
@admin_required
@csrf_exempt
def update_user(request, user_id):
    if request.method != "PUT":
        return JsonResponse({"error": "Método no permitido"}, status=405)
    try:
        body = json.loads(request.body)
        update_fields = {k: v for k, v in body.items() if k != "password"}
        if body.get("password"):
            update_fields["password_hash"] = hash_password(body["password"])
        users_col.update_one({"_id": ObjectId(user_id)}, {"$set": update_fields})
        user = sanitize_user(users_col.find_one({"_id": ObjectId(user_id)}))
        return JsonResponse({"user": user}, status=200)
    except Exception as e:
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=500)


# Eliminar usuario por ID (solo admin)
@jwt_required
@admin_required
@csrf_exempt
def delete_user(request, user_id):
    if request.method != "DELETE":
        return JsonResponse({"error": "Método no permitido"}, status=405)
    try:
        result = users_col.delete_one({"_id": ObjectId(user_id)})
        if result.deleted_count == 0:
            return JsonResponse({"error": "Usuario no encontrado"}, status=404)
        return JsonResponse({"message": "Usuario eliminado"}, status=200)
    except Exception as e:
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=500)
    

def get_climate_data(request):
    try:
        data = list(climate_data_col.find({}, {'_id': 0}))
        return JsonResponse({"status": "success", "data": data}, safe=False)
    except Exception as e:
        import traceback
        print("❌ ERROR en get_climate_data:", traceback.format_exc())
        return JsonResponse({"status": "error", "message": str(e)}, status=500)
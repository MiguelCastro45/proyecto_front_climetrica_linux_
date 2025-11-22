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
        identification = body.get("identification")

        # Validar email duplicado (case-insensitive)
        email_lower = email.lower() if email else None
        existing_email = users_col.find_one({"email": {"$regex": f"^{email_lower}$", "$options": "i"}})
        if existing_email:
            return JsonResponse({"error": "Ya existe un usuario registrado con ese correo electrónico"}, status=400)

        # Validar identificación duplicada
        if identification:
            existing_identification = users_col.find_one({"identification": identification})
            if existing_identification:
                return JsonResponse({"error": "Ya existe un usuario registrado con esa identificación"}, status=400)

        password_hash = hash_password(body.get("password"))

        user = {
            "first_name": body.get("first_name"),
            "last_name": body.get("last_name"),
            "email": email,
            "phone": body.get("phone"),
            "identification": identification,
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

        # Convertir email a minúsculas para búsqueda case-insensitive
        email_lower = email.lower() if email else None

        # Usar regex case-insensitive para búsqueda de email
        user = users_col.find_one({"email": {"$regex": f"^{email_lower}$", "$options": "i"}})
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
# Actualizar perfil propio
# ============================
@jwt_required
@csrf_exempt
def update_own_profile(request):
    """
    Permite a un usuario actualizar su propio perfil.
    No puede modificar: role, identification, status
    Puede modificar: first_name, last_name, email, phone, password
    """
    if request.method != "PUT":
        return JsonResponse({"error": "Método no permitido"}, status=405)
    try:
        body = json.loads(request.body)
        user_id = request.user["user_id"]

        # Campos permitidos para actualizar
        allowed_fields = ["first_name", "last_name", "email", "phone"]
        update_fields = {k: v for k, v in body.items() if k in allowed_fields}

        # Validar email duplicado si se está cambiando
        if "email" in update_fields:
            email_lower = update_fields["email"].lower()
            existing_email = users_col.find_one({
                "email": {"$regex": f"^{email_lower}$", "$options": "i"},
                "_id": {"$ne": ObjectId(user_id)}
            })
            if existing_email:
                return JsonResponse({"error": "Ya existe otro usuario con ese correo electrónico"}, status=400)

        # Manejar cambio de contraseña
        if body.get("password"):
            update_fields["password_hash"] = hash_password(body["password"])

        # Agregar timestamp de actualización
        update_fields["updated_at"] = datetime.utcnow()

        # Actualizar usuario
        users_col.update_one({"_id": ObjectId(user_id)}, {"$set": update_fields})

        # Obtener usuario actualizado
        user = sanitize_user(users_col.find_one({"_id": ObjectId(user_id)}))

        return JsonResponse({"user": user}, status=200)
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
    """
    Obtener datos climáticos con filtros opcionales
    Query params:
        ?userId=<id>
        ?fecha=<YYYY-MM-DD>
        ?lugar=<texto>
        ?variable=<nombre_variable>
    """
    try:
        # Obtener filtros de los query params
        user_id = request.GET.get('userId')
        fecha = request.GET.get('fecha')
        lugar = request.GET.get('lugar')
        variable = request.GET.get('variable')

        # Construir query de MongoDB
        query = {}

        # Filtro por usuario
        if user_id:
            query['usuario._id'] = user_id

        # Filtro por FECHA en la serie temporal
        # La serie temporal contiene los datos climáticos históricos con sus fechas específicas
        # Ejemplo: serieTemporal: [{date: "2025-11-15", value: "18.5"}, {date: "2025-11-16", value: "19.2"}]
        if fecha:
            try:
                # Buscar registros que contengan la fecha en su serieTemporal
                query['datosClimaticos.serieTemporal'] = {
                    '$elemMatch': {
                        'date': {'$regex': f'^{fecha}', '$options': 'i'}
                    }
                }
                print(f"📅 Buscando registros con datos en la fecha: {fecha} (en serieTemporal)")
            except Exception as e:
                print(f"⚠️ Error procesando filtro de fecha: {e}")
                pass  # Si hay error, ignorar el filtro

        # Filtro por lugar (búsqueda parcial, case-insensitive)
        if lugar:
            query['consulta.lugar'] = {'$regex': lugar, '$options': 'i'}

        # Filtro por variable (búsqueda exacta)
        if variable:
            query['consulta.variable'] = variable

        print(f"🔍 Query MongoDB: {query}")

        # Obtener datos con _id incluido para poder eliminar
        data = []
        for doc in climate_data_col.find(query):
            doc['_id'] = str(doc['_id'])  # Convertir ObjectId a string

            # DEBUG: Mostrar fechaDatos de cada documento encontrado
            if fecha:
                fecha_datos = doc.get('estadoDatos', {}).get('fechaDatos', 'N/A')
                print(f"  📋 Doc encontrado - estadoDatos.fechaDatos: {fecha_datos}")

            data.append(doc)

        print(f"✅ Documentos encontrados: {len(data)}")

        # DEBUG EXTRA: Si se buscó por fecha y no hay resultados, mostrar un documento de ejemplo
        if fecha and len(data) == 0:
            sample = climate_data_col.find_one({'usuario._id': user_id} if user_id else {})
            if sample:
                print(f"⚠️ NO se encontraron resultados para fecha: {fecha}")
                print(f"   Ejemplo de documento en BD - estadoDatos.fechaDatos: {sample.get('estadoDatos', {}).get('fechaDatos', 'N/A')}")
                # Mostrar también las primeras fechas de la serie temporal
                serie = sample.get('datosClimaticos', {}).get('serieTemporal', [])
                if serie and len(serie) > 0:
                    print(f"   Primera fecha en serieTemporal: {serie[0].get('date', 'N/A')}")
                    print(f"   Última fecha en serieTemporal: {serie[-1].get('date', 'N/A')}")

        return JsonResponse({"status": "success", "data": data}, safe=False)
    except Exception as e:
        import traceback
        print("❌ ERROR en get_climate_data:", traceback.format_exc())
        return JsonResponse({"status": "error", "message": str(e)}, status=500)


@csrf_exempt
@jwt_required
def save_climate_data(request):
    """
    Guardar nuevos datos climáticos en MongoDB
    """
    if request.method != "POST":
        return JsonResponse({"error": "Método no permitido"}, status=405)

    try:
        body = json.loads(request.body)

        # Validar datos requeridos
        if not body.get("usuario") or not body.get("consulta") or not body.get("datosClimaticos"):
            return JsonResponse({"error": "Faltan datos requeridos"}, status=400)

        # DEBUG: Verificar datos del usuario que se van a guardar
        print(f"\n{'='*80}")
        print(f"💾 DEBUG - save_climate_data - Guardando registro:")
        print(f"{'='*80}")
        print(f"Usuario recibido del frontend:")
        import pprint
        pprint.pprint(body.get("usuario", {}))
        print(f"\nUsuario del JWT (quien está guardando):")
        print(f"  user_id: {request.user.get('user_id')}")
        print(f"  email: {request.user.get('email')}")
        print(f"  role: {request.user.get('role')}")

        # SOLUCIÓN: Sobrescribir el _id del usuario con el del JWT para garantizar consistencia
        # Esto asegura que siempre se guarde el ID correcto del usuario autenticado
        body["usuario"]["_id"] = request.user.get("user_id")

        print(f"\n✅ _id del usuario sobrescrito con el del JWT: {body['usuario']['_id']}")
        print(f"{'='*80}\n")

        # Agregar timestamp de creación
        body["createdAt"] = datetime.utcnow().isoformat()

        # Insertar en MongoDB
        result = climate_data_col.insert_one(body)

        # Preparar respuesta
        body["_id"] = str(result.inserted_id)

        return JsonResponse({
            "status": "success",
            "message": "Datos guardados exitosamente",
            "data": body
        }, status=201)

    except Exception as e:
        import traceback
        print("❌ ERROR en save_climate_data:", traceback.format_exc())
        return JsonResponse({"error": f"Error al guardar datos: {str(e)}"}, status=500)


@csrf_exempt
@jwt_required
def delete_climate_data(request, record_id):
    """
    Eliminar un registro de datos climáticos por ID
    Solo el usuario dueño del registro o un admin puede eliminar
    """
    if request.method != "DELETE":
        return JsonResponse({"error": "Método no permitido"}, status=405)

    try:
        # Obtener el registro para verificar permisos
        record = climate_data_col.find_one({"_id": ObjectId(record_id)})

        if not record:
            return JsonResponse({"error": "Registro no encontrado"}, status=404)

        # Debugging completo del registro
        print(f"\n{'='*80}")
        print(f"🔍 DEBUG - ESTRUCTURA COMPLETA DEL REGISTRO:")
        print(f"{'='*80}")
        print(f"Record ID: {record_id}")
        print(f"\nUsuario completo en record:")
        import pprint
        pprint.pprint(record.get("usuario", {}))

        # Verificar que el usuario es dueño del registro o es admin
        user_id = str(request.user.get("user_id"))  # Convertir a string
        record_owner_id = str(record.get("usuario", {}).get("_id", ""))  # Convertir a string
        is_admin = request.user.get("role") == "admin"

        # Debugging: imprimir IDs para verificar comparación
        print(f"\n🔍 DEBUG - Verificando permisos:")
        print(f"   User ID del JWT: '{user_id}' (tipo: {type(user_id)}, len: {len(user_id)})")
        print(f"   Owner ID del registro: '{record_owner_id}' (tipo: {type(record_owner_id)}, len: {len(record_owner_id)})")
        print(f"   Es admin: {is_admin}")
        print(f"   ¿Son iguales?: {user_id == record_owner_id}")
        print(f"   Comparación byte a byte: {[ord(c) for c in user_id[:10]]} vs {[ord(c) for c in record_owner_id[:10]]}")
        print(f"{'='*80}\n")

        # Comparar como strings para evitar problemas de tipo
        if user_id != record_owner_id and not is_admin:
            error_msg = f"No tiene permisos para eliminar este registro. Su ID: {user_id}, Owner ID: {record_owner_id}"
            print(f"❌ {error_msg}")
            return JsonResponse({"error": error_msg}, status=403)

        # Eliminar registro
        result = climate_data_col.delete_one({"_id": ObjectId(record_id)})

        if result.deleted_count == 0:
            return JsonResponse({"error": "No se pudo eliminar el registro"}, status=500)

        print(f"✅ Registro {record_id} eliminado por usuario {user_id}")
        return JsonResponse({"message": "Registro eliminado exitosamente", "deleted_count": result.deleted_count}, status=200)

    except Exception as e:
        import traceback
        print("❌ ERROR en delete_climate_data:", traceback.format_exc())
        return JsonResponse({"error": f"Error al eliminar registro: {str(e)}"}, status=500)
    

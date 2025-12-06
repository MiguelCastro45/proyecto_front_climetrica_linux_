"""
Vistas y Endpoints de la API REST

Este módulo contiene todas las vistas/endpoints de la API para:
- Autenticación y autorización de usuarios
- Gestión de perfiles de usuario
- Administración de usuarios (solo admin)
- Gestión de datos climáticos
- Recuperación de contraseñas

Tecnologías:
    - Django con decoradores @csrf_exempt
    - MongoDB con PyMongo (users_col, climate_data_col)
    - JWT para autenticación
    - AES para encriptación de credenciales

Autor: Sistema Climétrica
Fecha: 2025
"""

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
import re
from datetime import datetime
from bson import ObjectId
from .mongodb import users_col
from .auth_utils import hash_password, check_password, create_jwt
from .decorators import jwt_required, admin_required
from .crypto_utils import decrypt_data
import traceback
from .mongodb import climate_data_col



# ============================
# UTILIDADES
# ============================

def sanitize_user(u):
    """
    Limpia un objeto de usuario eliminando información sensible.

    Remueve el hash de contraseña y convierte el ObjectId de MongoDB
    a string para poder ser serializado en JSON.

    Args:
        u (dict): Documento de usuario de MongoDB

    Returns:
        dict or None: Usuario limpio sin password_hash y con _id como string,
                     o None si el usuario es None

    Example:
        >>> user = users_col.find_one({"email": "test@example.com"})
        >>> safe_user = sanitize_user(user)
        >>> print(safe_user)
        {
            "_id": "507f1f77bcf86cd799439011",
            "email": "test@example.com",
            "first_name": "Juan",
            "last_name": "Pérez",
            "role": "productor",
            # password_hash NO está presente
        }

    Note:
        - Modifica el diccionario original (no crea copia)
        - Convierte ObjectId a string para compatibilidad con JSON
        - Siempre usar antes de enviar usuarios al frontend
    """
    if not u:
        return None
    u.pop('password_hash', None)
    u['_id'] = str(u['_id'])
    return u


# ============================
# AUTENTICACIÓN Y USUARIOS
# ============================

@csrf_exempt
def register(request):
    """
    Registra un nuevo usuario en el sistema.

    Endpoint: POST /api/register/

    Este endpoint crea un nuevo usuario validando que:
    - El email sea único (case-insensitive)
    - La identificación sea única
    - La contraseña cumpla requisitos de seguridad (validado en frontend)
    - Todos los campos requeridos estén presentes

    Request Body:
        {
            "first_name": str,        # Nombre (requerido)
            "last_name": str,         # Apellido (requerido)
            "email": str,             # Email único (requerido, case-insensitive)
            "phone": str,             # Teléfono (requerido)
            "identification": str,    # Cédula/ID único (requerido)
            "password": str,          # Contraseña (requerido, min. seguridad Media)
            "role": str              # Opcional, default: "productor"
        }

    Returns:
        JsonResponse:
            - 201: Usuario creado exitosamente
              {
                  "user": {
                      "_id": "507f1f77bcf86cd799439011",
                      "first_name": "Juan",
                      "last_name": "Pérez",
                      "email": "juan@example.com",
                      "phone": "3001234567",
                      "identification": "1234567890",
                      "role": "productor",
                      "status": "active",
                      "created_at": "2025-01-15T10:30:00",
                      "updated_at": "2025-01-15T10:30:00"
                  }
              }
            - 400: Email o identificación duplicados
              {"error": "Ya existe un usuario registrado con ese correo electrónico"}
            - 405: Método no permitido (solo acepta POST)
            - 500: Error del servidor

    Example:
        >>> import requests
        >>> data = {
        ...     "first_name": "Juan",
        ...     "last_name": "Pérez",
        ...     "email": "juan@example.com",
        ...     "phone": "3001234567",
        ...     "identification": "1234567890",
        ...     "password": "MySecurePass123!",
        ...     "role": "productor"
        ... }
        >>> response = requests.post("http://localhost:8000/api/register/", json=data)
        >>> print(response.json())

    Note:
        - El email se convierte a minúsculas para comparación
        - La contraseña se hashea con bcrypt antes de guardar
        - El password_hash NO se incluye en la respuesta
        - Por defecto, role es "productor" si no se especifica
        - must_change_password se establece en False (contraseña no es temporal)
    """
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


@csrf_exempt
def login(request):
    """
    Autentica un usuario y genera un token JWT.

    Endpoint: POST /api/login/

    Este endpoint:
    1. Desencripta las credenciales recibidas (AES encryption)
    2. Valida email y contraseña
    3. Genera un token JWT con expiración de 60 minutos
    4. Retorna el token y los datos del usuario (sin password_hash)

    Request Body:
        {
            "email": str,      # Email encriptado con AES (requerido)
            "password": str    # Contraseña encriptada con AES (requerido)
        }

    Returns:
        JsonResponse:
            - 200: Login exitoso
              {
                  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                  "user": {
                      "_id": "507f1f77bcf86cd799439011",
                      "first_name": "Juan",
                      "last_name": "Pérez",
                      "email": "juan@example.com",
                      "phone": "3001234567",
                      "identification": "1234567890",
                      "role": "productor",
                      "status": "active"
                  },
                  "role": "productor"
              }
            - 400: Error en desencriptación de credenciales
              {"error": "Error al procesar credenciales"}
            - 401: Credenciales inválidas (email o contraseña incorrectos)
              {"error": "Credenciales inválidas"}
            - 405: Método no permitido (solo acepta POST)
            - 500: Error del servidor

    Example (desde frontend con crypto-js):
        >>> import CryptoJS from 'crypto-js';
        >>> const secretKey = process.env.REACT_APP_ENCRYPTION_KEY;
        >>> const encryptedEmail = CryptoJS.AES.encrypt(email, secretKey).toString();
        >>> const encryptedPassword = CryptoJS.AES.encrypt(password, secretKey).toString();
        >>> const response = await axios.post('/api/login/', {
        ...     email: encryptedEmail,
        ...     password: encryptedPassword
        ... });

    Security Features:
        - Credenciales encriptadas con AES en tránsito
        - Contraseñas hasheadas con bcrypt en BD
        - JWT con expiración de 60 minutos
        - Email case-insensitive (juan@mail.com = JUAN@mail.com)
        - Password_hash nunca se incluye en respuesta

    Note:
        - Las credenciales llegan encriptadas desde el frontend
        - Se usa ENCRYPTION_KEY del archivo .env para desencriptar
        - El token JWT contiene: user_id, email y role
        - El frontend debe almacenar el token en localStorage
        - El token debe enviarse en headers: Authorization: Bearer <token>
    """
    if request.method != "POST":
        return JsonResponse({"error": "Método no permitido"}, status=405)
    try:
        body = json.loads(request.body)
        encrypted_email = body.get("email")
        encrypted_password = body.get("password")

        # Desencriptar email y contraseña
        try:
            email = decrypt_data(encrypted_email)
            password = decrypt_data(encrypted_password)
            print(f"✓ Datos desencriptados exitosamente para email: {email}")
        except Exception as decrypt_error:
            print(f"❌ Error desencriptando datos: {str(decrypt_error)}")
            return JsonResponse({"error": "Error al procesar credenciales"}, status=400)

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
        return JsonResponse({"token": token, "user": sanitized_user, "role": user["role"]}, status=200)

    except Exception as e:
        traceback.print_exc()
        return JsonResponse({"error": f"Error al iniciar sesión: {str(e)}"}, status=500)


@jwt_required
def profile(request):
    """
    Obtiene el perfil completo del usuario autenticado.

    Endpoint: GET /api/profile/

    Requiere token JWT válido. Retorna todos los datos del usuario
    excepto el password_hash.

    Headers requeridos:
        Authorization: Bearer <token_jwt>

    Returns:
        JsonResponse:
            - 200: Perfil obtenido exitosamente
              {
                  "user": {
                      "_id": "507f1f77bcf86cd799439011",
                      "first_name": "Juan",
                      "last_name": "Pérez",
                      "email": "juan@example.com",
                      "phone": "3001234567",
                      "identification": "1234567890",
                      "role": "productor",
                      "status": "active",
                      "created_at": "2025-01-15T10:30:00",
                      "updated_at": "2025-01-15T10:30:00"
                  }
              }
            - 401: Token no proporcionado o inválido (@jwt_required)
            - 404: Usuario no encontrado en BD
            - 500: Error del servidor

    Note:
        - Decorado con @jwt_required (validación automática del token)
        - Usa request.user agregado por el decorador
        - Excluye password_hash de la respuesta
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


@jwt_required
@csrf_exempt
def update_own_profile(request):
    """
    Actualiza el perfil del usuario autenticado.

    Endpoint: PUT /api/profile/update/

    Permite al usuario modificar sus propios datos. NO puede cambiar:
    role, identification, status (solo admin puede modificarlos).

    Headers requeridos:
        Authorization: Bearer <token_jwt>

    Request Body:
        {
            "first_name": str,     # Opcional
            "last_name": str,      # Opcional
            "email": str,          # Opcional (debe ser único)
            "phone": str,          # Opcional
            "password": str        # Opcional (se hasheará con bcrypt)
        }

    Returns:
        JsonResponse:
            - 200: Perfil actualizado exitosamente con usuario actualizado
            - 400: Email duplicado
            - 401: Token inválido (@jwt_required)
            - 405: Método no permitido (solo PUT)
            - 500: Error del servidor

    Note:
        - Los campos no incluidos en el body no se modifican
        - Si cambia email, se valida que no exista otro usuario con ese email
        - La contraseña se hashea automáticamente con bcrypt
        - Se actualiza el timestamp updated_at automáticamente
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
        if body.get("new_password"):
            # Validar que se haya proporcionado la contraseña actual
            if not body.get("current_password"):
                return JsonResponse({
                    "error": "Debes proporcionar tu contraseña actual para cambiarla"
                }, status=400)

            # Obtener el usuario actual para verificar la contraseña
            current_user = users_col.find_one({"_id": ObjectId(user_id)})
            if not current_user:
                return JsonResponse({"error": "Usuario no encontrado"}, status=404)

            # Verificar que la contraseña actual sea correcta
            if not check_password(body["current_password"], current_user["password_hash"]):
                return JsonResponse({
                    "error": "La contraseña actual es incorrecta"
                }, status=400)

            # Validar que la nueva contraseña sea segura (al menos 8 caracteres)
            new_password = body["new_password"]
            if len(new_password) < 8:
                return JsonResponse({
                    "error": "La nueva contraseña debe tener al menos 8 caracteres"
                }, status=400)

            # Validar que tenga mayúsculas, minúsculas, números y caracteres especiales
            if not re.search(r'[A-Z]', new_password):
                return JsonResponse({
                    "error": "La contraseña debe contener al menos una letra mayúscula"
                }, status=400)
            if not re.search(r'[a-z]', new_password):
                return JsonResponse({
                    "error": "La contraseña debe contener al menos una letra minúscula"
                }, status=400)
            if not re.search(r'[0-9]', new_password):
                return JsonResponse({
                    "error": "La contraseña debe contener al menos un número"
                }, status=400)
            if not re.search(r'[!@#$%^&*(),.?":{}|<>]', new_password):
                return JsonResponse({
                    "error": "La contraseña debe contener al menos un carácter especial (!@#$%^&*...)"
                }, status=400)

            # Hashear la nueva contraseña
            update_fields["password_hash"] = hash_password(new_password)

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
# ENDPOINTS DE ADMINISTRACIÓN (Solo Admin)
# ============================

@jwt_required
@admin_required
def list_users(request):
    """
    Lista todos los usuarios registrados en el sistema.

    Endpoint: GET /api/users/
    Permisos: Solo administradores (@admin_required)

    Headers requeridos:
        Authorization: Bearer <token_jwt_de_admin>

    Returns:
        JsonResponse:
            - 200: Lista de usuarios (sin password_hash)
              {"users": [{...}, {...}, ...]}
            - 401: Token inválido (@jwt_required)
            - 403: Usuario no es admin (@admin_required)
            - 405: Método no permitido (solo GET)
            - 500: Error del servidor
    """
    if request.method != "GET":
        return JsonResponse({"error": "Método no permitido"}, status=405)
    try:
        users = [sanitize_user(u) for u in users_col.find()]
        return JsonResponse({"users": users}, status=200)
    except Exception as e:
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=500)


@jwt_required
@admin_required
@csrf_exempt
def update_user(request, user_id):
    """
    Actualiza cualquier usuario por su ID (solo admin).

    Endpoint: PUT /api/users/<user_id>/
    Permisos: Solo administradores

    Headers requeridos:
        Authorization: Bearer <token_jwt_de_admin>

    Request Body:
        Cualquier campo de usuario (first_name, last_name, email, phone,
        identification, role, status, password)

    Returns:
        JsonResponse:
            - 200: Usuario actualizado exitosamente
            - 401/403: No autorizado
            - 405: Método no permitido (solo PUT)
            - 500: Error del servidor

    Note:
        - Admin puede modificar TODOS los campos incluyendo role y status
        - La contraseña se hashea automáticamente si se incluye
    """
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


@jwt_required
@admin_required
@csrf_exempt
def delete_user(request, user_id):
    """
    Elimina un usuario por su ID (solo admin).

    Endpoint: DELETE /api/users/<user_id>/
    Permisos: Solo administradores

    Headers requeridos:
        Authorization: Bearer <token_jwt_de_admin>

    Returns:
        JsonResponse:
            - 200: Usuario eliminado exitosamente
            - 401/403: No autorizado
            - 404: Usuario no encontrado
            - 405: Método no permitido (solo DELETE)
            - 500: Error del servidor
    """
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
    

# ============================
# GESTIÓN DE DATOS CLIMÁTICOS
# ============================

def get_climate_data(request):
    """
    Obtiene datos climáticos guardados con filtros opcionales.

    Endpoint: GET /api/climate-data/

    Query Parameters (todos opcionales):
        - userId: ID del usuario propietario de los datos
        - fecha: Fecha en formato YYYY-MM-DD (busca en serieTemporal)
        - lugar: Nombre del lugar (búsqueda parcial, case-insensitive)
        - variable: Nombre exacto de la variable climática

    Returns:
        JsonResponse:
            - 200: Datos encontrados
              {
                  "status": "success",
                  "data": [
                      {
                          "_id": "...",
                          "usuario": {...},
                          "consulta": {
                              "lugar": "Bogotá",
                              "variable": "temperatura_max",
                              "coordenadas": {...}
                          },
                          "datosClimaticos": {
                              "serieTemporal": [
                                  {"date": "2025-01-15", "value": "18.5"},
                                  ...
                              ],
                              "fuente": "Open-Meteo",
                              "tiempoReal": false
                          },
                          "estadoDatos": {
                              "fechaDatos": "2025-01-15 10:30:00"
                          },
                          "createdAt": "2025-01-15T10:30:00"
                      }
                  ]
              }
            - 500: Error del servidor

    Example:
        GET /api/climate-data/?userId=507f1f77bcf86cd799439011&variable=temperatura_max&fecha=2025-01-15

    Note:
        - El filtro de fecha busca en la serieTemporal del documento
        - El filtro de lugar usa regex case-insensitive
        - Retorna array vacío si no encuentra coincidencias
        - No requiere autenticación (público)
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
    Guarda nuevos datos climáticos en MongoDB.

    Endpoint: POST /api/climate-data/save/
    Requiere autenticación JWT

    Headers requeridos:
        Authorization: Bearer <token_jwt>

    Request Body:
        {
            "usuario": {
                "_id": str,          # Se sobrescribe con el user_id del JWT
                "nombre": str,
                "email": str
            },
            "consulta": {
                "lugar": str,
                "variable": str,
                "coordenadas": {
                    "lat": float,
                    "lon": float
                }
            },
            "datosClimaticos": {
                "serieTemporal": [
                    {"date": "YYYY-MM-DD", "value": "number"}
                ],
                "fuente": str,        # "Open-Meteo", "OpenWeatherMap", etc.
                "tiempoReal": bool
            },
            "estadoDatos": {
                "fechaDatos": str     # Fecha/hora de la consulta
            }
        }

    Returns:
        JsonResponse:
            - 201: Datos guardados exitosamente con _id del documento
            - 400: Faltan datos requeridos
            - 401: Token inválido (@jwt_required)
            - 405: Método no permitido (solo POST)
            - 500: Error del servidor

    Note:
        - El _id del usuario se sobrescribe con el del JWT para seguridad
        - Se agrega timestamp createdAt automáticamente
        - Cada documento representa una consulta de datos climáticos
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
    Elimina un registro de datos climáticos por ID.

    Endpoint: DELETE /api/climate-data/<record_id>/
    Requiere autenticación JWT

    Permisos:
        - El usuario propietario del registro puede eliminarlo
        - Los administradores pueden eliminar cualquier registro

    Headers requeridos:
        Authorization: Bearer <token_jwt>

    Returns:
        JsonResponse:
            - 200: Registro eliminado exitosamente
              {"message": "Registro eliminado exitosamente", "deleted_count": 1}
            - 401: Token inválido (@jwt_required)
            - 403: Usuario no tiene permisos (no es dueño ni admin)
            - 404: Registro no encontrado
            - 405: Método no permitido (solo DELETE)
            - 500: Error del servidor o no se pudo eliminar

    Note:
        - Valida que el user_id del JWT coincida con usuario._id del registro
        - Los admins pueden eliminar cualquier registro
        - Usa ObjectId de MongoDB para búsqueda
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


# ============================
# RECUPERACIÓN DE CONTRASEÑA
# ============================

@csrf_exempt
def check_email(request):
    """
    Verifica si un correo electrónico existe en el sistema.

    Endpoint: POST /api/check-email/

    Request Body:
        {
            "email": str    # Email a verificar (requerido)
        }

    Returns:
        JsonResponse:
            - 200: Verificación exitosa
              {
                  "exists": true/false,
                  "email": "usuario@example.com"
              }
            - 400: Email no proporcionado
            - 405: Método no permitido (solo POST)
            - 500: Error del servidor

    Note:
        - Búsqueda case-insensitive (juan@mail.com = JUAN@mail.com)
        - No requiere autenticación
        - Usado en el flujo de recuperación de contraseña
    """
    if request.method != "POST":
        return JsonResponse({"error": "Método no permitido"}, status=405)

    try:
        body = json.loads(request.body)
        email = body.get("email")

        if not email:
            return JsonResponse({"error": "El correo es requerido"}, status=400)

        # Buscar email (case-insensitive)
        email_lower = email.lower()
        user = users_col.find_one({"email": {"$regex": f"^{email_lower}$", "$options": "i"}})

        exists = user is not None

        return JsonResponse({
            "exists": exists,
            "email": email
        }, status=200)

    except Exception as e:
        traceback.print_exc()
        return JsonResponse({"error": f"Error al verificar correo: {str(e)}"}, status=500)


@csrf_exempt
def reset_password(request):
    """
    Restablece la contraseña de un usuario y envía email.

    Endpoint: POST /api/reset-password/

    Request Body:
        {
            "email": str,           # Email del usuario (requerido)
            "new_password": str     # Nueva contraseña temporal (requerido)
        }

    Returns:
        JsonResponse:
            - 200: Contraseña restablecida exitosamente
              {
                  "success": true,
                  "message": "Contraseña restablecida exitosamente",
                  "email": "usuario@example.com"
              }
            - 400: Email o contraseña no proporcionados
            - 404: Usuario no encontrado
            - 405: Método no permitido (solo POST)
            - 500: Error del servidor

    Proceso:
        1. Valida que el email exista en la BD
        2. Hashea la nueva contraseña con bcrypt
        3. Actualiza la contraseña en BD
        4. Marca must_change_password = True
        5. Envía email con la nueva contraseña temporal

    Note:
        - Requiere módulo email_service configurado para envío de correos
        - La nueva contraseña se genera en el frontend
        - El usuario debe cambiar la contraseña temporal al iniciar sesión
        - Búsqueda de email case-insensitive
    """
    if request.method != "POST":
        return JsonResponse({"error": "Método no permitido"}, status=405)

    try:
        body = json.loads(request.body)
        email = body.get("email")
        new_password = body.get("new_password")

        if not email or not new_password:
            return JsonResponse({"error": "Email y nueva contraseña son requeridos"}, status=400)

        # Buscar usuario (case-insensitive)
        email_lower = email.lower()
        user = users_col.find_one({"email": {"$regex": f"^{email_lower}$", "$options": "i"}})

        if not user:
            return JsonResponse({"error": "Usuario no encontrado"}, status=404)

        # Hash de la nueva contraseña
        password_hash = hash_password(new_password)

        # Actualizar contraseña en la base de datos
        users_col.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "password_hash": password_hash,
                    "updated_at": datetime.utcnow(),
                    "must_change_password": True  # Indicar que debe cambiar la contraseña temporal
                }
            }
        )

        # Aquí deberías enviar el correo electrónico con la nueva contraseña
        # Por ahora, solo simularemos el envío exitoso
        # TODO: Integrar servicio de correo (Gmail SMTP, SendGrid, etc.)

        try:
            # Importar módulo de envío de correo
            from .email_service import send_password_reset_email

            send_password_reset_email(
                to_email=user["email"],
                user_name=f"{user.get('first_name', '')} {user.get('last_name', '')}",
                new_password=new_password
            )

            print(f"✓ Correo enviado a {user['email']}")

        except ImportError:
            # Si no existe el servicio de correo, solo logear
            print(f"⚠️ Servicio de correo no configurado")
            print(f"📧 Nueva contraseña para {email}: {new_password}")
            # En producción, esto debería fallar si no se puede enviar el correo

        return JsonResponse({
            "success": True,
            "message": "Contraseña restablecida exitosamente",
            "email": user["email"]
        }, status=200)

    except Exception as e:
        traceback.print_exc()
        return JsonResponse({"error": f"Error al restablecer contraseña: {str(e)}"}, status=500)


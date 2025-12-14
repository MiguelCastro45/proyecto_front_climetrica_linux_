"""
Vistas de Administración para Variables y Cultivos

Este módulo contiene las vistas exclusivas para administradores
que permiten gestionar las variables del dashboard y los cultivos.

Endpoints disponibles:
    Variables Dashboard:
        - GET /api/admin/variables/ - Listar todas las variables
        - POST /api/admin/variables/ - Crear nueva variable
        - PUT /api/admin/variables/<id>/ - Actualizar variable
        - DELETE /api/admin/variables/<id>/ - Eliminar variable
        - PATCH /api/admin/variables/<id>/toggle/ - Activar/desactivar variable

    Cultivos:
        - GET /api/admin/crops/ - Listar todos los cultivos
        - POST /api/admin/crops/ - Crear nuevo cultivo
        - PUT /api/admin/crops/<id>/ - Actualizar cultivo
        - DELETE /api/admin/crops/<id>/ - Eliminar cultivo

Autor: Sistema Climétrica
Fecha: 2025
"""

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from bson import ObjectId
from datetime import datetime
import json

from .decorators import jwt_required, admin_required
from .mongodb import dashboard_variables_col, crops_col


# ============================
# GESTIÓN DE VARIABLES DASHBOARD
# ============================

@csrf_exempt
@jwt_required
@admin_required
@require_http_methods(["GET"])
def list_variables(request):
    """
    Lista todas las variables del dashboard.

    Retorna las variables ordenadas por el campo 'orden'.
    """
    try:
        variables = list(dashboard_variables_col.find().sort("orden", 1))

        # Convertir ObjectId a string
        for var in variables:
            var["_id"] = str(var["_id"])
            # Convertir datetime a string si existe
            if "created_at" in var:
                var["created_at"] = var["created_at"].isoformat()
            if "updated_at" in var:
                var["updated_at"] = var["updated_at"].isoformat()

        return JsonResponse({
            "success": True,
            "variables": variables
        }, status=200)

    except Exception as e:
        return JsonResponse({
            "error": f"Error al listar variables: {str(e)}"
        }, status=500)


@csrf_exempt
@jwt_required
@admin_required
@require_http_methods(["POST"])
def create_variable(request):
    """
    Crea una nueva variable para el dashboard.

    Body JSON:
        {
            "nombre": "Temperatura terrestre",
            "clave": "temperatura_terrestre",
            "descripcion": "Temperatura de la superficie terrestre",
            "activa": true,
            "categoria": "meteorologica",
            "unidad": "°C",
            "icono": "thermometer",
            "orden": 1
        }
    """
    try:
        data = json.loads(request.body)

        # Validar campos requeridos
        required_fields = ["nombre", "clave", "categoria", "unidad"]
        for field in required_fields:
            if field not in data:
                return JsonResponse({
                    "error": f"Campo requerido faltante: {field}"
                }, status=400)

        # Verificar que la clave no exista
        existing = dashboard_variables_col.find_one({"clave": data["clave"]})
        if existing:
            return JsonResponse({
                "error": "Ya existe una variable con esa clave"
            }, status=400)

        # Crear documento de variable
        variable = {
            "nombre": data["nombre"],
            "clave": data["clave"],
            "descripcion": data.get("descripcion", ""),
            "activa": data.get("activa", True),
            "categoria": data["categoria"],
            "unidad": data["unidad"],
            "icono": data.get("icono", ""),
            "orden": data.get("orden", 999),
            "configuracion_api": data.get("configuracion_api", {
                "tipo": "openweathermap",
                "layer": "",
                "formato": None,
                "tile_matrix_set": None,
                "parametro_open_meteo": None,
                "max_native_zoom": None
            }),
            "configuracion_animacion": data.get("configuracion_animacion", {
                "habilitada": True,
                "opacidad": 0.9,
                "velocidad": "normal",
                "tipo_animacion": "color"
            }),
            "leyenda": data.get("leyenda", {
                "min": 0,
                "max": 100,
                "colores": []
            }),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        result = dashboard_variables_col.insert_one(variable)
        variable["_id"] = str(result.inserted_id)
        variable["created_at"] = variable["created_at"].isoformat()
        variable["updated_at"] = variable["updated_at"].isoformat()

        return JsonResponse({
            "success": True,
            "message": "Variable creada exitosamente",
            "variable": variable
        }, status=201)

    except json.JSONDecodeError:
        return JsonResponse({"error": "JSON inválido"}, status=400)
    except Exception as e:
        return JsonResponse({
            "error": f"Error al crear variable: {str(e)}"
        }, status=500)


@csrf_exempt
@jwt_required
@admin_required
@require_http_methods(["PUT"])
def update_variable(request, variable_id):
    """
    Actualiza una variable existente.

    Args:
        variable_id: ID de la variable a actualizar
    """
    try:
        data = json.loads(request.body)

        # Verificar que la variable exista
        if not ObjectId.is_valid(variable_id):
            return JsonResponse({"error": "ID inválido"}, status=400)

        existing = dashboard_variables_col.find_one({"_id": ObjectId(variable_id)})
        if not existing:
            return JsonResponse({"error": "Variable no encontrada"}, status=404)

        # Si se cambia la clave, verificar que no exista otra con esa clave
        if "clave" in data and data["clave"] != existing["clave"]:
            duplicate = dashboard_variables_col.find_one({
                "clave": data["clave"],
                "_id": {"$ne": ObjectId(variable_id)}
            })
            if duplicate:
                return JsonResponse({
                    "error": "Ya existe otra variable con esa clave"
                }, status=400)

        # Preparar actualización
        update_data = {
            "updated_at": datetime.utcnow()
        }

        # Campos simples actualizables
        updatable_fields = ["nombre", "clave", "descripcion", "activa",
                           "categoria", "unidad", "icono", "orden"]
        for field in updatable_fields:
            if field in data:
                update_data[field] = data[field]

        # Campos de configuración (objetos anidados)
        if "configuracion_api" in data:
            update_data["configuracion_api"] = data["configuracion_api"]

        if "configuracion_animacion" in data:
            update_data["configuracion_animacion"] = data["configuracion_animacion"]

        if "leyenda" in data:
            update_data["leyenda"] = data["leyenda"]

        # Actualizar en MongoDB
        dashboard_variables_col.update_one(
            {"_id": ObjectId(variable_id)},
            {"$set": update_data}
        )

        # Obtener variable actualizada
        updated_var = dashboard_variables_col.find_one({"_id": ObjectId(variable_id)})
        updated_var["_id"] = str(updated_var["_id"])
        updated_var["created_at"] = updated_var["created_at"].isoformat()
        updated_var["updated_at"] = updated_var["updated_at"].isoformat()

        return JsonResponse({
            "success": True,
            "message": "Variable actualizada exitosamente",
            "variable": updated_var
        }, status=200)

    except json.JSONDecodeError:
        return JsonResponse({"error": "JSON inválido"}, status=400)
    except Exception as e:
        return JsonResponse({
            "error": f"Error al actualizar variable: {str(e)}"
        }, status=500)


@csrf_exempt
@jwt_required
@admin_required
@require_http_methods(["DELETE"])
def delete_variable(request, variable_id):
    """
    Elimina una variable del dashboard.

    Args:
        variable_id: ID de la variable a eliminar
    """
    try:
        if not ObjectId.is_valid(variable_id):
            return JsonResponse({"error": "ID inválido"}, status=400)

        result = dashboard_variables_col.delete_one({"_id": ObjectId(variable_id)})

        if result.deleted_count == 0:
            return JsonResponse({"error": "Variable no encontrada"}, status=404)

        return JsonResponse({
            "success": True,
            "message": "Variable eliminada exitosamente"
        }, status=200)

    except Exception as e:
        return JsonResponse({
            "error": f"Error al eliminar variable: {str(e)}"
        }, status=500)


@csrf_exempt
@jwt_required
@admin_required
@require_http_methods(["PATCH"])
def toggle_variable(request, variable_id):
    """
    Activa o desactiva una variable del dashboard.

    Args:
        variable_id: ID de la variable a toggle
    """
    try:
        if not ObjectId.is_valid(variable_id):
            return JsonResponse({"error": "ID inválido"}, status=400)

        variable = dashboard_variables_col.find_one({"_id": ObjectId(variable_id)})
        if not variable:
            return JsonResponse({"error": "Variable no encontrada"}, status=404)

        # Invertir estado activa
        new_state = not variable.get("activa", True)

        dashboard_variables_col.update_one(
            {"_id": ObjectId(variable_id)},
            {"$set": {
                "activa": new_state,
                "updated_at": datetime.utcnow()
            }}
        )

        return JsonResponse({
            "success": True,
            "message": f"Variable {'activada' if new_state else 'desactivada'} exitosamente",
            "activa": new_state
        }, status=200)

    except Exception as e:
        return JsonResponse({
            "error": f"Error al cambiar estado de variable: {str(e)}"
        }, status=500)


# ============================
# GESTIÓN DE CULTIVOS
# ============================

@csrf_exempt
@jwt_required
@admin_required
@require_http_methods(["GET"])
def list_crops(request):
    """
    Lista todos los cultivos.

    Retorna los cultivos ordenados alfabéticamente por nombre.
    """
    try:
        crops = list(crops_col.find().sort("nombre", 1))

        # Convertir ObjectId a string
        for crop in crops:
            crop["_id"] = str(crop["_id"])
            # Convertir datetime a string si existe
            if "created_at" in crop:
                crop["created_at"] = crop["created_at"].isoformat()
            if "updated_at" in crop:
                crop["updated_at"] = crop["updated_at"].isoformat()

        return JsonResponse({
            "success": True,
            "crops": crops
        }, status=200)

    except Exception as e:
        return JsonResponse({
            "error": f"Error al listar cultivos: {str(e)}"
        }, status=500)


@csrf_exempt
@jwt_required
@admin_required
@require_http_methods(["POST"])
def create_crop(request):
    """
    Crea un nuevo cultivo.

    Body JSON:
        {
            "nombre": "Café",
            "nombre_cientifico": "Coffea arabica",
            "descripcion": "Cultivo de café arábica",
            "requerimientos": {
                "temperatura_min": 15.0,
                "temperatura_max": 24.0,
                "temperatura_optima": 20.0,
                "precipitacion_min": 1500.0,
                "precipitacion_max": 2500.0,
                "altitud_min": 1200.0,
                "altitud_max": 1800.0,
                "humedad_min": 60.0,
                "humedad_max": 80.0
            },
            "imagen_url": "https://...",
            "activo": true
        }
    """
    try:
        data = json.loads(request.body)

        # Validar campos requeridos
        if "nombre" not in data:
            return JsonResponse({
                "error": "Campo requerido: nombre"
            }, status=400)

        if "requerimientos" not in data:
            return JsonResponse({
                "error": "Campo requerido: requerimientos"
            }, status=400)

        # Verificar que no exista un cultivo con el mismo nombre
        existing = crops_col.find_one({"nombre": data["nombre"]})
        if existing:
            return JsonResponse({
                "error": "Ya existe un cultivo con ese nombre"
            }, status=400)

        # Crear documento de cultivo
        crop = {
            "nombre": data["nombre"],
            "nombre_cientifico": data.get("nombre_cientifico", ""),
            "descripcion": data.get("descripcion", ""),
            "requerimientos": data["requerimientos"],
            "imagen_url": data.get("imagen_url", ""),
            "activo": data.get("activo", True),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        result = crops_col.insert_one(crop)
        crop["_id"] = str(result.inserted_id)
        crop["created_at"] = crop["created_at"].isoformat()
        crop["updated_at"] = crop["updated_at"].isoformat()

        return JsonResponse({
            "success": True,
            "message": "Cultivo creado exitosamente",
            "crop": crop
        }, status=201)

    except json.JSONDecodeError:
        return JsonResponse({"error": "JSON inválido"}, status=400)
    except Exception as e:
        return JsonResponse({
            "error": f"Error al crear cultivo: {str(e)}"
        }, status=500)


@csrf_exempt
@jwt_required
@admin_required
@require_http_methods(["PUT"])
def update_crop(request, crop_id):
    """
    Actualiza un cultivo existente.

    Args:
        crop_id: ID del cultivo a actualizar
    """
    try:
        data = json.loads(request.body)

        # Verificar que el cultivo exista
        if not ObjectId.is_valid(crop_id):
            return JsonResponse({"error": "ID inválido"}, status=400)

        existing = crops_col.find_one({"_id": ObjectId(crop_id)})
        if not existing:
            return JsonResponse({"error": "Cultivo no encontrado"}, status=404)

        # Si se cambia el nombre, verificar que no exista otro con ese nombre
        if "nombre" in data and data["nombre"] != existing["nombre"]:
            duplicate = crops_col.find_one({
                "nombre": data["nombre"],
                "_id": {"$ne": ObjectId(crop_id)}
            })
            if duplicate:
                return JsonResponse({
                    "error": "Ya existe otro cultivo con ese nombre"
                }, status=400)

        # Preparar actualización
        update_data = {
            "updated_at": datetime.utcnow()
        }

        # Campos actualizables
        updatable_fields = ["nombre", "nombre_cientifico", "descripcion",
                           "requerimientos", "imagen_url", "activo"]
        for field in updatable_fields:
            if field in data:
                update_data[field] = data[field]

        # Actualizar en MongoDB
        crops_col.update_one(
            {"_id": ObjectId(crop_id)},
            {"$set": update_data}
        )

        # Obtener cultivo actualizado
        updated_crop = crops_col.find_one({"_id": ObjectId(crop_id)})
        updated_crop["_id"] = str(updated_crop["_id"])
        updated_crop["created_at"] = updated_crop["created_at"].isoformat()
        updated_crop["updated_at"] = updated_crop["updated_at"].isoformat()

        return JsonResponse({
            "success": True,
            "message": "Cultivo actualizado exitosamente",
            "crop": updated_crop
        }, status=200)

    except json.JSONDecodeError:
        return JsonResponse({"error": "JSON inválido"}, status=400)
    except Exception as e:
        return JsonResponse({
            "error": f"Error al actualizar cultivo: {str(e)}"
        }, status=500)


@csrf_exempt
@jwt_required
@admin_required
@require_http_methods(["DELETE"])
def delete_crop(request, crop_id):
    """
    Elimina un cultivo.

    Args:
        crop_id: ID del cultivo a eliminar
    """
    try:
        if not ObjectId.is_valid(crop_id):
            return JsonResponse({"error": "ID inválido"}, status=400)

        result = crops_col.delete_one({"_id": ObjectId(crop_id)})

        if result.deleted_count == 0:
            return JsonResponse({"error": "Cultivo no encontrado"}, status=404)

        return JsonResponse({
            "success": True,
            "message": "Cultivo eliminado exitosamente"
        }, status=200)

    except Exception as e:
        return JsonResponse({
            "error": f"Error al eliminar cultivo: {str(e)}"
        }, status=500)


@csrf_exempt
@jwt_required
@admin_required
@require_http_methods(["PATCH"])
def toggle_crop(request, crop_id):
    """
    Activa o desactiva un cultivo.

    Args:
        crop_id: ID del cultivo a toggle
    """
    try:
        if not ObjectId.is_valid(crop_id):
            return JsonResponse({"error": "ID inválido"}, status=400)

        crop = crops_col.find_one({"_id": ObjectId(crop_id)})
        if not crop:
            return JsonResponse({"error": "Cultivo no encontrado"}, status=404)

        # Invertir estado activo
        new_state = not crop.get("activo", True)

        crops_col.update_one(
            {"_id": ObjectId(crop_id)},
            {"$set": {
                "activo": new_state,
                "updated_at": datetime.utcnow()
            }}
        )

        return JsonResponse({
            "success": True,
            "message": f"Cultivo {'activado' if new_state else 'desactivado'} exitosamente",
            "activo": new_state
        }, status=200)

    except Exception as e:
        return JsonResponse({
            "error": f"Error al cambiar estado de cultivo: {str(e)}"
        }, status=500)

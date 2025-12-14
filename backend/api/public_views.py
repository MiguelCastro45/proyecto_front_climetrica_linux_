"""
Vistas Públicas para Variables y Cultivos

Este módulo contiene las vistas públicas (sin autenticación requerida)
que permiten obtener las variables activas del dashboard y los cultivos activos.

Endpoints disponibles:
    - GET /api/public/variables/ - Listar variables activas
    - GET /api/public/crops/ - Listar cultivos activos

Autor: Sistema Climétrica
Fecha: 2025
"""

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from .mongodb import dashboard_variables_col, crops_col


@require_http_methods(["GET"])
def get_active_variables(request):
    """
    Lista todas las variables activas del dashboard.

    Este endpoint es público y no requiere autenticación.
    Retorna solo las variables con activa=True, ordenadas por 'orden'.
    """
    try:
        variables = list(
            dashboard_variables_col.find({"activa": True}).sort("orden", 1)
        )

        # Convertir ObjectId a string y limpiar campos internos
        for var in variables:
            var["_id"] = str(var["_id"])
            # Eliminar campos de auditoría para usuarios públicos
            var.pop("created_at", None)
            var.pop("updated_at", None)

        return JsonResponse({
            "success": True,
            "variables": variables
        }, status=200)

    except Exception as e:
        return JsonResponse({
            "error": f"Error al obtener variables: {str(e)}"
        }, status=500)


@require_http_methods(["GET"])
def get_active_crops(request):
    """
    Lista todos los cultivos activos.

    Este endpoint es público y no requiere autenticación.
    Retorna solo los cultivos con activo=True, ordenados alfabéticamente.
    """
    try:
        crops = list(
            crops_col.find({"activo": True}).sort("nombre", 1)
        )

        # Convertir ObjectId a string y limpiar campos internos
        for crop in crops:
            crop["_id"] = str(crop["_id"])
            # Eliminar campos de auditoría para usuarios públicos
            crop.pop("created_at", None)
            crop.pop("updated_at", None)

        return JsonResponse({
            "success": True,
            "crops": crops
        }, status=200)

    except Exception as e:
        return JsonResponse({
            "error": f"Error al obtener cultivos: {str(e)}"
        }, status=500)

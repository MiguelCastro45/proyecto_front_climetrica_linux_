/**
 * ============================================================================
 * HELPER: GUARDADO DE DATOS CLIMÁTICOS EN MONGODB
 * ============================================================================
 *
 * Este módulo proporciona funciones para guardar datos climáticos en la base
 * de datos MongoDB a través del backend Django.
 *
 * Autor: Sistema de Monitoreo Climétrica
 * Última actualización: 2025
 */

import API from './api';

/**
 * Guardar datos climáticos en MongoDB
 *
 * @param {Object} climateData - Datos climáticos a guardar
 * @param {Object} userInfo - Información del usuario
 * @param {Object} polygonData - Datos del polígono (opcional)
 * @returns {Promise<Object>} Resultado de la operación
 */
export async function saveClimateData(climateData, userInfo, polygonData = null) {
  try {
    // Validar que tenemos los datos mínimos necesarios
    if (!climateData || !userInfo) {
      return {
        success: false,
        error: 'Faltan datos requeridos para guardar'
      };
    }

    // DEBUG: Verificar estructura del usuario antes de guardar
    console.log('🔍 DEBUG - saveClimateData - userInfo recibido:', userInfo);
    console.log('🔍 DEBUG - userInfo._id:', userInfo._id);
    console.log('🔍 DEBUG - userInfo.id:', userInfo.id);

    // Construir el objeto de datos siguiendo la estructura de MongoDB
    const dataToSave = {
      usuario: {
        _id: userInfo._id || userInfo.id,
        nombre: `${userInfo.first_name || userInfo.nombre || ''} ${userInfo.last_name || userInfo.apellido || ''}`.trim(),
        rol: userInfo.role || userInfo.rol || 'productor',
        email: userInfo.email,
        fechaDescarga: new Date().toISOString(),
        horaDescarga: new Date().toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      },
      consulta: {
        variable: climateData.variable,
        lugar: climateData.place || climateData.lugar || 'Ubicación desconocida',
        coordenadas: polygonData ? {
          tipo: "Poligono",
          centro: {
            latitud: parseFloat(climateData.lat).toFixed(6),
            longitud: parseFloat(climateData.lng).toFixed(6)
          },
          vertices: polygonData.polygon.map(([lat, lng]) => ({
            latitud: parseFloat(lat).toFixed(6),
            longitud: parseFloat(lng).toFixed(6)
          })),
          puntosMuestreados: polygonData.samplePoints.map(([lat, lng]) => ({
            latitud: parseFloat(lat).toFixed(6),
            longitud: parseFloat(lng).toFixed(6)
          }))
        } : {
          tipo: "Punto unico",
          latitud: parseFloat(climateData.lat).toFixed(6),
          longitud: parseFloat(climateData.lng).toFixed(6)
        },
        rangoTemporal: climateData.rangoTemporal || 'N/A',
        fechaInicio: climateData.series && climateData.series.length > 0
          ? climateData.series[0].date
          : new Date().toISOString().split('T')[0],
        fechaFin: climateData.series && climateData.series.length > 0
          ? climateData.series[climateData.series.length - 1].date
          : new Date().toISOString().split('T')[0]
      },
      estadoDatos: {
        mensaje: climateData.dataStatusMessage || 'Datos disponibles',
        enTiempoReal: climateData.isLive !== undefined ? climateData.isLive.toString() : 'false',
        fechaDatos: climateData.dataTimestamp
          ? (typeof climateData.dataTimestamp === 'string' ? climateData.dataTimestamp : climateData.dataTimestamp.toISOString())
          : new Date().toISOString(),
        fuenteAPI: climateData.apiSource || 'Desconocido'
      },
      datosClimaticos: {
        valorActual: parseFloat(climateData.value || climateData.valorActual || 0).toFixed(2),
        unidad: climateData.unit || climateData.unidad || '°C',
        estadisticas: {
          promedio: parseFloat(climateData.mean || climateData.promedio || 0).toFixed(2),
          maximo: parseFloat(climateData.max || climateData.maximo || 0).toFixed(2),
          minimo: parseFloat(climateData.min || climateData.minimo || 0).toFixed(2)
        },
        serieTemporal: climateData.series || climateData.serieTemporal || []
      }
    };

    // DEBUG: Mostrar estructura completa antes de enviar
    console.log('📤 DEBUG - Datos a enviar al backend:', JSON.stringify(dataToSave.usuario, null, 2));

    // Hacer la petición POST al backend
    const response = await API.post('/api/climate-data/save/', dataToSave);

    return {
      success: true,
      data: response.data
    };

  } catch (error) {
    console.error('❌ Error guardando datos climáticos:', error);

    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Error desconocido al guardar datos'
    };
  }
}

/**
 * Obtener datos climáticos del usuario
 *
 * @param {string} userId - ID del usuario
 * @returns {Promise<Array>} Lista de registros climáticos
 */
export async function getClimateDataByUser(userId) {
  try {
    const response = await API.get(`/api/climate-data/?userId=${userId}`);
    return {
      success: true,
      data: response.data.data || response.data
    };
  } catch (error) {
    console.error('❌ Error obteniendo datos climáticos:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
}

/**
 * Eliminar un registro climático
 *
 * @param {string} recordId - ID del registro a eliminar
 * @returns {Promise<Object>} Resultado de la operación
 */
export async function deleteClimateData(recordId) {
  try {
    const response = await API.delete(`/api/climate-data/${recordId}/`);
    return {
      success: true,
      message: response.data.message
    };
  } catch (error) {
    console.error('❌ Error eliminando registro:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message
    };
  }
}

export default saveClimateData;

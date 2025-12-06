/**
 * Utilidad centralizada para manejo de errores de backend
 * Proporciona mensajes descriptivos y útiles para el usuario
 */

/**
 * Maneja errores de llamadas API y retorna un mensaje descriptivo
 * @param {Error} error - Error capturado del try/catch
 * @param {string} operacion - Descripción de la operación (ej: "iniciar sesión", "guardar datos")
 * @returns {string} Mensaje de error descriptivo para mostrar al usuario
 */
export const handleAPIError = (error, operacion = "realizar la operación") => {
  console.error(`Error en ${operacion}:`, error);

  // Error de red (sin respuesta del servidor)
  if (!error.response) {
    if (error.message === "Network Error") {
      return `No se pudo conectar con el servidor. Verifica tu conexión a internet y que el servidor esté en funcionamiento.`;
    }
    return `Error de conexión al ${operacion}. Verifica tu conexión a internet.`;
  }

  const { status, data } = error.response;

  // Mensajes según código de estado HTTP
  switch (status) {
    case 400:
      return data?.error || data?.message || `Datos inválidos al ${operacion}. Verifica la información ingresada.`;

    case 401:
      return data?.error || data?.message || `Credenciales inválidas. Verifica tu correo y contraseña.`;

    case 403:
      return data?.error || data?.message || `No tienes permisos para ${operacion}.`;

    case 404:
      return data?.error || data?.message || `Recurso no encontrado al ${operacion}.`;

    case 409:
      return data?.error || data?.message || `Ya existe un registro con esos datos.`;

    case 422:
      return data?.error || data?.message || `Los datos enviados no son válidos. Verifica la información.`;

    case 500:
      return `Error interno del servidor al ${operacion}. Por favor intenta más tarde o contacta al administrador.`;

    case 502:
      return `El servidor no está disponible temporalmente. Por favor intenta más tarde.`;

    case 503:
      return `El servicio no está disponible en este momento. Por favor intenta más tarde.`;

    case 504:
      return `El servidor tardó demasiado en responder. Por favor intenta nuevamente.`;

    default:
      return data?.error || data?.message || `Error desconocido al ${operacion} (Código ${status}). Por favor intenta más tarde.`;
  }
};

/**
 * Maneja errores específicos de validación de formularios
 * @param {Error} error - Error capturado
 * @returns {Object} Objeto con campos específicos de error
 */
export const handleValidationError = (error) => {
  if (error.response?.status === 400 && error.response?.data?.errors) {
    return error.response.data.errors;
  }
  return null;
};

/**
 * Verifica si el token ha expirado
 * @param {Error} error - Error capturado
 * @returns {boolean} true si el token expiró
 */
export const isTokenExpired = (error) => {
  return error.response?.status === 401 &&
         (error.response?.data?.error?.includes("token") ||
          error.response?.data?.error?.includes("expirado") ||
          error.response?.data?.error?.includes("expired"));
};

/**
 * Maneja errores y redirige si el token expiró
 * @param {Error} error - Error capturado
 * @param {Function} navigate - Función de navegación de react-router
 * @param {string} operacion - Descripción de la operación
 * @returns {string} Mensaje de error
 */
export const handleAPIErrorWithAuth = (error, navigate, operacion = "realizar la operación") => {
  if (isTokenExpired(error)) {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/login");
    return "Tu sesión ha expirado. Por favor inicia sesión nuevamente.";
  }

  return handleAPIError(error, operacion);
};

/**
 * Extrae mensaje de error del objeto de respuesta
 * @param {Object} errorResponse - Respuesta de error del servidor
 * @returns {string} Mensaje de error
 */
export const extractErrorMessage = (errorResponse) => {
  if (typeof errorResponse === 'string') return errorResponse;

  return errorResponse?.error ||
         errorResponse?.message ||
         errorResponse?.msg ||
         "Error desconocido";
};

/**
 * Formatea errores de validación para mostrar al usuario
 * @param {Object} validationErrors - Objeto con errores de validación por campo
 * @returns {string} Mensaje formateado
 */
export const formatValidationErrors = (validationErrors) => {
  if (!validationErrors || typeof validationErrors !== 'object') {
    return '';
  }

  const errors = Object.entries(validationErrors)
    .map(([field, message]) => `• ${field}: ${message}`)
    .join('\n');

  return errors;
};

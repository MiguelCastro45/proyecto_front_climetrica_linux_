# Sistema de Manejo de Errores del Frontend

## Descripción

Sistema centralizado para manejo de errores de llamadas API en toda la aplicación. Proporciona mensajes descriptivos y útiles para el usuario basados en códigos de estado HTTP y tipos de error.

## Ubicación

```
climetrica-frontend/src/utils/errorHandler.js
```

## Funciones Principales

### 1. `handleAPIError(error, operacion)`

Maneja errores de llamadas API y retorna un mensaje descriptivo.

**Parámetros:**
- `error` (Error): Error capturado del try/catch
- `operacion` (string): Descripción de la operación (ej: "iniciar sesión", "guardar datos")

**Retorna:**
- `string`: Mensaje de error descriptivo para mostrar al usuario

**Ejemplo de uso:**
```javascript
try {
  await API.post("/register/", payload);
  alert("✓ Usuario registrado con éxito");
} catch (err) {
  const errorMessage = handleAPIError(err, "registrar usuario");
  alert(errorMessage);
}
```

**Códigos HTTP manejados:**
- `400` - Datos inválidos
- `401` - Credenciales inválidas
- `403` - Sin permisos
- `404` - Recurso no encontrado
- `409` - Registro duplicado
- `422` - Datos no válidos
- `500` - Error interno del servidor
- `502` - Servidor no disponible
- `503` - Servicio no disponible
- `504` - Timeout del servidor
- Sin respuesta - Error de red/conexión

### 2. `handleAPIErrorWithAuth(error, navigate, operacion)`

Similar a `handleAPIError` pero incluye manejo especial para tokens expirados, redirigiendo automáticamente al login.

**Parámetros:**
- `error` (Error): Error capturado
- `navigate` (Function): Función de navegación de react-router
- `operacion` (string): Descripción de la operación

**Retorna:**
- `string`: Mensaje de error

**Ejemplo de uso:**
```javascript
try {
  const res = await API.get("/profile/", {
    headers: { Authorization: `Bearer ${token}` }
  });
  setUser(res.data.user);
} catch (err) {
  const errorMessage = handleAPIErrorWithAuth(err, navigate, "cargar perfil");
  showNotification("error", "Error", errorMessage);
}
```

### 3. `isTokenExpired(error)`

Verifica si el error es debido a un token expirado.

**Parámetros:**
- `error` (Error): Error capturado

**Retorna:**
- `boolean`: true si el token expiró

### 4. `extractErrorMessage(errorResponse)`

Extrae el mensaje de error del objeto de respuesta del servidor.

**Parámetros:**
- `errorResponse` (Object): Respuesta de error del servidor

**Retorna:**
- `string`: Mensaje de error extraído

### 5. `handleValidationError(error)`

Maneja errores específicos de validación de formularios.

**Parámetros:**
- `error` (Error): Error capturado

**Retorna:**
- `Object|null`: Objeto con campos específicos de error, o null

### 6. `formatValidationErrors(validationErrors)`

Formatea errores de validación para mostrar al usuario.

**Parámetros:**
- `validationErrors` (Object): Objeto con errores de validación por campo

**Retorna:**
- `string`: Mensaje formateado

## Archivos Actualizados

### Archivos que usan el sistema de manejo de errores:

1. **Login.jsx** - Manejo de errores de autenticación
2. **Register.jsx** - Manejo de errores de registro
3. **ForgotPassword.jsx** - Manejo de errores de recuperación de contraseña
4. **UserPanel.jsx** - Manejo de errores de perfil y administración
5. **ClimateDashboard.jsx** - Manejo de errores de datos climáticos
6. **UserMapDashboard.jsx** - Manejo de errores de mapas y análisis

## Ejemplos de Mensajes de Error

### Error de Red
```
"No se pudo conectar con el servidor. Verifica tu conexión a internet y que el servidor esté en funcionamiento."
```

### Error 400 (Bad Request)
```
"Datos inválidos al registrar usuario. Verifica la información ingresada."
```

### Error 401 (Unauthorized)
```
"Credenciales inválidas. Verifica tu correo y contraseña."
```

### Error 403 (Forbidden)
```
"No tienes permisos para eliminar el registro."
```

### Error 404 (Not Found)
```
"Recurso no encontrado al cargar los datos climáticos."
```

### Error 500 (Internal Server Error)
```
"Error interno del servidor al guardar datos. Por favor intenta más tarde o contacta al administrador."
```

### Token Expirado
```
"Tu sesión ha expirado. Por favor inicia sesión nuevamente."
```

## Mejores Prácticas

### 1. Siempre usar en bloques try/catch

```javascript
try {
  const res = await API.post("/endpoint/", data);
  // Manejo de éxito
} catch (err) {
  const errorMessage = handleAPIError(err, "descripción de la operación");
  // Mostrar error al usuario
}
```

### 2. Proporcionar descripciones claras de operaciones

❌ **Incorrecto:**
```javascript
const errorMessage = handleAPIError(err, "error");
```

✓ **Correcto:**
```javascript
const errorMessage = handleAPIError(err, "guardar registro climático");
```

### 3. Usar handleAPIErrorWithAuth para rutas protegidas

```javascript
// Para endpoints que requieren autenticación
const errorMessage = handleAPIErrorWithAuth(err, navigate, "cargar perfil");

// Para endpoints públicos
const errorMessage = handleAPIError(err, "iniciar sesión");
```

### 4. No duplicar lógica de manejo de errores

❌ **Incorrecto:**
```javascript
catch (err) {
  if (err.response?.status === 400) {
    setError("Datos inválidos");
  } else if (err.response?.status === 500) {
    setError("Error del servidor");
  }
  // ...más condiciones
}
```

✓ **Correcto:**
```javascript
catch (err) {
  const errorMessage = handleAPIError(err, "operación");
  setError(errorMessage);
}
```

### 5. Mostrar mensajes al usuario de forma apropiada

```javascript
// Para modales o notificaciones
showNotification("error", "Error al guardar", errorMessage);

// Para alerts simples
alert(`❌ ${errorMessage}`);

// Para estados del componente
setError(errorMessage);
```

## Beneficios

1. **Consistencia**: Todos los errores se manejan de forma uniforme en toda la aplicación
2. **Mantenibilidad**: Lógica centralizada, fácil de actualizar
3. **UX Mejorada**: Mensajes claros y descriptivos para el usuario
4. **Debugging**: Logs consistentes en consola
5. **Seguridad**: Manejo automático de tokens expirados
6. **Internacionalización**: Fácil agregar múltiples idiomas en el futuro

## Extensión Futura

Para agregar soporte a nuevos códigos de error:

```javascript
// En errorHandler.js
case 429:
  return `Demasiadas solicitudes. Por favor espera un momento antes de intentar nuevamente.`;
```

Para agregar soporte multiidioma:

```javascript
import { i18n } from './i18n';

export const handleAPIError = (error, operacion = "realizar la operación") => {
  // ...
  return i18n.t('errors.network_error', { operacion });
};
```

## Fecha de Implementación

Diciembre 2, 2025

## Autor

Sistema de Monitoreo Climático - Climétrica

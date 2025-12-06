# Guía de Documentación del Código - Climétrica

## Objetivo

Este documento establece los estándares de documentación para todo el código del proyecto Climétrica, garantizando que el código sea comprensible, mantenible y profesional.

## Principios Generales

1. **Claridad sobre brevedad**: Es mejor ser explícito que conciso
2. **Actualización constante**: La documentación debe actualizarse con el código
3. **Ejemplos prácticos**: Incluir ejemplos cuando sea posible
4. **Español**: Toda la documentación en español

## Estructura de Documentación

### Backend (Python/Django)

#### 1. Módulos

Cada archivo Python debe comenzar con un docstring de módulo:

```python
"""
Nombre del Módulo

Descripción detallada de qué hace este módulo y su propósito
en el sistema general.

Clases principales:
    - Clase1: Descripción
    - Clase2: Descripción

Funciones principales:
    - funcion1: Descripción
    - funcion2: Descripción

Autor: Sistema Climétrica
Fecha: 2025
"""
```

#### 2. Funciones

Todas las funciones deben estar documentadas con docstrings de Google Style:

```python
def nombre_funcion(parametro1, parametro2):
    """
    Descripción breve de qué hace la función (una línea).

    Descripción más detallada si es necesario, explicando:
    - El propósito de la función
    - Cómo funciona internamente (si es complejo)
    - Casos de uso comunes

    Args:
        parametro1 (tipo): Descripción del parámetro 1
        parametro2 (tipo): Descripción del parámetro 2

    Returns:
        tipo: Descripción de lo que retorna

    Raises:
        TipoDeError: Cuándo se lanza este error

    Example:
        >>> resultado = nombre_funcion("valor1", 42)
        >>> print(resultado)
        Resultado esperado

    Note:
        - Notas importantes sobre uso
        - Limitaciones conocidas
        - Consideraciones de performance
    """
```

#### 3. Clases

```python
class MiClase:
    """
    Descripción breve de la clase.

    Descripción detallada del propósito y uso de la clase.

    Attributes:
        atributo1 (tipo): Descripción
        atributo2 (tipo): Descripción

    Methods:
        metodo1: Descripción breve
        metodo2: Descripción breve

    Example:
        >>> obj = MiClase(param1, param2)
        >>> resultado = obj.metodo1()
    """
```

#### 4. Vistas/Endpoints de Django

```python
@csrf_exempt
@jwt_required
def nombre_vista(request):
    """
    Endpoint: POST /api/ruta/

    Descripción de qué hace este endpoint.

    Request Body:
        {
            "campo1": "tipo - descripción",
            "campo2": "tipo - descripción"
        }

    Response Success (200):
        {
            "resultado": "tipo - descripción"
        }

    Response Errors:
        - 400: Descripción del error
        - 401: No autenticado
        - 403: Sin permisos
        - 404: Recurso no encontrado
        - 500: Error del servidor

    Headers requeridos:
        Authorization: Bearer <token>

    Validaciones:
        - Campo1 debe ser único
        - Campo2 debe cumplir X condición

    Example:
        POST /api/ruta/
        {
            "campo1": "valor"
        }

    Note:
        - Consideraciones especiales
        - Efectos secundarios
    """
```

### Frontend (JavaScript/React)

#### 1. Archivos de Utilidades

```javascript
/**
 * Nombre del Módulo de Utilidades
 *
 * Descripción del propósito del archivo.
 *
 * Funciones exportadas:
 * - funcion1: Descripción
 * - funcion2: Descripción
 *
 * @author Sistema Climétrica
 * @date 2025
 */
```

#### 2. Funciones

```javascript
/**
 * Descripción breve de la función.
 *
 * Descripción más detallada si es necesario.
 *
 * @param {tipo} parametro1 - Descripción del parámetro
 * @param {tipo} parametro2 - Descripción del parámetro
 * @returns {tipo} Descripción de lo que retorna
 *
 * @example
 * const resultado = miFuncion("valor", 42);
 * console.log(resultado); // Salida esperada
 *
 * @throws {Error} Descripción de cuándo se lanza error
 */
export const miFuncion = (parametro1, parametro2) => {
    // Implementación
};
```

#### 3. Componentes React

```javascript
/**
 * Componente NombreComponente
 *
 * Descripción detallada del componente, qué muestra y cuál es su propósito.
 *
 * @component
 *
 * @param {Object} props - Props del componente
 * @param {string} props.propiedad1 - Descripción
 * @param {function} props.callback - Descripción
 *
 * @example
 * <NombreComponente
 *   propiedad1="valor"
 *   callback={() => console.log("click")}
 * />
 *
 * @returns {JSX.Element} Elemento React renderizado
 */
export default function NombreComponente({ propiedad1, callback }) {
    // Implementación
}
```

#### 4. Hooks Personalizados

```javascript
/**
 * Hook personalizado useNombreHook
 *
 * Descripción de qué hace el hook y cuándo usarlo.
 *
 * @param {tipo} parametro - Descripción
 * @returns {Object} Objeto con propiedades retornadas
 * @returns {tipo} return.propiedad1 - Descripción
 * @returns {function} return.funcion1 - Descripción
 *
 * @example
 * const { data, loading, error } = useNombreHook(id);
 *
 * if (loading) return <Spinner />;
 * if (error) return <Error message={error} />;
 * return <Display data={data} />;
 */
export const useNombreHook = (parametro) => {
    // Implementación
};
```

## Comentarios en el Código

### Cuándo Comentar

✅ **SÍ comentar:**
- Lógica compleja o no obvia
- Algoritmos importantes
- Hacks o soluciones temporales
- Decisiones de diseño no evidentes
- TODOs y FIXMEs
- Secciones importantes de código

❌ **NO comentar:**
- Código obvio o auto-explicativo
- Repetir lo que el código ya dice
- Comentarios obsoletos

### Formato de Comentarios

```python
# Comentarios de una línea para explicaciones breves

# Para explicaciones más largas, usar múltiples líneas
# que explican la lógica de forma clara y concisa
# siguiendo este formato.

# TODO: Descripción de tarea pendiente
# FIXME: Descripción de lo que hay que arreglar
# HACK: Explicación de por qué esto es un hack temporal
# NOTE: Nota importante sobre el código
```

```javascript
// Comentarios de una línea en JavaScript

// Para explicaciones más largas, usar múltiples líneas
// que explican la lógica de forma clara y concisa
// siguiendo este formato.

// TODO: Descripción de tarea pendiente
// FIXME: Descripción de lo que hay que arreglar
// HACK: Explicación de por qué esto es un hack temporal
// NOTE: Nota importante sobre el código
```

## Secciones del Código

Usar comentarios de sección para organizar código largo:

```python
# ============================================================================
# SECCIÓN PRINCIPAL
# ============================================================================

# ----------------------------------------------------------------------------
# Subsección
# ----------------------------------------------------------------------------

# ===== Grupo de funciones relacionadas =====
```

```javascript
// ============================================================================
// SECCIÓN PRINCIPAL
// ============================================================================

// ----------------------------------------------------------------------------
// Subsección
// ----------------------------------------------------------------------------

// ===== Grupo de funciones relacionadas =====
```

## Nombres Descriptivos

### Variables

```python
# ❌ Mal
x = get_data()
tmp = process(x)
result = tmp

# ✅ Bien
user_data = get_user_from_database()
validated_data = validate_user_input(user_data)
final_result = calculate_metrics(validated_data)
```

### Funciones

```python
# ❌ Mal
def process():
def do_thing():
def handler():

# ✅ Bien
def process_climate_data():
def validate_user_credentials():
def handle_authentication_error():
```

### Constantes

```python
# Backend Python
MAX_RETRY_ATTEMPTS = 3
DEFAULT_TIMEOUT_SECONDS = 30
API_BASE_URL = "https://api.example.com"
```

```javascript
// Frontend JavaScript
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_TIMEOUT_MS = 30000;
const API_BASE_URL = "https://api.example.com";
```

## Documentación de APIs

### Endpoints RESTful

Cada endpoint debe documentarse en el archivo de vistas:

```python
"""
GET /api/endpoint/

Descripción del endpoint

Query Parameters:
    - param1 (optional): Descripción
    - param2 (required): Descripción

Response:
    200: Success
    {
        "data": [...],
        "count": 10
    }

    400: Bad Request
    {
        "error": "Mensaje de error"
    }
"""
```

## Control de Versiones de Documentación

Cuando se actualice el código:

1. ✅ Actualizar el docstring/comentario correspondiente
2. ✅ Actualizar la fecha si es relevante
3. ✅ Agregar nota de cambio si es significativo
4. ✅ Actualizar README si afecta uso externo

## Herramientas Recomendadas

- **Backend**: Sphinx para generar documentación HTML
- **Frontend**: JSDoc para generar documentación de JavaScript
- **General**: Markdown para documentación de alto nivel

## Archivos ya Documentados

### Backend
- ✅ `backend/api/auth_utils.py` - Utilidades de autenticación
- ✅ `backend/api/crypto_utils.py` - Utilidades de encriptación
- ✅ `backend/api/decorators.py` - Decoradores de autenticación

### Pendientes de Documentar
- ⏳ `backend/api/views.py` - Vistas/endpoints principales
- ⏳ `backend/api/mongodb.py` - Conexión a MongoDB
- ⏳ `backend/api/email_service.py` - Servicio de correo
- ⏳ `frontend/src/utils/errorHandler.js` - Manejo de errores (ya tiene buena documentación)
- ⏳ `frontend/src/pages/*` - Componentes de página
- ⏳ `frontend/src/components/*` - Componentes reutilizables

## Conclusión

Una buena documentación es tan importante como el código mismo. Ayuda a:

- 📚 Nuevos desarrolladores a entender rápidamente
- 🔧 Facilitar el mantenimiento futuro
- 🐛 Reducir errores por malentendidos
- 📈 Mejorar la calidad general del código
- 🤝 Facilitar la colaboración en equipo

---

**Recuerda**: El código se escribe una vez, pero se lee muchas veces.
La documentación es una inversión que ahorra tiempo a futuro.

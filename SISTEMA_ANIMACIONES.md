# Sistema de Animaciones - Climetrica

## Estado Actual del Sistema

### 1. Animaciones Hardcoded (AnimatedLayer.jsx)

Actualmente, las animaciones están definidas **hardcodeadas** en el archivo `AnimatedLayer.jsx` en el objeto `LAYER_ANIMATIONS`:

```javascript
const LAYER_ANIMATIONS = {
  "Temperatura terrestre": {
    animationType: 'thermal-flow',
    baseLineCount: 80,
    lineSpeed: 0.5,
    lineLength: { min: 60, max: 150 },
    // ... más configuraciones
  },
  "Precipitación": {
    animationType: 'rain-drops',
    baseLineCount: 200,
    lineSpeed: 1.2,
    // ... más configuraciones
  },
  // ... etc
}
```

**Problema**: Cada variable climática tiene su animación definida en el código fuente.

### 2. Base de Datos (Parcialmente Implementado)

En la base de datos, las variables tienen el campo `configuracion_animacion` que **SÍ se usa** pero de forma limitada:

```javascript
configuracion_animacion: {
  habilitada: true/false,      // ✅ Se usa - activa/desactiva la animación
  opacidad: 0.9,              // ✅ Se usa - controla transparencia
  velocidad: "normal",         // ⚠️ Se usa parcialmente
  tipo_animacion: "color"     // ❌ NO se usa - no afecta el tipo de animación
}
```

**Cómo se usa actualmente**:
- `UserMapDashboard.jsx` lee `configuracion_animacion` de la BD
- Lo pasa como prop `animationConfig` a `AnimatedLayer`
- `AnimatedLayer` usa `habilitada` y `opacidad`
- PERO el `tipo_animacion` **NO cambia** la animación, usa `LAYER_ANIMATIONS[nombreVariable]`

## Problema Principal

**Las animaciones NO son configurables desde el panel de administración.**

Aunque el campo `tipo_animacion` existe en la BD, el componente `AnimatedLayer` ignora este valor y usa el hardcodeado en `LAYER_ANIMATIONS` según el nombre de la variable.

## Solución Propuesta

### Arquitectura Mejorada

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN PANEL                               │
│  (AdminVariables.jsx)                                        │
│                                                              │
│  Crear/Editar Variable                                      │
│  ├─ Nombre: "Temperatura"                                   │
│  ├─ API Config                                              │
│  └─ Animación Config:                                       │
│      ├─ Tipo: [thermal-flow ▼]  ← Selector con preview     │
│      ├─ Velocidad: [0.5]                                    │
│      ├─ Cantidad líneas: [80]                               │
│      ├─ Opacidad: [0.9]                                     │
│      └─ [Preview en vivo] ← Muestra cómo se verá           │
└─────────────────────────────────────────────────────────────┘
                            ↓ GUARDA EN BD
┌─────────────────────────────────────────────────────────────┐
│                   BASE DE DATOS                              │
│                                                              │
│  Variable: {                                                 │
│    nombre: "Temperatura",                                   │
│    configuracion_animacion: {                               │
│      tipo_animacion: "thermal-flow",  ← Config completa     │
│      baseLineCount: 80,                                     │
│      lineSpeed: 0.5,                                        │
│      opacidad: 0.9,                                         │
│      lineLength: { min: 60, max: 150 },                    │
│      glowIntensity: 8,                                      │
│      // ... toda la config                                  │
│    }                                                         │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
                            ↓ LEE DESDE API
┌─────────────────────────────────────────────────────────────┐
│                 USER DASHBOARD                               │
│  (UserMapDashboard.jsx)                                     │
│                                                              │
│  fetch variables → obtiene configuracion_animacion          │
│                            ↓                                 │
│            <AnimatedLayer                                    │
│              animationConfig={var.configuracion_animacion}  │
│            />                                                │
└─────────────────────────────────────────────────────────────┘
                            ↓ USA CONFIG DE BD
┌─────────────────────────────────────────────────────────────┐
│              ANIMATED LAYER                                  │
│  (AnimatedLayer.jsx)                                        │
│                                                              │
│  ❌ NO usar LAYER_ANIMATIONS hardcoded                      │
│  ✅ Usar animationConfig desde props (BD)                   │
│                                                              │
│  const config = props.animationConfig || DEFAULT_CONFIG     │
└─────────────────────────────────────────────────────────────┘
```

## Tipos de Animación Disponibles

Actualmente tienes estos tipos en el código:

1. **thermal-flow** - Flujo térmico (temperatura)
2. **ocean-thermal** - Térmico oceánico
3. **flow-vectors** - Vectores de flujo (corrientes)
4. **rain-drops** - Gotas de lluvia
5. **wind-streams** - Corrientes de viento
6. **clouds-dynamic** - Nubes dinámicas
7. **snow-fall** - Nieve cayendo
8. **pressure-flow** - Flujo de presión
9. **humidity-flow** - Flujo de humedad

## Implementación Requerida

### 1. Backend (MongoDB)
Ya está listo - el campo `configuracion_animacion` existe.

### 2. AdminVariables.jsx
- Agregar selector de tipo de animación
- Agregar sliders para configurar parámetros
- Agregar preview en vivo del canvas con la animación

### 3. AnimatedLayer.jsx
- Cambiar lógica para usar `props.animationConfig` en lugar de `LAYER_ANIMATIONS`
- Mantener `LAYER_ANIMATIONS` como configuraciones por defecto
- Usar: `const config = props.animationConfig || LAYER_ANIMATIONS[variableName] || DEFAULT`

### 4. UserMapDashboard.jsx
Ya está implementado - pasa `animationConfig` correctamente.

## Beneficios

✅ Administradores pueden personalizar animaciones sin tocar código
✅ Cada variable puede tener animación única
✅ Preview en tiempo real antes de guardar
✅ Cambios inmediatos en el dashboard de usuarios
✅ Configuraciones guardadas en BD (persistentes)

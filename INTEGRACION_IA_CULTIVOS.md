# 🤖 Integración de IA para Recomendaciones de Cultivos

## 📋 Resumen

Este documento explica cómo integrar **Inteligencia Artificial GRATUITA** para mejorar el sistema de recomendaciones de cultivos usando la API de Groq.

---

## 🎯 ¿Qué Mejora la IA?

### **ANTES** (Sistema Actual - Lógica Hardcoded):
```javascript
// Cálculo simple basado en rangos
if (temperatura < temperaturaOptima.min) {
  riesgos.push("Riesgo de heladas");
}
```

### **DESPUÉS** (Con IA):
```javascript
// Análisis contextual inteligente
const aiAnalysis = await getGroqCropAnalysis(climateData, cultivo);
// Resultado: Riesgos específicos, recomendaciones técnicas, manejo detallado
```

**Beneficios**:
- ✅ Recomendaciones más precisas y contextuales
- ✅ Riesgos agronómicos específicos (no genéricos)
- ✅ Sugerencias de manejo técnico detalladas
- ✅ Análisis combinado (lógica local + IA)
- ✅ 100% GRATIS (14,400 requests/día)

---

## 🚀 Paso 1: Obtener API Key de Groq (GRATIS)

1. **Registrarse**: https://console.groq.com/
2. **Crear API Key**:
   - Ir a https://console.groq.com/keys
   - Click en "Create API Key"
   - Copiar la key (empieza con `gsk_...`)

3. **Configurar en el proyecto**:
   ```bash
   # Crear archivo .env en /frontend
   cd /home/leaduin/proyectos/proyecto/climetrica/frontend
   cp .env.example .env

   # Editar .env y agregar:
   REACT_APP_GROQ_API_KEY=gsk_tu_api_key_aqui
   ```

**⚠️ IMPORTANTE**: Nunca subir `.env` a Git (ya está en `.gitignore`)

---

## 🔧 Paso 2: Instalar Dependencias (Opcional)

No se necesitan dependencias adicionales, pero si quieres usar TensorFlow.js en el futuro:

```bash
cd frontend
npm install @tensorflow/tfjs
```

---

## 📝 Paso 3: Integrar IA en UserMapDashboard.jsx

### **3.1. Importar el servicio**

```javascript
// Al inicio de UserMapDashboard.jsx
import { getGroqCropAnalysis, combineAnalysis } from '../api/groqCropAI';
```

### **3.2. Modificar la función `analyzeCropForLocation`**

Busca la función `analyzeCropForLocation` (aprox. línea 2633) y modifícala:

```javascript
async function analyzeCropForLocation(cultivoSeleccionado, lat, lng) {
  try {
    console.log(`🌱 Analizando cultivo: ${cultivoSeleccionado} en ${lat}, ${lng}`);

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    // ... código existente de obtención de datos climáticos ...

    const datosClimaticos = {
      temperatura,
      precipitacion,
      altitud,
      humedad
    };

    const cultivo = cultivos[cultivoSeleccionado];

    // ========================================
    // ANÁLISIS LOCAL (existente)
    // ========================================
    const aptitudTemp = calcularAptitud(
      datosClimaticos.temperatura,
      cultivo.temperaturaOptima.min,
      cultivo.temperaturaOptima.max
    );
    const aptitudPrec = calcularAptitud(
      datosClimaticos.precipitacion,
      cultivo.precipitacionOptima.min,
      cultivo.precipitacionOptima.max
    );
    const aptitudAlt = calcularAptitud(
      datosClimaticos.altitud,
      cultivo.altitudOptima.min,
      cultivo.altitudOptima.max
    );

    const aptitudTotal = (aptitudTemp + aptitudPrec + aptitudAlt) / 3;

    const analysisLocal = {
      cultivo: cultivoSeleccionado,
      ubicacion: { lat: latNum, lng: lngNum, altitud },
      condicionesClimaticas: datosClimaticos,
      fuentesDatos: {
        temperatura: temperaturaFuente,
        precipitacion: precipitacionFuente,
        altitud: altitudFuente,
        humedad: humedadFuente
      },
      aptitudes: {
        temperatura: aptitudTemp,
        precipitacion: aptitudPrec,
        altitud: aptitudAlt,
        total: aptitudTotal
      },
      recomendacion: getRecomendacion(aptitudTotal),
      riesgos: evaluarRiesgos(datosClimaticos, cultivo),
      parametrosOptimos: {
        temperatura: `${cultivo.temperaturaOptima.min}°C - ${cultivo.temperaturaOptima.max}°C`,
        precipitacion: `${cultivo.precipitacionOptima.min} - ${cultivo.precipitacionOptima.max} mm/año`,
        altitud: `${cultivo.altitudOptima.min} - ${cultivo.altitudOptima.max} msnm`
      },
      ciclosAgricolas: {
        siembra: cultivo.cicloSiembra,
        cosecha: cultivo.cicloCosecha
      }
    };

    // ========================================
    // ANÁLISIS CON IA (NUEVO)
    // ========================================
    console.log("🤖 Solicitando análisis con IA...");
    const analysisAI = await getGroqCropAnalysis(datosClimaticos, cultivo);

    // Combinar análisis local + IA
    const analysisFinal = combineAnalysis(analysisLocal, analysisAI);

    console.log("✅ Análisis completado:", {
      aptitudLocal: aptitudTotal.toFixed(1),
      aptitudIA: analysisAI?.aptitud || 'N/A',
      usedAI: analysisFinal.usedAI
    });

    return analysisFinal;

  } catch (error) {
    console.error("Error en análisis de cultivo:", error);
    throw error;
  }
}
```

### **3.3. Actualizar el modal para mostrar recomendaciones de IA**

Busca el modal de análisis de cultivo (aprox. línea 4900) y agrega sección de IA:

```javascript
{/* SECCIÓN EXISTENTE: Riesgos */}
<div className="crop-details-section">
  <h5>⚠️ Riesgos Identificados</h5>
  {cropAnalysisData.riesgos && cropAnalysisData.riesgos.length > 0 ? (
    <ul className="crop-risk-list">
      {cropAnalysisData.riesgos.map((riesgo, idx) => (
        <li key={idx} className="crop-risk-item">{riesgo}</li>
      ))}
    </ul>
  ) : (
    <p className="no-risks">✅ No se identificaron riesgos significativos</p>
  )}
</div>

{/* NUEVA SECCIÓN: Recomendaciones de IA */}
{cropAnalysisData.usedAI && cropAnalysisData.recomendacionesIA && (
  <>
    <div className="crop-details-section ai-section">
      <h5>🤖 Análisis con Inteligencia Artificial</h5>
      <div className="ai-badge">
        <span>✨ Análisis potenciado con IA</span>
        <span className="ai-confidence">
          Aptitud IA: {cropAnalysisData.aptitudes.totalIA?.toFixed(1)}%
        </span>
      </div>
    </div>

    <div className="crop-details-section">
      <h5>💡 Recomendaciones de Manejo (IA)</h5>
      <ul className="crop-recommendations-list">
        {cropAnalysisData.recomendacionesIA.map((rec, idx) => (
          <li key={idx} className="crop-recommendation-item">{rec}</li>
        ))}
      </ul>
    </div>

    {cropAnalysisData.recomendacion.manejoEspecifico && (
      <div className="crop-details-section">
        <h5>🌱 Manejo Agronómico Específico</h5>
        <p className="manejo-text">{cropAnalysisData.recomendacion.manejoEspecifico}</p>
      </div>
    )}
  </>
)}
```

### **3.4. Agregar estilos CSS para sección IA**

En `frontend/src/styles/UserMapDashboard.css`:

```css
/* Sección de IA */
.ai-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.ai-badge {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.ai-confidence {
  background: rgba(255, 255, 255, 0.2);
  padding: 5px 12px;
  border-radius: 20px;
  font-weight: bold;
}

.crop-recommendations-list {
  list-style: none;
  padding: 0;
  margin: 10px 0;
}

.crop-recommendation-item {
  background: #e8f5e9;
  padding: 12px;
  margin-bottom: 10px;
  border-left: 4px solid #4caf50;
  border-radius: 4px;
  font-size: 14px;
}

.manejo-text {
  background: #fff8e1;
  padding: 15px;
  border-left: 4px solid #ffc107;
  border-radius: 4px;
  line-height: 1.6;
  font-size: 14px;
}

.crop-risk-list {
  list-style: none;
  padding: 0;
  margin: 10px 0;
}

.crop-risk-item {
  background: #ffebee;
  padding: 12px;
  margin-bottom: 10px;
  border-left: 4px solid #f44336;
  border-radius: 4px;
  font-size: 14px;
}

.no-risks {
  background: #e8f5e9;
  padding: 12px;
  border-radius: 4px;
  color: #2e7d32;
  text-align: center;
}
```

---

## 🧪 Paso 4: Probar la Integración

### **4.1. Reiniciar el servidor**

```bash
cd frontend
npm start
```

### **4.2. Probar análisis de cultivo**

1. Ir al dashboard de usuario
2. Seleccionar una región en el mapa
3. Abrir modal de cultivos
4. Seleccionar un cultivo y "Analizar Región"
5. Verificar en consola:
   ```
   🤖 Consultando Groq AI para análisis de cultivo...
   ✅ Respuesta de Groq AI recibida
   🎯 Aptitud IA: 75% (Media)
   ```

### **4.3. Verificar en el modal**

Deberías ver:
- ✅ Sección "🤖 Análisis con Inteligencia Artificial"
- ✅ "💡 Recomendaciones de Manejo (IA)"
- ✅ "🌱 Manejo Agronómico Específico"

---

## 📊 Comparación: Con vs Sin IA

### **SIN IA** (Lógica Hardcoded):
```
Riesgos:
- Riesgo moderado de estrés térmico: 3.5°C por encima del óptimo
- Riesgo alto de déficit hídrico: Precipitación 35% por debajo del óptimo

Recomendación: Media - Condiciones aceptables, considerar manejo
```

### **CON IA** (Groq):
```
Riesgos:
- Riesgo moderado de estrés térmico: 3.5°C por encima del óptimo
- Riesgo alto de déficit hídrico: Precipitación 35% por debajo del óptimo
- Posible afectación de la floración por temperaturas elevadas en época crítica
- Reducción de calidad del grano por estrés hídrico durante llenado
- Mayor susceptibilidad a Broca del café por estrés combinado

Recomendaciones de Manejo (IA):
- Implementar riego por goteo con déficit controlado (70% ETc)
- Aplicar mulching orgánico para conservar humedad y reducir temperatura del suelo
- Establecer sombrío temporal con Inga edulis (30-40% de cobertura)
- Fraccionamiento de fertilización nitrogenada para evitar exceso de crecimiento vegetativo
- Monitoreo quincenal de Broca con trampas artesanales

Manejo Agronómico Específico:
Dadas las condiciones de estrés térmico e hídrico, se recomienda un sistema agroforestal
con café bajo sombra regulada. Establecer cortinas rompevientos en dirección este-oeste
para reducir evapotranspiración. Programar podas sanitarias post-cosecha para reducir
carga vegetativa. Implementar cosecha selectiva para mantener calidad del grano a pesar
de las condiciones adversas.
```

---

## 💰 Costos y Límites

| Proveedor | Costo | Límites Gratuitos | Velocidad |
|-----------|-------|-------------------|-----------|
| **Groq** | ✅ GRATIS | 14,400 req/día, 30 req/min | ⚡ Ultra rápido (20x OpenAI) |
| **Google Gemini** | ✅ GRATIS | 1,500 req/día, 60 req/min | 🐢 Moderado |
| **OpenAI** | 💰 Desde $0.50/1M tokens | $5 crédito inicial | 🐢 Moderado |
| **Hugging Face** | ✅ GRATIS | 1,000 req/día | 🐢 Lento |

**Recomendación**: Usar **Groq** como primaria, Gemini como respaldo.

---

## 🔒 Seguridad

### **Protección de API Keys**:

```javascript
// ❌ NUNCA hacer esto:
const API_KEY = "gsk_abc123...";

// ✅ SIEMPRE usar variables de entorno:
const API_KEY = process.env.REACT_APP_GROQ_API_KEY;
```

### **Rate Limiting** (opcional):

```javascript
// Implementar caché para evitar llamadas repetidas
const cache = {};

export async function getGroqCropAnalysisCached(climateData, cultivo) {
  const cacheKey = `${cultivo.nombre}_${climateData.temperatura}_${climateData.precipitacion}`;

  if (cache[cacheKey]) {
    console.log("✅ Usando resultado en caché");
    return cache[cacheKey];
  }

  const result = await getGroqCropAnalysis(climateData, cultivo);
  cache[cacheKey] = result;

  return result;
}
```

---

## 🐛 Solución de Problemas

### **Error: "API key not configured"**
```bash
# Verificar que .env existe y tiene la key
cat frontend/.env

# Reiniciar servidor
npm start
```

### **Error: "Rate limit exceeded"**
```javascript
// Agregar retry con backoff exponencial
async function getGroqWithRetry(data, cultivo, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await getGroqCropAnalysis(data, cultivo);
    } catch (error) {
      if (error.message.includes("rate limit")) {
        await new Promise(r => setTimeout(r, 2000 * (i + 1))); // Esperar 2s, 4s, 6s
      } else {
        throw error;
      }
    }
  }
  return null;
}
```

### **Error: "Network timeout"**
```javascript
// Agregar timeout a la petición
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos

const response = await fetch(url, {
  ...options,
  signal: controller.signal
});

clearTimeout(timeoutId);
```

---

## 📈 Métricas de Uso (Opcional)

```javascript
// Trackear uso de IA
let aiUsageStats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  averageResponseTime: 0
};

export async function getGroqCropAnalysisWithMetrics(climateData, cultivo) {
  const startTime = Date.now();
  aiUsageStats.totalRequests++;

  try {
    const result = await getGroqCropAnalysis(climateData, cultivo);
    aiUsageStats.successfulRequests++;

    const responseTime = Date.now() - startTime;
    aiUsageStats.averageResponseTime =
      (aiUsageStats.averageResponseTime * (aiUsageStats.successfulRequests - 1) + responseTime)
      / aiUsageStats.successfulRequests;

    console.log(`⏱️ Respuesta IA en ${responseTime}ms`);
    return result;
  } catch (error) {
    aiUsageStats.failedRequests++;
    throw error;
  }
}

// Ver estadísticas en consola
console.table(aiUsageStats);
```

---

## 🚀 Próximos Pasos

1. ✅ **Implementar Groq AI** (siguiendo esta guía)
2. 🔄 **Agregar sistema de caché** (evitar llamadas duplicadas)
3. 📊 **Mostrar indicador de "Análisis con IA"** en el UI
4. 🌐 **Agregar fallback a Gemini** si Groq falla
5. 🧪 **Entrenar modelo ML propio** con TensorFlow.js (largo plazo)

---

## 📚 Recursos Adicionales

- **Groq Documentation**: https://console.groq.com/docs
- **Groq Playground**: https://console.groq.com/playground
- **Modelos disponibles**: Mixtral, Llama 3, Gemma
- **Dataset de cultivos**: https://www.kaggle.com/datasets/atharvaingle/crop-recommendation-dataset

---

## ✅ Checklist de Implementación

- [ ] Registrarse en Groq (https://console.groq.com/)
- [ ] Obtener API Key
- [ ] Crear archivo `.env` con `REACT_APP_GROQ_API_KEY`
- [ ] Importar `groqCropAI.js` en UserMapDashboard
- [ ] Modificar `analyzeCropForLocation` para usar IA
- [ ] Actualizar modal para mostrar recomendaciones IA
- [ ] Agregar estilos CSS para sección IA
- [ ] Probar con diferentes cultivos y regiones
- [ ] Verificar logs en consola
- [ ] Implementar caché (opcional)
- [ ] Agregar métricas (opcional)

---

**¿Necesitas ayuda?** Revisa los logs de consola para debug detallado.

/**
 * Servicio de Recomendaciones de Cultivos usando Groq AI
 *
 * Groq ofrece acceso GRATUITO a modelos de IA de última generación
 * con velocidad ultra rápida (20x más rápido que OpenAI).
 *
 * Límites gratuitos:
 * - 14,400 requests/día
 * - 30 requests/minuto
 * - Sin costo
 *
 * Registro: https://console.groq.com/
 */

// ⚠️ IMPORTANTE: Obtén tu API Key gratis en https://console.groq.com/keys
const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY || "";

/**
 * Analiza la aptitud de un cultivo usando IA de Groq
 * @param {object} climateData - Datos climáticos de la región
 * @param {object} cultivo - Información del cultivo a evaluar
 * @returns {Promise<object>} Análisis con aptitud, riesgos y recomendaciones
 */
export async function getGroqCropAnalysis(climateData, cultivo) {
  if (!GROQ_API_KEY) {
    console.warn("⚠️ GROQ_API_KEY no configurada. Usando análisis local.");
    return null;
  }

  const prompt = `
Eres un ingeniero agrónomo experto con 20 años de experiencia en análisis de aptitud de cultivos.

CULTIVO A EVALUAR: ${cultivo.nombre}

CONDICIONES CLIMÁTICAS ACTUALES:
- Temperatura: ${climateData.temperatura.toFixed(1)}°C
- Precipitación anual: ${climateData.precipitacion.toFixed(0)} mm
- Humedad relativa: ${climateData.humedad.toFixed(1)}%
- Altitud: ${climateData.altitud.toFixed(0)} msnm

REQUISITOS ÓPTIMOS DEL CULTIVO:
- Temperatura óptima: ${cultivo.temperaturaOptima.min}-${cultivo.temperaturaOptima.max}°C
- Precipitación óptima: ${cultivo.precipitacionOptima.min}-${cultivo.precipitacionOptima.max} mm/año
- Altitud óptima: ${cultivo.altitudOptima.min}-${cultivo.altitudOptima.max} msnm

INSTRUCCIONES:
1. Evalúa la aptitud del cultivo (0-100%)
2. Identifica 3-5 riesgos agronómicos específicos
3. Proporciona 3-5 recomendaciones de manejo técnico

RESPONDE SOLO EN FORMATO JSON (sin markdown, sin explicaciones adicionales):
{
  "aptitud": número entre 0-100,
  "nivel": "Alta" | "Media" | "Baja" | "No Apto",
  "riesgos": ["riesgo técnico 1", "riesgo técnico 2", ...],
  "recomendaciones": ["recomendación 1", "recomendación 2", ...],
  "manejoEspecifico": "descripción detallada del manejo agronómico recomendado"
}
`;

  try {
    console.log("🤖 Consultando Groq AI para análisis de cultivo...");

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "mixtral-8x7b-32768", // Modelo gratuito y potente
        messages: [{
          role: "system",
          content: "Eres un ingeniero agrónomo especializado en análisis de aptitud de cultivos. Respondes siempre en formato JSON válido."
        }, {
          role: "user",
          content: prompt
        }],
        temperature: 0.3, // Más determinístico para datos técnicos
        max_tokens: 800,
        top_p: 1,
        stream: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Groq API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log("✅ Respuesta de Groq AI recibida");

    // Extraer JSON de la respuesta (por si viene con markdown)
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      // Validar estructura
      if (!parsed.aptitud || !parsed.nivel || !parsed.riesgos || !parsed.recomendaciones) {
        throw new Error("Respuesta de IA incompleta");
      }

      console.log(`🎯 Aptitud IA: ${parsed.aptitud}% (${parsed.nivel})`);
      return parsed;
    }

    throw new Error("No se pudo extraer JSON de la respuesta");

  } catch (error) {
    console.error("❌ Error en Groq AI:", error);
    return null;
  }
}

/**
 * Combina análisis local con análisis de IA
 * @param {object} analysisLocal - Análisis calculado localmente
 * @param {object} analysisAI - Análisis de Groq AI
 * @returns {object} Análisis combinado mejorado
 */
export function combineAnalysis(analysisLocal, analysisAI) {
  if (!analysisAI) {
    return analysisLocal; // Si falla IA, usar solo análisis local
  }

  return {
    ...analysisLocal,

    // Promedio entre aptitud local e IA
    aptitudes: {
      ...analysisLocal.aptitudes,
      totalIA: analysisAI.aptitud,
      totalCombinado: (analysisLocal.aptitudes.total + analysisAI.aptitud) / 2
    },

    // Recomendación basada en aptitud combinada
    recomendacion: {
      ...analysisLocal.recomendacion,
      nivelIA: analysisAI.nivel,
      manejoEspecifico: analysisAI.manejoEspecifico
    },

    // Combinar riesgos (local + IA, sin duplicados)
    riesgos: [
      ...analysisLocal.riesgos,
      ...analysisAI.riesgos.filter(r =>
        !analysisLocal.riesgos.some(lr =>
          lr.toLowerCase().includes(r.toLowerCase().substring(0, 20))
        )
      )
    ],

    // Agregar recomendaciones de IA
    recomendacionesIA: analysisAI.recomendaciones,

    // Indicador de que se usó IA
    usedAI: true
  };
}

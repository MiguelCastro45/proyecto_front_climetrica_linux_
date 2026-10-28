/**
 * config/accionesRiesgo.js — Cómo subsanar cada riesgo y qué oportunidad abre.
 *
 * El análisis de cultivo (UserMapDashboard → evaluarRiesgos) ya identifica
 * riesgos como texto. Aquí se asocia cada riesgo con:
 *   - accion:      qué hacer para subsanarlo
 *   - oportunidad: qué oportunidad de negocio o de mejora puede abrir
 *   - insumo:      qué tipo de proveedor buscar, y se sugieren los
 *                  proveedores de insumos más cercanos de la red (simulada),
 *                  al estilo de "gasolineras cercanas".
 *
 * Solo texto: no requiere backend.
 */
import { actoresCercanos } from "./actoresSimulados";

// El orden importa: se usa la primera regla cuyo patrón coincida.
const REGLAS = [
  {
    patron: /combinado de estrés hídrico y térmico/i,
    titulo: "Estrés hídrico y térmico combinado",
    accion: "Aumentar la frecuencia de riego en horas frescas y aplicar mulch (cobertura del suelo) para conservar humedad.",
    oportunidad: "Invertir en riego tecnificado mejora el rendimiento en épocas secas, cuando la oferta del mercado baja y los precios suelen subir.",
    insumo: "Sistemas de riego",
  },
  {
    patron: /heladas|bajas temperaturas/i,
    titulo: "Heladas / bajas temperaturas",
    accion: "Proteger el cultivo con coberturas o túneles plásticos, riego por aspersión antes del amanecer y barreras rompeviento.",
    oportunidad: "Las zonas frías permiten diversificar con cultivos de clima frío (papa, fresa, hortalizas) o producir en temporadas de menor oferta.",
    insumo: "Coberturas y plásticos agrícolas",
  },
  {
    patron: /estrés térmico/i,
    titulo: "Estrés térmico (calor)",
    accion: "Implementar sombrío temporal o permanente, regar en horas frescas y usar variedades tolerantes al calor.",
    oportunidad: "El sombrío con árboles maderables o frutales genera un ingreso adicional y mejora la calidad del café.",
    insumo: "Vivero de café y frutales",
  },
  {
    patron: /estrés hídrico|déficit hídrico/i,
    titulo: "Déficit de agua",
    accion: "Instalar riego por goteo o aspersión, cosechar agua lluvia en reservorios y monitorear la humedad del suelo.",
    oportunidad: "Con riego se puede producir fuera de temporada y vender cuando hay menos oferta en la región.",
    insumo: "Sistemas de riego",
  },
  {
    patron: /exceso hídrico|saturación hídrica|exceso de precipitación/i,
    titulo: "Exceso de agua",
    accion: "Construir drenajes superficiales, sembrar en camellones o camas elevadas y vigilar enfermedades de raíz.",
    oportunidad: "El agua sobrante puede almacenarse en reservorios para las épocas secas o para piscicultura.",
    insumo: "Agroquímicos y herramientas",
  },
  {
    patron: /altitud inadecuada/i,
    titulo: "Altitud por debajo del rango óptimo",
    accion: "Usar variedades adaptadas a zonas más bajas y cálidas, y ajustar la densidad de siembra y el sombrío.",
    oportunidad: "Evaluar cultivos mejor adaptados a esa altitud (cacao, plátano, frutales) para diversificar ingresos.",
    insumo: "Semillas certificadas",
  },
  {
    patron: /altitud excesiva/i,
    titulo: "Altitud por encima del rango óptimo",
    accion: "Proteger contra heladas nocturnas con coberturas, elegir variedades de ciclo largo y planear la siembra fuera de épocas frías.",
    oportunidad: "A mayor altitud, el café y otros cultivos pueden alcanzar mejor calidad de taza: posible acceso a mercados de cafés especiales.",
    insumo: "Coberturas y plásticos agrícolas",
  },
  {
    patron: /fitosanitario|alta humedad/i,
    titulo: "Enfermedades por alta humedad",
    accion: "Hacer manejo preventivo de hongos, podas de ventilación y control de malezas; monitorear roya y antracnosis.",
    oportunidad: "Un manejo sanitario preventivo reduce pérdidas y permite acceder a compradores que exigen buenas prácticas agrícolas.",
    insumo: "Agroquímicos y herramientas",
  },
  {
    patron: /baja humedad/i,
    titulo: "Baja humedad del aire",
    accion: "Regar por aspersión para subir la humedad ambiental y usar coberturas para reducir la evaporación.",
    oportunidad: "Las zonas secas tienen menos presión de enfermedades: menor costo en fungicidas.",
    insumo: "Sistemas de riego",
  },
  {
    patron: /acumulación térmica/i,
    titulo: "Ciclo de cultivo más largo",
    accion: "Ajustar el calendario de siembra y usar variedades precoces para no retrasar la cosecha.",
    oportunidad: "Escalonar siembras permite vender durante más meses del año y negociar mejores precios.",
    insumo: "Semillas certificadas",
  },
];

/**
 * Genera las acciones y oportunidades para una lista de riesgos.
 * @param {string[]} riesgos - Riesgos identificados (texto)
 * @param {number} lat - Latitud del punto analizado
 * @param {number} lng - Longitud del punto analizado
 * @returns {Array<{riesgo, titulo, accion, oportunidad, insumo, insumosCercanos}>}
 */
export function generarAccionesRiesgo(riesgos = [], lat, lng) {
  // Sin coordenadas válidas no se pueden sugerir proveedores cercanos
  const conUbicacion =
    lat != null && lng != null && lat !== "" && lng !== "" &&
    Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
  const proveedores = conUbicacion
    ? actoresCercanos(Number(lat), Number(lng), { tipo: "proveedor_insumos", limite: 20 })
    : [];

  return riesgos.map((riesgo) => {
    const regla = REGLAS.find((r) => r.patron.test(riesgo));
    if (!regla) {
      return {
        riesgo,
        titulo: "Riesgo identificado",
        accion: "Consultar con un asistente técnico agropecuario para definir el manejo adecuado.",
        oportunidad: null,
        insumo: null,
        insumosCercanos: proveedores.slice(0, 2).map(resumirProveedor),
      };
    }

    // Primero los proveedores de la especialidad necesaria, luego el más cercano de cualquier tipo
    const especializados = proveedores.filter((p) => p.actividad === regla.insumo);
    const otros = proveedores.filter((p) => p.actividad !== regla.insumo);
    const sugeridos = [...especializados.slice(0, 1), ...otros.slice(0, 1)];

    return {
      riesgo,
      titulo: regla.titulo,
      accion: regla.accion,
      oportunidad: regla.oportunidad,
      insumo: regla.insumo,
      insumosCercanos: sugeridos.map(resumirProveedor),
    };
  });
}

function resumirProveedor(p) {
  return { actividad: p.actividad, municipio: p.municipio, distanciaKm: Math.round(p.distanciaKm) };
}

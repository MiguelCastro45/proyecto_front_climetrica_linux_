/**
 * config/camposCultivo.js — Campos del formulario "Mis datos del sector".
 *
 * El usuario complementa cada registro con sus propios datos (árboles,
 * hectáreas, producción, ventas, afectaciones...). Los campos se ajustan al
 * tipo de cultivo: CAMPOS_COMUNES + los de CAMPOS_POR_CULTIVO[cultivo].
 * Si el cultivo no está en la lista se usan solo los comunes con unidad "kg".
 *
 * Tipos de campo: text | number | select | textarea.
 */

export const AFECTACIONES = [
  "Ninguna",
  "Daños por el sismo",
  "Vías afectadas / dificultad de transporte",
  "Clima (heladas, sequía, exceso de lluvia)",
  "Plagas o enfermedades",
  "Precios bajos / dificultad para vender",
  "Otra",
];

/** Campos específicos y unidad de producción por cultivo. */
export const CAMPOS_POR_CULTIVO = {
  "Café": {
    unidadProduccion: "cargas de 125 kg",
    campos: [
      { name: "numArboles", label: "Número de árboles (cafetos)", type: "number", required: true },
      { name: "variedad", label: "Variedad", type: "select", options: ["Castillo", "Cenicafé 1", "Colombia", "Caturra", "Tabi", "Otra"] },
      { name: "edadCultivo", label: "Edad del cultivo", type: "number", unit: "años" },
    ],
  },
  "Cacao": {
    unidadProduccion: "kg de cacao seco",
    campos: [
      { name: "numArboles", label: "Número de árboles", type: "number", required: true },
      { name: "variedad", label: "Clon / variedad", type: "text" },
      { name: "edadCultivo", label: "Edad del cultivo", type: "number", unit: "años" },
    ],
  },
  "Plátano": {
    unidadProduccion: "racimos",
    campos: [
      { name: "numPlantas", label: "Número de matas", type: "number", required: true },
      { name: "variedad", label: "Variedad", type: "select", options: ["Hartón", "Dominico hartón", "Dominico", "Otra"] },
    ],
  },
  "Papa": {
    unidadProduccion: "bultos de 50 kg",
    campos: [
      { name: "variedad", label: "Variedad", type: "select", options: ["Pastusa Suprema", "Parda Pastusa", "Criolla", "Diacol Capiro", "Otra"] },
      { name: "semillaSembrada", label: "Semilla sembrada", type: "number", unit: "bultos" },
    ],
  },
  "Maíz": {
    unidadProduccion: "toneladas",
    campos: [
      { name: "tipoMaiz", label: "Tipo", type: "select", options: ["Amarillo", "Blanco", "Choclo", "Otro"] },
      { name: "densidad", label: "Densidad de siembra", type: "number", unit: "plantas/ha" },
    ],
  },
  "Arroz": {
    unidadProduccion: "toneladas",
    campos: [
      { name: "sistema", label: "Sistema de cultivo", type: "select", options: ["Riego", "Secano"] },
      { name: "variedad", label: "Variedad", type: "text" },
    ],
  },
  "Caña de Azúcar": {
    unidadProduccion: "toneladas de caña",
    campos: [
      { name: "uso", label: "Destino", type: "select", options: ["Panela", "Azúcar", "Forraje"] },
      { name: "edadCorte", label: "Edad al corte", type: "number", unit: "meses" },
    ],
  },
};

/** Campos que aplican a cualquier cultivo. `{unidad}` se reemplaza por la unidad del cultivo. */
export const CAMPOS_COMUNES = [
  { name: "descripcion", label: "Descripción detallada del cultivo", type: "textarea", required: true },
  { name: "hectareas", label: "Área sembrada", type: "number", unit: "ha", required: true },
  { name: "produccionAnterior", label: "Producción anterior", type: "number", unit: "{unidad}" },
  { name: "produccionEsperada", label: "Producción esperada", type: "number", unit: "{unidad}" },
  { name: "ventas", label: "Ventas del periodo", type: "number", unit: "COP" },
  { name: "afectacion", label: "Principal afectación", type: "select", options: AFECTACIONES },
];

/** Devuelve la lista completa de campos para un cultivo, con unidades resueltas. */
export function camposParaCultivo(cultivo) {
  const config = CAMPOS_POR_CULTIVO[cultivo];
  const unidad = config?.unidadProduccion || "kg";
  const comunes = CAMPOS_COMUNES.map((c) =>
    c.unit === "{unidad}" ? { ...c, unit: unidad } : c
  );
  // Descripción y área primero, luego lo específico del cultivo, luego el resto
  return [comunes[0], comunes[1], ...(config?.campos || []), ...comunes.slice(2)];
}

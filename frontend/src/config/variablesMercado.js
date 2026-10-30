/**
 * config/variablesMercado.js — Variables de mercado (DATOS DE EJEMPLO).
 *
 * Pulso Productivo no solo usa variables climáticas: también variables de
 * mercado que interesan a cada actor (quien vende café, quien lo compra,
 * quien transporta...). Por ahora NO están conectadas a ninguna API: los
 * valores son de ejemplo y sirven para mostrar que la plataforma admite
 * otras fuentes de datos además de las climáticas.
 *
 * Las variables dependen del cultivo elegido en el mapa: primero se escoge
 * el cultivo y el selector de Mercado muestra las variables de ese cultivo
 * (precio del producto, transporte por su unidad de venta, insumos...) más
 * unas variables generales de la región.
 *
 * `fuenteFutura` indica de dónde se podrían traer más adelante.
 * `perfiles` indica para qué tipos de actor es más relevante (ver actores.js).
 */

const SIPSA = "SIPSA – DANE";
const FNC = "Federación Nacional de Cafeteros (precio interno de referencia)";
const MINTRANSPORTE = "Ministerio de Transporte (SICE-TAC)";
const INSUMOS = "SIPSA – DANE (insumos agropecuarios)";

export const VARIABLES_MERCADO = {
  // ---------- Café ----------
  cafe_pergamino: { nombre: "Precio café pergamino seco", icono: "☕", unidad: "COP/carga 125 kg", base: 2350000, volatilidad: 0.015, fuenteFutura: FNC, perfiles: ["productor", "comercializador"] },
  cafe_pasilla: { nombre: "Precio café pasilla", icono: "🫘", unidad: "COP/kg", base: 9200, volatilidad: 0.02, fuenteFutura: FNC, perfiles: ["productor", "comercializador"] },
  cafe_transporte: { nombre: "Transporte de café (finca–acopio)", icono: "🚚", unidad: "COP/carga", base: 18000, volatilidad: 0.015, fuenteFutura: MINTRANSPORTE, perfiles: ["comercializador", "productor"] },
  cafe_jornal: { nombre: "Jornal de recolección de café", icono: "🧺", unidad: "COP/kg recogido", base: 1100, volatilidad: 0.01, fuenteFutura: "Comités de cafeteros", perfiles: ["productor"] },

  // ---------- Papa ----------
  papa_pastusa: { nombre: "Precio papa pastusa", icono: "🥔", unidad: "COP/bulto 50 kg", base: 95000, volatilidad: 0.035, fuenteFutura: SIPSA, perfiles: ["productor", "comercializador", "servicios"] },
  papa_criolla: { nombre: "Precio papa criolla", icono: "🟡", unidad: "COP/arroba 12,5 kg", base: 32000, volatilidad: 0.04, fuenteFutura: SIPSA, perfiles: ["productor", "comercializador", "servicios"] },
  papa_transporte: { nombre: "Transporte de papa (finca–plaza)", icono: "🚚", unidad: "COP/bulto", base: 4500, volatilidad: 0.015, fuenteFutura: MINTRANSPORTE, perfiles: ["comercializador", "productor"] },
  papa_semilla: { nombre: "Semilla de papa certificada", icono: "🌱", unidad: "COP/bulto 50 kg", base: 120000, volatilidad: 0.01, fuenteFutura: INSUMOS, perfiles: ["proveedor_insumos", "productor"] },

  // ---------- Maíz ----------
  maiz_amarillo: { nombre: "Precio maíz amarillo", icono: "🌽", unidad: "COP/tonelada", base: 1250000, volatilidad: 0.02, fuenteFutura: SIPSA, perfiles: ["productor", "comercializador"] },
  maiz_choclo: { nombre: "Precio mazorca (choclo)", icono: "🌽", unidad: "COP/docena", base: 9000, volatilidad: 0.03, fuenteFutura: SIPSA, perfiles: ["productor", "comercializador", "servicios"] },
  maiz_transporte: { nombre: "Transporte de maíz", icono: "🚚", unidad: "COP/tonelada", base: 110000, volatilidad: 0.015, fuenteFutura: MINTRANSPORTE, perfiles: ["comercializador", "productor"] },

  // ---------- Arroz ----------
  arroz_paddy: { nombre: "Precio arroz paddy verde", icono: "🌾", unidad: "COP/tonelada", base: 1900000, volatilidad: 0.015, fuenteFutura: "FEDEARROZ", perfiles: ["productor", "comercializador"] },
  arroz_blanco: { nombre: "Precio arroz blanco al por mayor", icono: "🍚", unidad: "COP/kg", base: 4300, volatilidad: 0.01, fuenteFutura: SIPSA, perfiles: ["comercializador", "servicios"] },
  arroz_transporte: { nombre: "Transporte de arroz a molino", icono: "🚚", unidad: "COP/tonelada", base: 95000, volatilidad: 0.015, fuenteFutura: MINTRANSPORTE, perfiles: ["comercializador", "productor"] },

  // ---------- Plátano ----------
  platano_harton: { nombre: "Precio plátano hartón", icono: "🍌", unidad: "COP/kg", base: 2600, volatilidad: 0.03, fuenteFutura: SIPSA, perfiles: ["productor", "comercializador", "servicios"] },
  platano_racimo: { nombre: "Precio racimo en finca", icono: "🍌", unidad: "COP/racimo", base: 28000, volatilidad: 0.03, fuenteFutura: SIPSA, perfiles: ["productor", "comercializador"] },
  platano_transporte: { nombre: "Transporte de plátano", icono: "🚚", unidad: "COP/racimo", base: 2500, volatilidad: 0.015, fuenteFutura: MINTRANSPORTE, perfiles: ["comercializador", "productor"] },

  // ---------- Cacao ----------
  cacao_grano: { nombre: "Precio cacao en grano seco", icono: "🍫", unidad: "COP/kg", base: 31000, volatilidad: 0.03, fuenteFutura: "FEDECACAO", perfiles: ["productor", "comercializador"] },
  cacao_transporte: { nombre: "Transporte de cacao", icono: "🚚", unidad: "COP/bulto 50 kg", base: 9000, volatilidad: 0.015, fuenteFutura: MINTRANSPORTE, perfiles: ["comercializador", "productor"] },
  cacao_fermentado: { nombre: "Prima por cacao fino fermentado", icono: "⭐", unidad: "COP/kg adicional", base: 3500, volatilidad: 0.02, fuenteFutura: "FEDECACAO", perfiles: ["productor", "comercializador"] },

  // ---------- Caña de azúcar ----------
  cana_panela: { nombre: "Precio panela", icono: "🟫", unidad: "COP/kg", base: 4800, volatilidad: 0.012, fuenteFutura: SIPSA, perfiles: ["productor", "comercializador", "servicios"] },
  cana_tonelada: { nombre: "Precio caña en pie", icono: "🎋", unidad: "COP/tonelada", base: 165000, volatilidad: 0.01, fuenteFutura: "ASOCAÑA", perfiles: ["productor", "comercializador"] },
  cana_transporte: { nombre: "Transporte de caña a trapiche", icono: "🚚", unidad: "COP/tonelada", base: 35000, volatilidad: 0.015, fuenteFutura: MINTRANSPORTE, perfiles: ["comercializador", "productor"] },

  // ---------- Generales (cualquier cultivo) ----------
  urea: { nombre: "Precio bulto de urea", icono: "🧪", unidad: "COP/bulto 50 kg", base: 178000, volatilidad: 0.008, fuenteFutura: INSUMOS, perfiles: ["proveedor_insumos", "productor"] },
  transporte_cali: { nombre: "Carga Popayán–Cali", icono: "🛣️", unidad: "COP/tonelada", base: 125000, volatilidad: 0.02, fuenteFutura: MINTRANSPORTE, perfiles: ["comercializador", "proveedor_insumos", "productor"] },
  jornal: { nombre: "Jornal agrícola", icono: "👷", unidad: "COP/día", base: 60000, volatilidad: 0.005, fuenteFutura: "DANE – Encuesta de jornales", perfiles: ["productor"] },
  ganado_pie: { nombre: "Precio ganado gordo en pie", icono: "🐄", unidad: "COP/kg", base: 9400, volatilidad: 0.01, fuenteFutura: "SIPSA – DANE / FEDEGÁN", perfiles: ["productor", "comercializador", "servicios"] },
  tilapia: { nombre: "Precio tilapia (temporada de pescado)", icono: "🐟", unidad: "COP/kg", base: 14500, volatilidad: 0.025, fuenteFutura: SIPSA, perfiles: ["comercializador", "servicios"] },
};

/** Variables propias de cada cultivo (claves de VARIABLES_MERCADO). */
export const MERCADO_POR_CULTIVO = {
  "Café": ["cafe_pergamino", "cafe_pasilla", "cafe_transporte", "cafe_jornal"],
  "Papa": ["papa_pastusa", "papa_criolla", "papa_transporte", "papa_semilla"],
  "Maíz": ["maiz_amarillo", "maiz_choclo", "maiz_transporte"],
  "Arroz": ["arroz_paddy", "arroz_blanco", "arroz_transporte"],
  "Plátano": ["platano_harton", "platano_racimo", "platano_transporte"],
  "Cacao": ["cacao_grano", "cacao_fermentado", "cacao_transporte"],
  "Caña de Azúcar": ["cana_panela", "cana_tonelada", "cana_transporte"],
};

/** Variables generales de la región, disponibles con cualquier cultivo. */
export const MERCADO_GENERAL = ["urea", "transporte_cali", "jornal", "ganado_pie", "tilapia"];

/** Claves de mercado para un cultivo: { delCultivo: [...], generales: [...] } */
export function variablesMercadoParaCultivo(cultivo) {
  return {
    delCultivo: MERCADO_POR_CULTIVO[cultivo] || [],
    generales: MERCADO_GENERAL,
  };
}

/**
 * Genera una serie diaria de ejemplo (últimos `dias` días) para una variable.
 * Es determinística (misma variable -> misma serie) para que las capturas
 * de pantalla y las pruebas sean reproducibles.
 */
export function serieEjemplo(clave, dias = 30) {
  const v = VARIABLES_MERCADO[clave];
  if (!v) return [];

  // Generador pseudoaleatorio simple con semilla basada en la clave
  let seed = [...clave].reduce((s, c) => s + c.charCodeAt(0), 0);
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const serie = [];
  let valor = v.base;
  const hoy = new Date();
  for (let i = dias - 1; i >= 0; i--) {
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() - i);
    valor = valor * (1 + (rand() - 0.48) * v.volatilidad);
    serie.push({ date: fecha.toISOString().slice(0, 10), value: Math.round(valor) });
  }
  return serie;
}

/**
 * Resumen de una variable: valor actual y variación de los últimos 7 días
 * (de la misma serie de ejemplo que muestra el panel de mercado).
 */
export function resumenMercado(clave) {
  const v = VARIABLES_MERCADO[clave];
  const serie = serieEjemplo(clave, 30);
  if (!v || serie.length === 0) return null;
  const actual = serie[serie.length - 1].value;
  const hace7 = serie[serie.length - 8]?.value ?? serie[0].value;
  return { clave, ...v, actual, variacion: ((actual - hace7) / hace7) * 100 };
}

/** Variables principales del sector (las del cultivo y, si faltan, generales). */
export function mercadoPrincipalDelSector(cultivo, limite = 3) {
  const { delCultivo, generales } = variablesMercadoParaCultivo(cultivo);
  return [...delCultivo, ...generales].slice(0, limite).map(resumenMercado).filter(Boolean);
}

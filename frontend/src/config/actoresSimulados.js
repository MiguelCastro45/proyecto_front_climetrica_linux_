/**
 * config/actoresSimulados.js — Otros usuarios de la red (DATOS SIMULADOS).
 *
 * Puntos ficticios y anónimos de actores de la cadena agroalimentaria en el
 * Cauca, para mostrar en el mapa cómo se verían los demás beneficiarios.
 * No contienen nombres ni datos de personas reales: solo el tipo de actor,
 * la actividad y el municipio aproximado.
 *
 * Cuando exista el servicio real de usuarios, esta lista se reemplaza por la
 * respuesta del backend con la misma forma: { id, tipo, actividad, municipio,
 * lat, lng, afectacion }.
 */

export const ACTORES_SIMULADOS = [
  // `icono` representa la actividad puntual; el color del punto es el del
  // tipo de actor (ver ACTORES en actores.js), así se distinguen ambas cosas.

  // Proveedores de insumos
  { id: "a01", tipo: "proveedor_insumos", icono: "🧪", actividad: "Proveedor de fertilizantes", municipio: "Popayán", lat: 2.4590, lng: -76.6010, afectacion: "Media" },
  { id: "a02", tipo: "proveedor_insumos", icono: "🪴", actividad: "Vivero de café y frutales", municipio: "Piendamó", lat: 2.6420, lng: -76.5280, afectacion: "Baja" },
  { id: "a03", tipo: "proveedor_insumos", icono: "🌱", actividad: "Semillas certificadas", municipio: "Santander de Quilichao", lat: 3.0090, lng: -76.4880, afectacion: "Media" },
  { id: "a04", tipo: "proveedor_insumos", icono: "🛠️", actividad: "Agroquímicos y herramientas", municipio: "El Bordo (Patía)", lat: 2.1150, lng: -76.9810, afectacion: "Alta" },
  { id: "a05", tipo: "proveedor_insumos", icono: "🌾", actividad: "Alimento concentrado para ganado", municipio: "Timbío", lat: 2.3500, lng: -76.6830, afectacion: "Baja" },
  { id: "a06", tipo: "proveedor_insumos", icono: "⛺", actividad: "Coberturas y plásticos agrícolas", municipio: "Silvia", lat: 2.6150, lng: -76.3810, afectacion: "Media" },
  { id: "a07", tipo: "proveedor_insumos", icono: "💧", actividad: "Sistemas de riego", municipio: "Cajibío", lat: 2.6230, lng: -76.5700, afectacion: "Baja" },

  // Productores primarios
  { id: "p01", tipo: "productor", icono: "🐄", actividad: "Producción de carne bovina", municipio: "El Tambo", lat: 2.4520, lng: -76.8100, afectacion: "Alta" },
  { id: "p02", tipo: "productor", icono: "☕", actividad: "Cultivo de café", municipio: "Cajibío", lat: 2.6050, lng: -76.6020, afectacion: "Media" },
  { id: "p03", tipo: "productor", icono: "🥛", actividad: "Producción de leche", municipio: "Totoró", lat: 2.5110, lng: -76.4030, afectacion: "Media" },
  { id: "p04", tipo: "productor", icono: "🐖", actividad: "Porcicultura", municipio: "Morales", lat: 2.7530, lng: -76.6290, afectacion: "Alta" },
  { id: "p05", tipo: "productor", icono: "🍌", actividad: "Cultivo de plátano", municipio: "Rosas", lat: 2.2620, lng: -76.7390, afectacion: "Alta" },
  { id: "p06", tipo: "productor", icono: "🎋", actividad: "Caña panelera", municipio: "Caldono", lat: 2.7980, lng: -76.4830, afectacion: "Media" },
  { id: "p07", tipo: "productor", icono: "🐔", actividad: "Avicultura", municipio: "Sotará", lat: 2.2500, lng: -76.6100, afectacion: "Baja" },
  { id: "p08", tipo: "productor", icono: "🧶", actividad: "Cultivo de fique", municipio: "La Sierra", lat: 2.1800, lng: -76.7620, afectacion: "Alta" },
  { id: "p09", tipo: "productor", icono: "🥔", actividad: "Cultivo de papa", municipio: "Puracé", lat: 2.3420, lng: -76.4980, afectacion: "Media" },
  { id: "p10", tipo: "productor", icono: "🫘", actividad: "Cultivo de café especial", municipio: "Inzá", lat: 2.5520, lng: -76.0640, afectacion: "Baja" },

  // Comercializadores
  { id: "c01", tipo: "comercializador", icono: "📦", actividad: "Distribución de alimentos", municipio: "Popayán", lat: 2.4380, lng: -76.6250, afectacion: "Media" },
  { id: "c02", tipo: "comercializador", icono: "🏭", actividad: "Acopio de café", municipio: "Piendamó", lat: 2.6300, lng: -76.5450, afectacion: "Baja" },
  { id: "c03", tipo: "comercializador", icono: "🚚", actividad: "Transporte de carga agrícola", municipio: "Santander de Quilichao", lat: 3.0200, lng: -76.4700, afectacion: "Media" },
  { id: "c04", tipo: "comercializador", icono: "🟫", actividad: "Comercialización de panela", municipio: "Caloto", lat: 3.0330, lng: -76.4110, afectacion: "Alta" },
  { id: "c05", tipo: "comercializador", icono: "❄️", actividad: "Cadena de frío (cárnicos)", municipio: "Puerto Tejada", lat: 3.2300, lng: -76.4180, afectacion: "Baja" },
  { id: "c06", tipo: "comercializador", icono: "🏪", actividad: "Plaza de mercado mayorista", municipio: "Bolívar", lat: 1.8380, lng: -76.9680, afectacion: "Alta" },

  // Servicios (consumidores institucionales)
  { id: "s01", tipo: "servicios", icono: "🍽️", actividad: "Restaurante", municipio: "Popayán", lat: 2.4430, lng: -76.6070, afectacion: "Baja" },
  { id: "s02", tipo: "servicios", icono: "🏨", actividad: "Hotel", municipio: "Popayán", lat: 2.4510, lng: -76.6180, afectacion: "Media" },
  { id: "s03", tipo: "servicios", icono: "🍲", actividad: "Comedor comunitario", municipio: "Timbío", lat: 2.3420, lng: -76.6720, afectacion: "Alta" },
  { id: "s04", tipo: "servicios", icono: "🏥", actividad: "Servicio de alimentación hospitalaria", municipio: "Santander de Quilichao", lat: 2.9980, lng: -76.4950, afectacion: "Media" },
  { id: "s05", tipo: "servicios", icono: "🏫", actividad: "Restaurante escolar", municipio: "Silvia", lat: 2.6080, lng: -76.3740, afectacion: "Baja" },
];

// Centro aproximado del Cauca (para el botón "Ver red en el Cauca")
export const CAUCA_CENTER = [2.55, -76.6];
export const CAUCA_ZOOM = 9;

/** Distancia en km entre dos coordenadas (fórmula de Haversine). */
export function distanciaKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Actores más cercanos a un punto, ordenados por distancia.
 * @param {number} lat
 * @param {number} lng
 * @param {object} opciones - { tipo (opcional), limite (por defecto 3) }
 */
export function actoresCercanos(lat, lng, { tipo, limite = 3 } = {}) {
  return ACTORES_SIMULADOS
    .filter((a) => !tipo || a.tipo === tipo)
    .map((a) => ({ ...a, distanciaKm: distanciaKm(lat, lng, a.lat, a.lng) }))
    .sort((a, b) => a.distanciaKm - b.distanciaKm)
    .slice(0, limite);
}

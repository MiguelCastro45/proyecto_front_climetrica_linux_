/**
 * config/estadoVias.js — Estado de las vías (DATOS SIMULADOS).
 *
 * Unas pocas alertas de movilidad en el Cauca (derrumbes y una inundación)
 * para mostrar que el mapa admite otras variables además de las climáticas.
 * Son pocas a propósito: la idea no es mostrar todo bloqueado, sino los
 * fenómenos que afectan la movilidad de la cadena (sacar la cosecha, traer
 * insumos). Más adelante se podrían traer de INVÍAS o de la gestión del
 * riesgo departamental.
 *
 * estado: "cerrada" (rojo) o "restringida" (ámbar).
 */

export const ESTADOS_VIA = {
  cerrada: { label: "Vía cerrada", color: "#dc2626" },
  restringida: { label: "Paso restringido", color: "#d97706" },
};

export const ALERTAS_VIAS = [
  {
    id: "v01",
    tipo: "Derrumbe",
    estado: "cerrada",
    via: "Popayán – Totoró – Inzá",
    sector: "Sector Gabriel López",
    detalle: "Derrumbe sobre la calzada. Cierre total mientras se retira el material.",
    lat: 2.4930,
    lng: -76.2950,
    hace: "hace 3 h",
  },
  {
    id: "v02",
    tipo: "Derrumbe",
    estado: "restringida",
    via: "Vía Panamericana (Popayán – Pasto)",
    sector: "Entre Timbío y Rosas",
    detalle: "Paso a un solo carril con pare y siga. Demoras de 30 a 45 minutos.",
    lat: 2.3050,
    lng: -76.7120,
    hace: "hace 1 h",
  },
  {
    id: "v03",
    tipo: "Derrumbe",
    estado: "restringida",
    via: "Popayán – El Tambo",
    sector: "Sector Cuatro Esquinas",
    detalle: "Caída de material en la berma. Paso con precaución, solo vehículos livianos.",
    lat: 2.4600,
    lng: -76.7400,
    hace: "hace 6 h",
  },
  {
    id: "v04",
    tipo: "Inundación",
    estado: "restringida",
    via: "Santander de Quilichao – Puerto Tejada",
    sector: "Cruce del río Quinamayó",
    detalle: "Agua sobre la vía tras las lluvias. Paso lento; evitar vehículos bajos.",
    lat: 3.0850,
    lng: -76.4300,
    hace: "hace 2 h",
  },
];

/**
 * config/actores.js — Perfiles de actores de la cadena agroalimentaria.
 *
 * Pulso Productivo atiende cuatro perfiles. Cada uno tiene un color y un
 * ícono que se usan en el registro, el panel del usuario y los puntos de
 * otros usuarios en el mapa.
 *
 * La clave "productor" se conserva para que los usuarios ya registrados
 * sigan siendo válidos. Los roles anteriores (vendedor, inversionista) se
 * muestran con su nombre original para no romper cuentas existentes.
 */

export const ACTORES = {
  proveedor_insumos: {
    label: "Proveedor de insumos",
    color: "#f59e0b",
    icono: "🧪",
    descripcion: "Semillas, viveros, fertilizantes, agroquímicos, herramientas",
  },
  productor: {
    label: "Productor primario",
    color: "#16a34a",
    icono: "🌱",
    descripcion: "Agricultores, cultivadores, ganaderos, porcicultores",
  },
  comercializador: {
    label: "Comercializador",
    color: "#2563eb",
    icono: "🚚",
    descripcion: "Acopio, transporte, distribución y venta de alimentos",
  },
  servicios: {
    label: "Servicios",
    color: "#db2777",
    icono: "🍽️",
    descripcion: "Restaurantes, hoteles, hospitales, comedores",
  },
};

// Nombres de roles que existían antes del cambio a Pulso Productivo
const ROLES_ANTERIORES = {
  admin: "Administrador",
  vendedor: "Vendedor",
  inversionista: "Inversionista",
};

/** Devuelve el nombre legible de un rol (nuevo o anterior). */
export function getRoleLabel(role) {
  return ACTORES[role]?.label || ROLES_ANTERIORES[role] || role;
}

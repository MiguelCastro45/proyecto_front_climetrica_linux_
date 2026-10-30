/**
 * config/ubicacionUsuario.js — Ubicación del usuario en el mapa (SIMULADA).
 *
 * Para que cada usuario se reconozca entre los demás puntos ("este soy yo y
 * a mi alrededor están estos actores"), se le asigna un lugar del Cauca.
 * NO es su ubicación real: se escoge de esta lista a partir de su cuenta, así
 * que la misma cuenta siempre queda en el mismo sitio (capturas y pruebas
 * reproducibles). Cuando el registro pida la ubicación de la finca o el
 * negocio, esta función se reemplaza por ese dato.
 */

export const LUGARES_SIMULADOS = [
  { lugar: "Vereda El Placer", municipio: "Popayán", lat: 2.5080, lng: -76.6420 },
  { lugar: "Vereda La Palma", municipio: "Cajibío", lat: 2.6280, lng: -76.6350 },
  { lugar: "Vereda San Isidro", municipio: "Timbío", lat: 2.3720, lng: -76.6620 },
  { lugar: "Vereda El Rosal", municipio: "Piendamó", lat: 2.6610, lng: -76.5520 },
  { lugar: "Vereda La Esperanza", municipio: "El Tambo", lat: 2.4790, lng: -76.7630 },
  { lugar: "Vereda Buenos Aires", municipio: "Morales", lat: 2.7480, lng: -76.6110 },
  { lugar: "Vereda El Diviso", municipio: "Totoró", lat: 2.5180, lng: -76.4250 },
  { lugar: "Vereda Santa Lucía", municipio: "Sotará", lat: 2.2810, lng: -76.6020 },
];

/**
 * Lugar simulado para un usuario. Usa su id (o correo) como semilla: siempre
 * devuelve el mismo lugar para la misma cuenta.
 * @param {object} usuario - currentUser ({ _id | id | email, ... })
 * @returns {{ lugar, municipio, lat, lng }}
 */
export function ubicacionSimulada(usuario) {
  const semilla = String(usuario?._id || usuario?.id || usuario?.email || "demo");
  const hash = [...semilla].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return LUGARES_SIMULADOS[hash % LUGARES_SIMULADOS.length];
}

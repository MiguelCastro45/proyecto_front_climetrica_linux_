/**
 * MarketSummary.jsx — Variables de mercado del sector en el análisis.
 *
 * Muestra en tarjetas las variables de mercado del sector analizado
 * (precio del producto, transporte, insumos...) con su valor actual y la
 * variación de los últimos 7 días. Son las mismas que el selector "Mercado"
 * del mapa, para que el análisis sea consistente con lo que se ve allí.
 *
 * Props:
 *   - cultivo: sector analizado (clave de MERCADO_POR_CULTIVO)
 *   - limite: cuántas variables mostrar (por defecto 4)
 */
import React from "react";
import { mercadoPrincipalDelSector } from "../config/variablesMercado";
import "../styles/MarketSummary.css";

const fmt = (n) => n.toLocaleString("es-CO");

export default function MarketSummary({ cultivo, limite = 4 }) {
  const variables = mercadoPrincipalDelSector(cultivo, limite);
  if (variables.length === 0) return null;

  return (
    <div className="market-summary">
      <h4>💲 Variables de mercado del sector</h4>
      <div className="market-summary-grid">
        {variables.map((v) => {
          const sube = v.variacion >= 0;
          return (
            <div key={v.clave} className="market-summary-card">
              <div className="market-summary-name">{v.icono} {v.nombre}</div>
              <div className="market-summary-value">
                {fmt(v.actual)} <span>{v.unidad}</span>
              </div>
              <div className={`market-summary-change ${sube ? "up" : "down"}`}>
                {sube ? "▲" : "▼"} {Math.abs(v.variacion).toFixed(1)}% en 7 días
              </div>
            </div>
          );
        })}
      </div>
      <div className="market-summary-note">Datos de ejemplo · mismas variables del selector "Mercado" del mapa</div>
    </div>
  );
}

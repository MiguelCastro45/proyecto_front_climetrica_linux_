/**
 * MarketPanel.jsx — Panel flotante de una variable de mercado.
 *
 * Muestra el valor actual, la variación de los últimos 7 días, el mínimo y
 * máximo del mes y una mini gráfica (SVG) de la serie de ejemplo. Deja claro
 * que son datos de ejemplo y de qué fuente se traerían en el futuro.
 *
 * Props:
 *   - clave: clave de la variable en VARIABLES_MERCADO
 *   - role: rol del usuario (para indicar si es relevante para su perfil)
 *   - onClose: cierra el panel
 */
import React, { useMemo } from "react";
import { VARIABLES_MERCADO, serieEjemplo } from "../config/variablesMercado";
import "../styles/MarketPanel.css";

const fmt = (n) => n.toLocaleString("es-CO");

export default function MarketPanel({ clave, role, onClose }) {
  const variable = VARIABLES_MERCADO[clave];
  const serie = useMemo(() => serieEjemplo(clave, 30), [clave]);
  if (!variable || serie.length === 0) return null;

  const valores = serie.map((d) => d.value);
  const actual = valores[valores.length - 1];
  const hace7 = valores[valores.length - 8] ?? valores[0];
  const variacion = ((actual - hace7) / hace7) * 100;
  const min = Math.min(...valores);
  const max = Math.max(...valores);

  // Mini gráfica: polilínea escalada al recuadro 260x60
  const W = 260;
  const H = 60;
  const puntos = valores
    .map((v, i) => {
      const x = (i / (valores.length - 1)) * W;
      const y = H - ((v - min) / (max - min || 1)) * (H - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const sube = variacion >= 0;
  const relevante = variable.perfiles.includes(role);

  return (
    <div className="market-panel">
      <div className="market-panel-header">
        <span className="market-panel-title">
          {variable.icono} {variable.nombre}
        </span>
        <button className="market-panel-close" onClick={onClose} title="Cerrar">✕</button>
      </div>

      {relevante && <div className="market-panel-badge">★ Relevante para tu perfil</div>}

      <div className="market-panel-value">
        {fmt(actual)} <span className="market-panel-unit">{variable.unidad}</span>
      </div>
      <div className={`market-panel-change ${sube ? "up" : "down"}`}>
        {sube ? "▲" : "▼"} {Math.abs(variacion).toFixed(1)}% en los últimos 7 días
      </div>

      <svg className="market-panel-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <polyline points={puntos} className={sube ? "up" : "down"} />
      </svg>
      <div className="market-panel-range">
        <span>Mín. 30 días: {fmt(min)}</span>
        <span>Máx. 30 días: {fmt(max)}</span>
      </div>

      <div className="market-panel-note">
        Datos de ejemplo. Fuente prevista: {variable.fuenteFutura}.
      </div>
    </div>
  );
}

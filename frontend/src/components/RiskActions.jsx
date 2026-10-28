/**
 * RiskActions.jsx — Sección "Cómo subsanar los riesgos y oportunidades".
 *
 * Por cada riesgo identificado muestra qué hacer, qué oportunidad abre y los
 * proveedores de insumos cercanos de la red (como "gasolineras cercanas").
 *
 * Props:
 *   - acciones: lista ya calculada (cropAnalysis.accionesRiesgo). Opcional.
 *   - riesgos, lat, lng: si no llegan `acciones` (registros guardados antes
 *     de este cambio), se calculan a partir de los riesgos y la ubicación.
 */
import React from "react";
import { generarAccionesRiesgo } from "../config/accionesRiesgo";
import "../styles/RiskActions.css";

export default function RiskActions({ acciones, riesgos, lat, lng }) {
  const lista =
    acciones && acciones.length > 0
      ? acciones
      : riesgos && riesgos.length > 0 && lat != null && lng != null
        ? generarAccionesRiesgo(riesgos, Number(lat), Number(lng))
        : [];

  if (lista.length === 0) return null;

  return (
    <div className="risk-actions">
      <h5 className="risk-actions-title">🛠️ Cómo subsanar los riesgos y oportunidades</h5>
      {lista.map((a, idx) => (
        <div key={idx} className="risk-action-card">
          <div className="risk-action-head">⚠️ {a.titulo}</div>
          <div className="risk-action-row">
            <strong>✅ Qué hacer:</strong> {a.accion}
          </div>
          {a.oportunidad && (
            <div className="risk-action-row">
              <strong>💡 Oportunidad:</strong> {a.oportunidad}
            </div>
          )}
          {a.insumosCercanos && a.insumosCercanos.length > 0 && (
            <div className="risk-action-row risk-action-nearby">
              <strong>🏪 Insumos cercanos{a.insumo ? ` (${a.insumo.toLowerCase()})` : ""}:</strong>
              <ul>
                {a.insumosCercanos.map((p, i) => (
                  <li key={i}>
                    {p.actividad} — {p.municipio} · a {p.distanciaKm} km
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
      <div className="risk-actions-note">
        Proveedores de la red Pulso Productivo (usuarios anónimos · datos simulados).
      </div>
    </div>
  );
}

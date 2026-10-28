/**
 * BrandHeader.jsx — Encabezado de marca "Pulso Productivo (antes Climétrica)".
 *
 * La plataforma evoluciona de Climétrica a Pulso Productivo. El nombre nuevo
 * va como título principal y el logo de Climétrica se mantiene debajo, más
 * pequeño y tenue, para dejar evidencia de la evolución (no se borra).
 *
 * Props:
 *   - size: "lg" (login/registro) | "md" (panel lateral). Por defecto "md".
 */
import React from "react";
import "../styles/BrandHeader.css";

export const BRAND_NAME = "Pulso Productivo";
export const BRAND_FULL = "Pulso Productivo (antes Climétrica)";

export default function BrandHeader({ size = "md" }) {
  return (
    <div className={`brand-header brand-${size}`}>
      <div className="brand-title">
        <svg className="brand-pulse" viewBox="0 0 48 24" aria-hidden="true">
          <polyline points="0,12 12,12 17,3 23,21 29,8 33,12 48,12" />
        </svg>
        <span>{BRAND_NAME}</span>
      </div>
      <div className="brand-former">
        <span className="brand-former-label">antes</span>
        <img src="/logo/1_img.jpg" alt="Climétrica" className="brand-former-logo" />
      </div>
    </div>
  );
}

// src/components/LegendPanel.jsx
import React from "react";
import "../styles/UserMapDashboard.css";

export default function LegendPanel({ selectedLayer }) {
  const legends = {
    temp: [
      { color: "#0000ff", label: "Frío" },
      { color: "#00ffff", label: "Templado" },
      { color: "#ff0000", label: "Calor extremo" },
    ],
    precipitation: [
      { color: "#cceeff", label: "Lluvia ligera" },
      { color: "#3399ff", label: "Moderada" },
      { color: "#003366", label: "Intensa" },
    ],
    clouds: [
      { color: "#999999", label: "Nubes bajas" },
      { color: "#cccccc", label: "Nubes medias" },
      { color: "#ffffff", label: "Nubes altas" },
    ],
    wind: [
      { color: "#66ccff", label: "Brisa" },
      { color: "#0099cc", label: "Moderado" },
      { color: "#003366", label: "Fuerte" },
    ],
  };

  return (
    <div className="legend-panel">
      <h4>Leyenda - {selectedLayer.toUpperCase()}</h4>
      {legends[selectedLayer].map((item, i) => (
        <div key={i} className="legend-item">
          <span
            className="legend-color"
            style={{ backgroundColor: item.color }}
          ></span>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

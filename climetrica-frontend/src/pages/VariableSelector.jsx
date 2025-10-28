// src/components/VariableSelector.jsx
import React from "react";
import "../styles/UserMapDashboard.css";

export default function VariableSelector({ selected, onSelect, autoRotate, setAutoRotate }) {
  return (
    <div className="variable-selector">
      <label htmlFor="variableSelect">🌎 Variable: </label>
      <select
        id="variableSelect"
        onChange={(e) => onSelect(e.target.value)}
        value={selected}
        disabled={autoRotate}
      >
        <option value="temp">Temperatura</option>
        <option value="precipitation">Precipitación</option>
        <option value="clouds">Nubes</option>
        <option value="wind">Viento</option>
      </select>

      <div className="rotation-control">
        <input
          type="checkbox"
          id="autoRotate"
          checked={autoRotate}
          onChange={(e) => setAutoRotate(e.target.checked)}
        />
        <label htmlFor="autoRotate">Auto rotar</label>
      </div>
    </div>
  );
}

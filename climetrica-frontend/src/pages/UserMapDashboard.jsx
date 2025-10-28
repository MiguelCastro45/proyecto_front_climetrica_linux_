import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, LayersControl } from "react-leaflet";

const { BaseLayer, Overlay } = LayersControl;

export default function UserMapDashboard() {
  const [climateData, setClimateData] = useState({
    temperature: [],
    precipitation: [],
    soil_moisture: [],
    drought: [],
  });

  const fetchClimateLayer = async (variable) => {
    try {
      const res = await fetch(`http://localhost:5000/climate/${variable}`);
      const data = await res.json();
      setClimateData(prev => ({ ...prev, [variable]: data }));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    ["temperature", "precipitation", "soil_moisture", "drought"].forEach(fetchClimateLayer);
    const interval = setInterval(() => {
      ["temperature", "precipitation", "soil_moisture", "drought"].forEach(fetchClimateLayer);
    }, 10 * 60 * 1000); // actualizar cada 10 minutos
    return () => clearInterval(interval);
  }, []);

  return (
    <MapContainer center={[20,0]} zoom={2} style={{ height: "600px", width: "100%" }}>
      <LayersControl position="topright">
        <BaseLayer checked name="OpenStreetMap">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        </BaseLayer>

        {["temperature", "precipitation", "soil_moisture", "drought"].map(varName => (
          <Overlay key={varName} name={varName.charAt(0).toUpperCase() + varName.slice(1)}>
            {climateData[varName].map((d, i) => (
              <CircleMarker key={`${varName}-${i}`} center={[d.lat, d.lon]} radius={3} color={varName === "temperature" ? "red" : varName === "precipitation" ? "blue" : varName === "soil_moisture" ? "green" : "brown"}>
                <Tooltip>
                  <div>
                    <strong>{varName}</strong><br />
                    Valor: {d.value.toFixed(2)}
                  </div>
                </Tooltip>
              </CircleMarker>
            ))}
          </Overlay>
        ))}
      </LayersControl>
    </MapContainer>
  );
}

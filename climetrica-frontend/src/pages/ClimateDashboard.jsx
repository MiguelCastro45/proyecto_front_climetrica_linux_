import React, { useEffect, useState } from "react";
import API from "../api/api";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function ClimateDashboard() {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchClimate = async () => {
      try {
        const res = await API.get("/climate-data/");
        setData(res.data);
      } catch (err) {
        console.error("Error al obtener datos climáticos:", err);
      }
    };
    fetchClimate();
  }, []);

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h2 className="text-2xl font-bold mb-4">Dashboard Climático</h2>
      <div className="w-full h-[70vh]">
        <MapContainer
          center={[2.5, -76.5]}
          zoom={7}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {data.map((point, index) => (
            <CircleMarker
              key={index}
              center={[point.lat, point.lon]}
              radius={5}
              color="blue"
            >
              <Tooltip>
                <strong>{point.name}</strong>
                <br />
                Temp: {point.temp}°C <br />
                Humedad: {point.humidity}%
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

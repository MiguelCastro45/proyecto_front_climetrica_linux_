import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "../styles/UserMapDashboard.css";

// 🔑 API key de OpenWeatherMap (ya integrada)
const apiKey = "d2f1e6e2af677293a7fc4e832214a09c";

// Icono personalizado
const userIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/64/64113.png",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

export default function UserMapDashboard() {
  const [data, setData] = useState([]);
  const [activeLayers, setActiveLayers] = useState({
    temp: true,
    precipitation: false,
    clouds: false,
    wind: false,
  });

  const layers = {
    temp: {
      name: "🌡 Temperatura",
      url: `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${apiKey}`,
      opacity: 0.7,
    },
    precipitation: {
      name: "☔ Precipitación",
      url: `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${apiKey}`,
      opacity: 0.6,
    },
    clouds: {
      name: "☁️ Nubes",
      url: `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${apiKey}`,
      opacity: 0.6,
    },
    wind: {
      name: "💨 Viento",
      url: `https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${apiKey}`,
      opacity: 0.6,
    },
  };

  useEffect(() => {
    const mockData = [
      { id: 1, name: "Popayán", lat: 2.4448, lng: -76.6147, temp: 22 },
      { id: 2, name: "Cali", lat: 3.4516, lng: -76.5320, temp: 28 },
      { id: 3, name: "Bogotá", lat: 4.7110, lng: -74.0721, temp: 18 },
      { id: 4, name: "Medellín", lat: 6.2442, lng: -75.5812, temp: 24 },
    ];
    setData(mockData);
  }, []);

  // Alternar visibilidad de capas
  const toggleLayer = (layerKey) => {
    setActiveLayers((prev) => ({
      ...prev,
      [layerKey]: !prev[layerKey],
    }));
  };

  return (
    <div className="map-container">
      <MapContainer
        center={[4.5, -75.5]} // centro de Colombia
        zoom={6}
        scrollWheelZoom={true}
        className="leaflet-map"
      >
        {/* 🌍 Capa base */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a>"
        />

        {/* 🧩 Capas dinámicas de OpenWeatherMap */}
        {Object.keys(layers).map(
          (key) =>
            activeLayers[key] && (
              <TileLayer
                key={key}
                url={layers[key].url}
                opacity={layers[key].opacity}
              />
            )
        )}

        {/* 📍 Marcadores de ejemplo */}
        {data.map((city) => (
          <Marker key={city.id} position={[city.lat, city.lng]} icon={userIcon}>
            <Popup>
              <b>{city.name}</b>
              <br />
              Temperatura: {city.temp}°C
            </Popup>
          </Marker>
        ))}

        {/* 🔴 Círculos visuales */}
        {data.map((city) => (
          <CircleMarker
            key={`circle-${city.id}`}
            center={[city.lat, city.lng]}
            radius={10}
            pathOptions={{
              color: city.temp > 25 ? "red" : "blue",
              fillOpacity: 0.4,
            }}
          />
        ))}
      </MapContainer>

      {/* 📊 Leyenda flotante */}
      <div className="legend-panel">
        <h4>🌎 Capas disponibles</h4>
        {Object.keys(layers).map((key) => (
          <div key={key} className="legend-item">
            <input
              type="checkbox"
              id={key}
              checked={activeLayers[key]}
              onChange={() => toggleLayer(key)}
            />
            <label htmlFor={key}>{layers[key].name}</label>
          </div>
        ))}
      </div>
    </div>
  );
}

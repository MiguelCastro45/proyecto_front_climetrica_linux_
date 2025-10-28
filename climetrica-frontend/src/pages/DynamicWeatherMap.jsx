import React, { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function DynamicWeatherMap() {
  useEffect(() => {
    // Crear el mapa base centrado sobre América del Sur 🌎
    const map = L.map("weatherMap", {
      center: [4.5, -74], // Colombia
      zoom: 5,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    // Capa base con tonos suaves
    const baseLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    // Capas animadas de OpenWeather (usa tu API key)
    const apiKey = "d2f1e6e2af677293a7fc4e832214a09c";

    const clouds = L.tileLayer(
      `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${apiKey}`,
      { attribution: "© OpenWeather" }
    );

    const precipitation = L.tileLayer(
      `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${apiKey}`,
      { attribution: "© OpenWeather" }
    );

    const temp = L.tileLayer(
      `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${apiKey}`,
      { attribution: "© OpenWeather" }
    );

    const wind = L.tileLayer(
      `https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${apiKey}`,
      { attribution: "© OpenWeather" }
    );

    // Añadir una capa por defecto
    temp.addTo(map);

    // Control de capas
    const overlayMaps = {
       Nubes: clouds,
       Precipitación: precipitation,
       Temperatura: temp,
       Viento: wind,
    };

    L.control.layers(overlayMaps, null, { collapsed: false, position: "topright" }).addTo(map);

    // Limpiar el mapa al desmontar el componente
    return () => {
      map.remove();
    };
  }, []);

  return (
    <div
      id="weatherMap"
      style={{
        height: "550px",
        width: "100%",
        borderRadius: "10px",
        boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
      }}
    ></div>
  );
}

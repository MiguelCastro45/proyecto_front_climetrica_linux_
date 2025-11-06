import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "leaflet/dist/leaflet.css";
import API from "../api/api";
import "../styles/ClimateDashboard.css";

export default function ClimateDashboard() {
  const navigate = useNavigate();
  const mapRef = useRef();
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [filters, setFilters] = useState({ year: "", month: "", day: "", hour: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await API.get("http://localhost:8000/api/climate-data/");
        const raw = res.data.status ? res.data.data : res.data;
        const cleaned = raw
          .filter(d => d.latitude && d.longitude && d.valid_time)
          .map(d => {
            const lat = parseFloat(d.latitude);
            const lon = parseFloat(d.longitude);
            const sp = parseFloat(d.sp);
            const date = new Date(d.valid_time);
            if (isNaN(lat) || isNaN(lon) || isNaN(sp) || isNaN(date.getTime())) return null;
            return { valid_time: date, latitude: lat, longitude: lon, sp };
          })
          .filter(d => d !== null);
        setData(cleaned);
        setFilteredData(cleaned);
      } catch (err) {
        console.error(err);
        setError("No se pudo conectar al servidor.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleFilterChange = e => {
    const { name, value } = e.target;
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);

    const filtered = data.filter(d => {
      const date = d.valid_time;
      return (
        (!newFilters.year || date.getFullYear().toString() === newFilters.year) &&
        (!newFilters.month || (date.getMonth() + 1).toString().padStart(2, "0") === newFilters.month) &&
        (!newFilters.day || date.getDate().toString().padStart(2, "0") === newFilters.day) &&
        (!newFilters.hour || date.getHours().toString().padStart(2, "0") === newFilters.hour)
      );
    });
    setFilteredData(filtered);
  };

  const handleDownloadReport = async () => {
    try {
      const mapElement = document.querySelector(".map-section");
      const pdf = new jsPDF("p", "mm", "a4");
      pdf.setFontSize(18);
      pdf.text("Reporte de Datos Climáticos", 14, 20);

      const mapCanvas = await html2canvas(mapElement, { useCORS: true });
      const mapImg = mapCanvas.toDataURL("image/png");
      pdf.addImage(mapImg, "PNG", 10, 30, 190, 100);

      pdf.setFontSize(12);
      pdf.text("Datos Climáticos:", 14, 140);
      let y = 150;
      filteredData.slice(0, 20).forEach((d, i) => {
        pdf.text(
          `${i + 1}. ${d.valid_time.toLocaleString()} | Lat: ${d.latitude.toFixed(
            3
          )}, Lon: ${d.longitude.toFixed(3)} | sp: ${d.sp.toFixed(2)}`,
          14,
          y
        );
        y += 7;
        if (y > 270) {
          pdf.addPage();
          y = 20;
        }
      });

      pdf.save("reporte_climatico.pdf");
    } catch (error) {
      console.error(error);
      alert("Ocurrió un error al generar el reporte.");
    }
  };

  if (loading) return <p className="loading">Cargando datos...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div className="dashboard-container">
      {/* HEADER */}
      <div className="header-actions">
        <h2 className="title">📊 Datos Climáticos</h2>
        <div className="buttons">
          <button className="btn btn-back" onClick={() => navigate(-1)}>⬅️ Volver</button>
          <button className="btn btn-download" onClick={handleDownloadReport}>📥 Generar Reporte</button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="filters">
        {["year","month","day","hour"].map(f => (
          <select key={f} name={f} value={filters[f]} onChange={handleFilterChange}>
            <option value="">{f.charAt(0).toUpperCase() + f.slice(1)}</option>
            {[...new Set(
              data.map(d => {
                if(f==="year") return d.valid_time.getFullYear();
                if(f==="month") return (d.valid_time.getMonth()+1).toString().padStart(2,"0");
                if(f==="day") return d.valid_time.getDate().toString().padStart(2,"0");
                if(f==="hour") return d.valid_time.getHours().toString().padStart(2,"0");
                return "";
              })
            )].map(v => <option key={v} value={v}>{f==="hour"?v+":00":v}</option>)}
          </select>
        ))}
      </div>

      {/* TABLA */}
      <div className="data-table-container">
        <table className="climate-table">
          <thead>
            <tr>
              <th>Fecha</th><th>Latitud</th><th>Longitud</th><th>Presión (sp)</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length>0 ? filteredData.slice(0,30).map((d,i)=>(
              <tr key={i}>
                <td>{d.valid_time.toLocaleString()}</td>
                <td>{d.latitude.toFixed(4)}</td>
                <td>{d.longitude.toFixed(4)}</td>
                <td>{d.sp.toFixed(2)}</td>
              </tr>
            )) : <tr><td colSpan="4">No hay datos disponibles.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* MAPA */}
      <div className="map-section" ref={mapRef}>
        <MapContainer center={[4.5, -74.2]} zoom={6} scrollWheelZoom={true}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {filteredData.map((d,i)=>(
            <CircleMarker
              key={i}
              center={[d.latitude,d.longitude]}
              radius={6}
              fillColor="#00bcd4"
              color="#333"
              weight={1}
              fillOpacity={0.8}
            >
              <Tooltip>
                <div>
                  <strong>{d.valid_time.toLocaleString()}</strong>
                  <br/>Lat: {d.latitude.toFixed(3)}, Lon: {d.longitude.toFixed(3)}
                  <br/>sp: {d.sp.toFixed(2)}
                </div>
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

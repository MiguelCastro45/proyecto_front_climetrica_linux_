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
  const [filters, setFilters] = useState({ fecha: "", lugar: "", variable: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await API.get("http://localhost:8000/api/climate-data/");
        const raw = res.data.status ? res.data.data : res.data;

        const cleaned = raw.map((item) => ({
          nombre: item.usuario?.nombre || "N/A",
          rol: item.usuario?.rol || "N/A",
          email: item.usuario?.email || "N/A",
          variable: item.consulta?.variable || "N/A",
          lugar: item.consulta?.lugar || "N/A",
          latitud: item.consulta?.coordenadas?.latitud || "N/A",
          longitud: item.consulta?.coordenadas?.longitud || "N/A",
          rangoTemporal: item.consulta?.rangoTemporal || "N/A",
          valorActual: item.datosClimaticos?.valorActual || "N/A",
          promedio: item.datosClimaticos?.estadisticas?.promedio || "N/A",
          maximo: item.datosClimaticos?.estadisticas?.maximo || "N/A",
          minimo: item.datosClimaticos?.estadisticas?.minimo || "N/A",
          fecha: item.usuario?.fechaDescarga
            ? new Date(item.usuario.fechaDescarga).toLocaleDateString()
            : "N/A",
          hora: item.usuario?.horaDescarga || "N/A",
        }));

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

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);

    const filtered = data.filter((d) => {
      const matchFecha = !newFilters.fecha || d.fecha === new Date(newFilters.fecha).toLocaleDateString();
      const matchLugar = !newFilters.lugar || d.lugar.toLowerCase().includes(newFilters.lugar.toLowerCase());
      const matchVariable = !newFilters.variable || d.variable === newFilters.variable;
      return matchFecha && matchLugar && matchVariable;
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
          `${i + 1}. ${d.variable} (${d.lugar}) - Valor: ${d.valorActual}°C`,
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
      </div>

      {/* FILTROS ACTUALIZADOS */}
      <div className="filters">
        <input
          type="date"
          name="fecha"
          value={filters.fecha}
          onChange={handleFilterChange}
          className="filter-input"
        />
        <input
          type="text"
          name="lugar"
          placeholder="Buscar por lugar..."
          value={filters.lugar}
          onChange={handleFilterChange}
          className="filter-input"
        />
        <select
          name="variable"
          value={filters.variable}
          onChange={handleFilterChange}
          className="filter-input"
        >
          <option value="">Todas las variables</option>
          {[...new Set(data.map((d) => d.variable))].map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {/* 🔹 TABLA MEJORADA */}
      <div className="data-table-container">
        <table className="climate-table">
          <thead>
            <tr>
              <th>Variable</th>
              <th>Usuario</th>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Latitud</th>
              <th>Longitud</th>
              <th>Lugar</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length > 0 ? (
              filteredData.slice(0, 30).map((d, i) => (
                <React.Fragment key={i}>
                  <tr>
                    <td>{d.variable}</td>
                    <td>{d.nombre}</td>
                    <td>{d.fecha}</td>
                    <td>{d.hora}</td>
                    <td>{d.latitud}</td>
                    <td>{d.longitud}</td>
                    <td>{d.lugar}</td>
                    <td>
                      <button
                        className="btn btn-more"
                        onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                      >
                        {expandedRow === i ? "Ocultar" : "Ver más"}
                      </button>
                    </td>
                  </tr>

                  {expandedRow === i && (
                    <tr className="expanded-row">
                      <td colSpan="8">
                        <div className="extra-info">
                          <p><strong>Rol:</strong> {d.rol}</p>
                          <p><strong>Email:</strong> {d.email}</p>
                          <p><strong>Rango temporal:</strong> {d.rangoTemporal}</p>
                          <p><strong>Valor actual:</strong> {d.valorActual} °C</p>
                          <p><strong>Promedio:</strong> {d.promedio}</p>
                          <p><strong>Máximo:</strong> {d.maximo}</p>
                          <p><strong>Mínimo:</strong> {d.minimo}</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            ) : (
              <tr>
                <td colSpan="8">No hay datos disponibles.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MAPA */}
      <div className="map-section" ref={mapRef}>
        <MapContainer center={[4.5, -74.2]} zoom={6} scrollWheelZoom={true}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {filteredData.map((d, i) => (
            <CircleMarker
              key={i}
              center={[parseFloat(d.latitud), parseFloat(d.longitud)]}
              radius={6}
              fillColor="#00bcd4"
              color="#333"
              weight={1}
              fillOpacity={0.8}
            >
              <Tooltip>
                <div>
                  <strong>{d.variable}</strong>
                  <br />
                  {d.lugar}
                  <br />
                  Valor actual: {d.valorActual} °C
                </div>
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
      </div><br></br>
      <center><div className="buttons">
          <button className="btn btn-download" onClick={handleDownloadReport}>📥 Generar Reporte</button>
          <button className="btn btn-back" onClick={() => navigate(-1)}>⬅️ Volver</button>
        </div></center>
    </div>
  );
}



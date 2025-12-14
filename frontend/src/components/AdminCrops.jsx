import React, { useState, useEffect } from "react";
import API from "../api/api";
import "../styles/AdminTabsEncapsulated.css?v=11";

export default function AdminCrops({ showNotification }) {
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCrop, setEditingCrop] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState({
    nombre: "",
    nombre_cientifico: "",
    descripcion: "",
    requerimientos: {
      temperatura_min: 0,
      temperatura_max: 0,
      temperatura_optima: 0,
      precipitacion_min: 0,
      precipitacion_max: 0,
      altitud_min: 0,
      altitud_max: 0,
      humedad_min: 0,
      humedad_max: 0
    },
    color: "#8B4513",
    icono: "🌱",
    ciclo_siembra: "",
    ciclo_cosecha: "",
    imagen_url: "",
    activo: true
  });

  useEffect(() => {
    fetchCrops();
  }, []);

  const fetchCrops = async () => {
    try {
      const token = localStorage.getItem("token");
      console.log("🌱 Fetching crops from /api/admin/crops/");
      console.log("Token exists:", !!token);

      const res = await API.get("/api/admin/crops/", {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log("✅ Crops response:", res.data);
      console.log("Crops count:", res.data.crops?.length || 0);

      setCrops(res.data.crops || []);
    } catch (err) {
      console.error("❌ Error al cargar cultivos:", err);
      console.error("Error response:", err.response?.data);
      console.error("Error status:", err.response?.status);
      showNotification("error", "Error", "No se pudieron cargar los cultivos");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingCrop(null);
    setForm({
      nombre: "",
      nombre_cientifico: "",
      descripcion: "",
      requerimientos: {
        temperatura_min: 0,
        temperatura_max: 0,
        temperatura_optima: 0,
        precipitacion_min: 0,
        precipitacion_max: 0,
        altitud_min: 0,
        altitud_max: 0,
        humedad_min: 0,
        humedad_max: 0
      },
      color: "#8B4513",
      icono: "🌱",
      ciclo_siembra: "",
      ciclo_cosecha: "",
      imagen_url: "",
      activo: true
    });
    setShowModal(true);
  };

  const openEdit = (crop) => {
    setEditingCrop(crop);
    setForm({
      nombre: crop.nombre,
      nombre_cientifico: crop.nombre_cientifico || "",
      descripcion: crop.descripcion || "",
      requerimientos: {
        ...crop.requerimientos
      },
      color: crop.color || "#8B4513",
      icono: crop.icono || "🌱",
      ciclo_siembra: crop.ciclo_siembra || "",
      ciclo_cosecha: crop.ciclo_cosecha || "",
      imagen_url: crop.imagen_url || "",
      activo: crop.activo
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar campos requeridos
    if (!form.nombre) {
      showNotification("error", "Error", "El nombre del cultivo es requerido");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      if (editingCrop) {
        // Actualizar
        await API.put(`/api/admin/crops/${editingCrop._id}/`, form, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showNotification("success", "Éxito", "Cultivo actualizado correctamente");
      } else {
        // Crear
        await API.post("/api/admin/crops/create/", form, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showNotification("success", "Éxito", "Cultivo creado correctamente");
      }

      setShowModal(false);
      fetchCrops();
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Error al guardar el cultivo";
      showNotification("error", "Error", errorMsg);
    }
  };

  const handleDelete = async (cropId) => {
    if (!window.confirm("¿Estás seguro de eliminar este cultivo?")) return;

    try {
      const token = localStorage.getItem("token");
      await API.delete(`/api/admin/crops/${cropId}/delete/`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showNotification("success", "Éxito", "Cultivo eliminado correctamente");
      fetchCrops();
    } catch (err) {
      showNotification("error", "Error", "No se pudo eliminar el cultivo");
    }
  };

  const handleToggleActive = async (cropId, currentState) => {
    try {
      const token = localStorage.getItem("token");
      const res = await API.patch(`/api/admin/crops/${cropId}/toggle/`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showNotification("success", "Éxito", res.data.message);
      fetchCrops();
    } catch (err) {
      const errorMsg = err.response?.data?.error || "No se pudo cambiar el estado del cultivo";
      showNotification("error", "Error", errorMsg);
    }
  };

  const updateRequerimiento = (field, value) => {
    setForm({
      ...form,
      requerimientos: {
        ...form.requerimientos,
        [field]: parseFloat(value) || 0
      }
    });
  };

  // Filtrar cultivos según término de búsqueda
  const filteredCrops = crops.filter(crop => {
    const search = searchTerm.toLowerCase();
    return (
      crop.nombre.toLowerCase().includes(search) ||
      (crop.nombre_cientifico && crop.nombre_cientifico.toLowerCase().includes(search)) ||
      (crop.descripcion && crop.descripcion.toLowerCase().includes(search))
    );
  });

  if (loading) {
    return <div className="admin-loading">Cargando cultivos...</div>;
  }

  return (
    <div className="admin-tab-content">
      <div className="admin-header">
        <h3>Gestión de Cultivos</h3>
        <div className="admin-header-actions">
          <div className="admin-search-container">
            <input
              type="text"
              placeholder="🔍 Buscar cultivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="admin-search-input"
            />
          </div>
          <button className="btn btn-blue btn-with-icon" onClick={openCreate}>
            <span className="btn-icon-emoji">➕</span>
            Agregar Cultivo
          </button>
        </div>
      </div>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Nombre Científico</th>
              <th>Temp. Óptima (°C)</th>
              <th>Precip. (mm)</th>
              <th>Altitud (m)</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredCrops.length === 0 ? (
              <tr>
                <td colSpan="7" className="center">
                  {searchTerm ? "No se encontraron cultivos que coincidan con tu búsqueda" : "No hay cultivos registrados"}
                </td>
              </tr>
            ) : (
              filteredCrops.map((crop) => (
                <tr key={crop._id}>
                  <td>{crop.nombre}</td>
                  <td>{crop.nombre_cientifico || "-"}</td>
                  <td>{crop.requerimientos.temperatura_optima}°C</td>
                  <td>{crop.requerimientos.precipitacion_min} - {crop.requerimientos.precipitacion_max}</td>
                  <td>{crop.requerimientos.altitud_min} - {crop.requerimientos.altitud_max}</td>
                  <td>
                    <button
                      className={`toggle-btn ${crop.activo ? 'active' : 'inactive'}`}
                      onClick={() => handleToggleActive(crop._id, crop.activo)}
                      title={crop.activo ? "Click para desactivar" : "Click para activar"}
                    >
                      {crop.activo ? "✓ Activo" : "✗ Inactivo"}
                    </button>
                  </td>
                  <td className="actions-cell">
                    <button
                      className="btn btn-blue btn-sm"
                      onClick={() => openEdit(crop)}
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      className="btn btn-red btn-sm"
                      onClick={() => handleDelete(crop._id)}
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal para crear/editar */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content-admin modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-admin">
              <h3>{editingCrop ? "Editar Cultivo" : "Nuevo Cultivo"}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="admin-form">
              <div className="form-section">
                <h4>Información General</h4>

                <div className="form-row">
                  <div className="form-group">
                    <label>Nombre *</label>
                    <input
                      type="text"
                      value={form.nombre}
                      onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                      placeholder="Ej: Café"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Nombre Científico</label>
                    <input
                      type="text"
                      value={form.nombre_cientifico}
                      onChange={(e) => setForm({ ...form, nombre_cientifico: e.target.value })}
                      placeholder="Ej: Coffea arabica"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Descripción</label>
                  <textarea
                    value={form.descripcion}
                    onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                    placeholder="Descripción del cultivo"
                    rows="3"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Color (Hex)</label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="color"
                        value={form.color}
                        onChange={(e) => setForm({ ...form, color: e.target.value })}
                        style={{ width: '60px', height: '38px', cursor: 'pointer' }}
                      />
                      <input
                        type="text"
                        value={form.color}
                        onChange={(e) => setForm({ ...form, color: e.target.value })}
                        placeholder="#8B4513"
                        style={{ flex: 1 }}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Ícono (Emoji)</label>
                    <input
                      type="text"
                      value={form.icono}
                      onChange={(e) => setForm({ ...form, icono: e.target.value })}
                      placeholder="🌱"
                      maxLength="2"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Ciclo de Siembra</label>
                    <input
                      type="text"
                      value={form.ciclo_siembra}
                      onChange={(e) => setForm({ ...form, ciclo_siembra: e.target.value })}
                      placeholder="Ej: Mar-Abr, Sep-Oct"
                    />
                  </div>

                  <div className="form-group">
                    <label>Ciclo de Cosecha</label>
                    <input
                      type="text"
                      value={form.ciclo_cosecha}
                      onChange={(e) => setForm({ ...form, ciclo_cosecha: e.target.value })}
                      placeholder="Ej: Oct-Ene, Abr-Jun"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>URL de Imagen</label>
                  <input
                    type="text"
                    value={form.imagen_url}
                    onChange={(e) => setForm({ ...form, imagen_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="form-section">
                <h4>Requerimientos Climáticos</h4>

                <div className="form-row">
                  <div className="form-group">
                    <label>Temperatura Mínima (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={form.requerimientos.temperatura_min}
                      onChange={(e) => updateRequerimiento('temperatura_min', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Temperatura Óptima (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={form.requerimientos.temperatura_optima}
                      onChange={(e) => updateRequerimiento('temperatura_optima', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Temperatura Máxima (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={form.requerimientos.temperatura_max}
                      onChange={(e) => updateRequerimiento('temperatura_max', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Precipitación Mínima (mm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={form.requerimientos.precipitacion_min}
                      onChange={(e) => updateRequerimiento('precipitacion_min', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Precipitación Máxima (mm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={form.requerimientos.precipitacion_max}
                      onChange={(e) => updateRequerimiento('precipitacion_max', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Altitud Mínima (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={form.requerimientos.altitud_min}
                      onChange={(e) => updateRequerimiento('altitud_min', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Altitud Máxima (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={form.requerimientos.altitud_max}
                      onChange={(e) => updateRequerimiento('altitud_max', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Humedad Mínima (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={form.requerimientos.humedad_min}
                      onChange={(e) => updateRequerimiento('humedad_min', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Humedad Máxima (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={form.requerimientos.humedad_max}
                      onChange={(e) => updateRequerimiento('humedad_max', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.activo}
                    onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                  />
                  <span>Cultivo activo (visible en el dashboard)</span>
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-blue">
                  {editingCrop ? "Actualizar" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

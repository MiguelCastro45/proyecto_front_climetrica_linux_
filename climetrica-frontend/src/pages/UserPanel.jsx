import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import "../styles/UserPanel.css";
import UserMapDashboard from "./UserMapDashboard";

export default function UserPanel() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showEdit, setShowEdit] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    role: "productor",
    password: "",
  });

  // Función para mostrar notificaciones
  const showNotification = (type, title, message) => {
    setNotification({ type, title, message });
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return navigate("/");

        const res = await API.get("/profile/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(res.data.user);

        if (res.data.user.role === "admin") {
          const usersRes = await API.get("/users/", {
            headers: { Authorization: `Bearer ${token}` },
          });
          setUsers(usersRes.data.users || usersRes.data);
        }
      } catch (err) {
        console.error(err);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const openEdit = (u) => {
    setEditingUser(u);
    setForm({
      first_name: u.first_name || "",
      last_name: u.last_name || "",
      email: u.email || "",
      phone: u.phone || "",
      role: u.role || "productor",
      password: "",
    });
    setShowEdit(true);
    setNotification(null);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const token = localStorage.getItem("token");
      const payload = { ...form };
      if (!form.password) delete payload.password;

      const res = await API.put(`/users/${editingUser._id}/`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers((prev) =>
        prev.map((u) => (u._id === editingUser._id ? res.data.user : u))
      );
      setShowEdit(false);
      setEditingUser(null);
      showNotification(
        "success",
        "¡Actualizado con éxito!",
        `Los datos de ${form.first_name} ${form.last_name} han sido actualizados correctamente.`
      );
    } catch (err) {
      console.error(err);
      showNotification(
        "error",
        "Error al actualizar",
        "No se pudo actualizar el usuario. Intenta nuevamente."
      );
    }
  };

  const handleDelete = async (_id) => {
    const userToDelete = users.find((u) => u._id === _id);
    if (!window.confirm(`¿Seguro que deseas eliminar a ${userToDelete.first_name} ${userToDelete.last_name}?`)) return;
    
    try {
      const token = localStorage.getItem("token");
      await API.delete(`/users/delete/${_id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers((prev) => prev.filter((u) => u._id !== _id));
      showNotification(
        "success",
        "¡Usuario eliminado!",
        `${userToDelete.first_name} ${userToDelete.last_name} ha sido eliminado correctamente.`
      );
    } catch (err) {
      console.error(err);
      showNotification(
        "error",
        "Error al eliminar",
        "No se pudo eliminar el usuario. Intenta nuevamente."
      );
    }
  };

  if (loading) return <div className="loading">Cargando...</div>;

  return (
    <div className="container">
      {/* Notificaciones flotantes */}
      {notification && (
        <div className={`notification notification-${notification.type}`}>
          <div className="notification-icon">
            {notification.type === "success" ? "✅" : "❌"}
          </div>
          <div className="notification-content">
            <div className="notification-title">{notification.title}</div>
            <div className="notification-message">{notification.message}</div>
          </div>
        </div>
      )}

      {/* 🟡 Layout en dos columnas */}
      <div className="dashboard-layout">
        {/* 🔵 Lado izquierdo: perfil y acciones */}
        <div className="left-panel">
          {user && (
            <div className="welcome-card">
              <h2>Bienvenido <br />{user.first_name} {user.last_name}</h2>
              <p>Rol: {user.role}</p>
              <button className="btn btn-red" onClick={handleLogout}>
                Cerrar sesión
              </button>
            </div>
          )}

          {user?.role !== "admin" && (
            <div className="welcome-card">
              <button className="btn btn-blue" onClick={() => navigate("/climate")}>
                Ver datos climáticos
              </button>
              <button className="btn btn-green" onClick={() => navigate("/upload")}>
                Subir dataset
              </button>
            </div>
          )}
        </div>

        {/* 🌍 Lado derecho: mapa o administración */}
        <div className="right-panel">
          {user?.role !== "admin" ? (
            <UserMapDashboard />
          ) : (
            <div className="admin-panel-content">
              <h3>Administración de usuarios</h3>
              <div className="table-container">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Email</th>
                      <th>Rol</th>
                      <th>Teléfono</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 && (
                      <tr>
                        <td colSpan="5" className="center">
                          No hay usuarios
                        </td>
                      </tr>
                    )}
                    {users.map((u) => (
                      <tr key={u._id}>
                        <td>
                          {u.first_name} {u.last_name}
                        </td>
                        <td>{u.email}</td>
                        <td>{u.role}</td>
                        <td>{u.phone}</td>
                        <td>
                          <button
                            className="btn btn-yellow"
                            onClick={() => openEdit(u)}
                          >
                            ✏️ Editar
                          </button>
                          <button
                            className="btn btn-red"
                            onClick={() => handleDelete(u._id)}
                          >
                            🗑️ Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ✏️ Modal para editar usuario */}
      {showEdit && editingUser && (
        <div className="modal">
          <div className="modal-content">
            <h4>✏️ Editar usuario: {editingUser.email}</h4>
            <form onSubmit={handleUpdate} className="edit-form">
              <div className="form-row">
                <input
                  name="first_name"
                  value={form.first_name}
                  onChange={handleChange}
                  placeholder="Nombre"
                  required
                />
                <input
                  name="last_name"
                  value={form.last_name}
                  onChange={handleChange}
                  placeholder="Apellido"
                  required
                />
              </div>
              <input
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Email"
                type="email"
                required
              />
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="Teléfono"
              />
              <select name="role" value={form.role} onChange={handleChange}>
                <option value="productor">Productor</option>
                <option value="vendedor">Vendedor</option>
                <option value="inversionista">Inversionista</option>
                <option value="admin">Administrador</option>
              </select>
              <input
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Nueva contraseña (dejar vacío para no cambiar)"
                type="password"
              />
              <div className="modal-actions">
                <button type="submit" className="btn btn-blue">
                  💾 Actualizar
                </button>
                <button
                  type="button"
                  className="btn btn-gray"
                  onClick={() => setShowEdit(false)}
                >
                  ✖ Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
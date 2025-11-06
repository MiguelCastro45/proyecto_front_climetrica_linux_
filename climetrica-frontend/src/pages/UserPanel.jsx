import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import "../styles/UserPanel.css";
import UserMapDashboard from "./UserMapDashboard";


export default function UserPanel() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [msg, setMsg] = useState("");
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
    setMsg("");
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
      setMsg("Usuario actualizado ✅");
    } catch (err) {
      console.error(err);
      setMsg("Error al actualizar usuario");
    }
  };

const handleDelete = async (_id) => {
  if (!window.confirm("¿Seguro que deseas eliminar este usuario?")) return;
  try {
    const token = localStorage.getItem("token");
    await API.delete(`/users/delete/${_id}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setUsers((prev) => prev.filter((u) => u._id !== _id));
    setMsg("✅ Usuario eliminado correctamente");
  } catch (err) {
    console.error(err);
    setMsg("❌ Error al eliminar usuario");
  }
};


  if (loading) return <div className="loading">Cargando...</div>;

  return (
    <div className="container">
      {/* 🟢 Tarjeta de perfil */}
      {user && (
        <center>
          <div className="card profile-card">
            <h2>
              Bienvenido <br />
              {user.first_name} {user.last_name}
            </h2>
            <p>Rol: {user.role}</p>
            <button className="btn btn-red" onClick={handleLogout}>
              Cerrar sesión
            </button>
          </div>
        </center>
      )}

      {/* 🔵 Acciones para roles no admin */}
      {user?.role !== "admin" && (
        <div className="card actions-card">
          <button className="btn btn-blue" onClick={() => navigate("/climate")}>
            Ver datos climáticos
          </button>
          <button className="btn btn-green" onClick={() => navigate("/upload")}>
            Subir dataset
          </button>
        </div>
      )}

      {/* 🌍 Mapa sin estilos adicionales */}
      {user?.role !== "admin" && (
        <div className="map-wrapper">
          <UserMapDashboard />
        </div>
      )}

      {/* 🟠 Panel de administración */}
      {user?.role === "admin" && (
        <div className="card admin-card">
          <h3>Administración de usuarios</h3>
          {msg && <p className="msg">{msg}</p>}
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
                        Editar
                      </button>
                      <button
                        className="btn btn-red"
                        onClick={() => handleDelete(u._id)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ✏️ Modal para editar usuario */}
      {showEdit && editingUser && (
        <div className="modal">
          <div className="modal-content">
            <h4>Editar usuario: {editingUser.email}</h4>
            <form onSubmit={handleUpdate} className="edit-form">
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
                placeholder="Contraseña (dejar vacío para no cambiar)"
                type="password"
              />
              <div className="modal-actions">
                <button type="submit" className="btn btn-blue">
                  Actualizar
                </button>
                <button
                  type="button"
                  className="btn btn-gray"
                  onClick={() => setShowEdit(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

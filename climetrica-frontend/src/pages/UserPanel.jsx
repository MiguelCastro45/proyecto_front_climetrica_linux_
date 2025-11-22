import React, { useEffect, useState, useRef } from "react";
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
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [showAccountConfig, setShowAccountConfig] = useState(false);
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    role: "productor",
    password: "",
  });
  const [accountForm, setAccountForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    new_password: "",
    confirm_password: "",
  });

  // Referencia para opciones del mapa
  const mapRef = useRef(null);

  //hora

  const [currentTime, setCurrentTime] = useState(new Date());

useEffect(() => {
  const interval = setInterval(() => {
    setCurrentTime(new Date());
  }, 1000);

  return () => clearInterval(interval);
}, []);


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

  const handleAccountChange = (e) => {
    const { name, value } = e.target;
    setAccountForm((f) => ({ ...f, [name]: value }));
  };

  const openAccountConfig = () => {
    setAccountForm({
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      new_password: "",
      confirm_password: "",
    });
    setIsEditingAccount(false);
    setShowAccountConfig(true);
    setNotification(null);
  };

  const handleAccountUpdate = async (e) => {
    e.preventDefault();

    // Validación de contraseñas
    if (accountForm.new_password && accountForm.new_password !== accountForm.confirm_password) {
      showNotification(
        "error",
        "Error en contraseña",
        "Las contraseñas nuevas no coinciden."
      );
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const payload = {
        first_name: accountForm.first_name,
        last_name: accountForm.last_name,
        email: accountForm.email,
        phone: accountForm.phone,
      };

      // Solo incluir contraseña si se proporcionó una nueva
      if (accountForm.new_password) {
        payload.password = accountForm.new_password;
      }

      const res = await API.put(`/profile/update/`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUser(res.data.user);
      setIsEditingAccount(false);
      showNotification(
        "success",
        "¡Cuenta actualizada!",
        "Tus datos han sido actualizados correctamente."
      );
    } catch (err) {
      console.error(err);
      showNotification(
        "error",
        "Error al actualizar",
        err.response?.data?.error || "No se pudo actualizar tu cuenta. Intenta nuevamente."
      );
    }
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

  // Función para obtener el nombre completo del usuario
  const getUserFullName = () => {
    if (!user) return '';
    return `${user.first_name} ${user.last_name}`;
  };

  // Función para obtener el rol formateado
  const getUserRole = () => {
    if (!user) return '';
    const roles = {
      'admin': 'Administrador',
      'productor': 'Productor',
      'vendedor': 'Vendedor',
      'inversionista': 'Inversionista'
    };
    return roles[user.role] || user.role;
  };

  // Función para obtener las iniciales del usuario
  const getUserInitials = () => {
    if (!user) return '';
    const firstInitial = user.first_name?.charAt(0).toUpperCase() || '';
    const lastInitial = user.last_name?.charAt(0).toUpperCase() || '';
    return `${firstInitial}${lastInitial}`;
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
          <div className="logo-container">
            <img
              src="/logo/1_img.jpg"
              alt="Logo de Climétrica"
              className="logo-img"
            />
          </div>

          {user?.role !== "admin" && (
            <>
              <div className="welcome-card">
                <h3 className="section-title">Funciones</h3>
                <button className="btn btn-blue btn-with-icon" onClick={() => navigate("/climate")}>
                  <img src="/iconos/eye.png" alt="Ver datos" className="btn-icon" />
                  Ver datos climáticos
                </button>
                <button className="btn btn-blue btn-with-icon" onClick={() => navigate("/upload")}>
                  <img src="/iconos/tree-sapling.png" alt="Cultivos" className="btn-icon" />
                  Cultivos (aun sin implementar)
                </button>
                <button className="btn btn-green btn-with-icon" onClick={() => navigate("/upload")}>
                  <img src="/iconos/interrogation.png" alt="Información" className="btn-icon" />
                  Informacion General (aun sin implementar)
                </button>
              </div>

              <div className="welcome-card">
                <h3 className="section-title">Opciones del Mapa</h3>
                <button
                  className="btn btn-green btn-with-icon"
                  onClick={() => mapRef.current?.saveToMyRecords?.()}
                  title="Guardar en base de datos sin descargar"
                >
                  <img src="/iconos/disk.png" alt="Guardar" className="btn-icon" />
                  Guardar en mis registros
                </button>
                <button
                  className="btn btn-blue btn-with-icon"
                  onClick={() => mapRef.current?.downloadJSON?.()}
                  title="Descargar datos en formato JSON"
                >
                  <img src="/iconos/download.png" alt="Descargar JSON" className="btn-icon" />
                  Descargar JSON
                </button>
                <button
                  className="btn btn-red btn-with-icon"
                  onClick={() => mapRef.current?.downloadPDF?.()}
                  title="Descargar reporte en PDF"
                >
                  <img src="/iconos/file-pdf.png" alt="Descargar PDF" className="btn-icon" />
                  Descargar PDF
                </button>
              </div>
            </>
          )}

          {user && (
            <div className="welcome-card user-card-compact">
              <h3 className="section-title account-options-title">
                Opciones de cuenta
              </h3>

              <button className="btn btn-blue btn-with-icon" onClick={openAccountConfig}>
                <img src="/iconos/settings.png" alt="Configurar" className="btn-icon" />
                Configurar Cuenta
              </button>
              <button className="btn btn-red btn-with-icon" onClick={handleLogout}>
                <img src="/iconos/user-logout.png" alt="Cerrar sesión" className="btn-icon" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>

        {/* 🌍 Lado derecho: mapa o administración */}
        <div className="right-panel">
          {user?.role !== "admin" ? (
            <UserMapDashboard currentUser={user} ref={mapRef} />
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
                            className="btn btn-blue btn-with-icon"
                            onClick={() => openEdit(u)}
                          >
                            <img src="/iconos/edit.png" alt="Editar" className="btn-icon" />
                            Editar
                          </button>
                          <button
                            className="btn btn-red btn-with-icon"
                            onClick={() => handleDelete(u._id)}
                          >
                            <img src="/iconos/trash.png" alt="Eliminar" className="btn-icon" />
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

      {/* Configuración de cuenta del usuario */}
      {showAccountConfig && user && (
        <div className="modal">
          <div className="modal-content account-config-modal">
            <h4>Configuración de Cuenta</h4>

            {!isEditingAccount ? (
              <>
                <div className="account-info-table">
                  <table className="info-table">
                    <tbody>
                      <tr>
                        <td className="info-label">Nombre:</td>
                        <td className="info-value">{user.first_name}</td>
                      </tr>
                      <tr>
                        <td className="info-label">Apellido:</td>
                        <td className="info-value">{user.last_name}</td>
                      </tr>
                      <tr>
                        <td className="info-label">Correo electrónico:</td>
                        <td className="info-value">{user.email}</td>
                      </tr>
                      <tr>
                        <td className="info-label">Teléfono:</td>
                        <td className="info-value">{user.phone || "No registrado"}</td>
                      </tr>
                      <tr>
                        <td className="info-label">Identificación:</td>
                        <td className="info-value">{user.identification || "No registrada"}</td>
                      </tr>
                      <tr>
                        <td className="info-label">Rol:</td>
                        <td className="info-value">{getUserRole()}</td>
                      </tr>
                      <tr>
                        <td className="info-label">Contraseña:</td>
                        <td className="info-value">••••••••</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-blue btn-with-icon"
                    onClick={() => setIsEditingAccount(true)}
                  >
                    <img src="/iconos/edit.png" alt="Editar" className="btn-icon" />
                    Modificar datos
                  </button>
                  <button
                    type="button"
                    className="btn btn-gray"
                    onClick={() => setShowAccountConfig(false)}
                  >
                    Cerrar
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleAccountUpdate} className="edit-form">
                <div className="form-row">
                  <input
                    name="first_name"
                    value={accountForm.first_name}
                    onChange={handleAccountChange}
                    placeholder="Nombre"
                    required
                  />
                  <input
                    name="last_name"
                    value={accountForm.last_name}
                    onChange={handleAccountChange}
                    placeholder="Apellido"
                    required
                  />
                </div>

                <input
                  name="email"
                  value={accountForm.email}
                  onChange={handleAccountChange}
                  placeholder="Email"
                  type="email"
                  required
                />

                <input
                  name="phone"
                  value={accountForm.phone}
                  onChange={handleAccountChange}
                  placeholder="Teléfono"
                  type="tel"
                  maxLength="10"
                  onInput={(e) => {
                    e.target.value = e.target.value.replace(/[^0-9]/g, '');
                  }}
                />

                <div className="password-section">
                  <h5>Cambiar contraseña (opcional)</h5>
                  <input
                    name="new_password"
                    value={accountForm.new_password}
                    onChange={handleAccountChange}
                    placeholder="Nueva contraseña"
                    type="password"
                  />
                  <input
                    name="confirm_password"
                    value={accountForm.confirm_password}
                    onChange={handleAccountChange}
                    placeholder="Confirmar nueva contraseña"
                    type="password"
                  />
                </div>

                <div className="modal-actions">
                  <button type="submit" className="btn btn-blue">
                    Guardar cambios
                  </button>
                  <button
                    type="button"
                    className="btn btn-gray"
                    onClick={() => setIsEditingAccount(false)}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
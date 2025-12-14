import React, { useState, useEffect } from "react";
import API from "../api/api";
import "../styles/AdminTabsEncapsulated.css?v=11";

export default function AdminUsers({ showNotification }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    role: "productor",
    password: ""
  });
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    label: "",
    color: "",
    className: "",
    feedback: []
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await API.get("/users/", {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUsers(res.data.users || res.data);
    } catch (err) {
      showNotification("error", "Error", "No se pudieron cargar los usuarios");
    } finally {
      setLoading(false);
    }
  };

  // Función para calcular la similitud entre dos strings (algoritmo de Levenshtein simplificado)
  const calculateSimilarity = (str1, str2) => {
    if (!str1 || !str2) return 0;

    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = (s1, s2) => {
      s1 = s1.toLowerCase();
      s2 = s2.toLowerCase();
      const costs = [];
      for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
          if (i === 0) {
            costs[j] = j;
          } else if (j > 0) {
            let newValue = costs[j - 1];
            if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
              newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
            }
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
        if (i > 0) costs[s2.length] = lastValue;
      }
      return costs[s2.length];
    };

    return (longer.length - editDistance(longer, shorter)) / longer.length;
  };

  // Función helper para obtener la clase CSS según el score
  const getStrengthClass = (score) => {
    if (score <= 1) return 'very-weak';
    if (score === 2) return 'weak';
    if (score === 3) return 'medium';
    if (score === 4) return 'strong';
    return 'very-strong';
  };

  // Función para evaluar la fortaleza de la contraseña
  const evaluatePasswordStrength = (password, currentPassword = "") => {
    if (!password) {
      return {
        score: 0,
        label: "",
        color: "",
        className: "",
        feedback: []
      };
    }

    let score = 0;
    const feedback = [];

    // Longitud mínima
    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push("Debe tener al menos 8 caracteres");
    }

    // Contiene mayúsculas
    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push("Debe contener al menos una letra mayúscula");
    }

    // Contiene minúsculas
    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push("Debe contener al menos una letra minúscula");
    }

    // Contiene números
    if (/[0-9]/.test(password)) {
      score += 1;
    } else {
      feedback.push("Debe contener al menos un número");
    }

    // Contiene caracteres especiales
    if (/[^A-Za-z0-9]/.test(password)) {
      score += 1;
    } else {
      feedback.push("Debe contener al menos un carácter especial (!@#$%^&*)");
    }

    // Longitud adicional (bonus)
    if (password.length >= 12) {
      score += 1;
    }

    // Verificar similitud con contraseña actual
    if (currentPassword && password) {
      const similarity = calculateSimilarity(password, currentPassword);
      if (similarity > 0.7) {
        score = Math.max(0, score - 2);
        feedback.push("⚠️ La nueva contraseña es muy similar a la anterior");
      }
    }

    // Verificar patrones comunes débiles
    const weakPatterns = [
      /^123456/,
      /^password/i,
      /^qwerty/i,
      /^abc123/i,
      /^111111/,
      /^letmein/i,
      /(012345|123456|234567|345678|456789)/
    ];

    for (const pattern of weakPatterns) {
      if (pattern.test(password)) {
        score = Math.max(0, score - 2);
        feedback.push("⚠️ Evita patrones comunes como '123456', 'password', etc.");
        break;
      }
    }

    // Normalizar score
    const finalScore = Math.min(5, Math.max(0, score));

    // Determinar etiqueta, color y clase
    let label, color;
    if (finalScore <= 1) {
      label = "Muy débil";
      color = "#ef4444"; // rojo
    } else if (finalScore === 2) {
      label = "Débil";
      color = "#f97316"; // naranja
    } else if (finalScore === 3) {
      label = "Media";
      color = "#eab308"; // amarillo
    } else if (finalScore === 4) {
      label = "Fuerte";
      color = "#84cc16"; // lima
    } else {
      label = "Muy fuerte";
      color = "#22c55e"; // verde
    }

    return {
      score: finalScore,
      label,
      color,
      className: getStrengthClass(finalScore),
      feedback
    };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));

    // Si está cambiando la contraseña, evaluar fortaleza
    if (name === "password") {
      const strength = evaluatePasswordStrength(value);
      setPasswordStrength(strength);
    }
  };

  const openCreate = () => {
    setEditingUser(null);
    setForm({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      role: "productor",
      password: ""
    });
    setPasswordStrength({
      score: 0,
      label: "",
      color: "",
      className: "",
      feedback: []
    });
    setShowModal(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      email: user.email || "",
      phone: user.phone || "",
      role: user.role || "productor",
      password: ""
    });
    setPasswordStrength({
      score: 0,
      label: "",
      color: "",
      className: "",
      feedback: []
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Si es creación, validar que la contraseña sea obligatoria y fuerte
    if (!editingUser) {
      if (!form.password) {
        showNotification(
          "error",
          "Contraseña requerida",
          "Debes proporcionar una contraseña para crear el usuario."
        );
        return;
      }
      if (passwordStrength.score < 3) {
        showNotification(
          "error",
          "Contraseña débil",
          "La contraseña debe ser al menos de nivel 'Media'. Por favor, sigue las recomendaciones."
        );
        return;
      }
    }

    // Si es edición, validar fortaleza de contraseña solo si se está cambiando
    if (editingUser && form.password && passwordStrength.score < 3) {
      showNotification(
        "error",
        "Contraseña débil",
        "La contraseña debe ser al menos de nivel 'Media'. Por favor, sigue las recomendaciones."
      );
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const payload = { ...form };
      if (!form.password && editingUser) delete payload.password;

      let res;
      if (editingUser) {
        // Actualizar usuario existente
        res = await API.put(`/users/${editingUser._id}/`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUsers((prev) =>
          prev.map((u) => (u._id === editingUser._id ? res.data.user : u))
        );
        showNotification(
          "success",
          "¡Actualizado con éxito!",
          `Los datos de ${form.first_name} ${form.last_name} han sido actualizados correctamente.`
        );
      } else {
        // Crear nuevo usuario
        res = await API.post("/register/", payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUsers((prev) => [...prev, res.data.user]);
        showNotification(
          "success",
          "¡Usuario creado!",
          `El usuario ${form.first_name} ${form.last_name} ha sido creado exitosamente.`
        );
      }

      setShowModal(false);
      setEditingUser(null);
    } catch (err) {
      const errorMessage = err.response?.data?.error || (editingUser ? "Error al actualizar el usuario" : "Error al crear el usuario");
      showNotification(
        "error",
        editingUser ? "Error al actualizar" : "Error al crear",
        errorMessage
      );
    }
  };

  const handleDelete = async (_id) => {
    const userToDelete = users.find((u) => u._id === _id);
    if (!window.confirm(`¿Seguro que deseas eliminar a ${userToDelete.first_name} ${userToDelete.last_name}?`)) return;

    try {
      const token = localStorage.getItem("token");
      await API.delete(`/users/delete/${_id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers((prev) => prev.filter((u) => u._id !== _id));
      showNotification(
        "success",
        "¡Usuario eliminado!",
        `${userToDelete.first_name} ${userToDelete.last_name} ha sido eliminado correctamente.`
      );
    } catch (err) {
      showNotification(
        "error",
        "Error al eliminar",
        "No se pudo eliminar el usuario. Intenta nuevamente."
      );
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      u.first_name?.toLowerCase().includes(search) ||
      u.last_name?.toLowerCase().includes(search) ||
      u.email?.toLowerCase().includes(search) ||
      u.phone?.toLowerCase().includes(search) ||
      u.role?.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return <div className="admin-loading">Cargando usuarios...</div>;
  }

  return (
    <div className="admin-tab-content">
      <div className="admin-header">
        <h3>Administración de Usuarios</h3>
        <div className="admin-header-actions">
          <div className="admin-search-container">
            <input
              type="text"
              placeholder="🔍 Buscar usuario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="admin-search-input"
            />
          </div>
          <button className="btn btn-blue btn-with-icon" onClick={openCreate}>
            <span className="btn-icon-emoji">➕</span>
            Agregar Usuario
          </button>
        </div>
      </div>

      <div className="admin-table-container">
        <table className="admin-table">
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
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="5" className="center">
                  {searchTerm ? "No se encontraron usuarios que coincidan con tu búsqueda" : "No hay usuarios registrados"}
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user._id}>
                  <td>{user.first_name} {user.last_name}</td>
                  <td>{user.email}</td>
                  <td><span className="category-badge">{user.role === "admin" ? "Administrador" : user.role}</span></td>
                  <td>{user.phone || "-"}</td>
                  <td className="actions-cell">
                    <button
                      className="btn btn-blue btn-sm"
                      onClick={() => openEdit(user)}
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      className="btn btn-red btn-sm"
                      onClick={() => handleDelete(user._id)}
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

      {/* Modal para crear/editar usuario */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content-admin" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-admin">
              <h3>{editingUser ? "Editar Usuario" : "Nuevo Usuario"}</h3>
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
                      name="first_name"
                      value={form.first_name}
                      onChange={handleChange}
                      placeholder="Nombre"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Apellido *</label>
                    <input
                      type="text"
                      name="last_name"
                      value={form.last_name}
                      onChange={handleChange}
                      placeholder="Apellido"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="correo@ejemplo.com"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Teléfono</label>
                  <input
                    type="text"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="Teléfono"
                  />
                </div>

                <div className="form-group">
                  <label>Rol *</label>
                  <select name="role" value={form.role} onChange={handleChange}>
                    <option value="productor">Productor</option>
                    <option value="vendedor">Vendedor</option>
                    <option value="inversionista">Inversionista</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>

              <div className="form-section">
                <h4>Seguridad</h4>

                <div className="form-group">
                  <label>Contraseña {!editingUser && "*"}</label>
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder={editingUser ? "Dejar vacío para no cambiar" : "Contraseña"}
                    required={!editingUser}
                  />

                  {form.password && (
                    <div className="password-strength-indicator">
                      <div className="strength-bar-container">
                        <div
                          className={`strength-bar ${passwordStrength.className}`}
                          style={{
                            width: `${(passwordStrength.score / 5) * 100}%`,
                            backgroundColor: passwordStrength.color
                          }}
                        />
                      </div>
                      <div className={`strength-label ${passwordStrength.className}`}>
                        {passwordStrength.label}
                      </div>
                    </div>
                  )}

                  {form.password && passwordStrength.feedback.length > 0 && (
                    <div className="password-feedback">
                      <div className="feedback-title">Requisitos pendientes:</div>
                      <ul className="feedback-list">
                        {passwordStrength.feedback.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {form.password && passwordStrength.feedback.length === 0 && (
                    <div className="password-feedback success">
                      ✓ Contraseña cumple con todos los requisitos
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn btn-blue">
                  {editingUser ? "💾 Actualizar" : "➕ Crear Usuario"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
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

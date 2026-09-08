/**
 * UserPanel.jsx — Contenedor principal tras el login (ruta "/user").
 *
 * Al montar hace GET /profile/ (requiere JWT en localStorage; si no hay,
 * redirige a "/") y, según `user.role`, renderiza:
 *   - role != "admin"  ->  <UserMapDashboard>  (mapa climático)
 *   - role == "admin"  ->  pestañas <AdminUsers> / <AdminVariables> / <AdminCrops>
 *
 * También gestiona el panel lateral de "Mi cuenta": edición de perfil y
 * cambio de contraseña (PUT /profile/update/) con medidor de fuerza.
 */
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import { handleAPIErrorWithAuth, handleAPIError } from "../utils/errorHandler";
import "../styles/UserPanel.css";
import UserMapDashboard from "./UserMapDashboard";
import AdminUsers from "../components/AdminUsers";
import AdminVariables from "../components/AdminVariables";
import AdminCrops from "../components/AdminCrops";

export default function UserPanel() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [adminTab, setAdminTab] = useState("usuarios"); // usuarios, variables, cultivos
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showUserInfo, setShowUserInfo] = useState(false);
  const [showAccountConfig, setShowAccountConfig] = useState(false);
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [accountForm, setAccountForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    label: "",
    color: "",
    feedback: []
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
      } catch (err) {
        const errorMessage = handleAPIErrorWithAuth(err, navigate, "cargar perfil de usuario");
        showNotification("error", "Error de autenticación", errorMessage);
        setLoading(false);
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

  const handleAccountChange = (e) => {
    const { name, value } = e.target;
    setAccountForm((f) => ({ ...f, [name]: value }));

    // Si está cambiando la contraseña nueva, evaluar fortaleza
    if (name === "new_password") {
      const strength = evaluatePasswordStrength(value, accountForm.current_password);
      setPasswordStrength(strength);
    }
  };

  const openAccountConfig = () => {
    setAccountForm({
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      current_password: "",
      new_password: "",
      confirm_password: "",
    });
    setPasswordStrength({
      score: 0,
      label: "",
      color: "",
      feedback: []
    });
    setIsEditingAccount(false);
    setShowAccountConfig(true);
    setNotification(null);
  };

  const handleAccountUpdate = async (e) => {
    e.preventDefault();

    // VALIDACIÓN 1: Si se quiere cambiar la contraseña, se debe proporcionar la contraseña actual
    if (accountForm.new_password && !accountForm.current_password) {
      showNotification(
        "error",
        "Contraseña actual requerida",
        "Debes ingresar tu contraseña actual para poder cambiarla."
      );
      return;
    }

    // VALIDACIÓN 2: Las contraseñas nuevas deben coincidir
    if (accountForm.new_password && accountForm.new_password !== accountForm.confirm_password) {
      showNotification(
        "error",
        "Error en contraseña",
        "Las contraseñas nuevas no coinciden."
      );
      return;
    }

    // VALIDACIÓN 3: Validar fortaleza de contraseña (mínimo Media = score 3)
    if (accountForm.new_password && passwordStrength.score < 3) {
      showNotification(
        "error",
        "Contraseña débil",
        "La contraseña debe ser al menos de nivel 'Media'. Debe tener al menos 8 caracteres, mayúsculas, minúsculas, números y caracteres especiales."
      );
      return;
    }

    // VALIDACIÓN 4: La nueva contraseña no puede ser igual a la actual
    if (accountForm.new_password && accountForm.current_password === accountForm.new_password) {
      showNotification(
        "error",
        "Contraseña idéntica",
        "La nueva contraseña no puede ser igual a la actual. Por favor, elige una contraseña diferente."
      );
      return;
    }

    // VALIDACIÓN 5: Validar similitud con contraseña anterior
    if (accountForm.current_password && accountForm.new_password) {
      const similarity = calculateSimilarity(accountForm.new_password, accountForm.current_password);
      if (similarity > 0.7) {
        showNotification(
          "error",
          "Contraseña similar",
          "La nueva contraseña es muy similar a la anterior. Por favor, elige una contraseña más diferente."
        );
        return;
      }
    }

    try {
      const token = localStorage.getItem("token");
      const payload = {
        first_name: accountForm.first_name,
        last_name: accountForm.last_name,
        email: accountForm.email,
        phone: accountForm.phone,
      };

      // Si se quiere cambiar la contraseña, incluir ambas contraseñas
      if (accountForm.new_password) {
        payload.current_password = accountForm.current_password;
        payload.new_password = accountForm.new_password;
      }

      const res = await API.put(`/profile/update/`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUser(res.data.user);
      setIsEditingAccount(false);

      // Limpiar los campos de contraseña
      setAccountForm(prev => ({
        ...prev,
        current_password: "",
        new_password: "",
        confirm_password: ""
      }));

      showNotification(
        "success",
        "¡Cuenta actualizada!",
        "Tus datos han sido actualizados correctamente."
      );
    } catch (err) {
      const errorMessage = handleAPIError(err, "actualizar tu cuenta");
      showNotification(
        "error",
        "Error al actualizar",
        errorMessage
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
                  Ver datos climáticos y cultivos
                </button>
                <button
                  className="btn btn-blue btn-with-icon"
                  onClick={() => mapRef.current?.saveToMyRecords?.()}
                  title="Guardar en base de datos sin descargar"
                >
                  <img src="/iconos/disk.png" alt="Guardar" className="btn-icon" />
                  Guardar en mis registros
                </button>
              </div>

              <div className="welcome-card">
                <h3 className="section-title">Opciones de mapa</h3>
                <button
                  className="btn btn-blue btn-with-icon"
                  onClick={() => mapRef.current?.toggleDrawMode?.()}
                  title="Dibujar área en el mapa"
                >
                  <img src="/iconos/edit.png" alt="Dibujar" className="btn-icon" />
                  Dibujar Área
                </button>
                <button
                  className="btn btn-red btn-with-icon"
                  onClick={() => mapRef.current?.clearAll?.()}
                  title="Limpiar todo del mapa"
                >
                  <img src="/iconos/trash.png" alt="Limpiar" className="btn-icon" />
                  Limpiar Mapa
                </button>
              </div>
            </>
          )}

          {user && (
            <div className="welcome-card user-card-compact">
              <h3 className="section-title account-options-title">
                Opciones de cuenta
              </h3>

              <div className="user-info-simple">
                <h3 className="user-name">{getUserFullName()}</h3>
                <p className="user-role">{getUserRole()}</p>
              </div>

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
            <UserMapDashboard key={user?.email || 'default'} currentUser={user} ref={mapRef} />
          ) : (
            <div className="admin-panel-content">
              {/* Pestañas de administración */}
              <div className="admin-tabs">
                <button
                  className={`admin-tab ${adminTab === "usuarios" ? "active" : ""}`}
                  onClick={() => setAdminTab("usuarios")}
                >
                  👥 Usuarios
                </button>
                <button
                  className={`admin-tab ${adminTab === "variables" ? "active" : ""}`}
                  onClick={() => setAdminTab("variables")}
                >
                  📊 Variables
                </button>
                <button
                  className={`admin-tab ${adminTab === "cultivos" ? "active" : ""}`}
                  onClick={() => setAdminTab("cultivos")}
                >
                  🌱 Cultivos
                </button>
              </div>

              {/* Contenido según pestaña activa */}
              {adminTab === "usuarios" && (
                <AdminUsers showNotification={showNotification} />
              )}

              {adminTab === "variables" && (
                <AdminVariables showNotification={showNotification} />
              )}

              {adminTab === "cultivos" && (
                <AdminCrops showNotification={showNotification} />
              )}
            </div>
          )}
        </div>
      </div>

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
                  readOnly
                  className="readonly-input"
                  title="El correo electrónico no puede ser modificado. Contacte al administrador si necesita cambiarlo."
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
                    name="current_password"
                    value={accountForm.current_password}
                    onChange={handleAccountChange}
                    placeholder="Contraseña actual (para verificar similitud)"
                    type="password"
                  />

                  <div className="password-input-wrapper">
                    <input
                      name="new_password"
                      value={accountForm.new_password}
                      onChange={handleAccountChange}
                      placeholder="Nueva contraseña"
                      type="password"
                    />

                    {accountForm.new_password && (
                      <div className="password-strength-indicator">
                        <div className="strength-bar-container">
                          <div
                            className={`strength-bar ${passwordStrength.className}`}
                            style={{
                              width: `${(passwordStrength.score / 5) * 100}%`
                            }}
                          />
                        </div>
                        <div className={`strength-label ${passwordStrength.className}`}>
                          {passwordStrength.label}
                        </div>
                      </div>
                    )}

                    {accountForm.new_password && passwordStrength.feedback.length > 0 && (
                      <div className="password-feedback">
                        <div className="feedback-title">Requisitos pendientes:</div>
                        <ul className="feedback-list">
                          {passwordStrength.feedback.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {accountForm.new_password && passwordStrength.feedback.length === 0 && (
                      <div className="password-feedback success">
                        ✓ Contraseña cumple con todos los requisitos
                      </div>
                    )}
                  </div>

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
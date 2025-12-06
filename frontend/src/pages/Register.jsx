import React, { useState } from "react";
import API from "../api/api";
import { useNavigate } from "react-router-dom";
import { handleAPIError } from "../utils/errorHandler";
import "../styles/register.css";

export default function Register() {
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    password: "",
    telefono: "",
    identificacion: "",
    rol: "productor",
  });

  const [errors, setErrors] = useState({
    email: "",
    password: "",
    identification: "",
  });

  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    label: "",
    color: "",
    feedback: []
  });

  const navigate = useNavigate();

  // Función para evaluar la fortaleza de la contraseña
  const evaluatePasswordStrength = (password) => {
    if (!password) {
      return {
        score: 0,
        label: "",
        color: "",
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

    // Determinar etiqueta y color
    let label, color;
    if (score <= 1) {
      label = "Muy débil";
      color = "#ef4444"; // rojo
    } else if (score === 2) {
      label = "Débil";
      color = "#f97316"; // naranja
    } else if (score === 3) {
      label = "Media";
      color = "#eab308"; // amarillo
    } else if (score === 4) {
      label = "Fuerte";
      color = "#84cc16"; // lima
    } else {
      label = "Muy fuerte";
      color = "#22c55e"; // verde
    }

    return {
      score: Math.min(5, Math.max(0, score)),
      label,
      color,
      feedback
    };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // ✅ Permitir solo números en teléfono e identificación
    if ((name === "telefono" || name === "identificacion") && !/^\d*$/.test(value)) {
      return;
    }

    setForm({ ...form, [name]: value });
    setErrors((prev) => ({ ...prev, [name]: "" })); // limpiar errores al escribir

    // Si está cambiando la contraseña, evaluar fortaleza
    if (name === "password") {
      const strength = evaluatePasswordStrength(value);
      setPasswordStrength(strength);
    }
  };

  // ✅ Validar formato de correo electrónico
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // ✅ Validar contraseña segura
  const validatePassword = (password) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._-])[A-Za-z\d@$!%*?&._-]{8,}$/.test(
      password
    );

  const handleSubmit = async (e) => {
    e.preventDefault();
    let valid = true;
    let newErrors = { email: "", password: "", identification: "" };

    // Validar email
    if (!validateEmail(form.email)) {
      newErrors.email = "Por favor ingresa un correo electrónico válido.";
      valid = false;
    }

    // Validar que la identificación no esté vacía
    if (!form.identificacion || form.identificacion.trim() === "") {
      newErrors.identification = "La identificación es obligatoria.";
      valid = false;
    }

    // Validar fortaleza de contraseña (al menos nivel "Media" = score 3)
    if (passwordStrength.score < 3) {
      newErrors.password =
        "La contraseña debe ser al menos de nivel 'Media'. Por favor, sigue las recomendaciones de seguridad.";
      valid = false;
    }

    setErrors(newErrors);
    if (!valid) {
      alert("⚠️ Por favor corrige los errores en el formulario antes de continuar.");
      return;
    }

    try {
      const payload = {
        first_name: form.nombre,
        last_name: form.apellido,
        email: form.email.toLowerCase(), // Convertir a minúsculas
        password: form.password,
        phone: form.telefono,
        identification: form.identificacion,
        role: form.rol,
      };

      await API.post("/register/", payload);
      alert("✓ Usuario registrado con éxito. Ya puedes iniciar sesión.");
      navigate("/");
    } catch (err) {
      // Manejar errores específicos de duplicados del backend
      if (err.response?.status === 400) {
        const errorMsg = err.response?.data?.error || "";

        // Verificar si es error de correo duplicado
        if (errorMsg.includes("correo") || errorMsg.includes("email")) {
          alert(`❌ CORREO DUPLICADO\n\nEl correo "${form.email}" ya está registrado en el sistema.\n\nPor favor:\n• Usa otro correo electrónico\n• O inicia sesión si ya tienes cuenta`);
          setErrors(prev => ({ ...prev, email: "Este correo ya está registrado" }));
          return;
        }

        // Verificar si es error de identificación duplicada
        if (errorMsg.includes("identificación") || errorMsg.includes("identification")) {
          alert(`❌ IDENTIFICACIÓN DUPLICADA\n\nLa identificación "${form.identificacion}" ya está registrada en el sistema.\n\nPor favor:\n• Verifica que el número sea correcto\n• Si ya tienes cuenta, inicia sesión`);
          setErrors(prev => ({ ...prev, identification: "Esta identificación ya está registrada" }));
          return;
        }
      }

      // Para otros errores, usar el manejador general
      const errorMessage = handleAPIError(err, "registrar usuario");
      alert(`❌ ${errorMessage}`);
    }
  };

  const goToLogin = () => navigate("/");

  return (
    <div className="register-container">
      <form onSubmit={handleSubmit} className="register-form">
        <h2>Registro de Usuario</h2>

        <div className="form-row">
          <div className="input-group">
            <input
              type="text"
              name="nombre"
              placeholder="Nombre"
              value={form.nombre}
              onChange={handleChange}
              required
              className={errors.nombre ? "input-error" : ""}
            />
            {errors.nombre && (
              <p className="error-text">{errors.nombre}</p>
            )}
          </div>

          <div className="input-group">
            <input
              type="text"
              name="apellido"
              placeholder="Apellido"
              value={form.apellido}
              onChange={handleChange}
              required
              className={errors.apellido ? "input-error" : ""}
            />
            {errors.apellido && (
              <p className="error-text">{errors.apellido}</p>
            )}
          </div>
        </div>

        <div className="form-row">
          <div className="input-group">
            <input
              type="text"
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              required
              className={errors.email ? "input-error" : ""}
            />
            {errors.email && (
              <p className="error-text">{errors.email}</p>
            )}
          </div>

          <div className="input-group">
            <select name="rol" value={form.rol} onChange={handleChange} required>
              <option value="productor">Productor</option>
              <option value="vendedor">Vendedor</option>
              <option value="inversionista">Inversionista</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="input-group">
            <input
              type="text"
              inputMode="numeric"
              name="telefono"
              placeholder="Teléfono"
              value={form.telefono}
              onChange={handleChange}
              required
              className={errors.telefono ? "input-error" : ""}
            />
            {errors.telefono && (
              <p className="error-text">{errors.telefono}</p>
            )}
          </div>

          <div className="input-group">
            <input
              type="text"
              inputMode="numeric"
              name="identificacion"
              placeholder="Identificación"
              value={form.identificacion}
              onChange={handleChange}
              required
              className={errors.identification ? "input-error" : ""}
            />
            {errors.identification && (
              <p className="error-text">{errors.identification}</p>
            )}
          </div>
        </div>

        <div className="input-group full-width">
          <div className="password-input-wrapper">
            <input
              type="password"
              name="password"
              placeholder="Contraseña"
              value={form.password}
              onChange={handleChange}
              required
              className={errors.password ? "input-error" : ""}
            />

            {form.password && (
              <div className="password-strength-indicator">
                <div className="strength-bar-container">
                  <div
                    className="strength-bar"
                    style={{
                      width: `${(passwordStrength.score / 5) * 100}%`,
                      backgroundColor: passwordStrength.color,
                      transition: 'all 0.3s ease'
                    }}
                  />
                </div>
                <div className="strength-label" style={{ color: passwordStrength.color }}>
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
          {errors.password && (
            <p className="error-text">{errors.password}</p>
          )}
        </div>

        <div className="form-buttons">
          <button className="btn-blue" type="submit">Registrarse</button>
          <button type="button" className="btn-back" onClick={goToLogin}>
            Volver al inicio
          </button>
        </div>
      </form>
    </div>
  );
}

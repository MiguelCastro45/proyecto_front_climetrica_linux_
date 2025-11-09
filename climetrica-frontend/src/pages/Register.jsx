import React, { useState } from "react";
import API from "../api/api";
import { useNavigate } from "react-router-dom";
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
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;

    // ✅ Permitir solo números en teléfono e identificación
    if ((name === "telefono" || name === "identificacion") && !/^\d*$/.test(value)) {
      return;
    }

    setForm({ ...form, [name]: value });
    setErrors((prev) => ({ ...prev, [name]: "" })); // limpiar errores al escribir
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
    let newErrors = { email: "", password: "" };

    if (!validateEmail(form.email)) {
      newErrors.email = "Por favor ingresa un correo electrónico válido.";
      valid = false;
    }

    if (!validatePassword(form.password)) {
      newErrors.password =
        "La contraseña debe tener al menos 8 caracteres, con una mayúscula, una minúscula, un número y un símbolo.";
      valid = false;
    }

    setErrors(newErrors);
    if (!valid) return;

    try {
      const payload = {
        first_name: form.nombre,
        last_name: form.apellido,
        email: form.email,
        password: form.password,
        phone: form.telefono,
        identification: form.identificacion,
        role: form.rol,
      };

      await API.post("/register/", payload);
      alert("Usuario registrado con éxito");
      navigate("/");
    } catch (err) {
      alert("Error al registrar usuario");
    }
  };

  const goToLogin = () => navigate("/");

  return (
    <div className="register-container">
      <form onSubmit={handleSubmit} className="register-form">
        <h2>Registro de Usuario</h2>

        {["nombre", "apellido", "email", "password", "telefono", "identificacion"].map(
          (field) => (
            <div key={field} className="input-group">
              <input
                type={
                  field === "password"
                    ? "password"
                    : field === "telefono" || field === "identificacion"
                    ? "text" // input type text para control personalizado
                    : "text"
                }
                inputMode={
                  field === "telefono" || field === "identificacion"
                    ? "numeric"
                    : "text"
                }
                name={field}
                placeholder={field
                  .replace("nombre", "Nombre")
                  .replace("apellido", "Apellido")
                  .replace("email", "Email")
                  .replace("password", "Contraseña")
                  .replace("telefono", "Teléfono")
                  .replace("identificacion", "Identificación")}
                value={form[field]}
                onChange={handleChange}
                required
                className={errors[field] ? "input-error" : ""}
              />
              {errors[field] && (
                <p className="error-text">{errors[field]}</p>
              )}
            </div>
          )
        )}

        <select name="rol" value={form.rol} onChange={handleChange} required>
          <option value="productor">Productor</option>
          <option value="vendedor">Vendedor</option>
          <option value="inversionista">Inversionista</option>
        </select>

        <button className="btn-blue" type="submit">Registrarse</button>
        <p></p>
        <button type="button" className="btn-back" onClick={goToLogin}>
          Volver
        </button>
      </form>
    </div>
  );
}

import React, { useState } from "react";
import API from "../api/api";
import { useNavigate } from "react-router-dom";
import "./register.css";

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
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
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

  const goToLogin = () => {
    navigate("/");
  };

  return (
    <div className="register-container">
      <form onSubmit={handleSubmit} className="register-form">
        <h2>Registro de Usuario</h2>

        {["nombre", "apellido", "email", "password", "telefono", "identificacion"].map(
          (field) => (
            <input
              key={field}
              type={field === "password" ? "password" : "text"}
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
            />
          )
        )}

        <select name="rol" value={form.rol} onChange={handleChange} required>
          <option value="productor">Productor</option>
          <option value="vendedor">Vendedor</option>
          <option value="inversionista">Inversionista</option>
        </select>

        <button type="submit">Registrarse</button>
        <button
          type="button"
          className="login-links"
          onClick={goToLogin}
        >
          Volver 
        </button>
      </form>
    </div>
  );
}

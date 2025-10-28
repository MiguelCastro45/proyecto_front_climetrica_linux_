import React, { useState } from "react";
import API from "../api/api";
import { useNavigate } from "react-router-dom";
import "./Login.css"; // Importamos los estilos

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post("/login/", { email, password });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role);

      if (res.data.role === "admin") navigate("/admin");
      else navigate("/user");
    } catch (err) {
      setError("Credenciales inválidas");
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Iniciar Sesión</h2>
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleLogin} className="login-form">
          <input
            type="email"
            placeholder="Correo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-blue">Ingresar</button>
        </form>
        <div className="login-links">
          <button onClick={() => navigate("/register")}>Crear cuenta</button>
          <button onClick={() => navigate("/forgot")}>¿Olvidaste tu contraseña?</button>
        </div>
      </div>
    </div>
  );
}

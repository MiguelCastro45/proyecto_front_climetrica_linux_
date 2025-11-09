import React, { useState } from "react";
import API from "../api/api";
import "../styles/ForgotPassword.css"; 
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const navigate = useNavigate();
  
  // ✅ Validar formato de correo
  const isValidEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleReset = async (e) => {
    e.preventDefault();

    // 1️⃣ Verificar formato del correo
    if (!isValidEmail(email)) {
      setMessage("Por favor ingresa un correo válido.");
      setIsError(true);
      return;
    }

    try {
      // 2️⃣ Enviar correo al backend para verificar si existe y procesar el reset
      const response = await API.post("/forgot-password/", { email });

      if (response.data.exists) {
        setMessage("Se ha enviado un enlace a tu correo.");
        setIsError(false);
      } else {
        setMessage("El correo no se encuentra registrado.");
        setIsError(true);
      }
    } catch (err) {
      setMessage("Error al enviar la solicitud. Inténtalo más tarde.");
      setIsError(true);
    }
  };

  const goToLogin = () => {
    navigate("/");
  };

  return (
    <div className="forgot-container">
      <div className="forgot-card">
        <h2 className="forgot-title">Recuperar contraseña</h2>
        <form onSubmit={handleReset}>
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="forgot-input"
          />
          <button type="submit" className="forgot-btn">
            Enviar enlace
          </button>
          <p></p>
          <button
          type="button"
          className="forgot-btn"
          onClick={goToLogin}
        >
          Volver 
        </button>
        </form>
        {message && (
          <p className={`forgot-message ${isError ? "error" : "success"}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

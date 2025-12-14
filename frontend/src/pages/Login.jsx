import React, { useState } from "react";
import API from "../api/api";
import { useNavigate } from "react-router-dom";
import CryptoJS from "crypto-js";
import { handleAPIError } from "../utils/errorHandler";
import "../styles/Login.css"; 



export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSuggestions, setEmailSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const navigate = useNavigate();

  // Dominios de correo populares
  const emailDomains = [
    '@gmail.com',
    '@hotmail.com',
    '@outlook.com',
    '@yahoo.com',
    '@yahoo.es',
    '@icloud.com',
    '@live.com',
    '@msn.com'
  ];

  // Manejar cambio en el campo de email
  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);

    // Generar sugerencias si no contiene @
    if (value && !value.includes('@')) {
      const suggestions = emailDomains.map(domain => value + domain);
      setEmailSuggestions(suggestions);
      setShowSuggestions(true);
    } else if (value && value.includes('@') && !value.endsWith('.com') && !value.endsWith('.es')) {
      // Si ya tiene @ pero aún no está completo
      const [username, partial] = value.split('@');
      if (partial) {
        const matchingDomains = emailDomains.filter(domain =>
          domain.toLowerCase().includes('@' + partial.toLowerCase())
        );
        const suggestions = matchingDomains.map(domain => username + domain);
        setEmailSuggestions(suggestions);
        setShowSuggestions(suggestions.length > 0);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  // Seleccionar una sugerencia
  const handleSuggestionClick = (suggestion) => {
    setEmail(suggestion);
    setShowSuggestions(false);
  };

  // Función para encriptar datos
  const encryptData = (data) => {
    // Clave de encriptación - en producción debería estar en variable de entorno
    const secretKey = process.env.REACT_APP_ENCRYPTION_KEY || "ClimetricaSecretKey2024";
    return CryptoJS.AES.encrypt(data, secretKey).toString();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      // Encriptar email y contraseña antes de enviar
      const encryptedEmail = encryptData(email.toLowerCase());
      const encryptedPassword = encryptData(password);

      const res = await API.post("/login/", {
        email: encryptedEmail,
        password: encryptedPassword
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role);

      setSuccess("¡Inicio de sesión exitoso! Redirigiendo...");

      setTimeout(() => {
        navigate("/user");
      }, 1000);
    } catch (err) {
      setIsLoading(false);
      const errorMessage = handleAPIError(err, "iniciar sesión");
      setError(errorMessage);
    }
  };

  return (
    <div className="login-container">
      {error && (
        <div className="notification-toast notification-error">
          <span className="notification-icon">✕</span>
          <span className="notification-text">{error}</span>
        </div>
      )}

      {success && (
        <div className="notification-toast notification-success">
          <span className="notification-icon">✓</span>
          <span className="notification-text">{success}</span>
        </div>
      )}

      <div className="login-card">
        <div>
      <img
        src="/logo/1_img.jpg"
        alt="Logo de Climétrica"
        style={{ borderRadius: "100%", width: "320px" }}
      />
    </div>

        <h2>Iniciar Sesión</h2>

        <form onSubmit={handleLogin} className="login-form">
          <div className="input-with-icon">
            <img src="/iconos/envelope.png" alt="Email" className="input-icon" />
            <input
              type="email"
              placeholder="Correo"
              value={email}
              onChange={handleEmailChange}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              autoComplete="off"
              required
            />
            {showSuggestions && emailSuggestions.length > 0 && (
              <div className="email-suggestions">
                {emailSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="email-suggestion-item"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="input-with-icon">
            <img src="/iconos/lock.png" alt="Password" className="input-icon" />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-blue" disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="spinner"></span>
                Verificando...
              </>
            ) : (
              'Ingresar'
            )}
          </button>
        </form>
        <div className="login-links">
          <button onClick={() => navigate("/register")}>Crear cuenta</button>
          <button onClick={() => navigate("/forgot")}>¿Olvidaste tu contraseña?</button>
        </div>
      </div>
    </div>
  );
}

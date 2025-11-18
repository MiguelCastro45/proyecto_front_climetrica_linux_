import React, { useState } from "react";
import API from "../api/api";
import { useNavigate } from "react-router-dom";
import "../styles/Login.css"; 



export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
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
        <div>
      <img
        src="/logo/1_img.jpg"   
        alt="Logo de Climétrica"
        style={{ borderRadius: "100%", width: "320px" }}
      />
    </div>
        
        <h2>Iniciar Sesión</h2>
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleLogin} className="login-form">
          <div style={{ position: 'relative', width: '100%' }}>
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

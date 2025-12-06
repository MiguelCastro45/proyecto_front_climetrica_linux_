import React, { useState } from "react";
import API from "../api/api";
import { handleAPIError } from "../utils/errorHandler";
import "../styles/ForgotPassword.css";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  // Validar formato de correo en tiempo real
  const isValidEmail = (email) => {
    const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(email);
  };

  // Manejar cambio en el input del correo
  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    setMessage("");

    // Validar formato en tiempo real
    if (value.length > 0 && !isValidEmail(value)) {
      setEmailError("Formato de correo inválido");
    } else {
      setEmailError("");
    }
  };

  // Generar contraseña aleatoria segura
  const generateSecurePassword = () => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';
    const allChars = uppercase + lowercase + numbers + symbols;

    let password = '';

    // Asegurar que tenga al menos uno de cada tipo
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Completar hasta 12 caracteres
    for (let i = 4; i < 12; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Mezclar los caracteres
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  const handleReset = async (e) => {
    e.preventDefault();

    // Limpiar mensajes previos
    setMessage("");
    setEmailError("");

    // Validar que el campo no esté vacío
    if (!email.trim()) {
      setEmailError("Por favor ingresa tu correo electrónico");
      setIsError(true);
      return;
    }

    // Validar formato del correo
    if (!isValidEmail(email)) {
      setEmailError("Por favor ingresa un correo electrónico válido");
      setIsError(true);
      return;
    }

    setIsLoading(true);
    setIsValidating(true);

    try {
      // Paso 1: Verificar si el correo existe en la base de datos
      const checkResponse = await API.post("/check-email/", { email: email.toLowerCase() });

      if (!checkResponse.data.exists) {
        setMessage("❌ El correo electrónico no está registrado en nuestro sistema. Verifica que sea correcto o regístrate.");
        setIsError(true);
        setIsLoading(false);
        setIsValidating(false);
        return;
      }

      // Paso 2: Generar contraseña segura aleatoria
      const newPassword = generateSecurePassword();

      // Paso 3: Enviar correo con la nueva contraseña
      const response = await API.post("/reset-password/", {
        email: email.toLowerCase(),
        new_password: newPassword
      });

      if (response.data.success) {
        setMessage(`✓ Se ha enviado una nueva contraseña temporal a ${email}. Por favor revisa tu correo (incluyendo spam).`);
        setIsError(false);

        // Redirigir al login después de 5 segundos
        setTimeout(() => {
          navigate("/");
        }, 5000);
      } else {
        setMessage("❌ Error al procesar la solicitud. Por favor intenta nuevamente o contacta al administrador.");
        setIsError(true);
      }
    } catch (err) {
      const errorMessage = handleAPIError(err, "recuperar contraseña");
      setMessage(errorMessage);
      setIsError(true);
    } finally {
      setIsLoading(false);
      setIsValidating(false);
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
          <div className="input-group input-with-icon">
            <img src="/iconos/envelope.png" alt="Email" className="input-icon" />
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={handleEmailChange}
              className={`forgot-input ${emailError ? 'input-error' : ''}`}
              disabled={isLoading}
              autoComplete="email"
            />
            {emailError && (
              <span className="error-message">
                {emailError}
              </span>
            )}
          </div>

          <button
            type="submit"
            className="forgot-btn"
            disabled={isLoading || emailError || !email}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                {isValidating ? 'Verificando...' : 'Enviando...'}
              </>
            ) : (
              'Enviar nueva contraseña'
            )}
          </button>

          <button
            type="button"
            className="forgot-btn-back"
            onClick={goToLogin}
            disabled={isLoading}
          >
            Volver al inicio
          </button>
        </form>

        {message && (
          <div className={`forgot-message ${isError ? "error" : "success"}`}>
            {isError && <span className="message-icon">✕</span>}
            {!isError && <span className="message-icon">✓</span>}
            <span>{message}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * api/api.js — Cliente HTTP compartido (axios).
 *
 * Instancia única de axios que usan Login, Register, ForgotPassword,
 * UserPanel, UserMapDashboard, ClimateDashboard y los componentes Admin*.
 *
 * - baseURL: URL del backend Django. HOY ESTÁ HARDCODEADA a localhost:8000.
 *   Para desplegar, parametrizar con process.env.REACT_APP_API_URL.
 * - Interceptor de request: adjunta "Authorization: Bearer <token>" leyendo
 *   el JWT de localStorage en cada llamada.
 *
 * El manejo de errores 401 (token expirado -> volver al login) está en
 * utils/errorHandler.js.
 */
import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:8000",
});

// Interceptor: adjunta el token JWT guardado en localStorage a cada petición
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

export default API;
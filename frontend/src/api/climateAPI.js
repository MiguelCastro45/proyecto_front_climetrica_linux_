// src/api/climateAPI.js
import axios from "axios";

// URL base de tu backend
const BASE_URL = "http://localhost:8000/api";

// ✅ Crear instancia de axios con configuración común
const API = axios.create({
  baseURL: BASE_URL,
});

// ✅ Interceptor para incluir token JWT automáticamente
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token"); // o sessionStorage según tu login
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Obtener datos climáticos
export const getClimateData = async (layer) => {
  try {
    const response = await API.get(`/climate/${layer}`);
    return response.data;
  } catch (error) {
    console.error("❌ Error fetching climate data:", error.response?.data || error);
    return null;
  }
};

// ✅ Descargar capa climática en formato JSON
export const downloadLayer = async (layer) => {
  try {
    const response = await API.get(`/download/${layer}`);
    const blob = new Blob([JSON.stringify(response.data)], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${layer}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("❌ Error downloading layer:", error.response?.data || error);
  }
};

// ✅ Nuevo método opcional: eliminar capa (con token)
export const deleteLayer = async (layerId) => {
  try {
    const response = await API.delete(`/climate/delete/${layerId}/`);
    console.log("✅ Layer deleted successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error deleting layer:", error.response?.data || error);
    throw error;
  }
};
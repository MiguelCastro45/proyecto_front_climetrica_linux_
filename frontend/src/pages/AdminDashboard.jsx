/**
 * AdminDashboard.jsx — Panel de administración "suelto" (ruta "/admin").
 *
 * Monta las mismas tres pestañas que UserPanel usa para el rol admin:
 * <AdminUsers>, <AdminVariables>, <AdminCrops>. Hoy ninguna navegación
 * apunta aquí (el admin entra por "/user"); se mantiene como acceso directo.
 */
import React, { useState } from "react";
import AdminUsers from "../components/AdminUsers";
import AdminVariables from "../components/AdminVariables";
import AdminCrops from "../components/AdminCrops";
import "../styles/AdminTabsEncapsulated.css?v=11";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("usuarios");
  const [notification, setNotification] = useState(null);

  const showNotification = (type, title, message) => {
    setNotification({ type, title, message });
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#f5f7fa" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #3B5998, #2E86DE)",
        color: "white",
        padding: "20px 24px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
      }}>
        <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: "700" }}>Panel de Administración</h1>
        <p style={{ margin: "8px 0 0 0", opacity: 0.9, fontSize: "0.95rem" }}>Gestiona usuarios, variables y cultivos del sistema</p>
      </div>

      {/* Notification */}
      {notification && (
        <div style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          background: notification.type === "success" ? "#10b981" : "#ef4444",
          color: "white",
          padding: "16px 20px",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          zIndex: 10000,
          minWidth: "300px"
        }}>
          <strong>{notification.title}</strong>
          <p style={{ margin: "4px 0 0 0", fontSize: "0.9rem" }}>{notification.message}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === "usuarios" ? "active" : ""}`}
          onClick={() => setActiveTab("usuarios")}
        >
          👥 Usuarios
        </button>
        <button
          className={`admin-tab ${activeTab === "variables" ? "active" : ""}`}
          onClick={() => setActiveTab("variables")}
        >
          📊 Variables del Dashboard
        </button>
        <button
          className={`admin-tab ${activeTab === "cultivos" ? "active" : ""}`}
          onClick={() => setActiveTab("cultivos")}
        >
          🌱 Cultivos
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "usuarios" && (
        <AdminUsers showNotification={showNotification} />
      )}

      {activeTab === "variables" && (
        <AdminVariables showNotification={showNotification} />
      )}

      {activeTab === "cultivos" && (
        <AdminCrops showNotification={showNotification} />
      )}
    </div>
  );
}

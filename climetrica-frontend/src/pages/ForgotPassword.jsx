import React, { useState } from "react";
import API from "../api/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleReset = async (e) => {
    e.preventDefault();
    try {
      await API.post("/forgot-password/", { email });
      setMessage("Se ha enviado un enlace a tu correo.");
    } catch {
      setMessage("Error al enviar el correo.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white shadow-lg p-6 rounded-lg w-96">
        <h2 className="text-xl font-bold text-center mb-4">
          Recuperar contraseña
        </h2>
        <form onSubmit={handleReset}>
          <input
            type="email"
            placeholder="Correo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border p-2 w-full mb-3 rounded"
          />
          <button className="bg-blue-500 text-white py-2 w-full rounded">
            Enviar enlace
          </button>
        </form>
        {message && (
          <p className="text-center mt-3 text-gray-600">{message}</p>
        )}
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import API from "../api/api";

export default function AdminDashboard() {
  const [usuarios, setUsuarios] = useState([]);

  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        const res = await API.get("/usuarios/");
        setUsuarios(res.data);
      } catch (err) {
        console.error("Error cargando usuarios:", err);
      }
    };
    fetchUsuarios();
  }, []);

  const getRoleColor = (rol) => {
    switch (rol) {
      case "Administrador":
        return "bg-red-500 text-white";
      case "Usuario":
        return "bg-green-500 text-white";
      case "Invitado":
        return "bg-yellow-400 text-black";
      default:
        return "bg-gray-300 text-black";
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h2 className="text-3xl font-extrabold mb-6 text-gray-800">
        Panel de Administración
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {usuarios.map((u) => (
          <div
            key={u._id}
            className="bg-white rounded-2xl shadow-lg p-6 flex flex-col justify-between hover:shadow-2xl transition-shadow duration-300"
          >
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                {u.nombre} {u.apellido}
              </h3>
              <p className="text-gray-600 mb-2">{u.email}</p>
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getRoleColor(
                  u.rol
                )}`}
              >
                {u.rol}
              </span>
            </div>
            <div className="mt-4">
              <button className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-xl shadow-md transition transform hover:scale-105">
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

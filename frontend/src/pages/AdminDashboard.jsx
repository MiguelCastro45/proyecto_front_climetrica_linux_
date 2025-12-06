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

  return }
import React, { useState } from "react";
import API from "../api/api";

export default function UploadDataset() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage("Selecciona un archivo primero");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      await API.post("/datasets/upload/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage("Archivo subido exitosamente");
    } catch (err) {
      console.error(err);
      setMessage("Error al subir el archivo");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white shadow p-6 rounded-lg w-96">
        <h2 className="text-xl font-bold text-center mb-4">Subir Dataset</h2>
        <form onSubmit={handleUpload}>
          <input
            type="file"
            accept=".csv,.geojson"
            onChange={(e) => setFile(e.target.files[0])}
            className="border p-2 mb-3 w-full"
          />
          <button
            type="submit"
            className="bg-blue-500 text-white py-2 w-full rounded"
          >
            Subir
          </button>
        </form>
        {message && <p className="text-center mt-3 text-gray-600">{message}</p>}
      </div>
    </div>
  );
}

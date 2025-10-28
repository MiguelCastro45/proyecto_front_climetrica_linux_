import React from "react";
import { downloadVariable } from "../api/climateAPI";

export default function DownloadButton({ variable }) {
  return (
    <button
      onClick={() => downloadVariable(variable)}
      style={{
        margin: "4px",
        padding: "6px 10px",
        borderRadius: "8px",
        backgroundColor: "#0066cc",
        color: "white",
        border: "none",
        cursor: "pointer",
      }}
    >
      Descargar {variable}
    </button>
  );
}

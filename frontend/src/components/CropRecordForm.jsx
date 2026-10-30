/**
 * CropRecordForm.jsx — "Mis datos del sector": formulario para que el
 * usuario complemente un registro guardado con sus propios datos.
 *
 * - Los campos se ajustan al cultivo del registro (config/camposCultivo.js).
 * - El usuario puede agregar varias entradas en el tiempo, editarlas y
 *   eliminarlas.
 * - Por ahora se guarda SOLO en el navegador (localStorage), por usuario y
 *   por registro. Cuando exista el servicio en el backend, basta con cambiar
 *   cargarEntradas / guardarEntradas por llamadas a la API.
 *
 * Props:
 *   - recordId: _id del registro de climate_data
 *   - userId: id del usuario dueño del registro
 *   - cultivo: nombre del cultivo del registro (ej. "Café")
 */
import React, { useState } from "react";
import { camposParaCultivo } from "../config/camposCultivo";
import "../styles/CropRecordForm.css";

const STORAGE_PREFIX = "pp_datos_cultivo_";

function storageKey(userId) {
  return `${STORAGE_PREFIX}${userId || "anonimo"}`;
}

function cargarEntradas(userId, recordId) {
  try {
    const todo = JSON.parse(localStorage.getItem(storageKey(userId)) || "{}");
    return Array.isArray(todo[recordId]) ? todo[recordId] : [];
  } catch {
    return [];
  }
}

function guardarEntradas(userId, recordId, entradas) {
  try {
    const todo = JSON.parse(localStorage.getItem(storageKey(userId)) || "{}");
    todo[recordId] = entradas;
    localStorage.setItem(storageKey(userId), JSON.stringify(todo));
    return true;
  } catch {
    return false;
  }
}

/** Valida los valores del formulario. Devuelve { campo: mensaje }. */
function validar(campos, valores) {
  const errores = {};
  campos.forEach((c) => {
    const v = valores[c.name];
    const vacio = v === undefined || v === null || String(v).trim() === "";
    if (c.required && vacio) {
      errores[c.name] = "Este campo es obligatorio";
    } else if (c.type === "number" && !vacio) {
      const n = Number(v);
      if (!Number.isFinite(n)) errores[c.name] = "Debe ser un número";
      else if (n < 0) errores[c.name] = "No puede ser negativo";
    }
  });
  return errores;
}

export default function CropRecordForm({ recordId, userId, cultivo }) {
  const campos = camposParaCultivo(cultivo);
  const [entradas, setEntradas] = useState(() => cargarEntradas(userId, recordId));
  const [editando, setEditando] = useState(null); // null | "nueva" | id de la entrada
  const [valores, setValores] = useState({});
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState(null);

  const abrirNueva = () => {
    setValores({});
    setErrores({});
    setEditando("nueva");
  };

  const abrirEdicion = (entrada) => {
    setValores(entrada.valores);
    setErrores({});
    setEditando(entrada.id);
  };

  const cancelar = () => {
    setEditando(null);
    setValores({});
    setErrores({});
  };

  const persistir = (nuevas, texto) => {
    if (guardarEntradas(userId, recordId, nuevas)) {
      setEntradas(nuevas);
      setMensaje({ tipo: "ok", texto });
    } else {
      setMensaje({ tipo: "error", texto: "No se pudo guardar en este navegador." });
    }
    setTimeout(() => setMensaje(null), 3000);
  };

  const guardar = (e) => {
    e.preventDefault();
    const errs = validar(campos, valores);
    setErrores(errs);
    if (Object.keys(errs).length > 0) return;

    const ahora = new Date().toISOString();
    let nuevas;
    if (editando === "nueva") {
      nuevas = [{ id: `e${Date.now()}`, cultivo, creado: ahora, actualizado: ahora, valores }, ...entradas];
    } else {
      nuevas = entradas.map((en) => (en.id === editando ? { ...en, actualizado: ahora, valores } : en));
    }
    persistir(nuevas, editando === "nueva" ? "✅ Datos agregados" : "✅ Cambios guardados");
    cancelar();
  };

  const eliminar = (id) => {
    if (!window.confirm("¿Eliminar esta entrada?")) return;
    persistir(entradas.filter((en) => en.id !== id), "🗑️ Entrada eliminada");
  };

  const cambiar = (name, value) => setValores((prev) => ({ ...prev, [name]: value }));

  const renderCampo = (c) => {
    const valor = valores[c.name] ?? "";
    const comun = {
      id: `crf-${c.name}`,
      value: valor,
      onChange: (e) => cambiar(c.name, e.target.value),
      className: errores[c.name] ? "crf-input crf-input-error" : "crf-input",
    };
    let control;
    if (c.type === "textarea") {
      control = <textarea {...comun} rows={3} placeholder="Ej.: lote en ladera, sombrío con guamo, renovado en 2023..." />;
    } else if (c.type === "select") {
      control = (
        <select {...comun}>
          <option value="">— Seleccionar —</option>
          {c.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    } else {
      control = <input {...comun} type={c.type === "number" ? "number" : "text"} min={c.type === "number" ? 0 : undefined} step="any" />;
    }
    return (
      <div key={c.name} className={`crf-field ${c.type === "textarea" ? "crf-field-wide" : ""}`}>
        <label htmlFor={comun.id}>
          {c.label}{c.unit ? ` (${c.unit})` : ""}{c.required ? " *" : ""}
        </label>
        {control}
        {errores[c.name] && <span className="crf-error">{errores[c.name]}</span>}
      </div>
    );
  };

  const formatearValor = (c, v) => {
    if (v === undefined || v === "") return null;
    if (c.type === "number") return `${Number(v).toLocaleString("es-CO")}${c.unit ? ` ${c.unit}` : ""}`;
    return v;
  };

  return (
    <div className="crf">
      <div className="crf-header">
        <div>
          <h4>📝 Mis datos del sector{cultivo ? `: ${cultivo}` : ""}</h4>
          <p className="crf-sub">
            Complementa este registro con tu información (árboles, área, producción, ventas, afectaciones).
          </p>
        </div>
        {editando === null && (
          <button className="crf-btn crf-btn-primary" onClick={abrirNueva}>+ Agregar datos</button>
        )}
      </div>

      {mensaje && <div className={`crf-msg crf-msg-${mensaje.tipo}`}>{mensaje.texto}</div>}

      {editando !== null && (
        <form className="crf-form" onSubmit={guardar} noValidate>
          <div className="crf-grid">{campos.map(renderCampo)}</div>
          <div className="crf-actions">
            <button type="button" className="crf-btn" onClick={cancelar}>Cancelar</button>
            <button type="submit" className="crf-btn crf-btn-primary">
              {editando === "nueva" ? "Guardar datos" : "Guardar cambios"}
            </button>
          </div>
        </form>
      )}

      {entradas.length === 0 && editando === null && (
        <div className="crf-empty">Aún no has agregado datos a este registro.</div>
      )}

      {entradas.map((en) => (
        <div key={en.id} className="crf-entry">
          <div className="crf-entry-head">
            <span>
              📅 {new Date(en.creado).toLocaleString("es-CO")}
              {en.actualizado !== en.creado && (
                <em> · editado {new Date(en.actualizado).toLocaleString("es-CO")}</em>
              )}
            </span>
            <span className="crf-entry-actions">
              <button className="crf-btn crf-btn-small" onClick={() => abrirEdicion(en)} disabled={editando !== null}>Editar</button>
              <button className="crf-btn crf-btn-small crf-btn-danger" onClick={() => eliminar(en.id)} disabled={editando !== null}>Eliminar</button>
            </span>
          </div>
          <div className="crf-entry-grid">
            {campos.map((c) => {
              const v = formatearValor(c, en.valores[c.name]);
              if (v === null) return null;
              return (
                <div key={c.name} className={c.type === "textarea" ? "crf-field-wide" : ""}>
                  <strong>{c.label}:</strong> {v}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="crf-note">
        Versión de demostración: los datos se guardan en este navegador.
      </div>
    </div>
  );
}

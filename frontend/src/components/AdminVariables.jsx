import React, { useState, useEffect, useRef } from "react";
import API from "../api/api";
import "../styles/AdminTabsEncapsulated.css?v=11";
import { ANIMATION_TEMPLATES, getAnimationOptions, getAnimationConfig } from "../config/animationTemplates";

export default function AdminVariables({ showNotification }) {
  const [variables, setVariables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVariable, setEditingVariable] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const previewCanvasRef = useRef(null);
  const previewAnimationRef = useRef(null);
  const [form, setForm] = useState({
    nombre: "",
    clave: "",
    descripcion: "",
    categoria: "meteorologica",
    unidad: "",
    icono: "",
    orden: 999,
    activa: true,
    configuracion_api: {
      tipo: "openweathermap",
      layer: "",
      formato: null,
      tile_matrix_set: null,
      parametro_open_meteo: null,
      max_native_zoom: null
    },
    configuracion_animacion: {
      habilitada: true,
      opacidad: 0.9,
      velocidad: "normal",
      tipo_animacion: "thermal-flow",
      ...getAnimationConfig("thermal-flow")
    }
  });

  useEffect(() => {
    fetchVariables();
  }, []);

  // Efecto para la animación de preview - usa el mismo sistema que el dashboard
  useEffect(() => {
    if (!showModal || !previewCanvasRef.current || !form.configuracion_animacion.habilitada) {
      if (previewAnimationRef.current) {
        cancelAnimationFrame(previewAnimationRef.current);
        previewAnimationRef.current = null;
      }
      return;
    }

    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Aplicar configuración desde formulario
    const opacity = form.configuracion_animacion.opacidad;
    const velocidad = form.configuracion_animacion.velocidad;
    const tipoAnimacion = form.configuracion_animacion.tipo_animacion;

    // Multiplicador de velocidad
    const speedMultiplier =
      velocidad === 'lenta' ? 0.5 :
      velocidad === 'rapida' ? 1.5 : 1.0;

    // Configuración específica según tipo de animación
    let previewConfig;

    if (tipoAnimacion === 'particulas') {
      // Partículas cayendo (lluvia)
      previewConfig = {
        baseLineCount: 25,
        lineSpeed: 1.2 * speedMultiplier,
        lineLength: { min: 30, max: 70 },
        lineWidth: { min: 1.8, max: 3.5 },
        glowIntensity: 12,
        flowPattern: 'rain-streamline',
        curvature: 0.01,
        waveAmplitude: 1.5,
        waveFrequency: 0.008
      };
    } else if (tipoAnimacion === 'ondas') {
      // Ondas circulares
      previewConfig = {
        baseLineCount: 12,
        lineSpeed: 0.3 * speedMultiplier,
        lineLength: { min: 50, max: 100 },
        lineWidth: { min: 1.5, max: 3 },
        glowIntensity: 10,
        flowPattern: 'wave',
        curvature: 0.1,
        waveAmplitude: 25,
        waveFrequency: 0.005
      };
    } else if (tipoAnimacion === 'thermal-flow') {
      // Flujo horizontal rápido
      previewConfig = {
        baseLineCount: 18,
        lineSpeed: 0.6 * speedMultiplier,
        lineLength: { min: 60, max: 120 },
        lineWidth: { min: 1.5, max: 3.5 },
        glowIntensity: 8,
        flowPattern: 'horizontal-flow',
        curvature: 0.05,
        waveAmplitude: 8,
        waveFrequency: 0.003
      };
    } else if (tipoAnimacion === 'vortex') {
      // Vórtice/Remolino (para huracanes, tornados)
      previewConfig = {
        baseLineCount: 20,
        lineSpeed: 0.8 * speedMultiplier,
        lineLength: { min: 40, max: 90 },
        lineWidth: { min: 1.5, max: 3 },
        glowIntensity: 10,
        flowPattern: 'vortex',
        curvature: 0.15,
        waveAmplitude: 15,
        waveFrequency: 0.006
      };
    } else if (tipoAnimacion === 'nieve') {
      // Nieve cayendo lentamente
      previewConfig = {
        baseLineCount: 30,
        lineSpeed: 0.4 * speedMultiplier,
        lineLength: { min: 15, max: 35 },
        lineWidth: { min: 2, max: 4 },
        glowIntensity: 15,
        flowPattern: 'snow',
        curvature: 0.02,
        waveAmplitude: 3,
        waveFrequency: 0.01
      };
    } else if (tipoAnimacion === 'fuego') {
      // Efecto de fuego/calor intenso
      previewConfig = {
        baseLineCount: 22,
        lineSpeed: 0.7 * speedMultiplier,
        lineLength: { min: 25, max: 65 },
        lineWidth: { min: 2, max: 4.5 },
        glowIntensity: 18,
        flowPattern: 'fire',
        curvature: 0.12,
        waveAmplitude: 12,
        waveFrequency: 0.007
      };
    } else if (tipoAnimacion === 'estatico') {
      // Partículas estáticas con pulso
      previewConfig = {
        baseLineCount: 25,
        lineSpeed: 0.1 * speedMultiplier,
        lineLength: { min: 10, max: 25 },
        lineWidth: { min: 2.5, max: 5 },
        glowIntensity: 20,
        flowPattern: 'static-pulse',
        curvature: 0,
        waveAmplitude: 2,
        waveFrequency: 0.02
      };
    } else {
      // Color/Thermal Flow (por defecto)
      previewConfig = {
        baseLineCount: 15,
        lineSpeed: 0.5 * speedMultiplier,
        lineLength: { min: 30, max: 80 },
        lineWidth: { min: 1.5, max: 3 },
        glowIntensity: 6,
        flowPattern: 'thermal-streamline',
        curvature: 0.08,
        waveAmplitude: 8,
        waveFrequency: 0.004
      };
    }

    // Clase simplificada de línea de flujo para preview
    class PreviewFlowLine {
      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.length = previewConfig.lineLength.min + Math.random() * (previewConfig.lineLength.max - previewConfig.lineLength.min);
        this.lineWidth = previewConfig.lineWidth.min + Math.random() * (previewConfig.lineWidth.max - previewConfig.lineWidth.min);

        // Color de gradiente simulado (azul-verde-amarillo)
        const hue = 180 + Math.random() * 60;
        this.color = `hsla(${hue}, 70%, 60%, ${opacity})`;

        this.opacity = 0;
        this.baseOpacity = 0.7 + Math.random() * 0.3;
        this.fadeSpeed = 0.01 + Math.random() * 0.01;

        this.life = 0;
        this.maxLife = 120 + Math.random() * 80;

        // Configurar ángulo y velocidad según tipo de animación
        if (previewConfig.flowPattern === 'rain-streamline') {
          // Lluvia: caída vertical con ligera variación lateral
          const lateralDrift = (Math.random() - 0.5) * 0.15;
          this.angle = Math.PI / 2 + lateralDrift;
          this.velocityX = Math.cos(this.angle) * previewConfig.lineSpeed * 0.3;
          this.velocityY = Math.sin(this.angle) * previewConfig.lineSpeed;
        } else if (previewConfig.flowPattern === 'horizontal-flow') {
          // Flujo horizontal: de izquierda a derecha
          this.angle = (Math.random() - 0.5) * 0.2;
          this.velocityX = Math.cos(this.angle) * previewConfig.lineSpeed;
          this.velocityY = Math.sin(this.angle) * previewConfig.lineSpeed * 0.3;
        } else if (previewConfig.flowPattern === 'wave') {
          // Ondas: movimiento circular
          this.angle = Math.random() * Math.PI * 2;
          this.velocityX = Math.cos(this.angle) * previewConfig.lineSpeed;
          this.velocityY = Math.sin(this.angle) * previewConfig.lineSpeed;
        } else if (previewConfig.flowPattern === 'vortex') {
          // Vórtice: movimiento circular desde el centro
          this.centerX = width / 2;
          this.centerY = height / 2;
          this.radius = Math.random() * (Math.min(width, height) * 0.4);
          this.angle = Math.random() * Math.PI * 2;
          this.velocityX = Math.cos(this.angle) * previewConfig.lineSpeed;
          this.velocityY = Math.sin(this.angle) * previewConfig.lineSpeed;
          this.angularVelocity = 0.03 + Math.random() * 0.02;
        } else if (previewConfig.flowPattern === 'snow') {
          // Nieve: caída lenta con mucho bamboleo lateral
          this.angle = Math.PI / 2 + (Math.random() - 0.5) * 0.3;
          this.velocityX = (Math.random() - 0.5) * previewConfig.lineSpeed * 0.8;
          this.velocityY = previewConfig.lineSpeed;
          this.swayPhase = Math.random() * Math.PI * 2;
        } else if (previewConfig.flowPattern === 'fire') {
          // Fuego: ascenso turbulento
          this.angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.4;
          this.velocityX = (Math.random() - 0.5) * previewConfig.lineSpeed * 0.6;
          this.velocityY = -previewConfig.lineSpeed;
          this.turbulence = Math.random();
        } else if (previewConfig.flowPattern === 'static-pulse') {
          // Estático: sin movimiento, solo pulso
          this.angle = 0;
          this.velocityX = 0;
          this.velocityY = 0;
          this.pulsePhase = Math.random() * Math.PI * 2;
          this.pulseSpeed = 0.05 + Math.random() * 0.05;
        } else {
          // Thermal flow: flujo diagonal organizado
          const normalizedX = this.x / width;
          this.angle = (normalizedX - 0.5) * 0.3 + Math.PI / 6;
          this.velocityX = Math.cos(this.angle) * previewConfig.lineSpeed;
          this.velocityY = Math.sin(this.angle) * previewConfig.lineSpeed;
        }

        this.waveOffset = Math.random() * Math.PI * 2;
        this.points = [];
        this.generatePoints();
      }

      generatePoints() {
        this.points = [];
        const segments = 8;

        for (let i = 0; i <= segments; i++) {
          const t = i / segments;
          const distance = this.length * t;

          let px = this.x + Math.cos(this.angle) * distance;
          let py = this.y + Math.sin(this.angle) * distance;

          // Ondulación sutil
          const wave = Math.sin(distance * previewConfig.waveFrequency + this.waveOffset) * previewConfig.waveAmplitude * 0.5;
          px += Math.cos(this.angle + Math.PI / 2) * wave;
          py += Math.sin(this.angle + Math.PI / 2) * wave;

          this.points.push({ x: px, y: py });
        }
      }

      update() {
        this.life++;

        // Movimiento según tipo de animación
        if (previewConfig.flowPattern === 'rain-streamline') {
          // Lluvia: caída rápida vertical
          this.waveOffset += 0.025;
          const waveInfluence = Math.sin(this.y * previewConfig.waveFrequency + this.waveOffset);
          this.x += this.velocityX + waveInfluence * 0.05;
          this.y += this.velocityY;

          if (this.y > height + this.length) {
            this.y = -this.length;
            this.x = Math.random() * width;
          }
        } else if (previewConfig.flowPattern === 'horizontal-flow') {
          // Flujo horizontal: de izquierda a derecha
          this.waveOffset += 0.02;
          const waveInfluence = Math.sin(this.x * previewConfig.waveFrequency + this.waveOffset);
          this.x += this.velocityX;
          this.y += this.velocityY + waveInfluence * 0.15;

          if (this.x > width + this.length) {
            this.x = -this.length;
            this.y = Math.random() * height;
          }
        } else if (previewConfig.flowPattern === 'wave') {
          // Ondas: movimiento ondulatorio
          this.waveOffset += 0.04;
          const waveInfluence = Math.sin(this.x * previewConfig.waveFrequency + this.waveOffset);
          this.x += this.velocityX + waveInfluence * 0.4;
          this.y += this.velocityY;

          if (this.x < 0 || this.x > width) this.velocityX *= -1;
          if (this.y < 0 || this.y > height) this.velocityY *= -1;
        } else if (previewConfig.flowPattern === 'vortex') {
          // Vórtice: rotación espiral
          this.angle += this.angularVelocity;
          const spiralForce = 1 - (this.life / this.maxLife) * 0.3; // Se acerca al centro con el tiempo
          this.x = this.centerX + Math.cos(this.angle) * this.radius * spiralForce;
          this.y = this.centerY + Math.sin(this.angle) * this.radius * spiralForce;
        } else if (previewConfig.flowPattern === 'snow') {
          // Nieve: caída lenta con bamboleo
          this.swayPhase += 0.08;
          const sway = Math.sin(this.swayPhase) * 15;
          this.x += this.velocityX + sway * 0.1;
          this.y += this.velocityY;

          if (this.y > height + this.length) {
            this.y = -this.length;
            this.x = Math.random() * width;
            this.swayPhase = Math.random() * Math.PI * 2;
          }
        } else if (previewConfig.flowPattern === 'fire') {
          // Fuego: ascenso turbulento
          this.waveOffset += 0.1;
          const turbulence = Math.sin(this.waveOffset) * this.turbulence * 20;
          this.x += this.velocityX + turbulence * 0.05;
          this.y += this.velocityY;

          if (this.y < -this.length) {
            this.y = height + this.length;
            this.x = Math.random() * width;
          }
        } else if (previewConfig.flowPattern === 'static-pulse') {
          // Estático: solo pulso sin movimiento
          this.pulsePhase += this.pulseSpeed;
          const pulse = Math.sin(this.pulsePhase);
          this.baseOpacity = 0.4 + pulse * 0.4;
        } else {
          // Thermal flow: flujo diagonal organizado
          this.waveOffset += 0.015;
          const waveInfluence = Math.sin(this.x * previewConfig.waveFrequency + this.waveOffset);
          this.x += this.velocityX + waveInfluence * 0.1;
          this.y += this.velocityY + waveInfluence * 0.08;
        }

        // Fade in/out
        if (this.life < 40) {
          this.opacity = Math.min(this.baseOpacity, this.opacity + this.fadeSpeed);
        } else if (this.life > this.maxLife - 40) {
          this.opacity = Math.max(0, this.opacity - this.fadeSpeed);
        }

        this.generatePoints();

        // Resetear si sale del canvas o termina vida (excepto rain y horizontal que se manejan arriba)
        if (previewConfig.flowPattern !== 'rain-streamline' && previewConfig.flowPattern !== 'horizontal-flow') {
          if (this.x < -this.length || this.x > width + this.length ||
              this.y < -this.length || this.y > height + this.length ||
              this.life > this.maxLife || this.opacity <= 0) {
            this.reset();
          }
        }
      }

      draw(ctx) {
        if (this.points.length < 2) return;

        ctx.save();

        // Glow effect
        ctx.shadowBlur = previewConfig.glowIntensity;
        ctx.shadowColor = this.color;

        ctx.globalAlpha = this.opacity;
        ctx.strokeStyle = this.color;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = this.lineWidth;

        // Dibujar línea
        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);
        for (let i = 1; i < this.points.length; i++) {
          ctx.lineTo(this.points[i].x, this.points[i].y);
        }
        ctx.stroke();

        // Punto brillante al final
        const head = this.points[this.points.length - 1];
        ctx.shadowBlur = previewConfig.glowIntensity * 1.5;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(head.x, head.y, this.lineWidth * 0.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }

    // Crear líneas de flujo
    const lines = [];
    for (let i = 0; i < previewConfig.baseLineCount; i++) {
      lines.push(new PreviewFlowLine());
    }

    let lastTime = performance.now();
    const targetFPS = 45;
    const frameInterval = 1000 / targetFPS;

    const animate = (currentTime) => {
      const elapsed = currentTime - lastTime;

      if (elapsed < frameInterval) {
        previewAnimationRef.current = requestAnimationFrame(animate);
        return;
      }

      lastTime = currentTime - (elapsed % frameInterval);

      // Motion blur
      ctx.fillStyle = 'rgba(15, 23, 42, 0.08)';
      ctx.fillRect(0, 0, width, height);

      // Actualizar y dibujar líneas
      for (let i = 0; i < lines.length; i++) {
        lines[i].update();
        lines[i].draw(ctx);
      }

      previewAnimationRef.current = requestAnimationFrame(animate);
    };

    // Iniciar con fondo oscuro
    ctx.fillStyle = 'rgba(15, 23, 42, 1)';
    ctx.fillRect(0, 0, width, height);

    animate(performance.now());

    return () => {
      if (previewAnimationRef.current) {
        cancelAnimationFrame(previewAnimationRef.current);
      }
    };
  }, [showModal, form.configuracion_animacion]);

  const fetchVariables = async () => {
    try {
      const token = localStorage.getItem("token");
      console.log("📊 Fetching variables from /api/admin/variables/");
      console.log("Token exists:", !!token);

      const res = await API.get("/api/admin/variables/", {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log("✅ Variables response:", res.data);
      console.log("Variables count:", res.data.variables?.length || 0);

      setVariables(res.data.variables || []);
    } catch (err) {
      console.error("❌ Error al cargar variables:", err);
      console.error("Error response:", err.response?.data);
      console.error("Error status:", err.response?.status);
      showNotification("error", "Error", "No se pudieron cargar las variables");
    } finally {
      setLoading(false);
    }
  };

  const updateApiConfig = (field, value) => {
    setForm({
      ...form,
      configuracion_api: {
        ...form.configuracion_api,
        [field]: value === "" ? null : value
      }
    });
  };

  const updateAnimacionConfig = (field, value) => {
    // Si se cambia el tipo de animación, cargar toda la plantilla
    if (field === 'tipo_animacion') {
      const template = getAnimationConfig(value);
      setForm({
        ...form,
        configuracion_animacion: {
          habilitada: form.configuracion_animacion.habilitada,
          opacidad: form.configuracion_animacion.opacidad,
          velocidad: form.configuracion_animacion.velocidad,
          tipo_animacion: value,
          ...template // Cargar toda la config de la plantilla
        }
      });
    } else {
      // Para otros campos, solo actualizar ese campo
      setForm({
        ...form,
        configuracion_animacion: {
          ...form.configuracion_animacion,
          [field]: value
        }
      });
    }
  };

  const openCreate = () => {
    setEditingVariable(null);
    setForm({
      nombre: "",
      clave: "",
      descripcion: "",
      categoria: "meteorologica",
      unidad: "",
      icono: "",
      orden: 999,
      activa: true,
      configuracion_api: {
        tipo: "openweathermap",
        layer: "",
        formato: null,
        tile_matrix_set: null,
        parametro_open_meteo: null,
        max_native_zoom: null
      },
      configuracion_animacion: {
        habilitada: true,
        opacidad: 0.9,
        velocidad: "normal",
        tipo_animacion: "thermal-flow",
        ...getAnimationConfig("thermal-flow") // Cargar config completa de la plantilla
      }
    });
    setShowModal(true);
  };

  const openEdit = (variable) => {
    setEditingVariable(variable);
    setForm({
      nombre: variable.nombre,
      clave: variable.clave,
      descripcion: variable.descripcion || "",
      categoria: variable.categoria,
      unidad: variable.unidad,
      icono: variable.icono || "",
      orden: variable.orden,
      activa: variable.activa,
      configuracion_api: variable.configuracion_api || {
        tipo: "openweathermap",
        layer: "",
        formato: null,
        tile_matrix_set: null,
        parametro_open_meteo: null,
        max_native_zoom: null
      },
      configuracion_animacion: variable.configuracion_animacion && variable.configuracion_animacion.tipo_animacion
        ? variable.configuracion_animacion // Si ya tiene config completa, usarla
        : {
            habilitada: true,
            opacidad: 0.9,
            velocidad: "normal",
            tipo_animacion: "thermal-flow",
            ...getAnimationConfig("thermal-flow") // Si no, cargar plantilla por defecto
          }
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar campos requeridos
    if (!form.nombre || !form.clave || !form.categoria || !form.unidad) {
      showNotification("error", "Error", "Por favor completa todos los campos requeridos");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      if (editingVariable) {
        // Actualizar
        await API.put(`/api/admin/variables/${editingVariable._id}/`, form, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showNotification("success", "Éxito", "Variable actualizada correctamente");
      } else {
        // Crear
        await API.post("/api/admin/variables/create/", form, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showNotification("success", "Éxito", "Variable creada correctamente");
      }

      setShowModal(false);
      fetchVariables();
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Error al guardar la variable";
      showNotification("error", "Error", errorMsg);
    }
  };

  const handleToggle = async (variableId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await API.patch(`/api/admin/variables/${variableId}/toggle/`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Actualizar estado local
      setVariables(prev => prev.map(v =>
        v._id === variableId ? { ...v, activa: res.data.activa } : v
      ));

      showNotification("success", "Éxito", res.data.message);
    } catch (err) {
      showNotification("error", "Error", "No se pudo cambiar el estado de la variable");
    }
  };

  const handleDelete = async (variableId) => {
    if (!window.confirm("¿Estás seguro de eliminar esta variable?")) return;

    try {
      const token = localStorage.getItem("token");
      await API.delete(`/api/admin/variables/${variableId}/delete/`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showNotification("success", "Éxito", "Variable eliminada correctamente");
      fetchVariables();
    } catch (err) {
      showNotification("error", "Error", "No se pudo eliminar la variable");
    }
  };

  // Filtrar variables según término de búsqueda
  const filteredVariables = variables.filter(variable => {
    const search = searchTerm.toLowerCase();
    return (
      variable.nombre.toLowerCase().includes(search) ||
      variable.clave.toLowerCase().includes(search) ||
      variable.categoria.toLowerCase().includes(search) ||
      variable.unidad.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return <div className="admin-loading">Cargando variables...</div>;
  }

  return (
    <div className="admin-tab-content">
      <div className="admin-header">
        <h3>Gestión de Variables del Dashboard</h3>
        <div className="admin-header-actions">
          <div className="admin-search-container">
            <input
              type="text"
              placeholder="🔍 Buscar variable..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="admin-search-input"
            />
          </div>
          <button className="btn btn-blue btn-with-icon" onClick={openCreate}>
            <span className="btn-icon-emoji">➕</span>
            Agregar Variable
          </button>
        </div>
      </div>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Clave</th>
              <th>Categoría</th>
              <th>Unidad</th>
              <th>Orden</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredVariables.length === 0 ? (
              <tr>
                <td colSpan="7" className="center">
                  {searchTerm ? "No se encontraron variables que coincidan con tu búsqueda" : "No hay variables registradas"}
                </td>
              </tr>
            ) : (
              filteredVariables.map((variable) => (
                <tr key={variable._id}>
                  <td>{variable.nombre}</td>
                  <td><code>{variable.clave}</code></td>
                  <td><span className="category-badge">{variable.categoria}</span></td>
                  <td>{variable.unidad}</td>
                  <td>{variable.orden}</td>
                  <td>
                    <button
                      className={`toggle-btn ${variable.activa ? 'active' : 'inactive'}`}
                      onClick={() => handleToggle(variable._id)}
                      title={variable.activa ? "Click para desactivar" : "Click para activar"}
                    >
                      {variable.activa ? "✓ Activa" : "✗ Inactiva"}
                    </button>
                  </td>
                  <td className="actions-cell">
                    <button
                      className="btn btn-blue btn-sm"
                      onClick={() => openEdit(variable)}
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      className="btn btn-red btn-sm"
                      onClick={() => handleDelete(variable._id)}
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal para crear/editar */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content-admin modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-admin">
              <h3>{editingVariable ? "Editar Variable" : "Nueva Variable"}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="admin-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Nombre *</label>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    placeholder="Ej: Temperatura terrestre"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Clave *</label>
                  <input
                    type="text"
                    value={form.clave}
                    onChange={(e) => setForm({ ...form, clave: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                    placeholder="Ej: temperatura_terrestre"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  placeholder="Descripción breve de la variable"
                  rows="2"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Categoría *</label>
                  <select
                    value={form.categoria}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                    required
                  >
                    <option value="meteorologica">Meteorológica</option>
                    <option value="oceanica">Oceánica</option>
                    <option value="agricola">Agrícola</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Unidad *</label>
                  <input
                    type="text"
                    value={form.unidad}
                    onChange={(e) => setForm({ ...form, unidad: e.target.value })}
                    placeholder="Ej: °C, mm, %"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Ícono</label>
                  <input
                    type="text"
                    value={form.icono}
                    onChange={(e) => setForm({ ...form, icono: e.target.value })}
                    placeholder="Ej: thermometer, cloud-rain"
                  />
                </div>

                <div className="form-group">
                  <label>Orden</label>
                  <input
                    type="number"
                    value={form.orden}
                    onChange={(e) => setForm({ ...form, orden: parseInt(e.target.value) || 999 })}
                    min="1"
                  />
                </div>
              </div>

              {/* Configuración de API */}
              <div className="form-section" style={{ marginTop: "24px", padding: "20px", background: "#f9fafb", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                <h4 style={{ margin: "0 0 16px 0", color: "#374151", fontSize: "15px", fontWeight: "600" }}>
                  🌐 Configuración de API
                </h4>

                <div className="form-row">
                  <div className="form-group">
                    <label>Tipo de API *</label>
                    <select
                      value={form.configuracion_api.tipo}
                      onChange={(e) => updateApiConfig('tipo', e.target.value)}
                      required
                      style={{ background: "white" }}
                    >
                      <option value="openweathermap">OpenWeatherMap</option>
                      <option value="wmts">NASA GIBS (WMTS)</option>
                      <option value="rainviewer">RainViewer</option>
                      <option value="open-meteo">Open-Meteo</option>
                    </select>
                    <small style={{ display: "block", marginTop: "4px", color: "#6b7280", fontSize: "12px" }}>
                      {form.configuracion_api.tipo === "openweathermap" && "🌤️ Para temperatura, viento, precipitación"}
                      {form.configuracion_api.tipo === "wmts" && "🛰️ Para datos satelitales NASA (temperatura del mar, precipitación)"}
                      {form.configuracion_api.tipo === "rainviewer" && "🌧️ Para precipitación en tiempo real"}
                      {form.configuracion_api.tipo === "open-meteo" && "📊 Para datos meteorológicos históricos"}
                    </small>
                  </div>

                  <div className="form-group">
                    <label>Layer *</label>
                    <input
                      type="text"
                      value={form.configuracion_api.layer || ""}
                      onChange={(e) => updateApiConfig('layer', e.target.value)}
                      placeholder={
                        form.configuracion_api.tipo === "openweathermap" ? "Ej: temp_new, wind_new, precipitation_new" :
                        form.configuracion_api.tipo === "wmts" ? "Ej: GHRSST_L4_MUR_Sea_Surface_Temperature" :
                        "Nombre del layer"
                      }
                      required
                      style={{ background: "white" }}
                    />
                  </div>
                </div>

                {form.configuracion_api.tipo === "wmts" && (
                  <div className="form-row">
                    <div className="form-group">
                      <label>Formato</label>
                      <input
                        type="text"
                        value={form.configuracion_api.formato || ""}
                        onChange={(e) => updateApiConfig('formato', e.target.value)}
                        placeholder="Ej: png, jpeg"
                        style={{ background: "white" }}
                      />
                    </div>

                    <div className="form-group">
                      <label>Tile Matrix Set</label>
                      <input
                        type="text"
                        value={form.configuracion_api.tile_matrix_set || ""}
                        onChange={(e) => updateApiConfig('tile_matrix_set', e.target.value)}
                        placeholder="Ej: GoogleMapsCompatible_Level7"
                        style={{ background: "white" }}
                      />
                    </div>
                  </div>
                )}

                {form.configuracion_api.tipo === "wmts" && (
                  <div className="form-group">
                    <label>Max Native Zoom</label>
                    <input
                      type="number"
                      value={form.configuracion_api.max_native_zoom || ""}
                      onChange={(e) => updateApiConfig('max_native_zoom', parseInt(e.target.value) || null)}
                      placeholder="Ej: 7, 9, 10"
                      min="1"
                      max="18"
                      style={{ background: "white" }}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>Parámetro Open-Meteo (opcional)</label>
                  <input
                    type="text"
                    value={form.configuracion_api.parametro_open_meteo || ""}
                    onChange={(e) => updateApiConfig('parametro_open_meteo', e.target.value)}
                    placeholder="Ej: temperature_2m_mean, precipitation_sum"
                    style={{ background: "white" }}
                  />
                  <small style={{ display: "block", marginTop: "4px", color: "#6b7280", fontSize: "12px" }}>
                    Para datos históricos complementarios
                  </small>
                </div>
              </div>

              {/* Configuración de Animación */}
              <div className="form-section" style={{ marginTop: "16px", padding: "20px", background: "#fef3c7", borderRadius: "8px", border: "1px solid #fbbf24" }}>
                <h4 style={{ margin: "0 0 16px 0", color: "#92400e", fontSize: "15px", fontWeight: "600" }}>
                  ✨ Configuración de Animación
                </h4>

                <div className="form-group checkbox-group" style={{ marginBottom: "16px" }}>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={form.configuracion_animacion.habilitada}
                      onChange={(e) => updateAnimacionConfig('habilitada', e.target.checked)}
                    />
                    <span>Habilitar animación en el mapa</span>
                  </label>
                </div>

                {!form.configuracion_animacion.habilitada && (
                  <div style={{
                    padding: "24px",
                    textAlign: "center",
                    color: "#92400e",
                    background: "white",
                    borderRadius: "8px",
                    border: "2px dashed #fbbf24"
                  }}>
                    <div style={{ fontSize: "32px", marginBottom: "8px" }}>⏸️</div>
                    <div style={{ fontWeight: "600", marginBottom: "4px" }}>Animación deshabilitada</div>
                    <div style={{ fontSize: "12px", opacity: 0.7 }}>
                      Activa el checkbox arriba para configurar la animación
                    </div>
                  </div>
                )}

                {form.configuracion_animacion.habilitada && (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Tipo de Animación *</label>
                        <select
                          value={form.configuracion_animacion.tipo_animacion}
                          onChange={(e) => updateAnimacionConfig('tipo_animacion', e.target.value)}
                          required
                          style={{ background: "white" }}
                        >
                          {getAnimationOptions().map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <small style={{ display: "block", marginTop: "4px", color: "#92400e", fontSize: "12px" }}>
                          {ANIMATION_TEMPLATES[form.configuracion_animacion.tipo_animacion]?.descripcion || "Selecciona un tipo de animación"}
                        </small>
                      </div>

                      <div className="form-group">
                        <label>Velocidad *</label>
                        <select
                          value={form.configuracion_animacion.velocidad}
                          onChange={(e) => updateAnimacionConfig('velocidad', e.target.value)}
                          required
                          style={{ background: "white" }}
                        >
                          <option value="lenta"> Lenta</option>
                          <option value="normal"> Normal</option>
                          <option value="rapida"> Rápida</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Opacidad: {form.configuracion_animacion.opacidad.toFixed(1)}</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={form.configuracion_animacion.opacidad}
                        onChange={(e) => updateAnimacionConfig('opacidad', parseFloat(e.target.value))}
                        style={{
                          width: "90%",
                          background: "white",
                          accentColor: "#fbbf24"
                        }}
                      />
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#92400e", marginTop: "4px" }}>
                        <span>Transparente</span>
                        <span>Opaco</span>
                      </div>
                    </div>

                    {/* Mini Preview de Animación */}
                    <div style={{
                      marginTop: "20px",
                      padding: "16px",
                      background: "white",
                      borderRadius: "8px",
                      border: "2px solid #fbbf24"
                    }}>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "12px"
                      }}>
                        <label style={{ margin: 0, fontWeight: "600", color: "#92400e" }}>
                          🎬 Vista Previa en Vivo
                        </label>
                        <span style={{ fontSize: "11px", color: "#92400e", fontStyle: "italic" }}>
                          Actualiza en tiempo real
                        </span>
                      </div>
                      <canvas
                        ref={previewCanvasRef}
                        width={400}
                        height={200}
                        style={{
                          width: "100%",
                          height: "200px",
                          borderRadius: "6px",
                          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                          boxShadow: "inset 0 2px 8px rgba(0,0,0,0.3)"
                        }}
                      />
                      <div style={{
                        marginTop: "8px",
                        fontSize: "11px",
                        color: "#92400e",
                        textAlign: "center"
                      }}>
                        {form.configuracion_animacion.tipo_animacion === 'color' && "🌡️ Flujo de calor"}
                        {form.configuracion_animacion.tipo_animacion === 'particulas' && "💧 Partículas cayendo"}
                        {form.configuracion_animacion.tipo_animacion === 'nieve' && "❄️ Nieve con bamboleo"}
                        {form.configuracion_animacion.tipo_animacion === 'ondas' && "🌊 Ondas circulares"}
                        {form.configuracion_animacion.tipo_animacion === 'thermal-flow' && "➡️ Flujo horizontal"}
                        {form.configuracion_animacion.tipo_animacion === 'vortex' && "🌀 Vórtice en espiral"}
                        {form.configuracion_animacion.tipo_animacion === 'fuego' && "🔥 Calor ascendente"}
                        {form.configuracion_animacion.tipo_animacion === 'estatico' && "⭐ Partículas pulsantes"}
                        {" • "}
                        Velocidad: {form.configuracion_animacion.velocidad}
                        {" • "}
                        Opacidad: {(form.configuracion_animacion.opacidad * 100).toFixed(0)}%
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="form-group checkbox-group" style={{ marginTop: "16px" }}>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.activa}
                    onChange={(e) => setForm({ ...form, activa: e.target.checked })}
                  />
                  <span>Variable activa (visible en el dashboard)</span>
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-blue">
                  {editingVariable ? "Actualizar" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

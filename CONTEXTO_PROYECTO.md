# Contexto del proyecto — Pulso Productivo (antes Climétrica)

> Estado del trabajo, decisiones tomadas y cómo continuar en otro equipo.
> Última actualización: 29/10/2026 · Rama de trabajo: `feature/pulso-productivo`

---

## 1. Por qué existen estos cambios

Climétrica se presenta a una convocatoria para apoyar a la **cadena agroalimentaria afectada
por el sismo**. Para la convocatoria la plataforma evoluciona a **Pulso Productivo**: además de
información climática para productores, debe servir a otros actores de la cadena (proveedores
de insumos, comercializadores y servicios) y conectarlos entre sí.

Acordado en la reunión del 27/10/2026:

- Los cambios son **de frontend** y deben **verse**: se van a tomar pantallazos y hacer pruebas
  funcionales como evidencia. El backend no se modifica (lo adapta el equipo de backend).
- Todos los datos de ejemplo son **simulados y anónimos** (sin nombres de personas ni negocios)
  y se ubican **solo en el Cauca**, zona piloto.
- El nombre viejo no se borra: debe verse que **Climétrica evolucionó** a Pulso Productivo.

---

## 2. Los 5 cambios pedidos y dónde están

| # | Cambio | Qué se ve | Archivos principales |
|---|--------|-----------|----------------------|
| 1 | **Nombre** | "Pulso Productivo" como título y debajo "antes Climétrica" (tenue) en login, registro, recuperar contraseña, panel, pestaña del navegador y PDFs | `components/BrandHeader.jsx`, `public/index.html` |
| 2 | **Puntos de otros usuarios** | 28 puntos anónimos en el Cauca. Color = tipo de actor; ícono = actividad (fertilizantes, café, transporte, restaurante…). Leyenda "Red de actores" para mostrar/ocultar tipos. Registro con 4 perfiles | `config/actores.js`, `config/actoresSimulados.js`, `pages/UserMapDashboard.jsx`, `pages/Register.jsx` |
| 3 | **Variables de mercado** | Selector "Mercado" que depende del cultivo elegido (ej. Papa → precio por bulto, papa criolla por arroba, transporte por bulto). Panel con valor, variación 7 días y mini gráfica. **Datos de ejemplo** | `config/variablesMercado.js`, `components/MarketPanel.jsx` |
| 4 | **Formulario de datos del cultivo** | En Mis registros → "Ver más" → pestaña "Mis datos del cultivo ＋". Campos según el cultivo; agregar, editar y eliminar. Se guarda **en el navegador** (localStorage) | `components/CropRecordForm.jsx`, `config/camposCultivo.js` |
| 5 | **Recomendaciones para subsanar riesgos** | Debajo de "Riesgos identificados": qué hacer, oportunidad e **insumos cercanos** con distancia. También en el detalle del registro y en los PDF | `config/accionesRiesgo.js`, `components/RiskActions.jsx` |

**Perfiles de actor** (clave guardada en `role`): `proveedor_insumos`, `productor` (se mantuvo la
clave para no romper cuentas existentes), `comercializador`, `servicios`. Los roles anteriores
(`vendedor`, `inversionista`) se siguen mostrando con su nombre.

---

## 3. Ajustes adicionales hechos después

- **Mapa:** abre centrado en el Cauca; el departamento se resalta (contorno real, resto del mapa
  atenuado, casilla "Resaltar Cauca" en la leyenda). Límite en `config/limiteCauca.js`.
- **Barra de controles:** se adapta al ancho de pantalla (los campos ya no se montan). "Cultivo"
  va antes de "Mercado".
- **Aviso "Datos en tiempo real":** aparece al cambiar de variable y se oculta solo.
- **Tooltips de los puntos:** quedan por encima de las capas climáticas (antes se teñían).
- **Atribución del mapa** (© OpenStreetMap…): legible y sin recortarse.
- **Animación "Temperatura del mar":** usa un contorno de Suramérica para separar tierra y mar
  (antes la costa pacífica del Cauca contaba como tierra). En `components/AnimatedLayer.jsx`.
- **Detalle del registro:** el mapa y la serie solo salen en la pestaña "Detalles Climáticos";
  al cambiar de pestaña el contenido aparece arriba. El PDF sigue incluyendo mapa y gráfica.
- **Contraseñas:** botón de ojo para mostrar/ocultar en todos los campos
  (`components/PasswordInput.jsx`).
- **Mi ubicación** (reunión del 29/10/2026): el usuario que inicia sesión aparece en el mapa con un
  marcador propio (anillo que pulsa, etiqueta "Tú", color de su perfil). Al hacer clic muestra
  nombre, lugar, municipio y coordenadas. La ubicación es **simulada** en el Cauca y siempre es la
  misma para la misma cuenta (`config/ubicacionUsuario.js`). Botón "Mi ubicación" en la leyenda.
  Los globos de los demás puntos (actores y alertas de vías) muestran la distancia en km hasta
  esa ubicación, en línea recta.
- **Estado de vías:** 4 alertas simuladas (3 derrumbes y 1 inundación) con una señal de triángulo;
  el nombre ("Derrumbe", "Vía cerrada") se lee al acercarse (zoom 10 o más). Se pueden ocultar
  desde la leyenda (`config/estadoVias.js`).
- **Cultivo → Sector:** en pantalla todo lo que decía "cultivo" dice "sector" (selector, pestañas,
  PDF). Los nombres internos y la base de datos no cambian, para no romper registros ni el backend.
- **Mercado junto al selector:** el panel de mercado se abre justo debajo del selector "Mercado".
- **Mercado en el análisis:** en Mis registros → "Ver más", el recuadro de arriba muestra las
  variables de mercado del sector en vez de promedio/máximo/mínimo (siguen en "Datos Climáticos"),
  y la pestaña "Análisis del sector" trae tarjetas de mercado (`components/MarketSummary.jsx`).
- **"Detalles Climáticos" → "Detalles del sector"** (pestaña del detalle del registro).
- **Íconos de los títulos:** en el detalle del registro, los títulos con texto en degradado
  pintaban de azul los emojis; ahora usan un azul sólido.
- **Mapas base** (todos gratuitos y sin clave): OpenStreetMap, **Oscuro** (Esri Dark Gray
  Canvas) y **Satélite detallado** (imagen de Esri con vías y nombres; hasta nivel 18 se ven
  casas y techos, más cerca se amplía esa imagen). Se quitó Voyager. Zoom máximo del mapa: 20.
- **Botón de animación** sobre el mapa (a la derecha del botón de mapa base, ícono de ondas que
  se mueven cuando está activa; gris y tachado cuando está detenida): activa o detiene la
  animación de colores de la variable. El navegador recuerda la elección.
- **Limpieza:** se eliminó un módulo sin uso que llamaba a un servicio externo de análisis
  (nunca estuvo conectado) junto con su documentación y estilos.

---

## 4. Ideas de mejora pendientes (no implementadas)

- Cruzar mercado con riesgos (ej. "el precio del café subió 3 %: buena semana para vender").
- Formulario según el **perfil** además del cultivo (proveedor: inventario y precios;
  comercializador: volúmenes y rutas).
- Al hacer clic en un punto, mostrar "aliados cercanos" (conexión entre actores).
- Guardar el formulario de datos del cultivo en el backend (hoy solo en el navegador).
- Pasar las variables de mercado a fuentes reales (SIPSA-DANE, FNC, SICE-TAC).

---

## 5. Configurar el proyecto en otro equipo

### Forma rápida: `instalar_equipo.ps1`
Hace todo lo de esta sección con las **mismas versiones** del equipo original
(Git 2.55.0.2, Node.js 24.18.0, Python 3.14.3, MongoDB 7.0.28, dependencias del backend de
`backend/requirements-lock.txt` y del frontend de `frontend/package-lock.json`).
Se puede ejecutar varias veces sin duplicar nada.

1. Clonar el repositorio (5.2) y, si se tiene, dejar el paquete privado
   `Traspaso_PulsoProductivo.zip` en el Escritorio.
2. Abrir **PowerShell como Administrador** en la carpeta del proyecto y ejecutar:
   ```powershell
   Set-ExecutionPolicy -Scope Process Bypass -Force
   .\instalar_equipo.ps1
   ```
3. Si dice que no encuentra `node` o `python` justo después de instalarlos, cerrar PowerShell,
   abrirlo de nuevo (como Administrador) y volver a ejecutar el script.

Los pasos 5.1 a 5.6 explican lo mismo a mano.

### 5.1 Programas
| Programa | Versión | Nota |
|----------|---------|------|
| Git | 2.55.0 | |
| VS Code | 1.143 o superior | |
| Node.js | 24.18.0 (npm 11.16) | |
| Python | 3.14.3 | Marcar "Add python to PATH" |
| MongoDB Community Server | 7.0.28 | Instalar como servicio |

### 5.2 Clonar en la rama de trabajo
```powershell
git clone -b feature/pulso-productivo https://github.com/MiguelCastro45/proyecto_front_climetrica_linux_.git
```

### 5.3 Archivos `.env` (NO están en git)
Crear `backend/.env` y `frontend/.env` a partir de los `.env.example`. Las claves que deben
coincidir entre equipos (`ENCRYPTION_KEY` / `REACT_APP_ENCRYPTION_KEY`, `JWT_SECRET`,
`REACT_APP_OWM_KEY`) se pasan **por un canal privado**, nunca por git ni por chats de grupo.

### 5.4 Dependencias
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1      # si falla: Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
pip install -r requirements-lock.txt    # versiones exactas probadas

cd ..\frontend
npm ci                                  # versiones exactas del package-lock.json
```

### 5.5 Base de datos
`backend/datos_base/` trae la configuración que no tiene datos personales: **cultivos** y
**variables del mapa**. Para cargarla:
```powershell
cd backend
.\venv\Scripts\Activate.ps1
python import_database.py datos_base --replace
```
Los **usuarios** y los **registros guardados** no van en git (tienen correos, cédulas y
teléfonos). Si se necesitan, se exportan en el equipo original con `python export_database.py`
y se pasan por un medio privado; luego `python import_database.py <carpeta>`.
Sin usuarios, basta con crear una cuenta nueva desde "Crear cuenta".

### 5.6 Ejecutar
```powershell
# Terminal 1
cd backend; .\venv\Scripts\Activate.ps1; python manage.py runserver   # http://localhost:8000
# Terminal 2
cd frontend; npm start                                                # http://localhost:3000
```

### 5.7 Problemas conocidos
- **"[eslint] EBADF: bad file descriptor"** o un error de ESLint que no corresponde al código:
  detener `npm start`, borrar `frontend/node_modules/.cache` y volver a iniciar.
- **"Something is already running on port 3000"**: ya hay otro `npm start` abierto. Cerrarlo
  (Administrador de tareas → Node.js) o aceptar otro puerto.
- `npm run build` tarda mucho (más de 15 min) por el tamaño de `UserMapDashboard.jsx`;
  para trabajar basta con `npm start`.

---

## 6. Convenciones del repositorio

- Trabajo de Pulso Productivo en `feature/pulso-productivo`; se pasa a `main` con pull request.
- Commits y documentación en español.
- El historial de `main` se reescribió el 27/10/2026: si alguien tiene una copia anterior, debe
  volver a clonar (o `git fetch` + `git reset --hard origin/main` si no tiene cambios propios).

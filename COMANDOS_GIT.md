# Comandos Git - Subir Documentación y Base de Datos

> Guía para subir toda la documentación y exportación de base de datos al repositorio

---

## 📋 Antes de Empezar

### Verificar Git Status

```bash
cd /home/leaduin/proyectos/proyecto/climetrica
git status
```

---

## 🔍 Archivos a Agregar

### Documentación Nueva (7 archivos)

```bash
# Verificar archivos nuevos de documentación
ls -lh *.md | grep -E "(GUIA_INSTALACION|DOCUMENTACION_BACKEND|DOCUMENTACION_FRONTEND|DOCUMENTACION_SCRIPTS|ARQUITECTURA_SISTEMA|INDICE_DOCUMENTACION|RESUMEN_DOCUMENTACION|COMANDOS_GIT)"
```

### Scripts Nuevos (2 archivos)

```bash
# Verificar scripts nuevos
ls -lh backend/*.py | grep -E "(export_database|import_database)"
```

### Exportación Base de Datos

```bash
# Verificar exportación
ls -lh backend/database_exports/export_20251215_235456/
```

---

## 📦 Paso 1: Agregar Archivos de Documentación

```bash
# Agregar documentación principal
git add GUIA_INSTALACION.md
git add DOCUMENTACION_BACKEND.md
git add DOCUMENTACION_FRONTEND.md
git add DOCUMENTACION_SCRIPTS.md
git add ARQUITECTURA_SISTEMA.md
git add INDICE_DOCUMENTACION.md
git add RESUMEN_DOCUMENTACION.md
git add COMANDOS_GIT.md

# Actualizar README
git add README.md
```

---

## 📦 Paso 2: Agregar Scripts

```bash
# Agregar scripts de base de datos
git add backend/export_database.py
git add backend/import_database.py
```

---

## 📦 Paso 3: Agregar Exportación de Base de Datos

```bash
# Agregar directorio de exportaciones
git add backend/database_exports/export_20251215_235456/
```

**Nota**: Esto agregará:
- `users.json` (1.4 KB - 3 usuarios)
- `crops.json` (6.7 KB - 9 cultivos)
- `climate_data.json` (43 KB - 10 registros)
- `dashboard_variables.json` (6.5 KB - 5 variables)
- `export_summary.json` (587 B - resumen)

---

## 📦 Paso 4: Verificar Archivos Agregados

```bash
# Ver archivos en staging
git status
```

Deberías ver algo como:

```
Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
        new file:   ARQUITECTURA_SISTEMA.md
        new file:   COMANDOS_GIT.md
        new file:   DOCUMENTACION_BACKEND.md
        new file:   DOCUMENTACION_FRONTEND.md
        new file:   DOCUMENTACION_SCRIPTS.md
        new file:   GUIA_INSTALACION.md
        new file:   INDICE_DOCUMENTACION.md
        modified:   README.md
        new file:   RESUMEN_DOCUMENTACION.md
        new file:   backend/database_exports/export_20251215_235456/climate_data.json
        new file:   backend/database_exports/export_20251215_235456/crops.json
        new file:   backend/database_exports/export_20251215_235456/dashboard_variables.json
        new file:   backend/database_exports/export_20251215_235456/export_summary.json
        new file:   backend/database_exports/export_20251215_235456/users.json
        new file:   backend/export_database.py
        new file:   backend/import_database.py
```

---

## 💾 Paso 5: Crear Commit

### Opción 1: Commit Detallado

```bash
git commit -m "docs: Agregar documentación completa del sistema y exportación de base de datos

- Agregar GUIA_INSTALACION.md con instalación paso a paso completa
- Agregar DOCUMENTACION_BACKEND.md con API REST y base de datos
- Agregar DOCUMENTACION_FRONTEND.md con componentes y páginas
- Agregar DOCUMENTACION_SCRIPTS.md con scripts de utilidad
- Agregar ARQUITECTURA_SISTEMA.md con diseño del sistema
- Agregar INDICE_DOCUMENTACION.md para navegación
- Agregar RESUMEN_DOCUMENTACION.md con resumen ejecutivo
- Actualizar README.md con enlaces a toda la documentación
- Agregar scripts export_database.py e import_database.py
- Exportar base de datos completa (4 colecciones, 27 documentos)
  - users (3 documentos)
  - crops (9 documentos)
  - climate_data (10 documentos)
  - dashboard_variables (5 documentos)

Fecha: 2025-12-15"
```

### Opción 2: Commit Simple

```bash
git commit -m "docs: Documentación completa del sistema y exportación de BD

Incluye:
- 7 nuevos documentos de referencia técnica
- 2 scripts de backup/restore de BD
- Exportación completa de base de datos (27 documentos)
- README actualizado con índice de documentación"
```

---

## 🚀 Paso 6: Subir a Repositorio

### Verificar Rama Actual

```bash
git branch
```

### Subir a la Rama Main

```bash
git push origin main
```

### Si estás en otra rama

```bash
# Subir a tu rama actual
git push origin <nombre-de-tu-rama>

# O crear nueva rama para documentación
git checkout -b docs/complete-documentation
git push -u origin docs/complete-documentation
```

---

## 🔄 Comandos Completos (Todo en Uno)

```bash
#!/bin/bash
# Script para agregar toda la documentación

cd /home/leaduin/proyectos/proyecto/climetrica

# Agregar documentación
git add GUIA_INSTALACION.md \
        DOCUMENTACION_BACKEND.md \
        DOCUMENTACION_FRONTEND.md \
        DOCUMENTACION_SCRIPTS.md \
        ARQUITECTURA_SISTEMA.md \
        INDICE_DOCUMENTACION.md \
        RESUMEN_DOCUMENTACION.md \
        COMANDOS_GIT.md \
        README.md

# Agregar scripts
git add backend/export_database.py \
        backend/import_database.py

# Agregar exportación de BD
git add backend/database_exports/export_20251215_235456/

# Verificar
git status

# Commit
git commit -m "docs: Documentación completa del sistema y exportación de BD

Incluye:
- 7 nuevos documentos de referencia técnica
- 2 scripts de backup/restore de BD
- Exportación completa de base de datos (27 documentos)
- README actualizado con índice de documentación

Fecha: 2025-12-15"

# Push
git push origin main
```

---

## ⚠️ Consideraciones Importantes

### 1. Verificar .gitignore

Asegúrate de que `.env` y otros archivos sensibles NO estén en el commit:

```bash
# Verificar que .env no está en staging
git status | grep .env

# Si aparece, removerlo:
git reset HEAD backend/.env
git reset HEAD frontend/.env
```

### 2. Archivos que NO se deben subir

```
backend/.env
backend/venv/
frontend/.env
frontend/node_modules/
frontend/build/
*.pyc
__pycache__/
.DS_Store
```

### 3. Tamaño del Commit

El commit incluirá aproximadamente:
- **Documentación**: ~200 KB
- **Exportación BD**: ~58 KB
- **Scripts**: ~5 KB
- **Total**: ~263 KB

---

## 🔍 Verificación Post-Commit

### Verificar Commit Local

```bash
# Ver último commit
git log -1

# Ver archivos en el commit
git show --name-only

# Ver diferencias
git show
```

### Verificar en Remoto

```bash
# Ver commits remotos
git log origin/main -5

# Verificar que se subió correctamente
git fetch origin
git status
```

---

## 📊 Estadísticas del Commit

```bash
# Ver estadísticas del commit
git show --stat

# Debería mostrar algo como:
# 17 files changed
# ~500 insertions
```

---

## 🔄 En Caso de Error

### Deshacer Staging (antes de commit)

```bash
# Remover archivos del staging
git reset HEAD <archivo>

# O remover todos
git reset HEAD
```

### Deshacer Commit (antes de push)

```bash
# Deshacer último commit pero mantener cambios
git reset --soft HEAD^

# Deshacer último commit y cambios
git reset --hard HEAD^
```

### Deshacer Push (¡CUIDADO!)

```bash
# Solo si es absolutamente necesario
git revert HEAD
git push origin main
```

---

## 📋 Checklist Final

Antes de hacer push, verificar:

- [ ] Todos los archivos de documentación agregados
- [ ] Scripts de BD agregados
- [ ] Exportación de BD agregada
- [ ] README actualizado
- [ ] NO se incluyeron archivos .env
- [ ] NO se incluyeron node_modules o venv
- [ ] Mensaje de commit descriptivo
- [ ] Verificado con `git status`
- [ ] Revisado con `git show`

---

## 🎉 Después del Push

### Verificar en GitHub/GitLab

1. Ir al repositorio en la web
2. Verificar que aparezcan los nuevos archivos
3. Revisar que la documentación se vea correctamente
4. Verificar que el README muestre los enlaces

### Notificar al Equipo

```
📢 Documentación actualizada:

✅ Se agregó documentación completa del sistema
✅ Guías de instalación y configuración
✅ Documentación técnica de backend y frontend
✅ Scripts de backup/restore de base de datos
✅ Exportación actual de la base de datos

Ver: README.md para índice completo
```

---

## 📝 Comandos Útiles Adicionales

### Ver Historial de Commits

```bash
# Historial completo
git log --oneline --graph --all

# Últimos 5 commits
git log -5 --pretty=format:"%h - %an, %ar : %s"
```

### Comparar con Remoto

```bash
# Ver diferencias con remoto
git diff origin/main

# Ver commits que faltan por subir
git log origin/main..HEAD
```

### Actualizar desde Remoto

```bash
# Descargar cambios
git fetch origin

# Merge con main
git merge origin/main

# O pull (fetch + merge)
git pull origin main
```

---

## 🔐 Notas de Seguridad

### Antes de Subir

1. **Revisar que NO se incluyan**:
   - Contraseñas
   - API keys
   - Tokens
   - Archivos .env
   - Credenciales

2. **La exportación de BD incluye**:
   - Password hashes (bcrypt) ✅ Seguro
   - Datos de usuarios (nombres, emails) ⚠️ Revisar si es necesario
   - Sin contraseñas en texto plano ✅

3. **Recomendación**:
   - Si el repo es público, considera no incluir users.json
   - O sanitizar datos sensibles antes de exportar

---

## 👥 Autor

Sistema de Monitoreo Climático - Climétrica

## 📅 Fecha

15 de diciembre de 2025

---

**¡Listo para subir al repositorio!** 🚀

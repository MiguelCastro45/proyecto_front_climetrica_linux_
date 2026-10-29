<#
  instalar_equipo.ps1 - Configura Pulso Productivo (antes Climetrica) en un equipo nuevo.

  Instala las mismas versiones que el equipo original, actualiza el codigo a la rama de
  trabajo, crea el entorno del backend, instala el frontend y carga la base de datos.
  Se puede ejecutar varias veces: lo que ya esta listo se salta.

  USO (PowerShell como ADMINISTRADOR, dentro de la carpeta del proyecto):
      Set-ExecutionPolicy -Scope Process Bypass -Force
      .\instalar_equipo.ps1

  Opciones:
      -Paquete "C:\ruta\Traspaso_PulsoProductivo.zip"   Paquete privado (.env, usuarios, historial).
                                                       Por defecto se busca en el Escritorio.
      -SinInstalarProgramas                            No instala programas (solo proyecto y datos).

  Versiones (las del equipo original, 29/10/2026):
      Git 2.55.0.2 | Node.js 24.18.0 (npm 11) | Python 3.14.3 | MongoDB Server 7.0.28
      Backend: backend\requirements-lock.txt (Django 6.1.1, pymongo 4.18.0, ...)
      Frontend: frontend\package-lock.json (React 19, Leaflet 1.9, ...)
#>
param(
    [string]$Paquete = "",
    [switch]$SinInstalarProgramas
)

$Raiz = $PSScriptRoot
$Rama = 'feature/pulso-productivo'
$Programas = [ordered]@{
    'Git.Git'            = '2.55.0.2'
    'OpenJS.NodeJS.LTS'  = '24.18.0'
    'Python.Python.3.14' = '3.14.3'
    'MongoDB.Server'     = '7.0.28'
}

function Paso($texto)  { Write-Host ""; Write-Host "==> $texto" -ForegroundColor Cyan }
function Ok($texto)    { Write-Host "    OK  $texto" -ForegroundColor Green }
function Aviso($texto) { Write-Host "    !!  $texto" -ForegroundColor Yellow }
function Error-Fatal($texto) { Write-Host ""; Write-Host "ERROR: $texto" -ForegroundColor Red; exit 1 }
function Refrescar-Path {
    $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
                [Environment]::GetEnvironmentVariable('Path', 'User')
}

Write-Host "Pulso Productivo - configuracion de equipo" -ForegroundColor White
Write-Host "Proyecto: $Raiz"

if (-not (Test-Path (Join-Path $Raiz 'backend\manage.py'))) {
    Error-Fatal "Ejecuta este script desde la carpeta del proyecto (donde estan backend\ y frontend\)."
}

# ---------------------------------------------------------------------------
# 1. Programas con version exacta (winget)
# ---------------------------------------------------------------------------
if (-not $SinInstalarProgramas) {
    Paso "1/7 Programas (versiones exactas)"

    $identidad = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
    if (-not $identidad.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        Error-Fatal "Abre PowerShell como Administrador (clic derecho > Ejecutar como administrador) o usa -SinInstalarProgramas."
    }
    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
        Error-Fatal "No se encontro winget. Instala 'Instalador de aplicacion' (App Installer) desde Microsoft Store."
    }

    # Python puede venir del instalador de python.org (winget no lo ve): se revisa directo
    $pythonVersion = ''
    if (Get-Command py -ErrorAction SilentlyContinue) { $pythonVersion = (& py -3.14 --version 2>$null | Out-String) }
    if (-not $pythonVersion -and (Get-Command python -ErrorAction SilentlyContinue)) { $pythonVersion = (& python --version 2>$null | Out-String) }

    foreach ($id in $Programas.Keys) {
        $version = $Programas[$id]
        if ($id -eq 'Python.Python.3.14' -and $pythonVersion -match [regex]::Escape($version)) {
            Ok "Python $version ya instalado"
            continue
        }
        $instalado = (winget list --id $id --exact --accept-source-agreements 2>$null | Out-String)
        if ($instalado -match [regex]::Escape($version)) {
            Ok "$id $version ya instalado"
            continue
        }
        if ($instalado -match [regex]::Escape($id)) {
            Aviso "$id ya esta instalado con otra version; se deja como esta (se esperaba $version)."
            continue
        }
        Write-Host "    Instalando $id $version ..."
        winget install --id $id --version $version --exact --silent `
            --accept-package-agreements --accept-source-agreements
        if ($LASTEXITCODE -eq 0) { Ok "$id $version instalado" }
        else { Aviso "winget termino con codigo $LASTEXITCODE para $id. Revisa el mensaje de arriba." }
    }
    Refrescar-Path
} else {
    Paso "1/7 Programas: omitido (-SinInstalarProgramas)"
}

foreach ($cmd in 'git', 'node', 'npm') {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Error-Fatal "No se encuentra '$cmd'. Cierra y vuelve a abrir PowerShell (para refrescar el PATH) y ejecuta de nuevo el script."
    }
}
Ok ("git " + (git --version) + " | node " + (node -v) + " | npm " + (npm -v))

# ---------------------------------------------------------------------------
# 2. MongoDB (servicio)
# ---------------------------------------------------------------------------
Paso "2/7 MongoDB"
$servicio = Get-Service -Name MongoDB -ErrorAction SilentlyContinue
if ($servicio) {
    if ($servicio.Status -ne 'Running') {
        try { Start-Service MongoDB -ErrorAction Stop } catch { Aviso "No se pudo iniciar el servicio MongoDB: $_" }
    }
    Ok "Servicio MongoDB: $((Get-Service MongoDB).Status)"
} else {
    Aviso "No existe el servicio 'MongoDB'. Reinstala MongoDB Server marcando 'Install MongoD as a Service'."
}

# ---------------------------------------------------------------------------
# 3. Codigo en la rama de trabajo
# ---------------------------------------------------------------------------
Paso "3/7 Codigo (rama $Rama)"
Push-Location $Raiz
git fetch origin
git checkout $Rama
if ($LASTEXITCODE -ne 0) { Aviso "No se pudo cambiar a $Rama (hay cambios sin guardar?). Se continua con la rama actual." }
else {
    git pull --ff-only origin $Rama
    if ($LASTEXITCODE -ne 0) { Aviso "No se pudo actualizar con git pull. Revisa 'git status'." } else { Ok "Codigo actualizado" }
}
Pop-Location

# ---------------------------------------------------------------------------
# 4. Paquete privado: .env, usuarios/registros e historial (NO esta en git)
# ---------------------------------------------------------------------------
Paso "4/7 Paquete privado"
if (-not $Paquete) {
    $Paquete = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Traspaso_PulsoProductivo.zip'
}
$Privado = $null
if (Test-Path $Paquete) {
    $Privado = Join-Path $env:TEMP 'pulso_traspaso'
    if (Test-Path $Privado) { Remove-Item $Privado -Recurse -Force }
    Expand-Archive -Path $Paquete -DestinationPath $Privado -Force
    Ok "Paquete encontrado: $Paquete"

    foreach ($par in @(@('frontend.env', 'frontend'), @('backend.env', 'backend'))) {
        $origen = Join-Path $Privado ("env\" + $par[0])
        $destino = Join-Path $Raiz ($par[1] + "\.env")
        if (-not (Test-Path $origen)) { continue }
        if (Test-Path $destino) { Ok ($par[1] + "\.env ya existe (no se reemplaza)") }
        else { Copy-Item $origen $destino; Ok ($par[1] + "\.env copiado") }
    }

    $restaurar = Join-Path $Privado 'restaurar_privado.ps1'
    if (Test-Path $restaurar) { & $restaurar -Raiz $Raiz -Origen $Privado }
} else {
    Aviso "No se encontro el paquete privado ($Paquete)."
    Aviso "Crea backend\.env y frontend\.env a partir de los .env.example (claves por canal privado)."
}

# ---------------------------------------------------------------------------
# 5. Backend: entorno virtual + dependencias con version exacta
# ---------------------------------------------------------------------------
Paso "5/7 Backend (Python)"
$venv = Join-Path $Raiz 'backend\venv'
$python = Join-Path $venv 'Scripts\python.exe'
if (-not (Test-Path $python)) {
    if (Get-Command py -ErrorAction SilentlyContinue) { & py -3.14 -m venv $venv }
    elseif (Get-Command python -ErrorAction SilentlyContinue) { & python -m venv $venv }
    else { Error-Fatal "No se encuentra Python. Cierra y vuelve a abrir PowerShell y ejecuta de nuevo el script." }
}
if (-not (Test-Path $python)) { Error-Fatal "No se pudo crear el entorno virtual en $venv" }
& $python -m pip install --disable-pip-version-check -q "pip==26.2.1"
& $python -m pip install --disable-pip-version-check -r (Join-Path $Raiz 'backend\requirements-lock.txt')
if ($LASTEXITCODE -ne 0) { Error-Fatal "Fallo la instalacion de dependencias del backend (ver arriba)." }
Ok ("Backend listo con " + (& $python --version))

# ---------------------------------------------------------------------------
# 6. Frontend: dependencias exactas del package-lock.json
# ---------------------------------------------------------------------------
Paso "6/7 Frontend (npm ci)"
Push-Location (Join-Path $Raiz 'frontend')
npm ci --no-audit --no-fund
$codigoNpm = $LASTEXITCODE
Pop-Location
if ($codigoNpm -ne 0) { Error-Fatal "Fallo 'npm ci' en frontend (ver arriba)." }
Ok "Frontend listo"

# ---------------------------------------------------------------------------
# 7. Base de datos
# ---------------------------------------------------------------------------
Paso "7/7 Base de datos"
Push-Location (Join-Path $Raiz 'backend')
$env:PYTHONIOENCODING = 'utf-8'
# --replace: se puede ejecutar varias veces sin duplicar (reemplaza solo esas colecciones)
's' | & $python import_database.py datos_base --replace
if ($LASTEXITCODE -eq 0) { Ok "Cultivos y variables del mapa cargados" } else { Aviso "No se pudieron cargar los datos base (MongoDB esta en ejecucion?)." }

if ($Privado -and (Test-Path (Join-Path $Privado 'base_de_datos'))) {
    's' | & $python import_database.py (Join-Path $Privado 'base_de_datos') --replace
    if ($LASTEXITCODE -eq 0) { Ok "Usuarios y registros cargados" } else { Aviso "No se pudieron cargar usuarios y registros." }
} else {
    Aviso "Sin usuarios importados: crea una cuenta desde 'Crear cuenta' en la aplicacion."
}
Pop-Location

# Borrar la copia temporal del paquete privado (tiene claves y datos personales)
if ($Privado -and (Test-Path $Privado)) { Remove-Item $Privado -Recurse -Force }

# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "Listo. Para ejecutar el proyecto abre dos terminales:" -ForegroundColor Green
Write-Host "  Terminal 1 (backend):  cd `"$Raiz\backend`"; .\venv\Scripts\Activate.ps1; python manage.py runserver"
Write-Host "  Terminal 2 (frontend): cd `"$Raiz\frontend`"; npm start"
Write-Host "  Abrir http://localhost:3000"
Write-Host ""
Write-Host "Recuerda borrar el paquete privado del Escritorio cuando termines." -ForegroundColor Yellow

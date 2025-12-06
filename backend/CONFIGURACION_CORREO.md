# Configuración del Servicio de Correo Electrónico

Este documento explica cómo configurar el envío de correos electrónicos para la recuperación de contraseñas en Climétrica.

## Opción 1: Gmail SMTP (Recomendado para desarrollo)

### Paso 1: Habilitar verificación en dos pasos

1. Ve a tu cuenta de Google: https://myaccount.google.com
2. Navega a **Seguridad**
3. Activa la **Verificación en dos pasos**

### Paso 2: Crear contraseña de aplicación

1. Ve a https://myaccount.google.com/apppasswords
2. Selecciona "Correo" como aplicación
3. Selecciona "Otro (nombre personalizado)" como dispositivo
4. Escribe "Climetrica" como nombre
5. Copia la contraseña de 16 caracteres generada

### Paso 3: Configurar variables de entorno

#### En Linux/Mac:

```bash
export SENDER_EMAIL="tu_correo@gmail.com"
export SENDER_PASSWORD="xxxx xxxx xxxx xxxx"  # La contraseña de aplicación generada
export SMTP_SERVER="smtp.gmail.com"
export SMTP_PORT="587"
```

#### En Windows (PowerShell):

```powershell
$env:SENDER_EMAIL="tu_correo@gmail.com"
$env:SENDER_PASSWORD="xxxx xxxx xxxx xxxx"
$env:SMTP_SERVER="smtp.gmail.com"
$env:SMTP_PORT="587"
```

#### Permanente (en .env o .bashrc):

Crea un archivo `.env` en la raíz del proyecto:

```env
SENDER_EMAIL=tu_correo@gmail.com
SENDER_PASSWORD=xxxx xxxx xxxx xxxx
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
```

Luego instala `python-dotenv` y carga las variables:

```bash
pip install python-dotenv
```

### Paso 4: Verificar configuración

Ejecuta el servidor Django y prueba la funcionalidad de recuperación de contraseña desde el frontend.

---

## Opción 2: SendGrid (Recomendado para producción)

SendGrid ofrece hasta 100 correos gratuitos al día.

### Paso 1: Crear cuenta en SendGrid

1. Regístrate en https://sendgrid.com
2. Verifica tu correo electrónico
3. Crea una API Key en Settings > API Keys

### Paso 2: Instalar dependencia

```bash
pip install sendgrid
```

### Paso 3: Modificar email_service.py

Reemplaza el contenido con:

```python
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
import os

def send_password_reset_email(to_email, user_name, new_password):
    message = Mail(
        from_email=os.getenv('SENDER_EMAIL'),
        to_emails=to_email,
        subject='Recuperación de Contraseña - Climétrica',
        html_content=f'''
        <!-- Aquí va el HTML del correo -->
        '''
    )

    try:
        sg = SendGridAPIClient(os.getenv('SENDGRID_API_KEY'))
        response = sg.send(message)
        print(f"✓ Correo enviado: {response.status_code}")
        return True
    except Exception as e:
        print(f"✗ Error: {e}")
        raise
```

### Paso 4: Configurar variable de entorno

```bash
export SENDGRID_API_KEY="SG.xxxxxxxxxxxxxxx"
export SENDER_EMAIL="noreply@climetrica.com"
```

---

## Opción 3: Modo Simulación (Para pruebas sin correo real)

Si no configuras las variables de entorno, el sistema funcionará en modo simulación:

- La contraseña se genera correctamente
- Se actualiza en la base de datos
- Se imprime en la consola del servidor
- **NO** se envía correo real

Esto es útil para desarrollo y pruebas locales.

### Para ver la contraseña generada:

1. Observa la consola del servidor Django
2. Busca mensajes como:
   ```
   ⚠️  Configuración de correo no establecida. Usando modo simulación.
   📧 Correo que se enviaría a: usuario@example.com
   👤 Nombre de usuario: Juan Pérez
   🔑 Nueva contraseña: aB3$xY9#mK2@
   ```

---

## Verificación de Funcionamiento

### 1. Probar desde el Frontend

1. Ve a http://localhost:3000/forgot-password
2. Ingresa un correo registrado
3. Haz clic en "Enviar nueva contraseña"
4. Verifica:
   - ✓ Mensaje de éxito
   - ✓ Correo recibido (o mensaje en consola si es simulación)
   - ✓ Puedes iniciar sesión con la nueva contraseña

### 2. Probar desde Postman/cURL

```bash
# Verificar si existe el correo
curl -X POST http://localhost:8000/api/check-email/ \
  -H "Content-Type: application/json" \
  -d '{"email": "usuario@example.com"}'

# Solicitar reset de contraseña
curl -X POST http://localhost:8000/api/reset-password/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@example.com",
    "new_password": "TempPass123!"
  }'
```

---

## Solución de Problemas

### Error: "Authentication failed"

- Verifica que hayas creado una contraseña de aplicación (no uses tu contraseña de Gmail)
- Asegúrate de que la verificación en dos pasos esté activada

### Error: "Connection refused"

- Verifica que el puerto 587 esté abierto
- Prueba con puerto 465 (SSL) cambiando:
  ```python
  SMTP_PORT = 465
  # Y usa SSL en lugar de TLS:
  with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT) as server:
  ```

### El correo llega a spam

- Configura SPF, DKIM y DMARC en tu dominio
- Usa un servicio profesional como SendGrid para producción

### Variables de entorno no se cargan

- Reinicia el servidor después de configurarlas
- Verifica que estén en el mismo terminal donde ejecutas el servidor
- Considera usar un archivo `.env` y `python-dotenv`

---

## Seguridad

⚠️ **IMPORTANTE**:

1. **NUNCA** incluyas credenciales directamente en el código
2. **NUNCA** hagas commit de archivos `.env` al repositorio
3. Agrega `.env` a tu `.gitignore`
4. Usa variables de entorno en producción
5. Rota las credenciales regularmente
6. Limita el acceso a las API keys

---

## Para Producción

Se recomienda:

1. Usar SendGrid, Mailgun o Amazon SES
2. Configurar un dominio verificado
3. Usar templates profesionales de correo
4. Implementar rate limiting (limitar intentos)
5. Agregar logs de auditoría
6. Implementar un sistema de cola para correos (Celery + Redis)

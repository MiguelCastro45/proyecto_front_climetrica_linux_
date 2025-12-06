"""
Servicio de Envío de Correos Electrónicos

Este módulo proporciona funcionalidades para enviar correos electrónicos
usando Gmail SMTP. Actualmente implementa:
    - Envío de contraseñas temporales para recuperación de cuenta

Configuración requerida en .env:
    SMTP_SERVER=smtp.gmail.com
    SMTP_PORT=587
    SENDER_EMAIL=tu_correo@gmail.com
    SENDER_PASSWORD=tu_contraseña_de_aplicación

Para Gmail:
    1. Habilitar verificación en 2 pasos en tu cuenta de Google
    2. Crear una "Contraseña de aplicación" en:
       https://myaccount.google.com/apppasswords
    3. Usar esa contraseña en SENDER_PASSWORD

Servicios alternativos soportados:
    - SendGrid (modificar SMTP_SERVER y credenciales)
    - Mailgun
    - Amazon SES
    - Cualquier servidor SMTP compatible

Autor: Sistema Climétrica
Fecha: 2025
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os


def send_password_reset_email(to_email, user_name, new_password):
    """
    Envía un correo electrónico con la nueva contraseña temporal.

    Esta función genera y envía un correo HTML profesional con la
    contraseña temporal generada para recuperación de cuenta.

    Args:
        to_email (str): Correo electrónico del destinatario
        user_name (str): Nombre completo del usuario para personalización
        new_password (str): Contraseña temporal generada

    Returns:
        bool: True si el correo se envió correctamente

    Raises:
        Exception: Si falla el envío del correo (credenciales inválidas,
                  servidor SMTP no disponible, etc.)

    Example:
        >>> send_password_reset_email(
        ...     to_email="juan@example.com",
        ...     user_name="Juan Pérez",
        ...     new_password="Temp123!@"
        ... )
        ✓ Correo enviado exitosamente a juan@example.com
        True

    Modo Simulación:
        Si las variables de entorno no están configuradas, la función
        opera en modo simulación: imprime los detalles en consola sin
        enviar el correo real. Útil para desarrollo y testing.

    Note:
        - El correo se envía en formato HTML + texto plano (fallback)
        - Usa TLS para conexión segura al servidor SMTP
        - El diseño del email es responsive y profesional
        - Incluye instrucciones claras para el usuario
        - La contraseña temporal debe cambiarse tras el primer login
    """

    # Configuración del servidor SMTP
    # NOTA: Estas credenciales deben estar en variables de entorno por seguridad
    SMTP_SERVER = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
    SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
    SENDER_EMAIL = os.getenv('SENDER_EMAIL', 'tu_correo@gmail.com')
    SENDER_PASSWORD = os.getenv('SENDER_PASSWORD', 'tu_contraseña_de_aplicación')

    # Si no están configuradas las variables de entorno, solo simular el envío
    if SENDER_EMAIL == 'tu_correo@gmail.com' or SENDER_PASSWORD == 'tu_contraseña_de_aplicación':
        print("⚠️  Configuración de correo no establecida. Usando modo simulación.")
        print(f"📧 Correo que se enviaría a: {to_email}")
        print(f"👤 Nombre de usuario: {user_name}")
        print(f"🔑 Nueva contraseña: {new_password}")
        return True  # Simular éxito

    try:
        # Crear el mensaje
        message = MIMEMultipart("alternative")
        message["Subject"] = "Recuperación de Contraseña - Climétrica"
        message["From"] = SENDER_EMAIL
        message["To"] = to_email

        # Contenido del correo en texto plano
        text_content = f"""
Hola {user_name},

Has solicitado restablecer tu contraseña en Climétrica.

Tu nueva contraseña temporal es: {new_password}

Por favor, inicia sesión con esta contraseña y cámbiala inmediatamente por una de tu preferencia.

Instrucciones:
1. Ve a https://climetrica.com/login
2. Inicia sesión con tu correo y esta contraseña temporal
3. Ve a tu perfil y cambia la contraseña

Si no solicitaste este cambio, por favor contacta con soporte inmediatamente.

Saludos,
Equipo de Climétrica
        """

        # Contenido del correo en HTML
        html_content = f"""
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recuperación de Contraseña</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f3f4f6;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #3B5998, #2E86DE); padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">
                                🌤️ Climétrica
                            </h1>
                            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">
                                Recuperación de Contraseña
                            </p>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Hola <strong>{user_name}</strong>,
                            </p>

                            <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
                                Has solicitado restablecer tu contraseña en Climétrica. Tu nueva contraseña temporal es:
                            </p>

                            <div style="background: rgba(59, 130, 246, 0.08); border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 6px;">
                                <p style="margin: 0; font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                                    Contraseña Temporal
                                </p>
                                <p style="margin: 10px 0 0 0; font-size: 24px; color: #1f2937; font-weight: 700; font-family: 'Courier New', monospace; letter-spacing: 1px;">
                                    {new_password}
                                </p>
                            </div>

                            <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 20px 0;">
                                <strong style="color: #dc2626;">⚠️ Importante:</strong> Por seguridad, te recomendamos cambiar esta contraseña temporal inmediatamente después de iniciar sesión.
                            </p>

                            <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 25px 0;">
                                <p style="margin: 0 0 12px 0; font-size: 14px; color: #374151; font-weight: 600;">
                                    📋 Instrucciones:
                                </p>
                                <ol style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px; line-height: 1.8;">
                                    <li>Inicia sesión con tu correo y esta contraseña temporal</li>
                                    <li>Ve a "Configurar Cuenta" en tu panel de usuario</li>
                                    <li>Cambia la contraseña por una de tu preferencia</li>
                                    <li>Asegúrate de usar una contraseña segura (mayúsculas, minúsculas, números y símbolos)</li>
                                </ol>
                            </div>

                            <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 25px 0 0 0; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                                Si no solicitaste este cambio, por favor contacta con nuestro equipo de soporte inmediatamente.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; color: #6b7280; font-size: 13px;">
                                © 2025 Climétrica. Todos los derechos reservados.
                            </p>
                            <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 12px;">
                                Este es un correo automático, por favor no responder.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        """

        # Adjuntar ambas versiones del contenido
        part1 = MIMEText(text_content, "plain")
        part2 = MIMEText(html_content, "html")
        message.attach(part1)
        message.attach(part2)

        # Conectar al servidor SMTP y enviar el correo
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()  # Seguridad TLS
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.sendmail(SENDER_EMAIL, to_email, message.as_string())

        print(f"✓ Correo enviado exitosamente a {to_email}")
        return True

    except Exception as e:
        print(f"✗ Error al enviar correo: {str(e)}")
        raise Exception(f"No se pudo enviar el correo: {str(e)}")


# Configuración para usar Gmail:
# 1. Crear una "Contraseña de aplicación" en tu cuenta de Google:
#    https://myaccount.google.com/apppasswords
# 2. Establecer las variables de entorno:
#    export SENDER_EMAIL="tu_correo@gmail.com"
#    export SENDER_PASSWORD="tu_contraseña_de_aplicación"
#
# Alternativamente, puedes usar otros servicios como:
# - SendGrid
# - Mailgun
# - Amazon SES
# - Etc.

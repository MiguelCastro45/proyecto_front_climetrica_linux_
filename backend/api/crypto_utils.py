"""
Utilidades para encriptación/desencriptación de datos
Usa AES encryption compatible con CryptoJS del frontend
"""
import os
import base64
from Crypto.Cipher import AES
from Crypto.Protocol.KDF import PBKDF2
from Crypto.Util.Padding import unpad
import hashlib


def decrypt_data(encrypted_data):
    """
    Desencripta datos que fueron encriptados con CryptoJS.AES en el frontend

    Args:
        encrypted_data (str): Texto encriptado en formato base64

    Returns:
        str: Texto desencriptado
    """
    try:
        # Clave de encriptación - debe coincidir con la del frontend
        secret_key = os.getenv('ENCRYPTION_KEY', 'ClimetricaSecretKey2024')

        # CryptoJS genera un formato especial: "Salted__" + salt (8 bytes) + ciphertext
        encrypted_bytes = base64.b64decode(encrypted_data)

        # Verificar si tiene el prefijo "Salted__"
        if encrypted_bytes[:8] == b'Salted__':
            # Extraer salt (siguientes 8 bytes)
            salt = encrypted_bytes[8:16]
            ciphertext = encrypted_bytes[16:]

            # Derivar clave e IV usando el mismo método que CryptoJS (EVP_BytesToKey)
            key_iv = evp_bytes_to_key(secret_key.encode('utf-8'), salt, 32 + 16)
            key = key_iv[:32]  # 256 bits
            iv = key_iv[32:32+16]  # 128 bits

            # Desencriptar usando AES-256-CBC
            cipher = AES.new(key, AES.MODE_CBC, iv)
            decrypted = unpad(cipher.decrypt(ciphertext), AES.block_size)

            return decrypted.decode('utf-8')
        else:
            raise ValueError("Formato de datos encriptados no válido")

    except Exception as e:
        print(f"❌ Error desencriptando datos: {str(e)}")
        raise ValueError(f"Error al desencriptar datos: {str(e)}")


def evp_bytes_to_key(password, salt, key_len):
    """
    Implementación de OpenSSL's EVP_BytesToKey para compatibilidad con CryptoJS

    Args:
        password (bytes): Contraseña/clave
        salt (bytes): Salt de 8 bytes
        key_len (int): Longitud total necesaria (key + iv)

    Returns:
        bytes: Key + IV derivados
    """
    m = []
    i = 0
    while len(b''.join(m)) < key_len:
        md = hashlib.md5()
        data = password + salt
        if i > 0:
            data = m[i - 1] + data
        md.update(data)
        m.append(md.digest())
        i += 1
    return b''.join(m)[:key_len]

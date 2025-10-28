# seed_db.py
from api.mongodb import db, users_col
from api.auth_utils import hash_password
from datetime import datetime, UTC
from bson import ObjectId

def create_user(first_name, last_name, email, phone, identification, role, plain_password, status="active"):
    # Hash de la contraseña y conversión a cadena (para evitar binData en Mongo)
    pwd_hash = hash_password(plain_password)
    if isinstance(pwd_hash, bytes):
        pwd_hash = pwd_hash.decode('utf-8')

    user = {
        "first_name": first_name,
        "last_name": last_name,
        "email": email,
        "phone": phone,
        "identification": identification,
        "role": role,
        "status": status,  # ✅ "active" o "inactive"
        "password_hash": pwd_hash,
        "created_at": datetime.now(UTC),   # ✅ reemplaza utcnow()
        "updated_at": datetime.now(UTC),
        "must_change_password": False
    }

    res = users_col.insert_one(user)
    print(f"✅ Creado {role}: {email} (id={res.inserted_id})")

if __name__ == "__main__":
    # ⚠️ Borra colección de usuarios (solo para desarrollo)
    users_col.delete_many({})
    print("🧹 Colección 'users' limpiada.")

    # 🧑‍💼 Admin principal
    create_user("Admin", "Principal", "admin@climetrica.test", "+571000000", "900000001", "admin", "AdminPass123!")

    # 👥 Usuarios de ejemplo
    create_user("Juan", "Rodriguez", "juan@climetrica.test", "+571000001", "900000002", "productor", "ProdPass123!")
    create_user("Ana", "Gomez", "ana@climetrica.test", "+571000002", "900000003", "vendedor", "VendPass123!")
    create_user("Carlos", "Lopez", "carlos@climetrica.test", "+571000003", "900000004", "inversionista", "InvPass123!")

    print(" Seed completado exitosamente.")

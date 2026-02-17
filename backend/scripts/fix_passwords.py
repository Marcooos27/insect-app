from backend.database import get_connection
from passlib.context import CryptContext

USER_EMAIL = "marcos_operario@insecteat.es"
NEW_PASSWORD = "adminMarcosOperario"  # en claro
MAX_BCRYPT_LEN = 72

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def main():
    conn = get_connection()
    cursor = conn.cursor()

    # Truncamos la contraseña a 72 bytes
    truncated_pass = NEW_PASSWORD[:MAX_BCRYPT_LEN]

    # Hasheamos
    new_hash = pwd_context.hash(truncated_pass)

    # Actualizamos la DB
    cursor.execute(
        "UPDATE usuarios SET password_hash = :hash WHERE email = :email",
        {"hash": new_hash, "email": USER_EMAIL}
    )
    conn.commit()
    cursor.close()
    conn.close()

    print("Contraseña actualizada correctamente.")

if __name__ == "__main__":
    main()

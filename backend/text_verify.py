# test_verify.py
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain: str, hashed: str):
    truncated = plain[:72]  # Igual que en tu app
    return pwd_context.verify(truncated, hashed)

# -----------------------------
# CAMBIA ESTO
hashed_pw = "$2b$12$G6rW8zBYV98XiRYJio9rQOlEK.iJC3ZLKCDaGwZPIhrQiybk/GKg."
password_real = "prueba"

resultado = verify_password(password_real, hashed_pw)
print("Coincide:", resultado)

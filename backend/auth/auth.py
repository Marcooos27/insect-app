# backend/auth/auth.py

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from passlib.context import CryptContext

from backend.database import get_connection
from backend.auth.jwt import create_access_token, decode_token

import psycopg2
from psycopg2 import sql, IntegrityError

import os
from dotenv import load_dotenv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

router = APIRouter(prefix="/auth", tags=["auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


# ================================
# MODELOS
# ================================

class RegisterRequest(BaseModel):
    email: str
    username: str
    password: str
    admin_password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class PasswordUpdate(BaseModel):
    old_password: str
    new_password: str


class ProfileUpdate(BaseModel):
    username: str


# ================================
# HELPERS
# ================================

def hash_password(password: str):
    # Truncamos a 72 bytes para bcrypt
    truncated = password.strip()[:72]
    return pwd_context.hash(truncated)


def verify_password(plain: str, hashed: str):
    # Truncamos a 72 bytes antes de verificar
    truncated = plain.strip()[:72]
    return pwd_context.verify(truncated, hashed)


# ================================
# REGISTER
# ================================

@router.post("/register")
def register_user(data: RegisterRequest):
    
    conn = get_connection()
    cur = conn.cursor()

    try:
        # 1️⃣ Verificar si el email ya existe
        cur.execute(
            "SELECT id FROM usuarios WHERE email = :email",
            {"email": data.email},
        )

        if cur.fetchone():
            raise HTTPException(400, "El email ya está registrado")

        # 2️⃣ Crear operario automáticamente
        new_id = cur.var(oracledb.NUMBER)

        cur.execute("""
            INSERT INTO operario (nombre, turno_trabajo)
            VALUES (:nombre, :turno)
            RETURNING id_operario INTO :new_id
        """, {
            "nombre": data.username,
            "turno": "Mañana",
            "new_id": new_id
        })

        id_operario = new_id.getvalue()[0]

        # 3️⃣ Hashear contraseña
        hashed_pw = hash_password(data.password)

        # 4️⃣ Determinar rol seguro
        rol_final = "user"  # por defecto

        if hasattr(data, "rol") and data.rol == "admin":
            ADMIN_PASSWORD = os.getenv("ADMIN_REGISTER_PASSWORD")

            if data.admin_password != ADMIN_PASSWORD:
                raise HTTPException(
                    status_code=403,
                    detail="Contraseña de administrador incorrecta"
                )

            rol_final = "admin"

        # 4️⃣ Crear usuario vinculado al operario
        cur.execute("""
            INSERT INTO usuarios
            (id, email, username, password_hash, rol, id_operario)
            VALUES
            (usuarios_seq.NEXTVAL, :email, :username, :password_hash, :rol, :id_operario)
        """, {
            "email": data.email,
            "username": data.username,
            "password_hash": hashed_pw,
            "rol": rol_final,
            "id_operario": id_operario
        })

        conn.commit()

        return {
            "message": "Usuario creado correctamente",
            "id_operario": id_operario,
            "rol": rol_final
        }

    except HTTPException:
        conn.rollback()
        raise

    except Exception as e:
        import traceback
        print(traceback.format_exc())  # 👈 ESTO ES CLAVE
        conn.rollback()
        raise

    finally:
        cur.close()
        conn.close()



# ================================
# LOGIN
# ================================

@router.post("/login")
def login(data: LoginRequest):

    print("Login recibido:", data.email, data.password)

    import traceback

    conn = get_connection()
    cur = conn.cursor()

    try:
        # Normalizamos el email
        email = data.email.strip().lower()

        cur.execute("""
            SELECT id, password_hash, rol, username, email, id_operario
            FROM usuarios
            WHERE LOWER(email) = :email
        """, {"email": email})

        user = cur.fetchone()

        if not user:
            raise HTTPException(401, "Usuario no encontrado (revisa el email)")
        

        print("Hash en DB:", user[1])  # 🟢 para depuración
        print("Verificando password...")


        # Verificamos contraseña
        if not verify_password(data.password, user[1]):
            print("Error: Contraseña no coincide")  # 🟢 para depuración
            raise HTTPException(401, "Contraseña incorrecta")

        # Creamos token con id_operario
        token = create_access_token({
            "user_id": user[0],
            "rol": user[2],
            "id_operario": user[5],
        })

        return {
                "access_token": token,
                "token_type": "bearer",
                "user": {
                    "id": user[0],
                    "username": user[3],
                    "email": user[4],
                    "rol": user[2],
                },
            }

    except Exception as e:
        print("Error en login:", traceback.format_exc())
        raise HTTPException(500, f"Error interno: {str(e)}")

    finally:
        cur.close()
        conn.close()


# ================================
# GET CURRENT USER
# ================================

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials
    payload = decode_token(token)

    user_id = payload.get("user_id")
    id_operario = payload.get("id_operario")

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, email, username, rol
        FROM usuarios
        WHERE id = :id
    """, {"id": user_id})

    user = cur.fetchone()

    cur.close()
    conn.close()

    if not user:
        raise HTTPException(401, "Usuario no válido")

    return {
        "id": user[0],
        "email": user[1],
        "username": user[2],
        "rol": user[3],
        "id_operario": id_operario
    }


# ================================
# GET /me
# ================================

@router.get("/me")
def me(user=Depends(get_current_user)):
    return user


# ================================
# UPDATE PASSWORD
# ================================

@router.put("/user/password")
def update_password(
    data: PasswordUpdate,
    user=Depends(get_current_user),
):

    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        "SELECT password_hash FROM usuarios WHERE id = :id",
        {"id": user["id"]},
    )

    stored = cur.fetchone()[0]

    if not verify_password(data.old_password, stored):
        raise HTTPException(401, "Contraseña actual incorrecta")

    new_hash = hash_password(data.new_password)

    cur.execute(
        "UPDATE usuarios SET password_hash = :1 WHERE id = :2",
        (new_hash, user["id"]),
    )

    conn.commit()
    cur.close()
    conn.close()

    return {"message": "Contraseña actualizada"}


# ================================
# UPDATE PROFILE
# ================================

@router.put("/user/profile")
def update_profile(
    data: ProfileUpdate,
    user=Depends(get_current_user),
):

    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        "UPDATE usuarios SET username = :1 WHERE id = :2",
        (data.username, user["id"]),
    )

    conn.commit()
    cur.close()
    conn.close()

    return {"message": "Perfil actualizado"}




def require_admin(user=Depends(get_current_user)):
    if user["rol"] != "admin":
        raise HTTPException(
            status_code=403,
            detail="Solo administradores pueden hacer esto"
        )
    return user

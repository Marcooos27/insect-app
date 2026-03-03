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
    try:
        cur = conn.cursor()

        # 1️⃣ Verificar email
        cur.execute(
            "SELECT id FROM usuarios WHERE email = %s",
            (data.email.lower().strip(),)
        )

        if cur.fetchone():
            raise HTTPException(400, "El email ya está registrado")

        # 2️⃣ Crear operario (ID automático)
        cur.execute("""
            INSERT INTO operario (nombre, turno_trabajo)
            VALUES (%s, %s)
            RETURNING id_operario
        """, (
            data.username,
            "Mañana"
        ))

        id_operario = cur.fetchone()[0]

        # 3️⃣ Hash password
        hashed_pw = hash_password(data.password)

        # 4️⃣ Rol
        rol_final = "user"
        ADMIN_PASSWORD = os.getenv("ADMIN_REGISTER_PASSWORD")

        if data.admin_password == ADMIN_PASSWORD:
            rol_final = "admin"

        # 5️⃣ Crear usuario
        cur.execute("""
            INSERT INTO usuarios
            (email, username, password_hash, rol, id_operario)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            data.email.lower().strip(),
            data.username,
            hashed_pw,
            rol_final,
            id_operario
        ))

        conn.commit()

        return {
            "message": "Usuario creado correctamente",
            "id_operario": id_operario,
            "rol": rol_final
        }

    except:
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

    conn = get_connection()
    try:
        cur = conn.cursor()

        email = data.email.strip().lower()

        cur.execute("""
            SELECT id, password_hash, rol, username, email, id_operario
            FROM usuarios
            WHERE LOWER(email) = %s
        """, (email,))

        user = cur.fetchone()

        if not user:
            raise HTTPException(status_code=401, detail="Usuario no encontrado")

        if not verify_password(data.password, user[1]):
            raise HTTPException(status_code=401, detail="Contraseña incorrecta")

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

    if not user_id:
        raise HTTPException(401, "Token inválido")

    conn = get_connection()
    try:
        cur = conn.cursor()

        cur.execute("""
            SELECT id, email, username, rol, id_operario
            FROM usuarios
            WHERE id = %s
        """, (user_id,))

        user = cur.fetchone()

        if not user:
            raise HTTPException(401, "Usuario no válido")

        return {
            "id": user[0],
            "email": user[1],
            "username": user[2],
            "rol": user[3],
            "id_operario": user[4]
        }

    finally:
        cur.close()
        conn.close()


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
    try:
        cur = conn.cursor()

        cur.execute(
            "SELECT password_hash FROM usuarios WHERE id = %s",
            (user["id"],)
        )

        row = cur.fetchone()

        if not row:
            raise HTTPException(404, "Usuario no encontrado")

        stored_hash = row[0]

        if not verify_password(data.old_password, stored_hash):
            raise HTTPException(401, "Contraseña actual incorrecta")

        new_hash = hash_password(data.new_password)

        cur.execute(
            "UPDATE usuarios SET password_hash = %s WHERE id = %s",
            (new_hash, user["id"])
        )

        conn.commit()

        return {"message": "Contraseña actualizada correctamente"}

    finally:
        cur.close()
        conn.close()


# ================================
# UPDATE PROFILE
# ================================

@router.put("/user/profile")
def update_profile(
    data: ProfileUpdate,
    user=Depends(get_current_user),
):

    conn = get_connection()
    try:
        cur = conn.cursor()

        cur.execute(
            "UPDATE usuarios SET username = %s WHERE id = %s",
            (data.username, user["id"])
        )

        conn.commit()

        return {"message": "Perfil actualizado correctamente"}

    finally:
        cur.close()
        conn.close()




def require_admin(user=Depends(get_current_user)):
    if user["rol"] != "admin":
        raise HTTPException(
            status_code=403,
            detail="Solo administradores pueden hacer esto"
        )
    return user

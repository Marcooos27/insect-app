# backend/auth/jwt.py

from datetime import datetime, timedelta
from jose import jwt, JWTError
import os
from fastapi import HTTPException, status

SECRET_KEY = os.getenv("JWT_SECRET", "firma_token_marcos_insect_eat_contraseña_super_complicada")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 1


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
        )

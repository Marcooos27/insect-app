from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from .jwt import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")

def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = decode_token(token)
        return payload
    except:
        raise HTTPException(401, "Token inválido")

def require_admin(user = Depends(get_current_user)):
    if user["rol"] != "admin":
        raise HTTPException(403, "No autorizado")
    return user

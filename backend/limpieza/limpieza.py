from fastapi import APIRouter, Depends, HTTPException
from ..auth.auth import get_current_user
from ..database import get_connection

router = APIRouter(prefix="/limpieza", tags=["limpieza"])

@router.get("/estado_hoy")
def estado_hoy(user=Depends(get_current_user)):
    id_operario = user["id_operario"]
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT COUNT(*) FROM registro_limpieza_diario
            WHERE id_operario = %s AND fecha = CURRENT_DATE
        """, (id_operario,))
        count = cur.fetchone()[0]
        return {"realizado": count > 0}
    finally:
        cur.close()
        conn.close()

@router.post("/confirmar")
def confirmar_limpieza(user=Depends(get_current_user)):
    id_operario = user["id_operario"]
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO registro_limpieza_diario (id_operario, fecha)
            VALUES (%s, CURRENT_DATE)
            ON CONFLICT (id_operario, fecha) DO NOTHING
        """, (id_operario,))
        conn.commit()
        return {"ok": True}
    finally:
        cur.close()
        conn.close()
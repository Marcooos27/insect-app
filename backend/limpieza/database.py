from fastapi import APIRouter, Depends
from auth import get_current_user
from database import get_connection

router = APIRouter()

# COMPROBAR SI YA HA REGISTRADO LA LIMPIEZA HOY

@router.get("/limpieza/estado_hoy")
def estado_hoy(user=Depends(get_current_user)):

    conn = get_connection()
    cur = conn.cursor()

    try:
        id_operario = user["id_operario"]

        cur.execute("""
            SELECT 1
            FROM registro_limpieza_diario
            WHERE id_operario = %s
            AND fecha = CURRENT_DATE
        """, [id_operario])

        realizado = cur.fetchone() is not None

        return {
            "realizado": realizado
        }

    finally:
        cur.close()
        conn.close()


# CONFIRMAR LIMPIEZA

@router.post("/limpieza/confirmar")
def confirmar_limpieza(user=Depends(get_current_user)):

    conn = get_connection()
    cur = conn.cursor()

    try:
        id_operario = user["id_operario"]

        cur.execute("""
            INSERT INTO registro_limpieza_diario (
                id_operario,
                fecha
            )
            VALUES (
                %s,
                CURRENT_DATE
            )
            ON CONFLICT (id_operario, fecha)
            DO NOTHING
        """, [id_operario])

        conn.commit()

        return {
            "message": "Limpieza confirmada"
        }

    finally:
        cur.close()
        conn.close()
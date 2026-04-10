# backend/trazabilidad.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import date, timedelta
from backend.database import get_connection

router = APIRouter(tags=["trazabilidad"])


# ============================================================
# MODELOS
# ============================================================

class LoteHuevoIn(BaseModel):
    codigo_qr: str
    origen: Optional[str] = None
    fecha_registro: Optional[date] = None

class FechaSalidaUpdate(BaseModel):
    fecha_salida_prevista: date

class PalletMontadoIn(BaseModel):
    codigo_qr_pallet: str

class EntradaCamaraIn(BaseModel):
    codigo_qr_camara: str
    codigo_qr_pallet: str

class SalidaCamaraIn(BaseModel):
    codigo_qr_pallet: str
    confirmar: bool = False


# ============================================================
# HELPER: obtener lotes activos
# ============================================================

def _get_lote_alimento_activo(cur):
    cur.execute("""
        SELECT id_lote_alimento, descripcion
        FROM Lote_Alimento
        WHERE activo = TRUE
        ORDER BY id_lote_alimento DESC
        LIMIT 1
    """)
    row = cur.fetchone()
    return dict(zip(["id_lote_alimento","descripcion"], row)) if row else None


def _get_lote_huevo_activo(cur):
    cur.execute("""
        SELECT id_lote_huevo, origen
        FROM Lote_Huevo
        WHERE activo = TRUE
        ORDER BY id_lote_huevo DESC
        LIMIT 1
    """)
    row = cur.fetchone()
    return dict(zip(["id_lote_huevo","origen"], row)) if row else None



def _get_pallet_y_engorde(cur, codigo_qr):
    try:
        # Pallet + Engorde en una sola query (están en la misma tabla)
        cur.execute("""
            SELECT id_pallet, estado, id_camara,
                   id_lote_alimento_traz, id_lote_huevo_traz,
                   fecha_entrada_camara, fecha_salida_prevista
            FROM Engorde
            WHERE codigo_qr = %s
        """, [codigo_qr])
        row = cur.fetchone()

        if not row:
            return None, None

        pallet_dict = {
            "id_pallet": row[0],
            "estado": row[1],
            "id_camara": row[2],
        }

        engorde_dict = {
            "id_lote_alimento": row[3],
            "id_lote_huevo": row[4],
            "fecha_entrada_camara": row[5],
            "fecha_salida_prevista": row[6],
        }

        return pallet_dict, engorde_dict

    except Exception as e:
        print("ERROR EN FUNCION PALLET Y ENGORDE:", repr(e))
        raise


# ============================================================
# ESCANEAR QR — entrada única para todos los QR
# ============================================================

@router.get("/scan/{codigo_qr}")
def scan_qr(codigo_qr: str):
    conn = get_connection()
    cur = conn.cursor()

    print("QR recibido:", codigo_qr)
    codigo_qr = codigo_qr.strip().upper()
    print("QR recibido:", codigo_qr)

    try:
        # ───────────────
        # ¿ES CÁMARA?
        # ───────────────
        cur.execute("""
            SELECT id_camara, nombre, capacidad_max, codigo_qr
            FROM Camara
            WHERE codigo_qr = %s
        """, [codigo_qr])
        row = cur.fetchone()

        if row:
            cur.execute("""
                SELECT COUNT(*) FROM Pallet
                WHERE id_camara = %s AND estado = 'en_camara'
            """, [row[0]])

            pallets_dentro = cur.fetchone()[0]

            return {
                "tipo": "camara",
                "datos": {
                    "id_camara": row[0],
                    "nombre": row[1],
                    "capacidad_max": row[2],
                    "codigo_qr": row[3],  # 🔥 IMPORTANTE
                    "pallets_dentro": pallets_dentro,
                    "huecos_libres": row[2] - pallets_dentro
                }
            }

        # ───────────────
        # ¿ES PALLET?
        # ───────────────
        pallet, engorde = _get_pallet_y_engorde(cur, codigo_qr)

        if pallet:
            data = {**pallet}

            if engorde:
                data.update({
                    "id_lote_alimento_traz": engorde["id_lote_alimento"],
                    "id_lote_huevo_traz": engorde["id_lote_huevo"],
                    "fecha_entrada_camara": engorde["fecha_entrada_camara"].strftime("%Y-%m-%d") if engorde["fecha_entrada_camara"] else None,
                    "fecha_salida_prevista": engorde["fecha_salida_prevista"].strftime("%Y-%m-%d") if engorde["fecha_salida_prevista"] else None
                })

            return {"tipo": "pallet", "datos": data}

        # ───────────────
        # ¿ES LOTE ALIMENTO?
        # ───────────────
        cur.execute("""
            SELECT id_lote_alimento, descripcion, fecha_llegada, activo
            FROM Lote_Alimento WHERE codigo_qr = %s
        """, [codigo_qr])
        row = cur.fetchone()

        if row:
            return {
                "tipo": "lote_alimento",
                "datos": {
                    "id_lote_alimento": row[0],
                    "descripcion": row[1],
                    "fecha_llegada": row[2].strftime("%Y-%m-%d") if row[2] else None,
                    "activo": row[3]
                }
            }

        # ───────────────
        # ¿ES LOTE HUEVO?
        # ───────────────
        cur.execute("""
            SELECT id_lote_huevo, origen, fecha_registro, activo
            FROM Lote_Huevo WHERE codigo_qr = %s
        """, [codigo_qr])
        row = cur.fetchone()

        if row:
            return {
                "tipo": "lote_huevo",
                "datos": {
                    "id_lote_huevo": row[0],
                    "origen": row[1],
                    "fecha_registro": row[2].strftime("%Y-%m-%d") if row[2] else None,
                    "activo": row[3]
                }
            }

        raise HTTPException(status_code=404, detail="QR no reconocido")

    finally:
        cur.close()
        conn.close()


# ============================================================
# ACTIVAR LOTE DE ALIMENTO (escanear QR de lote)
# ============================================================

@router.post("/lote_alimento/activar")
def activar_lote_alimento(codigo_qr: str):
    """Al escanear QR de lote_alimento: finaliza el anterior y activa este."""
    conn = get_connection()
    cur = conn.cursor()
    try:
        # Verificar que existe
        cur.execute("SELECT id_lote_alimento FROM Lote_Alimento WHERE codigo_qr = %s", [codigo_qr])
        row = cur.fetchone()
        if not row:
            raise HTTPException(404, "Lote de alimento no encontrado")

        nuevo_id = row[0]

        # Finalizar todos los anteriores activos
        cur.execute("UPDATE Lote_Alimento SET activo = FALSE WHERE activo = TRUE AND id_lote_alimento != %s", [nuevo_id])

        # Activar el nuevo
        cur.execute("UPDATE Lote_Alimento SET activo = TRUE WHERE id_lote_alimento = %s", [nuevo_id])

        conn.commit()
        return {"message": "Lote de alimento activado", "id_lote_alimento": nuevo_id}
    finally:
        cur.close()
        conn.close()


# ============================================================
# ACTIVAR LOTE DE HUEVO
# ============================================================

@router.post("/lote_huevo/activar")
def activar_lote_huevo(data: LoteHuevoIn):
    """Al escanear QR de lote_huevo: finaliza el anterior y activa/crea este."""
    conn = get_connection()
    cur = conn.cursor()
    try:
        # Finalizar anteriores
        cur.execute("UPDATE Lote_Huevo SET activo = FALSE WHERE activo = TRUE")

        # Verificar si ya existe
        cur.execute("SELECT id_lote_huevo FROM Lote_Huevo WHERE codigo_qr = %s", [data.codigo_qr])
        existing = cur.fetchone()

        if existing:
            cur.execute("UPDATE Lote_Huevo SET activo = TRUE WHERE id_lote_huevo = %s", [existing[0]])
            nuevo_id = existing[0]
        else:
            cur.execute("""
                INSERT INTO Lote_Huevo (codigo_qr, origen, fecha_registro, activo)
                VALUES (%s, %s, %s, TRUE)
                RETURNING id_lote_huevo
            """, [data.codigo_qr, data.origen, data.fecha_registro or date.today()])
            nuevo_id = cur.fetchone()[0]

        conn.commit()
        return {"message": "Lote de huevo activado", "id_lote_huevo": nuevo_id}
    finally:
        cur.close()
        conn.close()


# ============================================================
# ESTADO DE UN PALLET
# ============================================================

@router.get("/pallet/{codigo_qr}")
def get_pallet_estado(codigo_qr: str):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT 
                p.id_pallet,
                p.estado,
                p.id_camara,
                e.id_lote_alimento,
                e.id_lote_huevo,
                e.fecha_entrada_camara,
                e.fecha_salida_prevista,
                la.descripcion AS lote_alimento_desc,
                lh.origen AS lote_huevo_origen
            FROM Pallet p
            LEFT JOIN Engorde e ON e.id_pallet = p.id_pallet
            LEFT JOIN Lote_Alimento la ON la.id_lote_alimento = e.id_lote_alimento
            LEFT JOIN Lote_Huevo lh ON lh.id_lote_huevo = e.id_lote_huevo
            WHERE p.codigo_qr = %s
            ORDER BY e.id_engorde DESC
            LIMIT 1
        """, [codigo_qr])

        row = cur.fetchone()

        if not row:
            raise HTTPException(404, "Pallet no encontrado")

        cols = [
            "id_pallet","estado","id_camara",
            "id_lote_alimento","id_lote_huevo",
            "fecha_entrada_camara","fecha_salida_prevista",
            "lote_alimento_desc","lote_huevo_origen"
        ]

        pallet = dict(zip(cols, row))

        for k in ["fecha_entrada_camara","fecha_salida_prevista"]:
            if pallet[k]:
                pallet[k] = pallet[k].strftime("%Y-%m-%d")

        return pallet

    finally:
        cur.close()
        conn.close()


# ============================================================
# MONTAR PALLET (estado: vacio → asignar lotes → preparado)
# ============================================================

@router.post("/pallet/montar")
def montar_pallet(data: PalletMontadoIn):
    """
    Asigna los lotes activos al pallet y lo deja en estado 'preparado'.
    El frontend llamará a esto cuando el operario pulse 'Pallet montado'.
    """
    conn = get_connection()
    cur = conn.cursor()
    try:
        # Verificar pallet
        cur.execute("SELECT id_pallet, estado FROM Pallet WHERE codigo_qr = %s", [data.codigo_qr_pallet])
        row = cur.fetchone()

        if not row:
            raise HTTPException(404, "Pallet no encontrado")

        if row[1] != "vacio":
            raise HTTPException(400, "El pallet no está vacío")

        lote_alimento = _get_lote_alimento_activo(cur)
        lote_huevo = _get_lote_huevo_activo(cur)

        # Crear nuevo engorde
        cur.execute("""
            INSERT INTO Engorde (id_pallet, id_lote_alimento, id_lote_huevo)
            VALUES (%s, %s, %s)
        """, [
            row[0],
            lote_alimento["id_lote_alimento"] if lote_alimento else None,
            lote_huevo["id_lote_huevo"] if lote_huevo else None
        ])

        # Cambiar estado pallet
        cur.execute("""
            UPDATE Pallet SET estado = 'preparado'
            WHERE id_pallet = %s
        """, [row[0]])

        conn.commit()

        return {"message": "Pallet montado"}
    
    finally:
        cur.close()
        conn.close()


# ============================================================
# DESMONTAR PALLET (estado: desmontar → vacio, desasignar lotes)
# ============================================================

@router.post("/pallet/desmontar")
def desmontar_pallet(data: PalletMontadoIn):
    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute("SELECT id_pallet, estado FROM Pallet WHERE codigo_qr = %s", [data.codigo_qr_pallet])
        row = cur.fetchone()

        if not row:
            raise HTTPException(404, "Pallet no encontrado")

        if row[1] != "desmontar":
            raise HTTPException(400, "No está en desmontar")

        cur.execute("""
            UPDATE Pallet SET estado = 'vacio'
            WHERE id_pallet = %s
        """, [row[0]])

        conn.commit()

        return {"message": "Pallet vacío"}

    finally:
        cur.close()
        conn.close()


# ============================================================
# ENTRADA A CÁMARA (estado: preparado → en_camara)
# ============================================================

@router.post("/camara/entrada")
def entrada_camara(data: EntradaCamaraIn):
    conn = get_connection()
    cur = conn.cursor()

    try:
        # Cámara
        cur.execute("""
            SELECT id_camara, capacidad_max
            FROM Camara WHERE codigo_qr = %s
        """, [data.codigo_qr_camara])

        camara = cur.fetchone()
        if not camara:
            raise HTTPException(404, "Cámara no encontrada")

        id_camara, capacidad = camara

        # Hueco libre
        cur.execute("""
            SELECT COUNT(*) FROM Pallet
            WHERE id_camara = %s AND estado = 'en_camara'
        """, [id_camara])

        if cur.fetchone()[0] >= capacidad:
            raise HTTPException(400, "Cámara llena")

        # Pallet
        cur.execute("""
            SELECT id_pallet, estado
            FROM Pallet WHERE codigo_qr = %s
        """, [data.codigo_qr_pallet])

        pallet = cur.fetchone()

        if not pallet:
            raise HTTPException(404, "Pallet no encontrado")

        if pallet[1] != "preparado":
            raise HTTPException(400, "Pallet no preparado")

        hoy = date.today()
        salida = hoy + timedelta(days=7)

        lote_alimento = _get_lote_alimento_activo(cur)
        lote_huevo = _get_lote_huevo_activo(cur)

        # Engorde
        cur.execute("""
            UPDATE Engorde
            SET fecha_entrada_camara = %s,
                fecha_salida_prevista = %s
            WHERE id_pallet = %s
        """, [hoy, salida, pallet[0]])

        # Pallet
        cur.execute("""
            UPDATE Pallet
            SET estado = 'en_camara', id_camara = %s
            WHERE id_pallet = %s
        """, [id_camara, pallet[0]])

        conn.commit()

        return {
            "message": "Entrada a cámara OK",
            "fecha_entrada_camara": hoy.strftime("%Y-%m-%d"),
            "fecha_salida_prevista": salida.strftime("%Y-%m-%d"),
            "lote_alimento": lote_alimento,
            "lote_huevo": lote_huevo
        }

    finally:
        cur.close()
        conn.close()

# ============================================================
# MODIFICAR FECHA DE SALIDA
# ============================================================

@router.put("/pallet/{codigo_qr}/fecha_salida")
def update_fecha_salida(codigo_qr: str, data: FechaSalidaUpdate):
    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            UPDATE Engorde
            SET fecha_salida_prevista = %s
            WHERE id_engorde = (
                SELECT e.id_engorde
                FROM Engorde e
                JOIN Pallet p ON p.id_pallet = e.id_pallet
                WHERE p.codigo_qr = %s
                ORDER BY e.id_engorde DESC
                LIMIT 1
            )
        """, [data.fecha_salida_prevista, codigo_qr])

        if cur.rowcount == 0:
            raise HTTPException(404, "Pallet no encontrado")

        conn.commit()

        return {"message": "Fecha de salida actualizada"}

    finally:
        cur.close()
        conn.close()


# ============================================================
# SALIDA DE CÁMARA (estado: en_camara → desmontar)
# ============================================================

@router.post("/camara/salida")
def salida_camara(data: SalidaCamaraIn):
    conn = get_connection()
    cur = conn.cursor()

    try:
        pallet, engorde = _get_pallet_y_engorde(cur, data.codigo_qr_pallet)

        if not pallet:
            raise HTTPException(404, "Pallet no encontrado")

        if not engorde:
            raise HTTPException(400, "Sin trazabilidad")

        if pallet["estado"] != "en_camara":
            raise HTTPException(400, "No está en cámara")

        hoy = date.today()

        fecha_entrada = engorde["fecha_entrada_camara"]
        fecha_salida = engorde["fecha_salida_prevista"]

        dias = (hoy - fecha_entrada).days if fecha_entrada else 0
        cumplido = hoy >= fecha_salida if fecha_salida else False

        if data.confirmar:
            cur.execute("""
                UPDATE Pallet
                SET estado = 'desmontar', id_camara = NULL
                WHERE id_pallet = %s
            """, [pallet["id_pallet"]])

            conn.commit()

        return {
            "message": "Salida procesada",
            "fecha_entrada_camara": fecha_entrada.strftime("%Y-%m-%d") if fecha_entrada else None,
            "fecha_salida_prevista": fecha_salida.strftime("%Y-%m-%d") if fecha_salida else None,
            "dias_en_camara": dias,
            "cumplido_plazo": cumplido
        }

    finally:
        cur.close()
        conn.close()


# ============================================================
# ESTADO GENERAL DE CÁMARAS (para dashboard)
# ============================================================

@router.get("/camaras/estado")
def estado_camaras():
    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT 
                id_camara,
                nombre,
                capacidad_max,
                pallets_dentro,
                huecos_libres
            FROM vista_camara_estado
            ORDER BY id_camara
        """)

        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]

    finally:
        cur.close()
        conn.close()

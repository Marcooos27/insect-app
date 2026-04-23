# backend/trazabilidad_backend.py

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime, timedelta
from backend.database import get_connection
from backend.auth.dependencies import get_current_user

import logging
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

#router = APIRouter(tags=["trazabilidad"])
router = APIRouter(tags=["trazabilidad"])

logger.info("TRAZABILIDAD CARGADA")


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

class IniciarSesionIn(BaseModel):
    id_operario: Optional[int] = None

class PalletCribadoIn(BaseModel):
    id_sesion: int
    codigo_qr_pallet: str

class BigBagLlenoIn(BaseModel):
    id_sesion: int
    peso: Optional[float] = None

class TerminarSesionIn(BaseModel):
    id_sesion: int
    peso_total: Optional[float] = None

class RegistrarQRIn(BaseModel):
    codigo_qr: str

class IncidenciaIn(BaseModel):
    titulo: str
    descripcion: str


# ============================================================
# HELPERS
# ============================================================

import re

def parse_qr(codigo: str):
    """
    Devuelve (tipo, numero) a partir del QR.
    Ej: CAMARA-01 → ("camara", 1)
    """
    codigo = codigo.strip().upper()

    patrones = {
        "camara": r"^CAMARA-(\d+)$",
        "pallet": r"^PALLET-(\d+)$",
        "lote_alimento": r"^LO-AL-(\d+)$",
        "lote_huevo": r"^LO-HU-(\d+)$",
    }

    for tipo, pattern in patrones.items():
        match = re.match(pattern, codigo)
        if match:
            return tipo, int(match.group(1))

    return None, None


def qr_exists(cur, codigo):
    tables = [
        "Camara",
        "Pallet",
        "Lote_Alimento",
        "Lote_Huevo"
    ]

    for t in tables:
        cur.execute(f"SELECT 1 FROM {t} WHERE codigo_qr = %s", [codigo])
        if cur.fetchone():
            return True

    return False



def log_engorde_event(
    cur, id_pallet, tipo_evento,
    id_camara=None, id_lote_alimento=None, id_lote_huevo=None,
    estado_anterior=None, estado_nuevo=None, usuario=None, metadata=None
):
    cur.execute("""
        INSERT INTO engorde (
            id_pallet, tipo_evento, id_camara,
            id_lote_alimento, id_lote_huevo,
            estado_anterior, estado_nuevo, usuario, metadata
        )
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
    """, [
        id_pallet, tipo_evento, id_camara,
        id_lote_alimento, id_lote_huevo,
        estado_anterior, estado_nuevo, usuario,
        json.dumps(metadata) if metadata else None
    ])


def _get_lote_alimento_activo(cur):
    cur.execute("""
        SELECT id_lote_alimento, descripcion
        FROM Lote_Alimento
        WHERE activo = TRUE
        ORDER BY id_lote_alimento DESC
        LIMIT 1
    """)
    row = cur.fetchone()
    return dict(zip(["id_lote_alimento", "descripcion"], row)) if row else None


def _get_lote_huevo_activo(cur):
    cur.execute("""
        SELECT id_lote_huevo, origen
        FROM Lote_Huevo
        WHERE activo = TRUE
        ORDER BY id_lote_huevo DESC
        LIMIT 1
    """)
    row = cur.fetchone()
    return dict(zip(["id_lote_huevo", "origen"], row)) if row else None


def _get_pallet_y_engorde(cur, codigo_qr):
    logger.info(f"EXEC _get_pallet_y_engorde con: {codigo_qr}")
    try:
        cur.execute("""
            SELECT id_pallet, estado, id_camara
            FROM Pallet WHERE codigo_qr = %s
        """, [codigo_qr])
        row = cur.fetchone()

        if not row:
            return None, None

        pallet_dict = {"id_pallet": row[0], "estado": row[1], "id_camara": row[2]}

        cur.execute("""
            SELECT
                id_lote_alimento, id_lote_huevo, id_camara,
                estado_anterior, estado_nuevo, metadata, timestamp
            FROM engorde
            WHERE id_pallet = %s
            ORDER BY timestamp DESC
            LIMIT 1
        """, [row[0]])

        engorde_row = cur.fetchone()
        if not engorde_row:
            return pallet_dict, None

        metadata = engorde_row[5]
        if isinstance(metadata, str):
            metadata = json.loads(metadata)
        elif metadata is None:
            metadata = {}

        engorde_dict = {
            "id_lote_alimento": engorde_row[0],
            "id_lote_huevo": engorde_row[1],
            "id_camara": engorde_row[2],
            "estado_anterior": engorde_row[3],
            "estado_nuevo": engorde_row[4],
            "metadata": metadata,
            "timestamp": engorde_row[6],
        }

        return pallet_dict, engorde_dict

    except Exception as e:
        logger.error(f"ERROR EN _get_pallet_y_engorde: {repr(e)}")
        raise


def _generar_codigo_lote(cur, tipo_producto: str) -> str:
    """Genera código tipo IN-YYYYMMDD-NN con secuencia diaria."""
    hoy = date.today()
    prefijo = f"IN-{hoy.strftime('%Y%m%d')}-"

    cur.execute("""
        SELECT codigo_lote FROM lote_final
        WHERE codigo_lote LIKE %s
        ORDER BY codigo_lote DESC
        LIMIT 1
    """, [f"{prefijo}%"])

    row = cur.fetchone()
    if row:
        ultimo = int(row[0].split("-")[-1])
        siguiente = ultimo + 1
    else:
        siguiente = 1

    return f"{prefijo}{str(siguiente).zfill(2)}"


# ============================================================
# SCAN QR — entrada única
# ============================================================

@router.get("/scan/{codigo_qr}")
def scan_qr(codigo_qr: str):
    conn = get_connection()
    cur = conn.cursor()

    codigo_qr = codigo_qr.strip().upper().replace(" ", "")
    logger.info(f"QR recibido: {codigo_qr}")

    try:
        # ¿ES CÁMARA?
        cur.execute("""
            SELECT id_camara, nombre, capacidad_max, codigo_qr
            FROM Camara WHERE codigo_qr = %s
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
                    "id_camara": row[0], "nombre": row[1],
                    "capacidad_max": row[2], "codigo_qr": row[3],
                    "pallets_dentro": pallets_dentro,
                    "huecos_libres": row[2] - pallets_dentro
                }
            }

        # ¿ES PALLET?
        pallet, engorde = _get_pallet_y_engorde(cur, codigo_qr)
        if pallet:
            data = {**pallet}
            if engorde:
                metadata = engorde["metadata"]
                data.update({
                    "id_lote_alimento_traz": engorde["id_lote_alimento"],
                    "id_lote_huevo_traz": engorde["id_lote_huevo"],
                    "fecha_entrada_camara": metadata.get("fecha_entrada"),
                    "fecha_salida_prevista": metadata.get("fecha_salida_prevista"),
                })
            return {"tipo": "pallet", "datos": data}

        # ¿ES LOTE ALIMENTO?
        cur.execute("""
            SELECT id_lote_alimento, descripcion, fecha_llegada, activo
            FROM Lote_Alimento WHERE codigo_qr = %s
        """, [codigo_qr])
        row = cur.fetchone()
        if row:
            return {
                "tipo": "lote_alimento",
                "datos": {
                    "id_lote_alimento": row[0], "descripcion": row[1],
                    "fecha_llegada": row[2].strftime("%Y-%m-%d") if row[2] else None,
                    "activo": row[3]
                }
            }

        # ¿ES LOTE HUEVO?
        cur.execute("""
            SELECT id_lote_huevo, origen, fecha_registro, activo
            FROM Lote_Huevo WHERE codigo_qr = %s
        """, [codigo_qr])
        row = cur.fetchone()
        if row:
            return {
                "tipo": "lote_huevo",
                "datos": {
                    "id_lote_huevo": row[0], "origen": row[1],
                    "fecha_registro": row[2].strftime("%Y-%m-%d") if row[2] else None,
                    "activo": row[3]
                }
            }

        raise HTTPException(status_code=404, detail="QR no reconocido")

    finally:
        cur.close()
        conn.close()


# ============================================================
# ACTIVAR LOTE DE ALIMENTO
# ============================================================

@router.post("/lote_alimento/activar")
def activar_lote_alimento(codigo_qr: str):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id_lote_alimento FROM Lote_Alimento WHERE codigo_qr = %s", [codigo_qr])
        row = cur.fetchone()
        if not row:
            raise HTTPException(404, "Lote de alimento no encontrado")
        nuevo_id = row[0]
        cur.execute("UPDATE Lote_Alimento SET activo = FALSE WHERE activo = TRUE AND id_lote_alimento != %s", [nuevo_id])
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
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("UPDATE Lote_Huevo SET activo = FALSE WHERE activo = TRUE")
        cur.execute("SELECT id_lote_huevo FROM Lote_Huevo WHERE codigo_qr = %s", [data.codigo_qr])
        existing = cur.fetchone()
        if existing:
            cur.execute("UPDATE Lote_Huevo SET activo = TRUE WHERE id_lote_huevo = %s", [existing[0]])
            nuevo_id = existing[0]
        else:
            cur.execute("""
                INSERT INTO Lote_Huevo (codigo_qr, origen, fecha_registro, activo)
                VALUES (%s, %s, %s, TRUE) RETURNING id_lote_huevo
            """, [data.codigo_qr, data.origen, data.fecha_registro or date.today()])
            nuevo_id = cur.fetchone()[0]
        conn.commit()
        return {"message": "Lote de huevo activado", "id_lote_huevo": nuevo_id}
    finally:
        cur.close()
        conn.close()


# ============================================================
# MONTAR PALLET
# ============================================================

@router.post("/pallet/montar")
def montar_pallet(data: PalletMontadoIn):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id_pallet, estado FROM Pallet WHERE codigo_qr = %s", [data.codigo_qr_pallet])
        row = cur.fetchone()
        if not row:
            raise HTTPException(404, "Pallet no encontrado")
        if row[1] != "vacio":
            raise HTTPException(400, "El pallet no está vacío")

        lote_alimento = _get_lote_alimento_activo(cur)
        lote_huevo = _get_lote_huevo_activo(cur)

        log_engorde_event(
            cur, row[0], "MONTADO",
            estado_anterior="vacio", estado_nuevo="preparado",
            id_lote_alimento=lote_alimento["id_lote_alimento"] if lote_alimento else None,
            id_lote_huevo=lote_huevo["id_lote_huevo"] if lote_huevo else None
        )
        cur.execute("UPDATE Pallet SET estado = 'preparado' WHERE id_pallet = %s", [row[0]])
        conn.commit()
        return {"message": "Pallet montado"}
    finally:
        cur.close()
        conn.close()


# ============================================================
# ENTRADA A CÁMARA
# ============================================================

@router.post("/camara/entrada")
def entrada_camara(data: EntradaCamaraIn):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id_camara, capacidad_max FROM Camara WHERE codigo_qr = %s", [data.codigo_qr_camara])
        camara = cur.fetchone()
        if not camara:
            raise HTTPException(404, "Cámara no encontrada")
        id_camara, capacidad = camara

        cur.execute("SELECT COUNT(*) FROM Pallet WHERE id_camara = %s AND estado = 'en_camara'", [id_camara])
        if cur.fetchone()[0] >= capacidad:
            raise HTTPException(400, "Cámara llena")

        cur.execute("SELECT id_pallet, estado FROM Pallet WHERE codigo_qr = %s", [data.codigo_qr_pallet])
        pallet = cur.fetchone()
        if not pallet:
            raise HTTPException(404, "Pallet no encontrado")
        if pallet[1] != "preparado":
            raise HTTPException(400, "Pallet no preparado")

        hoy = date.today()
        salida = hoy + timedelta(days=7)
        lote_alimento = _get_lote_alimento_activo(cur)
        lote_huevo = _get_lote_huevo_activo(cur)

        log_engorde_event(
            cur, pallet[0], "ENTRADA_CAMARA",
            estado_anterior="preparado", estado_nuevo="en_camara",
            id_camara=id_camara,
            metadata={"fecha_entrada": str(hoy), "fecha_salida_prevista": str(salida)}
        )
        cur.execute("UPDATE Pallet SET estado = 'en_camara', id_camara = %s WHERE id_pallet = %s", [id_camara, pallet[0]])
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
        cur.execute("SELECT id_pallet FROM Pallet WHERE codigo_qr = %s", [codigo_qr])
        row = cur.fetchone()
        if not row:
            raise HTTPException(404, "Pallet no encontrado")
        log_engorde_event(
            cur, row[0], "CAMBIO_FECHA_SALIDA",
            metadata={"fecha_salida_prevista": str(data.fecha_salida_prevista)}
        )
        conn.commit()
        return {"message": "Fecha de salida actualizada"}
    finally:
        cur.close()
        conn.close()


# ============================================================
# SALIDA DE CÁMARA → fuera_camara
# ============================================================

@router.post("/camara/salida")
def salida_camara(data: SalidaCamaraIn):
    conn = get_connection()
    cur = conn.cursor()
    try:
        pallet, _ = _get_pallet_y_engorde(cur, data.codigo_qr_pallet)
        if not pallet:
            raise HTTPException(404, "Pallet no encontrado")
        if pallet["estado"] != "en_camara":
            raise HTTPException(400, "No está en cámara")

        cur.execute("""
            SELECT metadata FROM engorde
            WHERE id_pallet = %s AND tipo_evento = 'ENTRADA_CAMARA'
            ORDER BY timestamp DESC LIMIT 1
        """, [pallet["id_pallet"]])
        row = cur.fetchone()
        metadata = {}
        if row and row[0]:
            metadata = row[0] if not isinstance(row[0], str) else json.loads(row[0])

        fecha_entrada = metadata.get("fecha_entrada")
        fecha_salida = metadata.get("fecha_salida_prevista")
        hoy = date.today()
        dias = 0
        cumplido = False

        if fecha_entrada:
            dias = (hoy - date.fromisoformat(fecha_entrada)).days
        if fecha_salida:
            cumplido = hoy >= date.fromisoformat(fecha_salida)

        if data.confirmar:
            # Estado: en_camara → fuera_camara (listo para cribar)
            cur.execute("""
                UPDATE Pallet SET estado = 'fuera_camara', id_camara = NULL
                WHERE id_pallet = %s
            """, [pallet["id_pallet"]])
            log_engorde_event(
                cur, pallet["id_pallet"], "SALIDA_CAMARA",
                estado_anterior="en_camara", estado_nuevo="fuera_camara",
                id_camara=pallet.get("id_camara"),
                metadata={"fecha_salida_real": str(hoy)}
            )
            conn.commit()

        return {
            "message": "Salida procesada",
            "fecha_entrada_camara": metadata.get("fecha_entrada"),
            "fecha_salida_prevista": metadata.get("fecha_salida_prevista"),
            "dias_en_camara": dias,
            "cumplido_plazo": cumplido
        }
    finally:
        cur.close()
        conn.close()


# ============================================================
# ESTADO GENERAL DE CÁMARAS
# ============================================================

@router.get("/camaras/estado")
def estado_camaras():
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT id_camara, nombre, capacidad_max, pallets_dentro, huecos_libres
            FROM vista_camara_estado ORDER BY id_camara
        """)
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]
    finally:
        cur.close()
        conn.close()


# ============================================================
# REGISTRAR QR AUTOMÁTICO
# ============================================================

@router.post("/registrar_qr_auto")
def registrar_qr_auto(data: RegistrarQRIn):
    logger.info("🔥 ENTRANDO A registrar_qr_auto")

    conn = get_connection()
    cur = conn.cursor()
    codigo = data.codigo_qr.strip().upper().replace(" ", "")

    logger.info(f"QR recibido: {codigo}")

    try:
        if qr_exists(cur, codigo):
            raise HTTPException(400, "El QR ya está registrado")

        tipo, numero = parse_qr(codigo)

        if tipo == "camara":
            nombre = f"Cámara {numero}" if numero else "Cámara"
            cur.execute(
                "INSERT INTO Camara (porcentaje_uso, codigo_qr, nombre, capacidad_max) VALUES (%s, %s, %s, %s)",
                [0, codigo, nombre, 40]
            )

        elif tipo == "pallet":
            cur.execute(
                "INSERT INTO Pallet (codigo_qr, estado) VALUES (%s, 'vacio')",
                [codigo]
            )

        elif tipo == "lote_alimento":
            descripcion = f"Lote alimento {numero}" if numero else "Nuevo lote alimento"
            cur.execute(
                "INSERT INTO Lote_Alimento (codigo_qr, descripcion, activo) VALUES (%s, %s, FALSE)",
                [codigo, descripcion]
            )

        elif tipo == "lote_huevo":
            origen = f"Lote huevo {numero}" if numero else "Origen desconocido"
            cur.execute(
                "INSERT INTO Lote_Huevo (codigo_qr, origen, activo) VALUES (%s, %s, FALSE)",
                [codigo, origen]
            )

        else:
            raise HTTPException(400, "Formato QR no válido")

        conn.commit()
        return {"message": "QR registrado", "tipo": tipo}

    finally:
        cur.close()
        conn.close()


# ============================================================
# ████  PROCESADO / CRIBADO  ████
# ============================================================

# SQL para crear las tablas (ejecutar una vez en la BD):
# CREATE TABLE IF NOT EXISTS procesado_sesion (
#     id SERIAL PRIMARY KEY,
#     fecha_inicio TIMESTAMP NOT NULL DEFAULT NOW(),
#     fecha_fin TIMESTAMP,
#     id_operario INTEGER,
#     observaciones TEXT,
#     estado VARCHAR(20) DEFAULT 'activa'  -- activa | finalizada
# );
#
# CREATE TABLE IF NOT EXISTS lote_final (
#     id SERIAL PRIMARY KEY,
#     codigo_lote VARCHAR(30) UNIQUE NOT NULL,
#     tipo_producto VARCHAR(10) NOT NULL,   -- 01/02/03/04
#     fecha_produccion DATE NOT NULL,
#     peso NUMERIC(10,2),
#     id_sesion_procesado INTEGER REFERENCES procesado_sesion(id),
#     id_lote_alimento INTEGER,
#     id_lote_huevo INTEGER,
#     destino VARCHAR(50),
#     etiquetado_ok BOOLEAN DEFAULT TRUE,
#     observaciones TEXT
# );


@router.post("/procesado/iniciar")
def iniciar_sesion_procesado(data: IniciarSesionIn):
    """Crea una nueva sesión de cribado/procesado."""
    conn = get_connection()
    cur = conn.cursor()
    try:
        # Verificar que no hay sesión activa
        cur.execute("""
            SELECT id FROM procesado_sesion WHERE estado = 'activa' LIMIT 1
        """)
        activa = cur.fetchone()
        if activa:
            raise HTTPException(400, f"Ya hay una sesión activa (ID {activa[0]}). Ciérrala antes de iniciar una nueva.")

        cur.execute("""
            INSERT INTO procesado_sesion (id_operario, estado)
            VALUES (%s, 'activa')
            RETURNING id, fecha_inicio
        """, [data.id_operario])
        row = cur.fetchone()
        conn.commit()
        return {
            "message": "Sesión de cribado iniciada",
            "id_sesion": row[0],
            "fecha_inicio": row[1].strftime("%Y-%m-%d %H:%M")
        }
    finally:
        cur.close()
        conn.close()


@router.post("/procesado/pallet_cribado")
def registrar_pallet_cribado(data: PalletCribadoIn):
    """
    El operario escanea un pallet fuera_camara para añadirlo a la sesión.
    El pallet pasa a estado 'vacio' (ya fue cribado y vaciado).
    """
    conn = get_connection()
    cur = conn.cursor()
    try:
        # Verificar sesión activa
        cur.execute("SELECT id FROM procesado_sesion WHERE id = %s AND estado = 'activa'", [data.id_sesion])
        if not cur.fetchone():
            raise HTTPException(404, "Sesión no encontrada o ya finalizada")

        # Verificar pallet
        codigo_qr = data.codigo_qr_pallet.strip().upper()
        cur.execute("SELECT id_pallet, estado FROM Pallet WHERE codigo_qr = %s", [codigo_qr])
        pallet = cur.fetchone()
        if not pallet:
            raise HTTPException(404, "Pallet no encontrado")
        if pallet[1] != "fuera_camara":
            raise HTTPException(400, f"El pallet está en estado '{pallet[1]}', debe estar 'fuera_camara'")

        # Obtener lotes activos en el último evento de entrada_camara de este pallet
        cur.execute("""
            SELECT id_lote_alimento, id_lote_huevo
            FROM engorde
            WHERE id_pallet = %s AND tipo_evento = 'ENTRADA_CAMARA'
            ORDER BY timestamp DESC LIMIT 1
        """, [pallet[0]])
        lote_row = cur.fetchone()
        id_lote_alimento = lote_row[0] if lote_row else None
        id_lote_huevo = lote_row[1] if lote_row else None

        # Guardar relación pallet ↔ sesión en engorde
        log_engorde_event(
            cur, pallet[0], "CRIBADO",
            estado_anterior="fuera_camara", estado_nuevo="vacio",
            id_lote_alimento=id_lote_alimento,
            id_lote_huevo=id_lote_huevo,
            metadata={"id_sesion_procesado": data.id_sesion}
        )

        # Pallet vuelve a vacio
        cur.execute("UPDATE Pallet SET estado = 'vacio' WHERE id_pallet = %s", [pallet[0]])

        conn.commit()

        # Contar pallets ya cribados en esta sesión
        cur.execute("""
            SELECT COUNT(*) FROM engorde
            WHERE tipo_evento = 'CRIBADO'
              AND metadata::jsonb->>'id_sesion_procesado' = %s::text
        """, [str(data.id_sesion)])
        total_cribados = cur.fetchone()[0]

        return {
            "message": "Pallet cribado correctamente",
            "id_pallet": pallet[0],
            "codigo_qr": codigo_qr,
            "total_cribados_sesion": total_cribados
        }
    finally:
        cur.close()
        conn.close()


@router.post("/procesado/big_bag_lleno")
def registrar_big_bag_lleno(data: BigBagLlenoIn):
    """
    El operario pulsa 'Big bag lleno'. Se genera un lote_final de tipo frass (03)
    con todos los pallets cribados hasta ahora en esta sesión.
    """
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id, id_operario FROM procesado_sesion WHERE id = %s AND estado = 'activa'", [data.id_sesion])
        sesion = cur.fetchone()
        if not sesion:
            raise HTTPException(404, "Sesión no encontrada o ya finalizada")

        # Buscar lotes alimento/huevo de los pallets de esta sesión
        cur.execute("""
            SELECT DISTINCT id_lote_alimento, id_lote_huevo
            FROM engorde
            WHERE tipo_evento = 'CRIBADO'
              AND metadata::jsonb->>'id_sesion_procesado' = %s::text
              AND id_lote_alimento IS NOT NULL
            LIMIT 1
        """, [str(data.id_sesion)])
        lotes = cur.fetchone()
        id_lote_alimento = lotes[0] if lotes else None
        id_lote_huevo = lotes[1] if lotes else None

        codigo_lote = _generar_codigo_lote(cur, "03")

        cur.execute("""
            INSERT INTO lote_final (
                codigo_lote, tipo_producto, fecha_produccion,
                peso, id_sesion_procesado,
                id_lote_alimento, id_lote_huevo,
                destino, etiquetado_ok
            )
            VALUES (%s, '03', %s, %s, %s, %s, %s, 'AGRICOLA', TRUE)
            RETURNING id
        """, [
            codigo_lote, date.today(), data.peso,
            data.id_sesion, id_lote_alimento, id_lote_huevo
        ])
        id_lote = cur.fetchone()[0]
        conn.commit()

        return {
            "message": "Big bag registrado — lote final creado",
            "id_lote_final": id_lote,
            "codigo_lote": codigo_lote,
            "tipo_producto": "Frass (03)",
            "fecha_produccion": date.today().strftime("%d/%m/%Y"),
            "peso": data.peso,
            "destino": "AGRICOLA",
        }
    finally:
        cur.close()
        conn.close()


@router.post("/procesado/terminar")
def terminar_sesion_procesado(data: TerminarSesionIn):
    """
    Finaliza la sesión de cribado.
    Si hay big bag parcial (sin haber pulsado 'big bag lleno'), lo crea igual.
    """
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id FROM procesado_sesion WHERE id = %s AND estado = 'activa'", [data.id_sesion])
        if not cur.fetchone():
            raise HTTPException(404, "Sesión no encontrada o ya finalizada")

        lote_final_creado = None

        # Verificar si hay pallets cribados sin lote final asociado en esta sesión
        # (es decir, si hay cribados pero no se pulsó big_bag_lleno)
        cur.execute("""
            SELECT COUNT(*) FROM engorde
            WHERE tipo_evento = 'CRIBADO'
              AND metadata::jsonb->>'id_sesion_procesado' = %s::text
        """, [str(data.id_sesion)])
        total_cribados = cur.fetchone()[0]

        cur.execute("""
            SELECT COUNT(*) FROM lote_final WHERE id_sesion_procesado = %s
        """, [data.id_sesion])
        lotes_ya_creados = cur.fetchone()[0]

        if total_cribados > 0 and lotes_ya_creados == 0:
            # Big bag parcial — crear lote final igualmente
            cur.execute("""
                SELECT DISTINCT id_lote_alimento, id_lote_huevo
                FROM engorde
                WHERE tipo_evento = 'CRIBADO'
                  AND metadata::jsonb->>'id_sesion_procesado' = %s::text
                  AND id_lote_alimento IS NOT NULL
                LIMIT 1
            """, [str(data.id_sesion)])
            lotes = cur.fetchone()
            id_lote_alimento = lotes[0] if lotes else None
            id_lote_huevo = lotes[1] if lotes else None

            codigo_lote = _generar_codigo_lote(cur, "03")
            cur.execute("""
                INSERT INTO lote_final (
                    codigo_lote, tipo_producto, fecha_produccion,
                    peso, id_sesion_procesado,
                    id_lote_alimento, id_lote_huevo,
                    destino, etiquetado_ok, observaciones
                )
                VALUES (%s, '03', %s, %s, %s, %s, %s, 'AGRICOLA', TRUE, 'Big bag parcial')
                RETURNING id
            """, [
                codigo_lote, date.today(), data.peso_total,
                data.id_sesion, id_lote_alimento, id_lote_huevo
            ])
            id_lote = cur.fetchone()[0]
            lote_final_creado = {"id": id_lote, "codigo_lote": codigo_lote, "parcial": True}

        # Cerrar sesión
        cur.execute("""
            UPDATE procesado_sesion
            SET estado = 'finalizada', fecha_fin = NOW()
            WHERE id = %s
        """, [data.id_sesion])

        conn.commit()

        return {
            "message": "Sesión de cribado finalizada",
            "id_sesion": data.id_sesion,
            "total_pallets_cribados": total_cribados,
            "lote_final_creado": lote_final_creado
        }
    finally:
        cur.close()
        conn.close()


@router.get("/procesado/sesion_activa")
def get_sesion_activa():
    """Devuelve la sesión activa si existe, o null."""
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT id, fecha_inicio, id_operario
            FROM procesado_sesion WHERE estado = 'activa' LIMIT 1
        """)
        row = cur.fetchone()
        if not row:
            return {"sesion_activa": None}

        id_sesion = row[0]

        # Pallets ya cribados en esta sesión
        cur.execute("""
            SELECT e.metadata, p.codigo_qr
            FROM engorde e
            JOIN Pallet p ON p.id_pallet = e.id_pallet
            WHERE e.tipo_evento = 'CRIBADO'
              AND e.metadata::jsonb->>'id_sesion_procesado' = %s::text
            ORDER BY e.timestamp
        """, [str(id_sesion)])
        pallets_cribados = [{"codigo_qr": r[1]} for r in cur.fetchall()]

        return {
            "sesion_activa": {
                "id_sesion": id_sesion,
                "fecha_inicio": row[1].strftime("%Y-%m-%d %H:%M"),
                "id_operario": row[2],
                "pallets_cribados": pallets_cribados,
                "total_cribados": len(pallets_cribados)
            }
        }
    finally:
        cur.close()
        conn.close()


@router.get("/lote_final/{codigo_lote}")
def get_lote_final(codigo_lote: str):
    """Devuelve los datos completos de un lote final para imprimir etiqueta."""
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT lf.id, lf.codigo_lote, lf.tipo_producto, lf.fecha_produccion,
                   lf.peso, lf.destino, lf.etiquetado_ok, lf.observaciones,
                   la.descripcion AS lote_alimento_desc,
                   lh.origen AS lote_huevo_origen,
                   ps.fecha_inicio AS sesion_inicio
            FROM lote_final lf
            LEFT JOIN Lote_Alimento la ON la.id_lote_alimento = lf.id_lote_alimento
            LEFT JOIN Lote_Huevo lh ON lh.id_lote_huevo = lf.id_lote_huevo
            LEFT JOIN procesado_sesion ps ON ps.id = lf.id_sesion_procesado
            WHERE lf.codigo_lote = %s
        """, [codigo_lote])

        row = cur.fetchone()
        if not row:
            raise HTTPException(404, "Lote final no encontrado")

        TIPOS = {"01": "Harina proteica de insecto", "02": "Aceite de insecto",
                 "03": "Frass", "04": "Larva deshidratada"}

        return {
            "id": row[0],
            "codigo_lote": row[1],
            "tipo_producto_codigo": row[2],
            "tipo_producto_nombre": TIPOS.get(row[2], row[2]),
            "fecha_produccion": row[3].strftime("%d/%m/%Y"),
            "peso": float(row[4]) if row[4] else None,
            "destino": row[5],
            "etiquetado_ok": row[6],
            "observaciones": row[7],
            "lote_alimento": row[8],
            "lote_huevo": row[9],
            "sesion_inicio": row[10].strftime("%Y-%m-%d %H:%M") if row[10] else None,
            # Campos para etiqueta impresa
            "etiqueta": {
                "empresa": "InsectEAT S.L.",
                "producto": f"{TIPOS.get(row[2], row[2])} ({row[2]})",
                "lote": row[1],
                "fecha": row[3].strftime("%d/%m/%Y"),
                "peso_neto": f"{row[4]} kg" if row[4] else "—",
                "uso": "Ingrediente para piensos" if row[2] != "03" else "Fertilizante orgánico (Frass)",
                "destino": row[5] or "—",
                "registro_silum": "ES24/XXXX/XXX",
            }
        }
    finally:
        cur.close()
        conn.close()
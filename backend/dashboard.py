from fastapi import APIRouter, Depends
from backend.auth.auth import get_current_user
from backend.database import get_connection
from datetime import date

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/camaras")
def get_camaras(user=Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        # Cámaras propias (sin franquiciado)
        cur.execute("""
            SELECT 
                c.id_camara,
                c.nombre,
                c.capacidad_max,
                COUNT(p.id_pallet) FILTER (WHERE p.estado = 'en_camara') AS pallets_dentro,
                COUNT(p.id_pallet) FILTER (
                    WHERE p.estado = 'en_camara' 
                    AND p.fecha_salida_prevista < CURRENT_DATE
                ) AS pallets_vencidos,
                (SELECT sl.valor FROM sensor s
                 JOIN sensor_lectura sl ON sl.id_sensor = s.id_sensor
                 WHERE s.id_camara = c.id_camara AND s.tipo = 'temperatura' AND s.activo = true
                 ORDER BY sl.fecha_lectura DESC LIMIT 1) AS temperatura,
                (SELECT sl.valor FROM sensor s
                 JOIN sensor_lectura sl ON sl.id_sensor = s.id_sensor
                 WHERE s.id_camara = c.id_camara AND s.tipo = 'humedad' AND s.activo = true
                 ORDER BY sl.fecha_lectura DESC LIMIT 1) AS humedad,
                (SELECT sl.fecha_lectura FROM sensor s
                 JOIN sensor_lectura sl ON sl.id_sensor = s.id_sensor
                 WHERE s.id_camara = c.id_camara AND s.activo = true
                 ORDER BY sl.fecha_lectura DESC LIMIT 1) AS ultima_lectura
            FROM camara c
            LEFT JOIN pallet p ON p.id_camara = c.id_camara
            WHERE c.id_franquiciado IS NULL
            GROUP BY c.id_camara, c.nombre, c.capacidad_max
            ORDER BY c.nombre
        """)
        cols = [d[0] for d in cur.description]
        camaras_propias = [dict(zip(cols, row)) for row in cur.fetchall()]

        resultado = {"propias": camaras_propias}

        # Si es admin, devolvemos también las cámaras de franquiciados, con la
        # misma forma que las propias (una fila por cámara) para que el
        # frontend pueda pintarlas igual, solo que son cámaras con
        # id_franquiciado asignado (p.ej. "Motilla 1", "Villaconejos 1"...).
        if user["rol"] == "admin":
            cur.execute("""
                SELECT
                    c.id_camara,
                    c.nombre,
                    c.capacidad_max,
                    COUNT(p.id_pallet) FILTER (WHERE p.estado = 'en_camara') AS pallets_dentro,
                    COUNT(p.id_pallet) FILTER (
                        WHERE p.estado = 'en_camara'
                        AND p.fecha_salida_prevista < CURRENT_DATE
                    ) AS pallets_vencidos,
                    (SELECT sl.valor FROM sensor s
                     JOIN sensor_lectura sl ON sl.id_sensor = s.id_sensor
                     WHERE s.id_camara = c.id_camara AND s.tipo = 'temperatura' AND s.activo = true
                     ORDER BY sl.fecha_lectura DESC LIMIT 1) AS temperatura,
                    (SELECT sl.valor FROM sensor s
                     JOIN sensor_lectura sl ON sl.id_sensor = s.id_sensor
                     WHERE s.id_camara = c.id_camara AND s.tipo = 'humedad' AND s.activo = true
                     ORDER BY sl.fecha_lectura DESC LIMIT 1) AS humedad,
                    (SELECT sl.fecha_lectura FROM sensor s
                     JOIN sensor_lectura sl ON sl.id_sensor = s.id_sensor
                     WHERE s.id_camara = c.id_camara AND s.activo = true
                     ORDER BY sl.fecha_lectura DESC LIMIT 1) AS ultima_lectura
                FROM camara c
                LEFT JOIN pallet p ON p.id_camara = c.id_camara
                WHERE c.id_franquiciado IS NOT NULL
                GROUP BY c.id_camara, c.nombre, c.capacidad_max
                ORDER BY c.nombre
            """)
            cols = [d[0] for d in cur.description]
            resultado["franquiciados"] = [dict(zip(cols, row)) for row in cur.fetchall()]

        return resultado
    finally:
        cur.close()
        conn.close()


@router.get("/camara/{id_camara}/pallets")
def get_pallets_camara(id_camara: int, user=Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT
                p.id_pallet,
                p.codigo_qr,
                p.estado,
                p.fecha_entrada_camara,
                p.fecha_salida_prevista,
                (CURRENT_DATE - p.fecha_entrada_camara) AS dias_en_camara,
                CASE 
                    WHEN p.fecha_salida_prevista < CURRENT_DATE THEN 'vencido'
                    ELSE 'en_ciclo'
                END AS estado_ciclo
            FROM pallet p
            WHERE p.id_camara = %(id)s AND p.estado = 'en_camara'
            ORDER BY p.fecha_entrada_camara
        """, {"id": id_camara})
        cols = [d[0] for d in cur.description]
        pallets = [dict(zip(cols, row)) for row in cur.fetchall()]

        # Info de la cámara + capacidad
        cur.execute("""
            SELECT id_camara, nombre, capacidad_max,
                (SELECT sl.valor FROM sensor s
                 JOIN sensor_lectura sl ON sl.id_sensor = s.id_sensor
                 WHERE s.id_camara = c.id_camara AND s.tipo = 'temperatura' AND s.activo = true
                 ORDER BY sl.fecha_lectura DESC LIMIT 1) AS temperatura,
                (SELECT sl.valor FROM sensor s
                 JOIN sensor_lectura sl ON sl.id_sensor = s.id_sensor
                 WHERE s.id_camara = c.id_camara AND s.tipo = 'humedad' AND s.activo = true
                 ORDER BY sl.fecha_lectura DESC LIMIT 1) AS humedad,
                (SELECT sl.fecha_lectura FROM sensor s
                 JOIN sensor_lectura sl ON sl.id_sensor = s.id_sensor
                 WHERE s.id_camara = c.id_camara AND s.activo = true
                 ORDER BY sl.fecha_lectura DESC LIMIT 1) AS ultima_lectura
            FROM camara c WHERE id_camara = %(id)s
        """, {"id": id_camara})
        cols = [d[0] for d in cur.description]
        camara = dict(zip(cols, cur.fetchone()))

        return {"camara": camara, "pallets": pallets}
    finally:
        cur.close()
        conn.close()


@router.get("/camara/{id_camara}/lecturas")
def get_lecturas_camara(id_camara: int, tipo: str, user=Depends(get_current_user)):
    """
    Histórico de lecturas de un sensor de la cámara (tipo: 'temperatura' o 'humedad'),
    limitado a los últimos 90 días para no devolver un histórico sin límite.
    """
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT sl.valor, sl.fecha_lectura
            FROM sensor s
            JOIN sensor_lectura sl ON sl.id_sensor = s.id_sensor
            WHERE s.id_camara = %(id)s
              AND s.tipo = %(tipo)s
              AND s.activo = true
              AND sl.fecha_lectura >= CURRENT_DATE - INTERVAL '90 days'
            ORDER BY sl.fecha_lectura ASC
        """, {"id": id_camara, "tipo": tipo})
        cols = [d[0] for d in cur.description]
        lecturas = [dict(zip(cols, row)) for row in cur.fetchall()]
        return {"lecturas": lecturas}
    finally:
        cur.close()
        conn.close()


@router.post("/sensores/lectura")
def registrar_lectura(payload: dict):
    """
    Endpoint para que los sensores físicos manden sus lecturas.
    Payload: { "codigo_dispositivo": "ESP32-C01-TEMP", "valor": 23.5 }
    """
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT id_sensor FROM sensor 
            WHERE codigo_dispositivo = %s AND activo = true
        """, (payload["codigo_dispositivo"],))
        row = cur.fetchone()
        if not row:
            from fastapi import HTTPException
            raise HTTPException(404, "Sensor no encontrado o inactivo")

        id_sensor = row[0]
        cur.execute("""
            INSERT INTO sensor_lectura (id_sensor, valor)
            VALUES (%s, %s)
        """, (id_sensor, payload["valor"]))
        conn.commit()
        return {"ok": True}
    finally:
        cur.close()
        conn.close()
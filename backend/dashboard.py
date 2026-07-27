from fastapi import APIRouter, Depends
from auth.auth import get_current_user
from database import get_connection
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

        # Si es admin, devolvemos también los franquiciados
        if user["rol"] == "admin":
            cur.execute("""
                SELECT 
                    f.id_franquiciado,
                    f.ubicacion,
                    COUNT(DISTINCT c.id_camara) AS num_camaras,
                    c.capacidad_max,
                    COUNT(p.id_pallet) FILTER (WHERE p.estado = 'en_camara') AS pallets_dentro,
                    SUM(c.capacidad_max) AS capacidad_total,
                    MIN(
                        (SELECT sl.valor FROM sensor s
                         JOIN sensor_lectura sl ON sl.id_sensor = s.id_sensor
                         WHERE s.id_camara = c.id_camara AND s.tipo = 'temperatura' AND s.activo = true
                         ORDER BY sl.fecha_lectura DESC LIMIT 1)
                    ) AS temp_min,
                    MAX(
                        (SELECT sl.valor FROM sensor s
                         JOIN sensor_lectura sl ON sl.id_sensor = s.id_sensor
                         WHERE s.id_camara = c.id_camara AND s.tipo = 'temperatura' AND s.activo = true
                         ORDER BY sl.fecha_lectura DESC LIMIT 1)
                    ) AS temp_max
                FROM franquiciado f
                JOIN camara c ON c.id_franquiciado = f.id_franquiciado
                LEFT JOIN pallet p ON p.id_camara = c.id_camara
                GROUP BY f.id_franquiciado, f.ubicacion, c.capacidad_max
                ORDER BY f.ubicacion
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
            WHERE p.id_camara = :id AND p.estado = 'en_camara'
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
            FROM camara c WHERE id_camara = :id
        """, {"id": id_camara})
        cols = [d[0] for d in cur.description]
        camara = dict(zip(cols, cur.fetchone()))

        return {"camara": camara, "pallets": pallets}
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
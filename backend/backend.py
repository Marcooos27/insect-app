from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
import psycopg2
from psycopg2 import IntegrityError
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from datetime import date, datetime, timedelta

from backend.auth.auth import get_current_user, router as auth_router
from backend.database import get_connection  # Importamos la función de conexión a la BD
from backend.auth.auth import require_admin

app = FastAPI(title="API Multi-Tablas Oracle")

app.include_router(auth_router)


app.add_middleware(
    CORSMiddleware,
    # Añadimos los orígenes usados en desarrollo. Si sigues teniendo problemas con
    # las peticiones preflight (OPTIONS) puedes usar `allow_origins=["*"]` temporalmente.
    #allow_origins=["http://localhost:8101", "http://127.0.0.1:8101", "http://localhost:8100"], AQUI DEBERIAN ESTAR LOS ORIGIN PERMITIDOS
    allow_origins=["*"], # AQUI PARA DESARROLLO USO * PERO ESTO NO ES SEGURO ⚠️⚠️⚠️⚠️⚠️⚠️⚠️

    # allow_origins=["https://web.miempresa.com", "https://admin.miempresa.com"] SERÁ ALGO ASÍ CUANDO LA API ESTE EN CLOUD
    
    allow_credentials=True,
    allow_methods=["*"],  # Permitir GET, POST, PUT, DELETE, OPTIONS
    allow_headers=["*"],
)


# Opcional: manejar explícitamente la petición OPTIONS a /evento como fallback
from fastapi import Request, Response


@app.options("/evento")
async def options_evento(request: Request):
    # FastAPI/Starlette CORSMiddleware debería encargarse de añadir las cabeceras CORS
    # a esta respuesta, pero si el navegador hace una petición preflight que falla,
    # esta ruta garantiza una respuesta 200 para OPTIONS.
    return Response(status_code=200)

# ================================
# TABLA: CLIENTE
# ================================
class ClienteIn(BaseModel):
    nombre: str
    telefono: str | None = None
    direccion: str | None = None
    pedido: str | None = None
    satisfaccion: str | None = None

class ClienteOut(ClienteIn):
    id_cliente: int

@app.get("/cliente")
def get_clientes():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM Cliente")
    cols = [d[0].lower() for d in cur.description]
    data = [dict(zip(cols, row)) for row in cur.fetchall()]
    cur.close()
    conn.close()
    return data

@app.put("/cliente/{id_cliente}")
def update_cliente(id_cliente: int, cliente: ClienteIn):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        UPDATE Cliente
        SET nombre = %s, 
            telefono = %s, 
            direccion = %s, 
            pedido = %s, 
            satisfaccion = %s
        WHERE id_cliente = %s
    """, (cliente.nombre, cliente.telefono, cliente.direccion, cliente.pedido, cliente.satisfaccion, id_cliente))
    if cur.rowcount == 0:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Cliente actualizado correctamente", "id_cliente": id_cliente}


@app.post("/cliente")
def add_cliente(cliente: ClienteIn):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO Cliente (nombre, telefono, direccion, pedido, satisfaccion)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            cliente.nombre, cliente.telefono,
            cliente.direccion, cliente.pedido, cliente.satisfaccion
        ))
        new_id = cur.fetchone()[0]
        conn.commit()
        return {"message": "Cliente insertado", "id_cliente": new_id}
    except IntegrityError as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cur.close()
        conn.close()


@app.delete("/cliente/{id_cliente}")
def delete_cliente(id_cliente: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM Cliente WHERE id_cliente = %s", [id_cliente])
    if cur.rowcount == 0:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Cliente eliminado correctamente"}


# ================================
# TABLA: PEDIDO
# ================================
class PedidoIn(BaseModel):
    id_cliente: int
    estado: str
    tipo_producto: str
    cantidad: int
    fecha_entrega: datetime | None = None
    fecha_prevista: datetime | None = None
    logistica: str | None = None

class PedidoOut(PedidoIn):
    id_pedido: int

@app.get("/pedido")
def get_pedidos():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM Pedido")
    cols = [d[0].lower() for d in cur.description]
    data = [dict(zip(cols, row)) for row in cur.fetchall()]
    cur.close()
    conn.close()
    return data


@app.post("/pedido")
def add_pedido(pedido: PedidoIn):
    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            INSERT INTO Pedido (
                id_cliente, estado, tipo_producto, cantidad,
                fecha_entrega, fecha_prevista, logistica
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id_pedido
        """, (
            pedido.id_cliente, pedido.estado, pedido.tipo_producto,
            pedido.cantidad, pedido.fecha_entrega, pedido.fecha_prevista, pedido.logistica
        ))
        new_id = cur.fetchone()[0]
        conn.commit()
        return {"id_pedido": new_id}
    except IntegrityError as e:
        raise HTTPException(status_code=400, detail="El pedido ya existe")
    finally:
        cur.close()
        conn.close()
    return {"message": "Pedido insertado correctamente"}

@app.delete("/pedido/{id_pedido}")
def delete_pedido(id_pedido: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM Pedido WHERE id_pedido = %s", [id_pedido])
    if cur.rowcount == 0:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Pedido eliminado correctamente"}



# ================================
# TABLA: TAREA
# ================================
class TareaIn(BaseModel):
    id_cliente: Optional[int] = None
    id_operario: int
    estado: str
    tipo_tarea: str
    descripcion: Optional[str] = None
    frecuencia: Optional[str] = None  # diaria | semanal | mensual
    logistica: Optional[str] = None

class TareaOut(TareaIn):
    id_tarea: int
    fecha_creacion: datetime
    fecha_prevista: datetime | None

@app.get("/tarea")
def get_tareas(user = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()
    
    if user["rol"] == "user":
        cur.execute("""
            SELECT * FROM Tarea
            WHERE id_operario = %s
        """, [user["id_operario"]])
    else:
        cur.execute("SELECT * FROM Tarea")

    cols = [d[0].lower() for d in cur.description]
    data = [dict(zip(cols, row)) for row in cur.fetchall()]
    cur.close()
    conn.close()
    return data


from datetime import datetime, timedelta

@app.post("/tarea")
def add_tarea(tarea: TareaIn, user=Depends(require_admin)):
    print("TAREA RECIBIDA:", tarea)
    conn = get_connection()
    cur = conn.cursor()

    fecha_creacion = datetime.now()
    fecha_prevista = None

    if tarea.frecuencia == "diaria":
        fecha_prevista = fecha_creacion + timedelta(days=1)
    elif tarea.frecuencia == "semanal":
        fecha_prevista = fecha_creacion + timedelta(weeks=1)
    elif tarea.frecuencia == "mensual":
        fecha_prevista = fecha_creacion + timedelta(days=30)

    try:
        cur.execute("""
            INSERT INTO Tarea (
                    id_cliente, id_operario, estado, 
                    tipo_tarea, descripcion, fecha_creacion, fecha_prevista, logistica)

            VALUES (tarea_seq.NEXTVAL, %s, %s, %s, %s, %s, %s, %s)
        """, (
            tarea.id_cliente, tarea.id_operario, tarea.estado, tarea.tipo_tarea, tarea.descripcion,
            fecha_creacion, fecha_prevista, tarea.logistica
        ))
        new_id = cur.fetchone()[0]
        conn.commit()
        return {"id_tarea": new_id}
    except Exception as e:
        print("ERROR ORACLE:", e)
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cur.close()
        conn.close()
    return {"message": "Tarea insertada correctamente"}



@app.put("/tarea/{id_tarea}")
def update_tarea(id_tarea: int, estado: dict):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        "UPDATE Tarea SET estado = %s WHERE id_tarea = %s",
        [estado["estado"], id_tarea]
    )

    if cur.rowcount == 0:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")

    conn.commit()

    # devolver tarea actualizada
    cur.execute("SELECT * FROM Tarea WHERE id_tarea = %s", [id_tarea])
    tarea = cur.fetchone()

    cur.close()
    conn.close()

    return tarea



@app.delete("/tarea/{id_tarea}")
def delete_tarea(id_tarea: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM Tarea WHERE id_tarea = %s", [id_tarea])
    if cur.rowcount == 0:
        raise HTTPException(status_code=404, detail="Tarea no encontrado")
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Tarea eliminada correctamente"}


# ================================
# TABLA: EVENTO
# ================================
class EventoIn(BaseModel):
    titulo: str
    tipo_evento: str
    descripcion: Optional[str] = None
    fecha_inicio: date
    fecha_fin: date | None = None
    estado: str | None = "Pendiente"
    id_operario: Optional[int] = None
    id_tarea: Optional[int] = None

class EventoOut(EventoIn):
    id_evento: int

@app.get("/evento")
def get_eventos():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM Evento")
    cols = [d[0].lower() for d in cur.description]
    data = [dict(zip(cols, row)) for row in cur.fetchall()]
    # Normalize date/datetime fields to ISO strings to avoid client-side parsing issues
    for item in data:
        for k, v in list(item.items()):
            try:
                if isinstance(v, (date, datetime)):
                    # format as YYYY-MM-DD
                    item[k] = v.strftime('%Y-%m-%d')
            except Exception:
                # leave as-is on error
                pass
    cur.close()
    conn.close()
    return data

@app.post("/evento")
def add_evento(evento: EventoIn):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO Evento (
                tipo_evento, descripcion, fecha_inicio, fecha_fin,
                estado, id_operario, titulo, id_tarea
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            evento.tipo_evento, evento.descripcion, evento.fecha_inicio,
            evento.fecha_fin, evento.estado or "Pendiente", evento.id_operario,
            evento.titulo, evento.id_tarea
        ))
        new_id = cur.fetchone()[0]
        conn.commit()
        return {"id_evento": new_id}
    
    except IntegrityError as e:
        raise HTTPException(status_code=400, detail=f"Error de integridad: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error inesperado: {e}")
    finally:
        cur.close()
        conn.close()
    return {"message": "Evento insertado correctamente"}




@app.delete("/evento/{id_evento}")
def delete_evento(id_evento: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM Evento WHERE id_evento = %s", [id_evento])
    if cur.rowcount == 0:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Evento eliminado correctamente"}



# ================================
# TABLA: PROVEEDOR
# ================================
class ProveedorIn(BaseModel):
    nombre: str
    tipo_producto: str | None = None
    URL_ficha_producto: str | None = None

class ProveedorOut(ProveedorIn):
    id_proveedor: int

@app.get("/proveedor")
def get_proveedores():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM Proveedor")
    cols = [d[0].lower() for d in cur.description]
    data = [dict(zip(cols, row)) for row in cur.fetchall()]
    cur.close()
    conn.close()
    return data

@app.post("/proveedor")
def add_proveedor(proveedor: ProveedorIn):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO Proveedor (nombre, tipo_producto, URL_ficha_producto)
            VALUES (%s, %s, %s)
        """, (
            proveedor.nombre,
            proveedor.tipo_producto, proveedor.URL_ficha_producto
        ))
        conn.commit()
    except IntegrityError as e:
        raise HTTPException(status_code=400, detail="El proveedor ya existe")
    finally:
        cur.close()
        conn.close()
    return {"message": "Proveedor insertado correctamente"}

@app.delete("/proveedor/{id_proveedor}")
def delete_proveedor(id_proveedor: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM Proveedor WHERE id_proveedor = %s", [id_proveedor])
    if cur.rowcount == 0:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Proveedor eliminado correctamente"}





# ================================
# TABLA: OPERARIO
# ================================
class OperarioIn(BaseModel):
    nombre: str
    turno_trabajo: str

class OperarioUpdateCreate(BaseModel):
    nombre: str
    turno_trabajo: str

class OperarioOut(OperarioIn):
    id_operario: int

@app.get("/operario")
def get_operarios():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM Operario")
    cols = [d[0].lower() for d in cur.description]
    data = [dict(zip(cols, row)) for row in cur.fetchall()]
    cur.close()
    conn.close()
    return data

@app.post("/operario")
def add_operario(operario: OperarioUpdateCreate):
    conn = get_connection()

    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO operario (nombre, turno_trabajo)
            VALUES (%s, %s)
            RETURNING *
        """, (
            operario.nombre,
            operario.turno_trabajo
        ))
        new_operario = cur.fetchone()
        conn.commit()
        cols = [d[0] for d in cur.description]
        return dict(zip(cols, new_operario))
    except IntegrityError:
        conn.rollback()
        raise HTTPException(400, "El operario ya existe")
    finally:
        cur.close()
        conn.close()
    return {"message": "Operario insertado correctamente"}

@app.delete("/operario/{id_operario}")
def delete_operario(id_operario: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM Operario WHERE id_operario = %s", [id_operario])
    if cur.rowcount == 0:
        raise HTTPException(status_code=404, detail="Operario no encontrado")
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Operario eliminado correctamente"}


@app.put("/operario/{id_operario}")
def update_operario(id_operario: int, operario: OperarioUpdateCreate):
    conn = get_connection()
    cur = conn.cursor()
    try:
        # Actualizar nombre y turno_trabajo para el id dado
        cur.execute("""
            UPDATE Operario
            SET nombre = %s, turno_trabajo = %s
            WHERE id_operario = %s
        """, (
            operario.nombre,
            operario.turno_trabajo,
            id_operario
        ))
        conn.commit()

        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Operario no encontrado")
    finally:
        cur.close()
        conn.close()

    return {"message": "Operario actualizado correctamente"}



# ================================
# TABLA: CAMARA
# ================================
class CamaraIn(BaseModel):
    porcentaje_uso: float

class CamaraOut(CamaraIn):
    id_camara: int

@app.get("/camara")
def get_camaras():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM Camara")
    cols = [d[0].lower() for d in cur.description]
    data = [dict(zip(cols, row)) for row in cur.fetchall()]
    cur.close()
    conn.close()
    return data

@app.post("/camara")
def add_camara(camara: CamaraIn):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO Camara (porcentaje_uso)
            VALUES (%s, %s)
        """, (
            camara.porcentaje_uso
        ))
        conn.commit()
    except IntegrityError as e:
        raise HTTPException(status_code=400, detail="La cámara ya existe")
    finally:
        cur.close()
        conn.close()
    return {"message": "Cámara insertada correctamente"}

@app.delete("/camara/{id_camara}")
def delete_camara(id_camara: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM Camara WHERE id_camara = %s", [id_camara])
    if cur.rowcount == 0:
        raise HTTPException(status_code=404, detail="Cámara no encontrada")
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Cámara eliminada correctamente"}




# ================================
# TABLA: LOTE_ALIMENTO
# ================================
class LoteAlimentoIn(BaseModel):
    descripcion: str | None = None
    fecha_llegada: str | None = None      # 'YYYY-MM-DD'
    fecha_caducidad: str | None = None    # 'YYYY-MM-DD'
    cantidad: float | None = None

class LoteAlimentoOut(LoteAlimentoIn):
    id_lote_alimento: int

@app.get("/lote_alimento")
def get_lotes_alimento():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM Lote_Alimento ORDER BY id_lote_alimento")
    cols = [d[0].lower() for d in cur.description]
    data = [dict(zip(cols, row)) for row in cur.fetchall()]
    cur.close()
    conn.close()
    return data

@app.post("/lote_alimento")
def add_lote_alimento(lote: LoteAlimentoIn):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO Lote_Alimento
                (descripcion, fecha_llegada, fecha_caducidad, cantidad)
            VALUES
                (%s, %s, %s, %s)
        """, (
            lote.descripcion,
            lote.fecha_llegada, lote.fecha_caducidad,
            lote.cantidad
        ))
        conn.commit()
    except IntegrityError as e:
        raise HTTPException(status_code=400, detail=f"Error de integridad: {e}")
    finally:
        cur.close()
        conn.close()
    return {"message": "Lote_Alimento insertado correctamente"}

@app.delete("/lote_alimento/{id_lote_alimento}")
def delete_lote_alimento(id_lote_alimento: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM Lote_Alimento WHERE id_lote_alimento = %s", [id_lote_alimento])
    if cur.rowcount == 0:
        raise HTTPException(status_code=404, detail="Lote_Alimento no encontrado")
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Lote_Alimento eliminado correctamente"}



# ================================
# TABLA: REGISTRO
# ================================
class RegistroIn(BaseModel):
    id_camara: int
    tipo_registro: str | None = None
    timestamp_registro: str | None = None  # 'YYYY-MM-DD HH:MM:SS'
    humedad: float | None = None
    co2: float | None = None
    temperatura: float | None = None

class RegistroOut(RegistroIn):
    id_registro: int

@app.get("/registro")
def get_registros():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM Registro ORDER BY id_registro")
    cols = [d[0].lower() for d in cur.description]
    data = [dict(zip(cols, row)) for row in cur.fetchall()]
    cur.close()
    conn.close()
    return data

@app.post("/registro")
def add_registro(reg: RegistroIn):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO Registro
                (id_camara, tipo_registro, timestamp_registro, humedad, co2, temperatura)
            VALUES
                (%s, %s, %s, %s, %s, %s)
        """, (
            reg.id_camara, reg.tipo_registro,
            reg.timestamp_registro, reg.humedad, reg.co2, reg.temperatura
        ))
        conn.commit()
    except IntegrityError as e:
        raise HTTPException(status_code=400, detail=f"Error de integridad (¿FK id_camara?): {e}")
    finally:
        cur.close()
        conn.close()
    return {"message": "Registro insertado correctamente"}

@app.delete("/registro/{id_registro}")
def delete_registro(id_registro: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM Registro WHERE id_registro = %s", [id_registro])
    if cur.rowcount == 0:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Registro eliminado correctamente"}



# ================================
# TABLA: SENSORES
# ================================
class SensorIn(BaseModel):
    id_registro: int
    tipo_sensor: str | None = None
    ubicacion: str | None = None

class SensorOut(SensorIn):
    id_sensor: int

@app.get("/sensores")
def get_sensores():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM Sensores ORDER BY id_sensor")
    cols = [d[0].lower() for d in cur.description]
    data = [dict(zip(cols, row)) for row in cur.fetchall()]
    cur.close()
    conn.close()
    return data

@app.post("/sensores")
def add_sensor(sensor: SensorIn):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO Sensores
                (id_registro, tipo_sensor, ubicacion)
            VALUES
                (%s, %s, %s)
        """, (
            sensor.id_registro, sensor.tipo_sensor, sensor.ubicacion
        ))
        conn.commit()
    except IntegrityError as e:
        raise HTTPException(status_code=400, detail=f"Error de integridad (¿FK id_registro?): {e}")
    finally:
        cur.close()
        conn.close()
    return {"message": "Sensor insertado correctamente"}

@app.delete("/sensores/{id_sensor}")
def delete_sensor(id_sensor: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM Sensores WHERE id_sensor = %s", [id_sensor])
    if cur.rowcount == 0:
        raise HTTPException(status_code=404, detail="Sensor no encontrado")
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Sensor eliminado correctamente"}



# ================================
# TABLA: FRANQUICIADO
# ================================
class FranquiciadoIn(BaseModel):
    ubicacion: str | None = None

class FranquiciadoOut(FranquiciadoIn):
    id_franquiciado: int

@app.get("/franquiciado")
def get_franquiciados():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM Franquiciado ORDER BY id_franquiciado")
    cols = [d[0].lower() for d in cur.description]
    data = [dict(zip(cols, row)) for row in cur.fetchall()]
    cur.close()
    conn.close()
    return data

@app.post("/franquiciado")
def add_franquiciado(f: FranquiciadoIn):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO Franquiciado (ubicacion)
            VALUES (%s)
        """, (f.ubicacion))
        conn.commit()
    except IntegrityError as e:
        raise HTTPException(status_code=400, detail=f"Error de integridad: {e}")
    finally:
        cur.close()
        conn.close()
    return {"message": "Franquiciado insertado correctamente"}

@app.delete("/franquiciado/{id_franquiciado}")
def delete_franquiciado(id_franquiciado: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM Franquiciado WHERE id_franquiciado = %s", [id_franquiciado])
    if cur.rowcount == 0:
        raise HTTPException(status_code=404, detail="Franquiciado no encontrado")
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Franquiciado eliminado correctamente"}



# ================================
# TABLA: ENGORDE
# ================================
class EngordeIn(BaseModel):
    id_camara: int | None = None
    id_operario: int | None = None
    id_lote_madre: int | None = None
    pasillo: int | None = None
    posicion: str | None = None
    timestamp_ubicacion: str | None = None  # 'YYYY-MM-DD HH:MM:SS'
    fecha_montaje: str
    fecha_desmontaje: str
    fecha_desmontaje_prevista: str
    destino: str | None = None

class EngordeOut(EngordeIn):
    id_pallet: int


@app.get("/engorde")
def get_engorde():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM Engorde ORDER BY id_pallet")
    cols = [d[0].lower() for d in cur.description]
    data = [dict(zip(cols, row)) for row in cur.fetchall()]
    cur.close()
    conn.close()
    return data

@app.post("/engorde")
def add_engorde(e: EngordeIn):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO Engorde
                (id_camara, id_operario, id_lote_madre, pasillo, posicion,
                 timestamp_ubicacion, fecha_montaje, fecha_desmontaje, fecha_desmontaje_prevista, destino)
            VALUES
                (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            e.id_camara, e.id_operario, e.id_lote_madre, e.pasillo, e.posicion,
            e.timestamp_ubicacion, e.fecha_montaje, e.fecha_desmontaje, e.fecha_desmontaje_prevista,
            e.destino
        ))
        conn.commit()
    except IntegrityError as err:
        raise HTTPException(status_code=400, detail=f"Error de integridad (¿FK id_camara/id_operario?): {err}")
    finally:
        cur.close()
        conn.close()
    return {"message": "Engorde insertado correctamente"}

@app.delete("/engorde/{id_pallet}")
def delete_engorde(id_pallet: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM Engorde WHERE id_pallet = %s", [id_pallet])
    if cur.rowcount == 0:
        raise HTTPException(status_code=404, detail="Engorde no encontrado")
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Engorde eliminado correctamente"}



# ================================
# TABLA: VOLADERO
# ================================
class VoladeroIn(BaseModel):
    id_pallet: int
    fecha_inicio: str
    fecha_fin: str
    fecha_fin_estimada: str

class VoladeroOut(VoladeroIn):
    id_voladero: int

@app.get("/voladero")
def get_voladero():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM Voladero ORDER BY id_voladero")
    cols = [d[0].lower() for d in cur.description]
    data = [dict(zip(cols, row)) for row in cur.fetchall()]
    cur.close()
    conn.close()
    return data

@app.post("/voladero")
def add_voladero(v: VoladeroIn):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO Voladero
                (id_pallet, fecha_inicio, fecha_fin, fecha_fin_estimada)
            VALUES
                (%s, %s, %s, %s)
        """, (
            v.id_pallet, v.fecha_inicio, v.fecha_fin, v.fecha_fin_estimada
        ))
        conn.commit()
    except IntegrityError as e:
        raise HTTPException(status_code=400, detail=f"Error de integridad (¿FK id_pallet?): {e}")
    finally:
        cur.close()
        conn.close()
    return {"message": "Voladero insertado correctamente"}

@app.delete("/voladero/{id_voladero}")
def delete_voladero(id_voladero: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM Voladero WHERE id_voladero = %s", [id_voladero])
    if cur.rowcount == 0:
        raise HTTPException(status_code=404, detail="Voladero no encontrado")
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Voladero eliminado correctamente"}



# ================================
# TABLA: INCUBACION
# ================================
class IncubacionIn(BaseModel):
    id_lote_alimento: int | None = None
    id_operario: int | None = None
    id_voladero: int | None = None
    fecha_inicio: str
    fecha_fin: str
    origen: str | None = None
    gramos_huevos: float | None = None
    n_bandejas: int | None = None

class IncubaciónOut(IncubacionIn):
    id_lote_madre: int

@app.get("/incubacion")
def get_incubacion():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM Incubacion ORDER BY id_lote_madre")
    cols = [d[0].lower() for d in cur.description]
    data = [dict(zip(cols, row)) for row in cur.fetchall()]
    cur.close()
    conn.close()
    return data

@app.post("/incubacion")
def add_incubacion(i: IncubacionIn):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO Incubacion
                (id_lote_alimento, id_operario, id_voladero,
                 fecha_inicio, fecha_fin, origen, gramos_huevos, n_bandejas)
            VALUES
                (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            i.id_lote_alimento, i.id_operario, i.id_voladero,
            i.fecha_inicio, i.fecha_fin, i.origen, i.gramos_huevos, i.n_bandejas
        ))
        conn.commit()
    except IntegrityError as e:
        raise HTTPException(status_code=400, detail=f"Error de integridad (¿FK id_lote_alimento/id_operario?): {e}")
    finally:
        cur.close()
        conn.close()
    return {"message": "Incubación insertada correctamente"}

@app.delete("/incubacion/{id_lote_madre}")
def delete_incubacion(id_lote_madre: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM Incubacion WHERE id_lote_madre = %s", [id_lote_madre])
    if cur.rowcount == 0:
        raise HTTPException(status_code=404, detail="Incubación no encontrada")
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Incubación eliminada correctamente"}



# ================================
# TABLA: PRODUCTOS
# ================================
class ProductoIn(BaseModel):
    id_lote_madre: int | None = None
    id_pallet: int | None = None
    id_operario: int | None = None
    id_pedido: int | None = None
    fecha_produccion: str
    fecha_caducidad: str
    url_pdf: str | None = None
    tipo_producto: str | None = None
    ubicacion_almacen: str | None = None

class ProductoOut(ProductoIn):
    id_bigbag: int

@app.get("/productos")
def get_productos():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM Productos ORDER BY id_bigbag")
    cols = [d[0].lower() for d in cur.description]
    data = [dict(zip(cols, row)) for row in cur.fetchall()]
    cur.close()
    conn.close()
    return data

@app.post("/productos")
def add_producto(p: ProductoIn):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO Productos
                (id_lote_madre, id_pallet, id_operario, id_pedido,
                 fecha_produccion, fecha_caducidad, url_pdf, tipo_producto, ubicacion_almacen)
            VALUES
                (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            p.id_lote_madre, p.id_pallet, p.id_operario, p.id_pedido,
            p.fecha_produccion, p.fecha_caducidad, p.url_pdf, p.tipo_producto, p.ubicacion_almacen
        ))
        conn.commit()
    except IntegrityError as e:
        raise HTTPException(status_code=400, detail=f"Error de integridad (¿FKs?): {e}")
    finally:
        cur.close()
        conn.close()
    return {"message": "Producto insertado correctamente"}

@app.delete("/productos/{id_bigbag}")
def delete_producto(id_bigbag: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM Productos WHERE id_bigbag = %s", [id_bigbag])
    if cur.rowcount == 0:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Producto eliminado correctamente"}

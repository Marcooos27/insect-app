import logging
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from backend.auth.auth import get_current_user
from backend.database import get_connection
from datetime import date, timedelta
import calendar
import io

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/appcc", tags=["appcc"])


def get_dias_laborables(year: int, month: int):
    """Devuelve lista de fechas laborables (L-V) del mes."""
    _, num_dias = calendar.monthrange(year, month)
    dias = []
    for d in range(1, num_dias + 1):
        fecha = date(year, month, d)
        if fecha.weekday() < 5:  # 0=Lunes, 4=Viernes
            dias.append(fecha)
    return dias


def get_semanas_mes(year: int, month: int):
    """Devuelve las semanas laborables del mes como lista de (lunes, viernes)."""
    dias = get_dias_laborables(year, month)
    semanas = []
    semana_actual = []
    for dia in dias:
        if semana_actual and dia.weekday() == 0:
            semanas.append((semana_actual[0], semana_actual[-1]))
            semana_actual = []
        semana_actual.append(dia)
    if semana_actual:
        semanas.append((semana_actual[0], semana_actual[-1]))
    return semanas


@router.get("/datos/{year}/{month}")
def get_datos_appcc(year: int, month: int, user=Depends(get_current_user)):
    if user["rol"] != "admin":
        raise HTTPException(403, "Solo administradores pueden generar el APPCC")

    conn = get_connection()
    cur = conn.cursor()
    try:
        # --- SECCIÓN 1: Zonas de limpieza con responsable ---
        cur.execute("""
            SELECT z.id, z.nombre, z.detergente, z.dosis,
                   z.forma_aplicacion, z.tiempo_exposicion,
                   o.nombre as responsable, z.orden
            FROM appcc_zona_limpieza z
            LEFT JOIN operario o ON o.id_operario = z.id_responsable
            ORDER BY z.orden
        """)
        cols = [d[0] for d in cur.description]
        zonas = [dict(zip(cols, row)) for row in cur.fetchall()]

        # Observaciones puntuales del mes
        cur.execute("""
            SELECT id_zona, fecha, observacion
            FROM appcc_limpieza_observacion
            WHERE DATE_TRUNC('month', fecha) = %s
        """, (date(year, month, 1),))
        obs_rows = cur.fetchall()
        observaciones = {}
        for id_zona, fecha, obs in obs_rows:
            observaciones[(id_zona, str(fecha))] = obs

        # --- SECCIÓN 2: Higiene personal (registro_limpieza_diario) ---
        cur.execute("""
            SELECT o.nombre, r.fecha
            FROM registro_limpieza_diario r
            JOIN operario o ON o.id_operario = r.id_operario
            WHERE DATE_TRUNC('month', r.fecha) = %s
            ORDER BY o.nombre, r.fecha
        """, (date(year, month, 1),))
        higiene_rows = cur.fetchall()
        higiene = {}
        for nombre, fecha in higiene_rows:
            higiene.setdefault(nombre, set()).add(str(fecha))

        # --- SECCIÓN 3: Aspectos de buenas prácticas ---
        cur.execute("""
            SELECT numero, descripcion FROM appcc_aspecto_practica ORDER BY numero
        """)
        aspectos = [{"numero": r[0], "descripcion": r[1]} for r in cur.fetchall()]

        cur.execute("""
            SELECT semana_inicio, id_aspecto, correcto, observacion
            FROM appcc_practica_resultado
            WHERE DATE_TRUNC('month', semana_inicio) = %s
        """, (date(year, month, 1),))
        resultados_practica = {}
        for semana, id_asp, correcto, obs in cur.fetchall():
            resultados_practica[(str(semana), id_asp)] = {
                "correcto": correcto, "observacion": obs
            }

        # --- SECCIÓN 4: Control de plagas ---
        cur.execute("SELECT id, nombre, orden FROM appcc_zona_plaga ORDER BY orden")
        zonas_plaga = [{"id": r[0], "nombre": r[1]} for r in cur.fetchall()]

        cur.execute("""
            SELECT id_zona, interaccion_trampas, reposicion_producto, observaciones
            FROM appcc_plaga_registro
            WHERE mes = %s
        """, (date(year, month, 1),))
        plaga_data = {}
        for id_zona, interaccion, reposicion, obs in cur.fetchall():
            plaga_data[id_zona] = {
                "interaccion": interaccion,
                "reposicion": reposicion,
                "observaciones": obs or ""
            }

        # --- SECCIÓN 5: Proveedores ---
        cur.execute("""
            SELECT nombre FROM operario WHERE id_operario = %s
        """, (user["id_operario"],))
        row = cur.fetchone()
        nombre_admin = row[0] if row else ""

        # --- SECCIÓN 6: Trazabilidad (lotes del mes) ---
        cur.execute("""
            SELECT
                la.codigo_qr as lote,
                p.fecha_entrada_camara as fecha,
                p.codigo_qr as pallet,
                la.descripcion as sustrato
            FROM engorde e
            JOIN pallet p ON p.id_pallet = e.id_pallet
            JOIN lote_alimento la ON la.id_lote_alimento = e.id_lote_alimento
            WHERE DATE_TRUNC('month', p.fecha_entrada_camara) = %s
            ORDER BY p.fecha_entrada_camara
        """, (date(year, month, 1),))
        cols = [d[0] for d in cur.description]
        trazabilidad = [dict(zip(cols, row)) for row in cur.fetchall()]

        meses_es = ["", "enero", "febrero", "marzo", "abril", "mayo", "junio",
                    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]

        return {
            "year": year,
            "month": month,
            "mes_nombre": meses_es[month].upper(),
            "nombre_admin": nombre_admin,
            "dias_laborables": [str(d) for d in get_dias_laborables(year, month)],
            "semanas": [(str(s[0]), str(s[1])) for s in get_semanas_mes(year, month)],
            "zonas_limpieza": zonas,
            "observaciones_limpieza": {f"{k[0]}_{k[1]}": v for k, v in observaciones.items()},
            "higiene_personal": {k: list(v) for k, v in higiene.items()},
            "aspectos_practica": aspectos,
            "resultados_practica": {f"{k[0]}_{k[1]}": v for k, v in resultados_practica.items()},
            "zonas_plaga": zonas_plaga,
            "plaga_data": plaga_data,
            "trazabilidad": trazabilidad,
        }

    finally:
        cur.close()
        conn.close()


@router.get("/exportar/{year}/{month}")
def exportar_appcc(year: int, month: int, user=Depends(get_current_user)):
    if user["rol"] != "admin":
        raise HTTPException(403, "Solo administradores pueden exportar el APPCC")

    # Reutilizamos la lógica de datos
    datos = get_datos_appcc(year, month, user)
    docx_bytes = generar_docx(datos)

    filename = f"APPCC_{datos['mes_nombre']}_{year}.docx"
    return StreamingResponse(
        io.BytesIO(docx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


def generar_docx(datos: dict) -> bytes:
    from docx import Document
    from docx.shared import Pt, Cm, RGBColor
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.enum.table import WD_ALIGN_VERTICAL
    from docx.oxml.ns import qn
    from docx.oxml import OxmlElement

    doc = Document()

    # Márgenes
    for section in doc.sections:
        section.top_margin = Cm(1.5)
        section.bottom_margin = Cm(1.5)
        section.left_margin = Cm(2)
        section.right_margin = Cm(2)

    meses_es = ["", "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
                "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"]
    mes_nombre = meses_es[datos["month"]]
    year = datos["year"]

    def set_cell_bg(cell, hex_color):
        tc = cell._tc
        tcPr = tc.get_or_add_tcPr()
        shd = OxmlElement('w:shd')
        shd.set(qn('w:val'), 'clear')
        shd.set(qn('w:color'), 'auto')
        shd.set(qn('w:fill'), hex_color)
        tcPr.append(shd)

    def heading(text, level=1):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run(text)
        run.bold = True
        run.font.size = Pt(13 if level == 1 else 11)
        return p

    # =========================================================
    # SECCIÓN 1: LIMPIEZA Y DESINFECCIÓN
    # =========================================================
    heading(f"LIMPIEZA Y DESINFECCIÓN {mes_nombre} {year}")

    dias = datos["dias_laborables"]
    zonas = datos["zonas_limpieza"]
    obs_map = datos["observaciones_limpieza"]

    for dia_str in dias:
        dia = date.fromisoformat(dia_str)
        dia_num = dia.day

        p = doc.add_paragraph()
        p.add_run(f"Fecha: {dia_num}    Mes: {mes_nombre}    Año: {year}").bold = True

        # Tabla de limpieza
        cols_widths = [Cm(3), Cm(3.5), Cm(2), Cm(4), Cm(2.5), Cm(3), Cm(3)]
        tabla = doc.add_table(rows=1, cols=7)
        tabla.style = 'Table Grid'

        headers = ["EQUIPO", "DETERGENTE / DESINFECTANTE",
                   "DOSIS", "FORMA DE APLICACIÓN",
                   "TIEMPO DE EXPOSICIÓN", "RESPONSABLE", "OBSERVACIONES"]

        hdr_row = tabla.rows[0]
        for i, (h, w) in enumerate(zip(headers, cols_widths)):
            cell = hdr_row.cells[i]
            cell.width = w
            set_cell_bg(cell, "D9D9D9")
            p_cell = cell.paragraphs[0]
            run = p_cell.add_run(h)
            run.bold = True
            run.font.size = Pt(8)

        for zona in zonas:
            row = tabla.add_row()
            obs_key = f"{zona['id']}_{dia_str}"
            obs_val = obs_map.get(obs_key, "")
            valores = [
                zona["nombre"],
                zona["detergente"] or "",
                zona["dosis"] or "",
                zona["forma_aplicacion"] or "",
                zona["tiempo_exposicion"] or "",
                zona["responsable"] or "",
                obs_val,
            ]
            for i, (val, w) in enumerate(zip(valores, cols_widths)):
                cell = row.cells[i]
                cell.width = w
                p_cell = cell.paragraphs[0]
                run = p_cell.add_run(str(val))
                run.font.size = Pt(8)

        doc.add_paragraph(f"Firma responsable: _________________________")
        doc.add_paragraph("")

    # =========================================================
    # SECCIÓN 2: HIGIENE PERSONAL
    # =========================================================
    doc.add_page_break()
    heading(f"CONTROL DE HIGIENE PERSONAL — {mes_nombre} {year}")

    semanas = datos["semanas"]
    higiene = datos["higiene_personal"]
    dias_semana = ["L", "M", "M", "J", "V"]

    for sem_inicio_str, sem_fin_str in semanas:
        sem_inicio = date.fromisoformat(sem_inicio_str)
        sem_fin = date.fromisoformat(sem_fin_str)

        p = doc.add_paragraph()
        p.add_run(
            f"Semana: {sem_inicio.day}-{sem_fin.day} de {mes_nombre.lower()}"
        ).italic = True

        # Construir los días reales de esta semana
        dias_reales = []
        d = sem_inicio
        while d <= sem_fin:
            if d.weekday() < 5:
                dias_reales.append(d)
            d += timedelta(days=1)

        tabla = doc.add_table(rows=1, cols=1 + 4 * 5)
        tabla.style = 'Table Grid'

        # Cabecera
        hdr = tabla.rows[0]
        hdr.cells[0].text = "NOMBRE Y APELLIDOS"
        hdr.cells[0].paragraphs[0].runs[0].font.size = Pt(7)

        categorias = ["UÑAS Y MANOS", "ACCESORIOS", "ROPA", "CALZADO"]
        for ci, cat in enumerate(categorias):
            col_start = 1 + ci * 5
            hdr.cells[col_start].text = cat
            hdr.cells[col_start].paragraphs[0].runs[0].font.size = Pt(7)
            for di, dl in enumerate(dias_semana):
                idx = col_start + di
                if idx < len(hdr.cells):
                    hdr.cells[idx].text = dl
                    hdr.cells[idx].paragraphs[0].runs[0].font.size = Pt(7)

        # Operarios
        operarios_higiene = sorted(higiene.keys())
        if not operarios_higiene:
            row = tabla.add_row()
            row.cells[0].text = "(Sin registros este mes)"
        else:
            for op_nombre in operarios_higiene:
                fechas_ok = higiene[op_nombre]
                row = tabla.add_row()
                row.cells[0].text = op_nombre
                row.cells[0].paragraphs[0].runs[0].font.size = Pt(7)

                for ci in range(4):
                    col_start = 1 + ci * 5
                    for di, dia_real in enumerate(dias_reales):
                        idx = col_start + di
                        if idx < len(row.cells):
                            if str(dia_real) in fechas_ok:
                                row.cells[idx].text = "X"
                                row.cells[idx].paragraphs[0].runs[0].font.size = Pt(7)

        doc.add_paragraph("Firma Responsable: _________________________")
        doc.add_paragraph("")

    # =========================================================
    # SECCIÓN 3: BUENAS PRÁCTICAS DE MANIPULACIÓN
    # =========================================================
    doc.add_page_break()
    heading(f"CONTROL DE BUENAS PRÁCTICAS DE MANIPULACIÓN — {mes_nombre} {year}")

    aspectos = datos["aspectos_practica"]
    resultados = datos["resultados_practica"]

    for sem_inicio_str, sem_fin_str in semanas:
        sem_inicio = date.fromisoformat(sem_inicio_str)
        sem_fin = date.fromisoformat(sem_fin_str)

        p = doc.add_paragraph()
        p.add_run(
            f"Fecha de control: {sem_inicio.day}-{sem_fin.day} de {mes_nombre.lower()}"
        ).bold = True

        tabla = doc.add_table(rows=1, cols=4)
        tabla.style = 'Table Grid'
        hdrs = ["Nº", "ASPECTO A CONTROLAR", "CORRECTO", "INCORRECTO"]
        for i, h in enumerate(hdrs):
            cell = tabla.rows[0].cells[i]
            set_cell_bg(cell, "D9D9D9")
            run = cell.paragraphs[0].add_run(h)
            run.bold = True
            run.font.size = Pt(8)

        for asp in aspectos:
            key = f"{sem_inicio_str}_{asp['numero']}"
            resultado = resultados.get(key, {"correcto": True, "observacion": ""})
            row = tabla.add_row()
            row.cells[0].text = str(asp["numero"])
            row.cells[1].text = asp["descripcion"]
            row.cells[2].text = "SÍ" if resultado["correcto"] else ""
            obs = resultado.get("observacion") or ""
            row.cells[3].text = "" if resultado["correcto"] else f"SÍ ({obs})"
            for cell in row.cells:
                cell.paragraphs[0].runs[0].font.size = Pt(8)

        doc.add_paragraph("Firma: _________________________")
        doc.add_paragraph("")

    # =========================================================
    # SECCIÓN 4: CONTROL DE PLAGAS
    # =========================================================
    doc.add_page_break()
    heading(f"CONTROL DE PLAGAS — {mes_nombre} {year}")

    tabla = doc.add_table(rows=1, cols=4)
    tabla.style = 'Table Grid'
    for i, h in enumerate(["Estancia / Zona", "¿Interacción con trampas? (Sí/No)",
                            "¿Reposición de producto de control? (Sí/No)", "Observaciones"]):
        cell = tabla.rows[0].cells[i]
        set_cell_bg(cell, "D9D9D9")
        run = cell.paragraphs[0].add_run(h)
        run.bold = True
        run.font.size = Pt(8)

    for zona in datos["zonas_plaga"]:
        d = datos["plaga_data"].get(zona["id"], {})
        row = tabla.add_row()
        row.cells[0].text = zona["nombre"]
        row.cells[1].text = "SÍ" if d.get("interaccion") else "NO"
        row.cells[2].text = "SÍ" if d.get("reposicion") else "NO"
        row.cells[3].text = d.get("observaciones", "")
        for cell in row.cells:
            if cell.paragraphs[0].runs:
                cell.paragraphs[0].runs[0].font.size = Pt(8)

    doc.add_paragraph(f"Fecha: __ / __ / {year}")
    doc.add_paragraph("Responsable de la revisión: _________________________")

    # =========================================================
    # SECCIÓN 5: CONTROL DE PROVEEDORES
    # =========================================================
    doc.add_page_break()
    heading(f"CONTROL DE PROVEEDORES — {mes_nombre} {year}")

    tabla = doc.add_table(rows=1, cols=7)
    tabla.style = 'Table Grid'
    prov_hdrs = ["Proveedor", "Producto suministrado", "Documentación en regla (Sí/No)",
                 "Conformidad del producto (Sí/No)", "Incidencias detectadas",
                 "Acciones correctoras", "¿Proveedor apto? (Sí/No)"]
    for i, h in enumerate(prov_hdrs):
        cell = tabla.rows[0].cells[i]
        set_cell_bg(cell, "D9D9D9")
        run = cell.paragraphs[0].add_run(h)
        run.bold = True
        run.font.size = Pt(7)

    # 5 filas vacías para rellenar a mano
    for _ in range(5):
        tabla.add_row()

    # =========================================================
    # SECCIÓN 6: TRAZABILIDAD
    # =========================================================
    doc.add_page_break()
    heading(f"CONTROL DE IDENTIFICACIÓN Y TRAZABILIDAD — {mes_nombre} {year}")

    tabla = doc.add_table(rows=1, cols=5)
    tabla.style = 'Table Grid'
    traz_hdrs = ["Lote", "Pallet asociado", "Sustrato utilizado",
                 "Fecha de producción", "Observaciones"]
    for i, h in enumerate(traz_hdrs):
        cell = tabla.rows[0].cells[i]
        set_cell_bg(cell, "D9D9D9")
        run = cell.paragraphs[0].add_run(h)
        run.bold = True
        run.font.size = Pt(8)

    if datos["trazabilidad"]:
        for t in datos["trazabilidad"]:
            row = tabla.add_row()
            row.cells[0].text = str(t.get("lote", ""))
            row.cells[1].text = str(t.get("pallet", ""))
            row.cells[2].text = str(t.get("sustrato", ""))
            row.cells[3].text = str(t.get("fecha", ""))
            row.cells[4].text = ""
            for cell in row.cells:
                if cell.paragraphs[0].runs:
                    cell.paragraphs[0].runs[0].font.size = Pt(8)
    else:
        row = tabla.add_row()
        row.cells[0].text = "(Sin registros de trazabilidad este mes)"

    # Guardar en memoria
    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)
    return buf.read()
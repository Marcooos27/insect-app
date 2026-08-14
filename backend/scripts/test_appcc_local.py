# -*- coding: utf-8 -*-
"""
Prueba local del export APPCC contra la base de datos real (solo lectura),
sin pasar por HTTP/JWT: llama directamente a get_datos_appcc/generar_docx
con un usuario admin simulado.

Requiere: pip install -r requirements.txt (desde la raiz del proyecto),
y que tu maquina tenga acceso de red a la base de datos RDS del .env.

Uso:
    python backend/scripts/test_appcc_local.py [year] [month]

Si no se pasan year/month, usa el mes actual.
"""
import sys, io
from pathlib import Path
from datetime import date

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from backend import appcc
from docx import Document

fake_user = {"rol": "admin", "id_operario": 1}

if len(sys.argv) >= 3:
    YEAR, MONTH = int(sys.argv[1]), int(sys.argv[2])
else:
    hoy = date.today()
    YEAR, MONTH = hoy.year, hoy.month

print(f"Consultando datos APPCC reales para {MONTH}/{YEAR}...")
datos = appcc.get_datos_appcc(YEAR, MONTH, user=fake_user)

print("\n--- Resumen de datos obtenidos ---")
print("Proveedores:", len(datos["proveedores"]), "->", [p["nombre"] for p in datos["proveedores"]])
print("Trazabilidad (lote_final este mes):", len(datos["trazabilidad"]))
print("Zonas limpieza:", len(datos["zonas_limpieza"]))
print("Dias laborables:", len(datos["dias_laborables"]))

print("\nGenerando docx...")
docx_bytes = appcc.generar_docx(datos)
print("Bytes generados:", len(docx_bytes))

out_path = Path(__file__).resolve().parent / f"APPCC_test_{YEAR}_{MONTH:02d}.docx"
out_path.write_bytes(docx_bytes)
print("Guardado en:", out_path)

# Verificar que las secciones esperadas existen en el documento generado
doc = Document(io.BytesIO(docx_bytes))
headings = [p.text for p in doc.paragraphs if p.text.strip() and p.runs and p.runs[0].bold]
print("\n--- Encabezados en el docx generado ---")
for h in headings:
    print(" -", h)

necesarias = [
    "CONTROL DE MATERIAS PRIMAS",
    "CONTROL DE TRANSFORMACIÓN DEL PRODUCTO",
    "CONTROL DE ALMACENAMIENTO",
]
faltantes = [n for n in necesarias if not any(n in h for h in headings)]
if faltantes:
    print("\n¡FALTAN SECCIONES!:", faltantes)
else:
    print("\nOK: las 3 secciones nuevas están presentes en el docx.")

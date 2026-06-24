import qrcode
from qrcode.constants import ERROR_CORRECT_H
import os

os.makedirs("qrs", exist_ok=True)


# Crear estructura de carpetas principal y subcarpetas
os.makedirs("qrs/lote_alimento", exist_ok=True)
os.makedirs("qrs/lote_huevo", exist_ok=True)
os.makedirs("qrs/camara", exist_ok=True)

def generar_qr(texto, nombre_archivo, subcarpeta):
    qr = qrcode.QRCode(
        version=2,
        error_correction=ERROR_CORRECT_H,
        box_size=10,
        border=4
    )
    qr.add_data(texto)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    # Guardar en la subcarpeta específica
    img.save(f"qrs/{subcarpeta}/{nombre_archivo}.png")



'''
# 1. Generar Lotes de Huevos
for i in range(1, 50):
    codigo = f"BFS-{i:05d}"
    archivo = f"lote_huevos_{i:05d}"
    generar_qr(codigo, archivo, "lote_huevo")
    print(f"Generado en lote_huevo: {archivo}")
'''


# 2. Generar Lotes de Salvado de Trigo
for i in range(1, 10):
    codigo = f"Salvado-trigo-{i:04d}"
    archivo = f"salvado_trigo_{i:04d}"
    generar_qr(codigo, archivo, "lote_alimento")
    print(f"Generado en lote_alimento: {archivo}")




# Ejemplos
generar_qr("CAMARA-01", "camara_01")
generar_qr("CAMARA-02", "camara_02")



# Generar 25 Pallets (del 001 al 025)
for i in range(1, 34):
    # El :03d rellena con ceros a la izquierda (001, 002...)
    codigo = f"PALLET-{i:03d}"
    archivo = f"pallet_{i:03d}"
    generar_qr(codigo, archivo)
    print(f"Generado: {archivo}")


# Ejemplo si quieres generar varias cámaras (del 01 al 05)
'''
for i in range(1, 6):
    codigo = f"CAMARA-{i:02d}"
    archivo = f"camara_{i:02d}"
    generar_qr(codigo, archivo)

    '''

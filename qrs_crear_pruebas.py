import qrcode
from qrcode.constants import ERROR_CORRECT_H
import os

os.makedirs("qrs", exist_ok=True)


def generar_qr(texto, nombre_archivo):
    qr = qrcode.QRCode(
        version=2,  # tamaño del QR (1-40). 2 ya es más grande
        error_correction=ERROR_CORRECT_H,  # tolera errores y permite mejor escaneo
        box_size=10,  # tamaño de cada "cuadro" del QR
        border=4      # borde mínimo recomendado
    )
    qr.add_data(texto)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    img.save(f"qrs/{nombre_archivo}.png")

# Ejemplos
generar_qr("PALLET-001", "pallet_001")
generar_qr("CAMARA-01", "camara_01")
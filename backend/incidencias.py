from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from config import settings  # tu archivo de configuración
from auth import get_current_user  # tu función de autenticación actual

router = APIRouter()

class IncidenciaRequest(BaseModel):
    titulo: str
    descripcion: str

def enviar_email_incidencia(nombre_usuario: str, email_usuario: str, titulo: str, descripcion: str):
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"🚨 Nueva incidencia: {titulo}"
    msg["From"] = settings.EMAIL_FROM        # ej: incidencias@insecteat.es
    msg["To"] = settings.EMAIL_RESPONSABLE   # ej: responsable@insecteat.es

    fecha = datetime.now().strftime("%d/%m/%Y %H:%M")

    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #e74c3c;">🚨 Nueva Incidencia Reportada</h2>
        <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
            <tr style="background:#f8f8f8;">
                <td style="padding:10px; font-weight:bold; width:150px;">Reportado por</td>
                <td style="padding:10px;">{nombre_usuario} ({email_usuario})</td>
            </tr>
            <tr>
                <td style="padding:10px; font-weight:bold;">Fecha</td>
                <td style="padding:10px;">{fecha}</td>
            </tr>
            <tr style="background:#f8f8f8;">
                <td style="padding:10px; font-weight:bold;">Título</td>
                <td style="padding:10px;">{titulo}</td>
            </tr>
            <tr>
                <td style="padding:10px; font-weight:bold; vertical-align:top;">Descripción</td>
                <td style="padding:10px;">{descripcion}</td>
            </tr>
        </table>
        <p style="color:#888; font-size:12px; margin-top:20px;">
            Este mensaje fue generado automáticamente por el sistema de gestión InsectEat.
        </p>
    </body>
    </html>
    """

    msg.attach(MIMEText(html, "html"))

    # Gmail SMTP con tu dominio personalizado
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(settings.EMAIL_FROM, settings.EMAIL_PASSWORD)
        server.sendmail(settings.EMAIL_FROM, settings.EMAIL_RESPONSABLE, msg.as_string())


@router.post("/incidencias")
async def crear_incidencia(
    body: IncidenciaRequest,
    current_user=Depends(get_current_user)  # extrae el usuario del token JWT
):
    try:
        enviar_email_incidencia(
            nombre_usuario=current_user.username,  # ajusta según tu modelo de usuario
            email_usuario=current_user.email,
            titulo=body.titulo,
            descripcion=body.descripcion
        )
        return {"message": "Incidencia enviada correctamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al enviar el correo: {str(e)}")
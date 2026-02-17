// src/services/calendarService.ts
import { API_URL } from "./api";

export async function getEventos() {
  const res = await fetch(`${API_URL}/evento`);
  return res.json();
}

export async function addEvento(event: any) {
  // Adaptar los campos al modelo del backend
  const payload = {
    titulo: event.title,
    tipo_evento: event.title, // o event.eventType si lo tienes separado
    descripcion: event.description,
    fecha_inicio: event.start instanceof Date ? event.start.toISOString().slice(0, 10) : event.start,
    fecha_fin: event.end instanceof Date ? event.end.toISOString().slice(0, 10) : event.end,
    estado: event.estado || "Pendiente",
    id_operario: event.id_operario || null,
    id_tarea: event.id_tarea || null
  };
  const res = await fetch(`${API_URL}/evento`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

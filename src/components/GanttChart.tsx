import React, { useEffect, useRef } from "react";
import Gantt from "frappe-gantt";

interface Pedido {
  id_pedido: number;
  tipo_producto: string;
  fecha_prevista?: string;
  fecha_entrega?: string;
}

interface Tarea {
  id_tarea: number;
  tipo_tarea: string;
  fecha_prevista?: string;
  fecha_entrega?: string;
}

interface Evento {
  id_evento: number;
  titulo: string;
  fecha_inicio: string;
  fecha_fin?: string;
}

interface Props {
  pedidos: Pedido[];
  tareas: Tarea[];
  eventos: Evento[];
}

interface MyGanttTask {
  id: string;
  name: string;
  start: string;
  end: string;
  progress: number;
  dependencies?: string;
}


const GanttChart: React.FC<Props> = ({ pedidos, tareas, eventos }) => {
  const ganttRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ganttRef.current) return;
    if (![...pedidos, ...tareas, ...eventos].length) return; // 👈 evita render vacío


    const formatDate = (date?: string) => {
      if (!date) return new Date().toISOString().slice(0, 10);
      return date.split("T")[0]; // elimina hora si viene en ISO
    };

    try {
      const tasks: MyGanttTask[] = [
        ...pedidos.map(p => ({
          id: `pedido-${p.id_pedido}`,
          name: `Pedido: ${p.tipo_producto}`,
          start: formatDate(p.fecha_prevista),
          end: formatDate(p.fecha_entrega || p.fecha_prevista),
          progress: 0,
        })),
        ...tareas.map(t => ({
          id: `tarea-${t.id_tarea}`,
          name: `Tarea: ${t.tipo_tarea}`,
          start: formatDate(t.fecha_prevista),
          end: formatDate(t.fecha_entrega || t.fecha_prevista),
          progress: 0,
        })),
        ...eventos.map(e => ({
          id: `evento-${e.id_evento}`,
          name: `Evento: ${e.titulo}`,
          start: formatDate(e.fecha_inicio),
          end: formatDate(e.fecha_fin),
          progress: 0
        }))
      ];

      // Si no hay tareas, agrega una temporal para que no se vea vacío
      if (tasks.length === 0) {
        tasks.push({
          id: "dummy",
          name: "Sin tareas",
          start: new Date().toISOString().slice(0, 10),
          end: new Date().toISOString().slice(0, 10),
          progress: 0,
        });
      }


      if (ganttRef.current) {
        ganttRef.current.innerHTML = ""; // limpia antes de volver a dibujar
      }

      // @ts-ignore
      new Gantt(ganttRef.current, tasks, {
        view_mode: "Day",
        date_format: "YYYY-MM-DD",
        // @ts-ignore
        custom_popup_html: (task: MyGanttTask) => `
          <div class="gantt-task-info">
            <strong>${task.name}</strong><br/>
            <small>${task.start} → ${task.end}</small>
          </div>
        `
      });

    } catch (err) {
      console.error("Error al renderizar el Gantt:", err);
    }

  }, [pedidos, tareas, eventos]);

  return (
    <div
      ref={ganttRef}
      style={{
        width: "100%",
        height: "600px",
        overflowX: "auto",
        overflowY: "hidden",
      }}
    />
  );
};

export default GanttChart;
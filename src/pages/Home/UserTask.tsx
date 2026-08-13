import './UserTask.css';

import React, { useContext } from "react";

import {
  IonItem,
  IonLabel,
  IonCheckbox,
  IonAlert,
  IonIcon,
} from "@ionic/react";
import { calendarOutline } from "ionicons/icons";

import { TareaContext } from "../../context/TareaContext";
import { useAuth } from "../../context/AuthContext";


interface Props {
  tipo: "pendientes" | "proximas";
}

const UserTasks: React.FC<Props> = ({ tipo }) => {

  const { tareas, completarTarea } = useContext(TareaContext);
  const { user } = useAuth();

  const [alertOpen, setAlertOpen] = React.useState(false);
  const [tareaSeleccionada, setTareaSeleccionada] = React.useState<number | null>(null);

  // 📅 Día actual (sin hora)
  const hoy = new Date().toISOString().split("T")[0];

  // Estado de una tarea según su fecha: sirve tanto para filtrar como para
  // colorear cada tarjeta individualmente (retrasada / hoy / próxima).
  const estadoFecha = (fechaPrevista: string | null): "retrasada" | "hoy" | "proxima" | null => {
    if (!fechaPrevista) return null;
    const fecha = fechaPrevista.split("T")[0];
    if (fecha < hoy) return "retrasada";
    if (fecha === hoy) return "hoy";
    return "proxima";
  };

  // 🔎 tareas del operario
  const tareasUsuario = tareas.filter(
    (t) =>
      t.id_operario === user?.id_operario &&
      t.estado !== "Completada"
  );

  // "Pendientes" unifica retrasadas + hoy, para que se vean juntas y las
  // retrasadas (con fondo rojo) destaquen sobre las que tocan hoy.
  const tareasFiltradas = tareasUsuario
    .filter((t) => {
      const estado = estadoFecha(t.fecha_prevista);
      if (tipo === "pendientes") return estado === "retrasada" || estado === "hoy";
      return estado === "proxima";
    })
    .sort((a, b) => (a.fecha_prevista ?? "").localeCompare(b.fecha_prevista ?? ""));

  // marcar tarea como completada
  const toggleTarea = (id: number) => {
    setTareaSeleccionada(id);
    setAlertOpen(true);
  };

  const confirmarFinalizar = async () => {
    if (tareaSeleccionada) {
      await completarTarea(tareaSeleccionada);
    }

    setAlertOpen(false);
    setTareaSeleccionada(null);
  };

  const cancelarFinalizar = () => {
    setAlertOpen(false);
    setTareaSeleccionada(null);
  };

  return (
    <>
      <div className="usertask-grid">
        {tareasFiltradas.length > 0 ? (
          tareasFiltradas.map((t) => (
            <IonItem
              key={t.id_tarea}
              className={`usertask-card usertask-card--${estadoFecha(t.fecha_prevista) ?? "proxima"}`}
              lines="none"
            >
              <IonCheckbox
                slot="start"
                checked={false}
                onIonChange={() => toggleTarea(t.id_tarea)}
              />
              <IonLabel>
                <div className="task-descripcion">{t.descripcion}</div>
                <div className="task-fecha">
                  <IonIcon icon={calendarOutline} />
                  {t.fecha_prevista
                    ? (() => {
                        const [y, m, d] = t.fecha_prevista.split("T")[0].split("-");
                        return `${d}-${m}-${y}`;
                      })()
                    : "Sin fecha"}
                </div>
              </IonLabel>
            </IonItem>
          ))
        ) : (
          <div className="usertask-empty">No hay tareas</div>
        )}
      </div>

      <IonAlert
        isOpen={alertOpen}
        header="¿Quieres finalizar la tarea?"
        buttons={[
          {
            text: "No",
            role: "cancel",
            handler: cancelarFinalizar,
          },
          {
            text: "Sí",
            handler: confirmarFinalizar,
          },
        ]}
      />

    </>
  );
};

export default UserTasks;

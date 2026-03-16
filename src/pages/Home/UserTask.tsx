import './TaskList.css';

import React, { useContext } from "react";

import {
  IonCard,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonCheckbox,
  IonAlert
} from "@ionic/react";

import { TareaContext } from "../../context/TareaContext";
import { useAuth } from "../../context/AuthContext";


interface Props {
  tipo: "retrasadas" | "hoy" | "proximas";
}

const UserTasks: React.FC<Props> = ({ tipo }) => {

  const { tareas, completarTarea } = useContext(TareaContext);
  const { user } = useAuth();

  const [alertOpen, setAlertOpen] = React.useState(false);
  const [tareaSeleccionada, setTareaSeleccionada] = React.useState<number | null>(null);

  // 📅 Día actual (sin hora)
  const hoy = new Date().toISOString().split("T")[0];

  // 🔎 tareas del operario
  const tareasUsuario = tareas.filter(
    (t) =>
      t.id_operario === user?.id_operario &&
      t.estado !== "Completada"
  );

  // 🔄 clasificación dinámica
  let tareasFiltradas: typeof tareasUsuario = []; // asi tareasFiltradas tiene exactamente el mismo type que tareasUsusario

  if (tipo === "retrasadas") {
    tareasFiltradas = tareasUsuario.filter((t) => {
      if (!t.fecha_prevista) return false;
      const fecha = t.fecha_prevista.split("T")[0];
      return fecha < hoy;
    });
  }

  if (tipo === "hoy") {
    tareasFiltradas = tareasUsuario.filter((t) => {
      if (!t.fecha_prevista) return false;
      const fecha = t.fecha_prevista.split("T")[0];
      return fecha === hoy;
    });
  }

  if (tipo === "proximas") {
    tareasFiltradas = tareasUsuario.filter((t) => {
      if (!t.fecha_prevista) return false;
      const fecha = t.fecha_prevista.split("T")[0];
      return fecha > hoy;
    });
  }

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
      <IonCard className="task-card">

        <IonCardContent>

          <IonList>

            {tareasFiltradas.length > 0 ? (
              tareasFiltradas.map((t) => (
                <IonItem key={t.id_tarea} className="task-item">
                  <IonCheckbox
                    slot="start"
                    checked={false}
                    onIonChange={() => toggleTarea(t.id_tarea)}
                  />
                  <IonLabel>
                    <div className="task-row">
                      <span className="task-key">Tipo: </span>
                      <span className="task-value">{t.tipo_tarea}</span>
                    </div>
                    <div className="task-row">
                      <span className="task-key">Descripción: </span>
                      <span className="task-value">{t.descripcion}</span>
                    </div>
                    <div className="task-row">
                      <span className="task-key">Entrega: </span>
                      <span className="task-value">
                        {t.fecha_prevista
                          ? (() => {
                              const [y, m, d] = t.fecha_prevista.split("T")[0].split("-");
                              return `${d}-${m}-${y}`;
                            })()
                          : "Sin fecha"}
                      </span>
                    </div>
                  </IonLabel>
                </IonItem>
              ))
            ) : (
              <IonItem className="no-tasks-item">
                <IonLabel className="no-tasks-text">No hay tareas</IonLabel>
              </IonItem>
            )}

          </IonList>

        </IonCardContent>

      </IonCard>

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
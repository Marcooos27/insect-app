import {
  IonCard,
  IonCardContent,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonDatetime,
  IonButton,
  IonList
} from "@ionic/react";

import { useContext, useState, useEffect } from "react";
import { TareaContext } from "../../context/TareaContext";
import { OperarioContext } from "../../context/OperarioContext";
import "./CompletedTask.css";

const CompletedTasks: React.FC = () => {

  const { tareas } = useContext(TareaContext);
  const { operarios } = useContext(OperarioContext);

  const [operarioFiltro, setOperarioFiltro] = useState<number | null>(null);
  const [fechaFiltro, setFechaFiltro] = useState<string>("");
  const [tareasFiltradas, setTareasFiltradas] = useState<any[]>([]);

  const filtrar = () => {
    let filtradas = tareas.filter(t => t.estado === "Completada");

    if (operarioFiltro) {
      filtradas = filtradas.filter(t => t.id_operario === operarioFiltro);
    }

    if (fechaFiltro) {
      const fechaNormalizada = fechaFiltro.split("T")[0];
      filtradas = filtradas.filter(t =>
        t.fecha_completada?.split("T")[0] === fechaNormalizada
      );
    }

    setTareasFiltradas(filtradas);
  };

  return (
    <div className="completed-container">

      {/* Filtros */}
      <div className="completed-filters">

        <IonItem className="completed-filter-item">
          <IonLabel position="stacked">Operario</IonLabel>
          <IonSelect
            value={operarioFiltro}
            placeholder="Todos"
            onIonChange={e => setOperarioFiltro(e.detail.value)}
          >
            <IonSelectOption value={null}>Todos</IonSelectOption>
            {operarios.map(op => (
              <IonSelectOption key={op.id_operario} value={op.id_operario}>
                {op.nombre}
              </IonSelectOption>
            ))}
          </IonSelect>
        </IonItem>

        <IonItem className="completed-filter-item">
          <IonLabel position="stacked">Fecha de Tarea Completada</IonLabel>
          <IonDatetime
            presentation="date"
            value={fechaFiltro}
            onIonChange={e => setFechaFiltro(e.detail.value as string)}
            style={{
              '--background': 'var(--green-accent)',
              color: 'var(--text-primary)'
            }}
          />
        </IonItem>

        <IonButton
          expand="full"
          className="completed-filter-btn"
          onClick={filtrar}
        >
          Filtrar
        </IonButton>

      </div>

      {/* Lista de tareas completadas */}
      <IonList className="completed-list">
        {tareasFiltradas.length > 0 ? (
          tareasFiltradas.map(t => (
            <IonItem key={t.id_tarea} className="completed-task-item">
              <IonLabel className="completed-task-label">

                <div className="completed-task-row">
                  <span className="completed-task-key">Operario: </span>
                  <span className="completed-task-value">
                    {operarios.find(op => op.id_operario === t.id_operario)?.nombre ?? t.id_operario}
                  </span>
                </div>

                <div className="completed-task-row">
                  <span className="completed-task-key">Tipo: </span>
                  <span className="completed-task-value">{t.tipo_tarea}</span>
                </div>

                <div className="completed-task-row">
                  <span className="completed-task-key">Descripción: </span>
                  <span className="completed-task-value">{t.descripcion}</span>
                </div>

                <div className="completed-task-row">
                  <span className="completed-task-key">Entrega: </span>
                  <span className="completed-task-value">
                    {t.fecha_prevista
                      ? (() => {
                          const [y, m, d] = t.fecha_prevista.split("T")[0].split("-");
                          return `${d}-${m}-${y}`;
                        })()
                      : "Sin fecha"}
                  </span>
                </div>

                <div className="completed-task-row">
                  <span className="completed-task-key">Completada: </span>
                  <span className="completed-task-value">
                    {t.fecha_completada
                      ? (() => {
                          const [y, m, d] = t.fecha_completada.split("T")[0].split("-");
                          return `${d}-${m}-${y}`;
                        })()
                      : "Sin fecha"}
                  </span>
                </div>

              </IonLabel>
            </IonItem>
          ))
        ) : (
          <IonItem className="completed-no-tasks-item">
            <IonLabel className="completed-no-tasks-text">No hay tareas completadas</IonLabel>
          </IonItem>
        )}
      </IonList>

    </div>
  );
};

export default CompletedTasks;
import './TaskList.css';
import React, { useContext, useState } from 'react';
import {
  IonCard,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonCheckbox,
  IonAlert,
  IonButton
} from '@ionic/react';
import { OperarioContext } from '../../context/OperarioContext';
import { TareaContext  } from '../../context/TareaContext';
import { useAuth } from '../../context/AuthContext';


const TaskList: React.FC = () => {
  const { operarios } = useContext(OperarioContext);
  const { tareas, completarTarea  } = useContext(TareaContext);

// Estado local para controlar los checkboxes
  const [tareasCompletadas, setTareasCompletadas] = useState<{ [key: number]: boolean }>({});
  const [alertOpen, setAlertOpen] = useState(false);
  const [tareaSeleccionada, setTareaSeleccionada] = useState<string | null>(null);

  // Cuando el usuario pulsa el checkbox
  const toggleTarea = (id_tarea: string) => {
    setTareaSeleccionada(id_tarea);
    setAlertOpen(true);
  };


    // Filtramos las tareas visibles para cada operario
  const tareasVisibles = (opId: number) =>
    tareas.filter(t => t.id_operario === opId && t.estado !== 'Completada');


  // Filtramos operarios según el usuario y que tengan tareas visibles
  const { user } = useAuth();

  const operariosAMostrar = operarios.filter(op => {
    const tareas = tareasVisibles(op.id_operario);
    // Solo operarios con tareas visibles
    if (user?.rol === "admin") {
      return true; // Admin ve todos los operarios
    }
    return op.id_operario === user?.id_operario && tareas.length > 0;
  });


  // Confirmar finalizar la tarea
  const confirmarFinalizar = async () => {
    if (tareaSeleccionada) {
      /*setTareasCompletadas(prev => ({
        ...prev,
        [tareaSeleccionada]: true
      }));*/

      await completarTarea(Number(tareaSeleccionada));

      setAlertOpen(false);
      setTareaSeleccionada(null);
    }
  };

  // Cancelar finalizar la tarea
  const cancelarFinalizar = () => {
    setAlertOpen(false);
    setTareaSeleccionada(null);
  };



  return (
    <>

      {operariosAMostrar.map(op => {
        const tareas = tareasVisibles(op.id_operario);

            return (
              <IonCard key={op.id_operario} className="task-card">
                <IonCardContent>
                  <div className="operator-header">
                    <h3 className="operator-name">{op.nombre}</h3>
                  </div>
                  
                  <IonList className="task-list">
                    {tareas.length > 0 ? (
                      tareas.map(t => (
                        <IonItem key={t.id_tarea} className="task-item">
                          {/* COLUMNA IZQUIERDA */}
                          <div className="task-actions">
                            <IonCheckbox
                              className="task-checkbox"
                              checked={t.estado === 'Completada'}
                              onIonChange={() => toggleTarea(t.id_tarea.toString())}
                            />

                            <button className="edit-task-btn">
                              EDITAR
                            </button>
                          </div>

                          {/* CONTENIDO */}
                          <IonLabel className="task-label">
                            <div className="task-row">
                              <span className="task-key">Tipo : </span>
                              <span className="task-value">{t.tipo_tarea}</span>
                            </div>
                            <div className="task-row">
                              <span className="task-key">Descripción : </span>
                              <span className="task-value">{t.descripcion}</span>
                            </div>
                            <div className="task-row">
                              <span className="task-key">Entrega : </span>
                              <span className="task-value">
                                {t.fecha_prevista
                                  ? (() => {
                                      const [y, m, d] = t.fecha_prevista.split('T')[0].split('-');
                                      return `${d}-${m}-${y}`;
                                    })()
                                  : 'Sin fecha'}
                              </span>
                            </div>
                          </IonLabel>
                        </IonItem>
                      ))) : (
                      <IonItem className="no-tasks-item">
                        <IonLabel className="no-tasks-text">Sin tareas asignadas</IonLabel>
                      </IonItem>
                    )}
                  </IonList>
                </IonCardContent>
              </IonCard>
            );
          })}

      {/* Alerta de confirmación */}
      <IonAlert
        isOpen={alertOpen}
        header="¿Quieres finalizar la tarea?"
        buttons={[
          {
            text: 'No',
            role: 'cancel',
            handler: cancelarFinalizar
          },
          {
            text: 'Sí',
            handler: confirmarFinalizar
          }
        ]}
      />
      
    </>
  );
};

export default TaskList;

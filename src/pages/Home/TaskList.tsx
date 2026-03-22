import './TaskList.css';
import React, { useContext, useState } from 'react';
import {
  IonCard, IonCardContent, IonList, IonItem, IonLabel,
  IonCheckbox, IonAlert, IonButton, IonModal, IonHeader,
  IonToolbar, IonTitle, IonContent, IonSelect, IonSelectOption,
  IonDatetime, IonTextarea, IonToast
} from '@ionic/react';
import { OperarioContext } from '../../context/OperarioContext';
import { TareaContext, TareaEdit } from '../../context/TareaContext';
import { useAuth } from '../../context/AuthContext';


const TaskList: React.FC = () => {
  const { operarios } = useContext(OperarioContext);
  const { tareas, completarTarea, editarTarea  } = useContext(TareaContext);
  // Filtramos operarios según el usuario y que tengan tareas visibles
  const { user } = useAuth();

// Estado local para controlar los checkboxes
  const [tareasCompletadas, setTareasCompletadas] = useState<{ [key: number]: boolean }>({});
  const [alertOpen, setAlertOpen] = useState(false);
  const [tareaSeleccionada, setTareaSeleccionada] = useState<string | null>(null);

  // Estados editar
  const [modalEditOpen, setModalEditOpen] = useState(false);
  const [tareaEditando, setTareaEditando] = useState<any | null>(null);
  const [editOperario, setEditOperario] = useState<number | null>(null);
  const [editTipo, setEditTipo] = useState('');
  const [editDescripcion, setEditDescripcion] = useState('');
  const [editFecha, setEditFecha] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');


  // Cuando el usuario pulsa el checkbox
  const toggleTarea = (id_tarea: string) => {
    setTareaSeleccionada(id_tarea);
    setAlertOpen(true);
  };


  const abrirEditar = (t: any) => {
    setTareaEditando(t);
    setEditOperario(t.id_operario);
    setEditTipo(t.tipo_tarea);
    setEditDescripcion(t.descripcion);
    setEditFecha(t.fecha_prevista ?? '');
    setModalEditOpen(true);
  };

  const confirmarEditar = async () => {
    if (!tareaEditando || !editOperario || !editTipo || !editDescripcion || !editFecha) {
      setToastMsg("Rellena todos los campos");
      setShowToast(true);
      return;
    }

    const datos: TareaEdit = {
      id_operario: editOperario,
      tipo_tarea: editTipo,
      descripcion: editDescripcion,
      fecha_prevista: editFecha.split("T")[0],
    };

    await editarTarea(tareaEditando.id_tarea, datos);
    setModalEditOpen(false);
    setToastMsg("Tarea actualizada correctamente");
    setShowToast(true);
  };



    // Filtramos las tareas visibles para cada operario
  const tareasVisibles = (opId: number) =>
    tareas.filter(t => t.id_operario === opId && t.estado !== 'Completada');


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

                            <button 
                              className="edit-task-btn"
                              onClick={() => abrirEditar(t)}
                            >
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
                        <IonLabel className="no-tasks-text">Sin Tareas Asignadas</IonLabel>
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


      {/* Modal editar tarea */}
      <IonModal isOpen={modalEditOpen} onDidDismiss={() => setModalEditOpen(false)}>
        <IonHeader>
          <IonToolbar className="header-toolbar">
            <IonTitle>Editar Tarea</IonTitle>
          </IonToolbar>
        </IonHeader>

        <IonContent className="ion-padding">

          <IonItem className="assign-task-item">
            <IonLabel position="stacked">Operario</IonLabel>
            <IonSelect
              value={editOperario}
              onIonChange={e => setEditOperario(e.detail.value)}
            >
              {operarios.map(op => (
                <IonSelectOption key={op.id_operario} value={op.id_operario}>
                  {op.nombre}
                </IonSelectOption>
              ))}
            </IonSelect>
          </IonItem>

          <IonItem className="assign-task-item">
            <IonLabel position="stacked">Tipo de Tarea</IonLabel>
            <IonSelect
              value={editTipo}
              onIonChange={e => setEditTipo(e.detail.value)}
            >
              <IonSelectOption value="Almacen">Almacén</IonSelectOption>
              <IonSelectOption value="Engorde">Engorde</IonSelectOption>
              <IonSelectOption value="Procesado">Procesado</IonSelectOption>
              <IonSelectOption value="Incubacion">Incubación</IonSelectOption>
              <IonSelectOption value="Reproduccion">Reproducción</IonSelectOption>
              <IonSelectOption value="Limpieza">Limpieza</IonSelectOption>
              <IonSelectOption value="Tarea Especial">Tarea Especial</IonSelectOption>
            </IonSelect>
          </IonItem>

          <IonItem className="assign-task-item textarea-item">
            <IonLabel position="stacked">Descripción</IonLabel>
            <IonTextarea
              value={editDescripcion}
              rows={3}
              onIonChange={e => setEditDescripcion(e.detail.value!)}
            />
          </IonItem>

          <IonItem className="assign-task-item">
            <IonLabel position="stacked">Fecha de Entrega</IonLabel>
            <IonDatetime
              presentation="date"
              value={editFecha}
              onIonChange={e => setEditFecha(e.detail.value as string)}
              style={{
                '--background': 'var(--color-accent)',
                color: 'var(--text-primary)'
              } as React.CSSProperties}
            />
          </IonItem>

          <div style={{ display: 'flex', gap: '12px', marginTop: '20px', padding: '0 4px' }}>
            <IonButton
              expand="full"
              className="assign-button-task"
              onClick={confirmarEditar}
              style={{ flex: 1 }}
            >
              Guardar
            </IonButton>
            <IonButton
              expand="full"
              fill="outline"
              onClick={() => setModalEditOpen(false)}
              style={{ flex: 1, '--color': 'var(--color-darkest)', '--border-color': 'var(--color-darkest)' } as React.CSSProperties}
            >
              Cancelar
            </IonButton>
          </div>

        </IonContent>
      </IonModal>

      <IonToast
        isOpen={showToast}
        onDidDismiss={() => setShowToast(false)}
        message={toastMsg}
        duration={2000}
        color="success"
      />
      
    </>
  );
};

export default TaskList;

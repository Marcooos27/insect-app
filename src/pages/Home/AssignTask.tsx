import React, { useState, useContext, useRef } from 'react';
import {
  IonItem, IonLabel, IonSelect, IonSelectOption,
  IonTextarea, IonButton, IonToast,
  IonDatetime, IonModal, IonAlert
} from '@ionic/react';
import { OperarioContext } from '../../context/OperarioContext';
import { TareaContext } from '../../context/TareaContext';
import './AssignTask.css';
import { TareaCreate } from '../../context/TareaContext';

const AssignTask: React.FC = () => {
  const { operarios } = useContext(OperarioContext);
  const { addTarea } = useContext(TareaContext);

  const [idOperario, setIdOperario] = useState<number | null>(null);
  const [tipoTarea, setTipoTarea] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaPrevista, setFechaPrevista] = useState<string>('');

  const [frecuencia, setFrecuencia] = useState<'sin-frecuencia' | 'diaria' | 'semanal'>('sin-frecuencia');
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [showModalInicio, setShowModalInicio] = useState(false);
  const [showConfirmAlert, setShowConfirmAlert] = useState(false);

  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');


  const ultimaAsignacion = useRef<number | null>(null);

  const handleFrecuenciaChange = (val: 'sin-frecuencia' | 'diaria' | 'semanal') => {
    setFrecuencia(val);
    setFechaInicio('');
    if (val !== 'sin-frecuencia') {
      setShowModalInicio(true);
    }
  };

  const validarCampos = () => {
    if (!idOperario || !tipoTarea || !descripcion || !fechaPrevista) {
      setToastMsg("Por favor, rellena todos los campos");
      setShowToast(true);
      return false;
    }
    if (frecuencia !== 'sin-frecuencia' && !fechaInicio) {
      setToastMsg("Por favor, selecciona la fecha de inicio");
      setShowToast(true);
      return false;
    }
    if (frecuencia !== 'sin-frecuencia' && fechaInicio >= fechaPrevista) {
      setToastMsg("La fecha de inicio debe ser anterior a la fecha de fin");
      setShowToast(true);
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validarCampos()) return;

    // Control de límite 15 segundos
    const ahora = Date.now();
    if (ultimaAsignacion.current && ahora - ultimaAsignacion.current < 15000) {
      const restantes = Math.ceil((15000 - (ahora - ultimaAsignacion.current)) / 1000);
      setToastMsg(`Espera ${restantes} segundos para asignar otra tarea`);
      setShowToast(true);
      return;
    }

    if (frecuencia !== 'sin-frecuencia') {
      setShowConfirmAlert(true);
    } else {
      crearTareas();
    }
  };

  const generarFechas = (): string[] => {
    const fechas: string[] = [];
    const fin = new Date(fechaPrevista.split("T")[0]);

    if (frecuencia === 'diaria') {
      let actual = new Date(fechaInicio.split("T")[0]);
      while (actual <= fin) {
        fechas.push(actual.toISOString().split("T")[0]);
        actual.setDate(actual.getDate() + 1);
      }
    } else if (frecuencia === 'semanal') {
      let actual = new Date(fechaInicio.split("T")[0]);
      while (actual <= fin) {
        fechas.push(actual.toISOString().split("T")[0]);
        actual.setDate(actual.getDate() + 7);
      }
    }

    return fechas;
  };

  const crearTareas = async () => {
    ultimaAsignacion.current = Date.now();

    if (frecuencia === 'sin-frecuencia') {
      const nuevaTarea: TareaCreate = {
        id_cliente: null,
        id_operario: idOperario!,
        estado: "Pendiente",
        tipo_tarea: tipoTarea,
        descripcion,
        fecha_prevista: fechaPrevista.split("T")[0],
        logistica: "Interna"
      };
      await addTarea(nuevaTarea);
    } else {
      const fechas = generarFechas();
      for (const fecha of fechas) {
        const nuevaTarea: TareaCreate = {
          id_cliente: null,
          id_operario: idOperario!,
          estado: "Pendiente",
          tipo_tarea: tipoTarea,
          descripcion,
          fecha_prevista: fecha,
          logistica: "Interna"
        };
        await addTarea(nuevaTarea);
      }
    }

    setToastMsg(
      frecuencia === 'sin-frecuencia'
        ? "Tarea asignada correctamente"
        : `Tareas ${frecuencia === 'diaria' ? 'diarias' : 'semanales'} creadas correctamente`
    );
    setShowToast(true);

    // Reset
    setIdOperario(null);
    setTipoTarea('');
    setDescripcion('');
    setFechaPrevista('');
    setFechaInicio('');
    setFrecuencia('sin-frecuencia');
  };

  const getResumenConfirmacion = () => {
    if (!fechaInicio || !fechaPrevista) return '';
    const fechas = generarFechas();
    const tipo = frecuencia === 'diaria' ? 'diarias' : 'semanales';
    return `Se crearán ${fechas.length} tareas ${tipo} desde ${fechaInicio.split("T")[0]} hasta ${fechaPrevista.split("T")[0]}.`;
  };

  return (
    <div className="assign-task-container">

        {/* Selección de operario */}
        <IonItem className="assign-task-item">
          <IonLabel position="stacked">Operario</IonLabel>
          <IonSelect
            value={idOperario}
            placeholder="Selecciona operario"
            onIonChange={e => setIdOperario(e.detail.value)}
          >
            {operarios.map(op => (
              <IonSelectOption key={op.id_operario} value={op.id_operario}>
                {op.nombre}
              </IonSelectOption>
            ))}
          </IonSelect>
        </IonItem>

        {/* Tipo de tarea */}
        <IonItem className="assign-task-item">
          <IonLabel position="stacked">Tipo de Tarea</IonLabel>
          <IonSelect
            value={tipoTarea}
            placeholder="Selecciona tipo de tarea"
            onIonChange={e => setTipoTarea(e.detail.value!)}
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

        {/* Breve descripción */}
        <IonItem className="assign-task-item">
          <IonLabel position="stacked">Breve Descripción</IonLabel>
          <IonTextarea
            value={descripcion}
            placeholder="Descripción de la tarea"
            rows={2}
            onIonChange={e => setDescripcion(e.detail.value!)}
          />
        </IonItem>


        {/* Frecuencia */}
        <IonItem className="assign-task-item">
          <IonLabel position="stacked">Frecuencia</IonLabel>
          <IonSelect
            value={frecuencia}
            onIonChange={e => handleFrecuenciaChange(e.detail.value)}
          >
            <IonSelectOption value="sin-frecuencia">Sin frecuencia</IonSelectOption>
            <IonSelectOption value="diaria">Diaria</IonSelectOption>
            <IonSelectOption value="semanal">Semanal</IonSelectOption>
          </IonSelect>
        </IonItem>

        {/* Fecha inicio seleccionada (solo si hay frecuencia) */}
        {frecuencia !== 'sin-frecuencia' && fechaInicio && (
          <div className="assign-fecha-info">
            <span className="assign-fecha-label">Inicio: </span>
            <span className="assign-fecha-value">
              {(() => {
                const [y, m, d] = fechaInicio.split("T")[0].split("-");
                return `${d}-${m}-${y}`;
              })()}
            </span>
            <IonButton
              fill="clear"
              size="small"
              className="assign-fecha-edit-btn"
              onClick={() => setShowModalInicio(true)}
            >
              Cambiar
            </IonButton>
          </div>
        )}

        {/* Fecha de fin (siempre visible) */}
        <IonItem className="assign-task-item">
          <IonLabel position="stacked">
            {frecuencia === 'sin-frecuencia' ? 'Fecha de Entrega' : 'Fecha de Fin'}
          </IonLabel>
          <IonDatetime
            presentation="date"
            value={fechaPrevista}
            min={new Date().toISOString().split('T')[0]}
            onIonChange={e => setFechaPrevista(e.detail.value as string)}
            style={{
              '--background': 'var(--color-accent)',
              '--background-rgb': '234,239,157',
              color: 'var(--text-primary)'
            } as React.CSSProperties}
          />
        </IonItem>

        {/* Botón crear */}
        <div className="animated-border-btn">
          <IonButton expand="full" className="assign-button-task" onClick={handleSubmit}>
            Crear Tarea
          </IonButton>
        </div>

        {/* Modal calendario fecha inicio */}
        <IonModal
          isOpen={showModalInicio}
          onDidDismiss={() => setShowModalInicio(false)}
          className="assign-modal-inicio"
        >
          <div className="assign-modal-content">
            <h3 className="assign-modal-title">
              {frecuencia === 'diaria' ? 'Selecciona fecha de inicio' : 'Selecciona día de inicio (y día de la semana recurrente)'}
            </h3>
            <IonDatetime
              presentation="date"
              value={fechaInicio}
              min={new Date().toISOString().split('T')[0]}
              max={fechaPrevista || undefined}
              onIonChange={e => setFechaInicio(e.detail.value as string)}
              style={{
                '--background': 'var(--color-accent)',
                color: 'var(--text-primary)'
              } as React.CSSProperties}
            />
            <IonButton
              expand="full"
              className="assign-modal-confirm-btn"
              onClick={() => {
                if (!fechaInicio) {
                  setToastMsg("Selecciona una fecha de inicio");
                  setShowToast(true);
                  return;
                }
                setShowModalInicio(false);
              }}
            >
              Confirmar
            </IonButton>
            <IonButton
              expand="full"
              fill="outline"
              className="assign-modal-cancel-btn"
              onClick={() => {
                setFrecuencia('sin-frecuencia');
                setFechaInicio('');
                setShowModalInicio(false);
              }}
            >
              Cancelar
            </IonButton>
          </div>
        </IonModal>

        {/* Alert confirmación tareas recurrentes */}
        <IonAlert
          isOpen={showConfirmAlert}
          onDidDismiss={() => setShowConfirmAlert(false)}
          header="Tarea recurrente"
          message={`La tarea a asignar es recurrente. ${getResumenConfirmacion()} ¿Quieres asignarla?`}
          buttons={[
            {
              text: 'No',
              role: 'cancel',
            },
            {
              text: 'Sí',
              handler: () => crearTareas()
            }
          ]}
        />

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMsg}
          duration={2500}
          color="success"
        />
      </div>
    );
  };

  export default AssignTask;
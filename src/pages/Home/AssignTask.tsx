import React, { useState, useContext } from 'react';
import {
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonItem, IonLabel, IonSelect, IonSelectOption,
  IonTextarea, IonButton, IonToast
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
  const [frecuenciaEntrega, setFrecuenciaEntrega] = useState('');
  const [showToast, setShowToast] = useState(false);

  const handleSubmit = async () => {
    if (!idOperario || !tipoTarea || !descripcion || !frecuenciaEntrega) {
      alert("Por favor, rellena todos los campos");
      return;
    }

    const newTarea: TareaCreate = {
      id_cliente: null,
      id_operario: idOperario,
      estado: "Pendiente",
      tipo_tarea: tipoTarea,
      descripcion: descripcion,
      frecuencia: frecuenciaEntrega, // frecuencia de entrega
      logistica: "Interna"
    };

    await addTarea(newTarea);
    setShowToast(true);

    // reset
    setIdOperario(null);
    setTipoTarea('');
    setDescripcion('');
    setFrecuenciaEntrega('');
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
            <IonSelectOption value="Tarea Especial">Tarea Especial</IonSelectOption>
          </IonSelect>
        </IonItem>

        {/* Breve descripción */}
        <IonItem className="assign-task-item textarea-item">
          <IonLabel position="stacked">Breve Descripción</IonLabel>
          <IonTextarea
            value={descripcion}
            placeholder="Descripción de la tarea"
            rows={2}
            onIonChange={e => setDescripcion(e.detail.value!)}
          />
        </IonItem>


        {/* Frecuencia de entrega */}
        <IonItem className="assign-task-item">
          <IonLabel position="stacked">Frecuencia de Entrega</IonLabel>
          <IonSelect
            value={frecuenciaEntrega}
            placeholder="Selecciona frecuencia"
            onIonChange={e => setFrecuenciaEntrega(e.detail.value)}
          >
            <IonSelectOption value="diaria">Diaria</IonSelectOption>
            <IonSelectOption value="semanal">Semanal</IonSelectOption>
            <IonSelectOption value="mensual">Mensual</IonSelectOption>
          </IonSelect>
        </IonItem>


        {/* Botón enviar */}
        <div className="animated-border-btn">
          <IonButton expand="full" className="assign-button-task" onClick={handleSubmit}>
            Crear Tarea
          </IonButton>
        </div>

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message="Tarea asignada correctamente"
          duration={2000}
          color="success"
        />
      </div>
  );
};

export default AssignTask;

import React, { useState, useContext } from 'react';
import { IonModal, IonButton, IonInput, IonItem, IonLabel, IonSelect, IonSelectOption, IonTextarea, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons } from '@ionic/react';
import { addEvento } from '../services/api';
import { OperarioContext } from '../context/OperarioContext';
import { TareaContext } from '../context/TareaContext';
//import './EventForm.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const EventForm: React.FC<Props> = ({ isOpen, onClose, onSaved }) => {
  const { operarios } = useContext(OperarioContext);
  const { tareas } = useContext(TareaContext);

  const [titulo, setTitulo] = useState('');
  const [tipo_evento, setTipoEvento] = useState('');
  const [descripcion, setDescripcion] = useState("");
  const [estado, setEstado] = useState('');
  const [fecha_inicio, setFechaInicio] = useState('');
  const [fecha_fin, setFechaFin] = useState('');
  const [idOperario, setIdOperario] = useState<number | null>(null);
  const [idTarea, setIdTarea] = useState<number | null>(null);
  const [showToast, setShowToast] = useState(false);

  const save = async () => {
    if (!titulo || !tipo_evento || !fecha_inicio || !fecha_fin) {
      alert("Por favor, rellena todos los campos obligatorios");
      console.log("ID Operario seleccionado:", idOperario);
      return;
    }

    const evento = {
      titulo,
      tipo_evento,
      descripcion: descripcion || "", // aseguramos que exista aunque esté vacío
      fecha_inicio: new Date(fecha_inicio).toISOString().split("T")[0],
      fecha_fin: new Date(fecha_fin).toISOString().split("T")[0],
      estado: estado || "Pendiente",
      id_operario: idOperario ?? null,
      id_tarea: idTarea ?? null,
    };

    try {
      console.log(evento);
      await addEvento(evento);
      onSaved();
      onClose();
    } catch (error: any) {
      console.error("Error en addEvento:", error.response?.data || error.message);
      alert("Error al guardar el evento");
    }
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Nuevo Evento</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>Cerrar</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>


      <IonContent fullscreen className="ion-padding">
        <IonItem>
          <IonLabel position="stacked">Título*</IonLabel>
          <IonInput value={titulo} onIonChange={e => setTitulo(e.detail.value!)} />
        </IonItem>

        <IonItem>
          <IonLabel position="stacked">Tipo de Evento*</IonLabel>
          <IonInput value={tipo_evento} onIonChange={e => setTipoEvento(e.detail.value!)} />
        </IonItem>

        <IonItem>
          <IonLabel position="stacked">Estado</IonLabel>
          <IonSelect
            value={estado}
            placeholder="Selecciona estado"
            onIonChange={e => setEstado(e.detail.value)}
          >
            <IonSelectOption value="">Ninguno</IonSelectOption>
            <IonSelectOption value="Pendiente">Pendiente</IonSelectOption>
            <IonSelectOption value="En Proceso">En Proceso</IonSelectOption>
            <IonSelectOption value="Finalizado">Finalizado</IonSelectOption>
          </IonSelect>
        </IonItem>

        <IonItem>
          <IonLabel position="stacked">Fecha Inicio*</IonLabel>
          <IonInput type="date" value={fecha_inicio} onIonChange={e => setFechaInicio(e.detail.value!)} />
        </IonItem>

        <IonItem>
          <IonLabel position="stacked">Fecha Fin</IonLabel>
          <IonInput type="date" value={fecha_fin} onIonChange={e => setFechaFin(e.detail.value!)} placeholder="Opcional" />
        </IonItem>

        <IonItem>
          <IonLabel position="stacked">Operario</IonLabel>
          <IonSelect
            value={idOperario}
            onIonChange={e => setIdOperario(e.detail.value)}
          >
            <IonSelectOption value={null}>Ninguno</IonSelectOption>
            {operarios.map(op => (
              <IonSelectOption key={op.id_operario} value={op.id_operario}>
                {op.nombre} (Turno: {op.turno_trabajo})
              </IonSelectOption>
            ))}
          </IonSelect>
        </IonItem>

        <IonItem>
          <IonLabel position="stacked">Tarea</IonLabel>
          <IonSelect
            value={idTarea}
            onIonChange={e => setIdTarea(e.detail.value)}
          >
            <IonSelectOption value={null}>Ninguno</IonSelectOption>
            {tareas.map(t => (
              <IonSelectOption key={t.id_tarea} value={t.id_tarea}>
                {t.tipo_tarea} - {t.descripcion}
              </IonSelectOption>
            ))}
          </IonSelect>
        </IonItem>

        <IonItem>
          <IonLabel position="stacked">Descripción</IonLabel>
          <IonTextarea
            value={descripcion}
            placeholder="Escribe una breve descripción"
            rows={2}
            onIonChange={(e) => setDescripcion(e.detail.value!)}
          />
        </IonItem>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem" }}>
          <IonButton color="primary" onClick={save}>Guardar</IonButton>
          <IonButton color="medium" onClick={onClose}>Cancelar</IonButton>
        </div>
      </IonContent>
    </IonModal>
  );
};

export default EventForm;
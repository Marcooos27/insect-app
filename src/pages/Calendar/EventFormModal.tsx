import React, { useState } from "react";
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonItem, IonLabel,
  IonInput, IonDatetime, IonButton, IonSelect, IonSelectOption
} from "@ionic/react";
import { useCalendar } from "../../context/CalendarContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const EventFormModal: React.FC<Props> = ({ isOpen, onClose }) => {

  const { addEvent } = useCalendar();
  const [eventType, setEventType] = useState("");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState("");
  const [period, setPeriod] = useState("diaria");

  // Calcula la fecha de fin según el periodo y evita terminar en fin de semana
  function calculateEndDate(startDateStr: string, period: string): Date | null {
    if (!startDateStr) return null;
    let startDate = new Date(startDateStr);
    let endDate = new Date(startDate);
    if (period === "diaria") {
      endDate.setDate(startDate.getDate() + 1);
    } else if (period === "semanal") {
      endDate.setDate(startDate.getDate() + 7);
    } else if (period === "mensual") {
      endDate.setDate(startDate.getDate() + 30);
    }
    // Si termina en sábado (6) o domingo (0), pásalo al lunes siguiente
    while (endDate.getDay() === 0 || endDate.getDay() === 6) {
      endDate.setDate(endDate.getDate() + 1);
    }
    return endDate;
  }


  const handleSave = async () => {
    const endDate = calculateEndDate(start, period);
    if (!eventType || !start || !endDate) {
      alert("Por favor, completa todos los campos.");
      return;
    }
    await addEvent({
      title: eventType,
      description,
      start: new Date(start),
      end: endDate,
      created_by: "empresa"
    });
    onClose();
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Nuevo Evento</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonItem>
          <IonLabel position="stacked">Tipo de Evento</IonLabel>
          <IonSelect
            value={eventType}
            placeholder="Selecciona tipo de evento"
            onIonChange={(e: CustomEvent) => setEventType((e.detail.value as string) || "")}
          >
            <IonSelectOption value="Almacen">Almacén</IonSelectOption>
            <IonSelectOption value="Engorde">Engorde</IonSelectOption>
            <IonSelectOption value="Procesado">Procesado</IonSelectOption>
            <IonSelectOption value="Incubacion">Incubación</IonSelectOption>
            <IonSelectOption value="Reproduccion">Reproducción</IonSelectOption>
            <IonSelectOption value="Tarea Especial">Tarea Especial</IonSelectOption>
          </IonSelect>
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Descripción</IonLabel>
          <IonInput value={description} onIonChange={e => setDescription(e.detail.value!)} />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Fecha de inicio</IonLabel>
          <IonDatetime
            value={start}
            onIonChange={e => setStart(Array.isArray(e.detail.value) ? e.detail.value[0] : e.detail.value || "")}
            presentation="date"
          />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Periodicidad</IonLabel>
          <select
            style={{ width: '100%', padding: '8px', fontSize: '16px' }}
            value={period}
            onChange={e => setPeriod(e.target.value)}
          >
            <option value="diaria">Diaria</option>
            <option value="semanal">Semanal</option>
            <option value="mensual">Mensual</option>
          </select>
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Fecha de fin</IonLabel>
          <IonInput
            value={start && calculateEndDate(start, period) ? calculateEndDate(start, period)!.toLocaleDateString() : ""}
            readonly
          />
        </IonItem>
        <IonButton expand="block" onClick={handleSave}>Guardar Evento</IonButton>
      </IonContent>
    </IonModal>
  );
};

export default EventFormModal;

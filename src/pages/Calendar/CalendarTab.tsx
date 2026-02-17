// src/pages/calendar/CalendarTab.tsx
import React, { useState } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonButtons,
} from "@ionic/react";
import { addOutline } from "ionicons/icons";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { es } from "date-fns/locale";
import { useCalendar } from "../../context/CalendarContext";
import EventFormModal from "./EventFormModal";
import "react-big-calendar/lib/css/react-big-calendar.css";

/**
 * --- FIX TIPO ---
 * Creamos un alias de tipo que corresponde con los values de Views.
 * Esto evita problemas de namespace / tipos que da react-big-calendar.
 */
type CalendarView = typeof Views[keyof typeof Views];

const locales = { es };
const localizer = dateFnsLocalizer({
  format,
  parse,
  // startOfWeek pide una función: devolvemos el comienzo de semana (Lun)
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

const CalendarTab: React.FC = () => {
  const { events, isOwnerView, toggleView } = useCalendar();

  // estados
  const [showDebug, setShowDebug] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [currentView, setCurrentView] = useState<CalendarView>(Views.MONTH);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // filtrado según rol
  const filteredEvents = isOwnerView
    ? events
    : events.filter(
        (e) => e.created_by === "empresa" || e.assigned_to === "operario"
      );

  // navegación básica
  const handleToday = () => setCurrentDate(new Date());

  const handleNext = () => {
    const next = new Date(currentDate);
    if (currentView === Views.MONTH) next.setMonth(next.getMonth() + 1);
    else if (currentView === Views.WEEK) next.setDate(next.getDate() + 7);
    else next.setDate(next.getDate() + 1);
    setCurrentDate(next);
  };

  const handleBack = () => {
    const prev = new Date(currentDate);
    if (currentView === Views.MONTH) prev.setMonth(prev.getMonth() - 1);
    else if (currentView === Views.WEEK) prev.setDate(prev.getDate() - 7);
    else prev.setDate(prev.getDate() - 1);
    setCurrentDate(prev);
  };

  // cuando el calendario cambia de vista (month/week/day)
  // react-big-calendar puede pasar un string o símbolo; lo casteamos a CalendarView
  const handleViewChange = (view: any) => {
    setCurrentView(view as CalendarView);
  };

  // navegación por fecha desde el calendario (date puede venir como Date)
  const handleNavigate = (date: Date | string) => {
    // react-big-calendar pasa Date; si por algún motivo fuera string intentamos convertir
    setCurrentDate(date instanceof Date ? date : new Date(date));
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>
            Calendario ({isOwnerView ? "Empresa" : "Trabajador"})
          </IonTitle>

          <IonButtons slot="end">
            <IonButton color="medium" onClick={toggleView}>
              Cambiar vista
            </IonButton>

            {isOwnerView && (
              <IonButton color="primary" onClick={() => setShowModal(true)}>
                <IonIcon icon={addOutline} />
              </IonButton>
            )}

            <IonButton
              color="tertiary"
              onClick={() => setShowDebug((prev) => !prev)}
            >
              {showDebug ? "Ocultar debug" : "Debug"}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {/* calendario */}
        <div style={{ height: "75vh", padding: "10px" }}>
          <Calendar
            localizer={localizer}
            events={filteredEvents}
            startAccessor="start"
            endAccessor="end"
            titleAccessor="title"
            style={{ height: "100%" }}
            date={currentDate}
            view={currentView as any} // react-big-calendar internamente acepta strings
            onView={(view: any) => handleViewChange(view)}
            onNavigate={(d: Date) => handleNavigate(d)}  // 👈 AÑADIMOS EL TIPO
            views={{ month: true, week: true, day: true }} // eliminamos agenda
            messages={{
              month: "Mes",
              week: "Semana",
              day: "Día",
              today: "Hoy",
              previous: "Atrás",
              next: "Siguiente",
              noEventsInRange: "No hay eventos en este periodo",
            }}
          />
        </div>

        {/* debug */}
        {showDebug && (
          <div style={{ padding: 10 }}>
            <h3>Debug events ({events.length})</h3>
            <pre
              style={{
                maxHeight: 300,
                overflow: "auto",
                background: "#f5f5f5",
                padding: 10,
              }}
            >
              {JSON.stringify(events, null, 2)}
            </pre>
          </div>
        )}

        {/* modal */}
        <EventFormModal isOpen={showModal} onClose={() => setShowModal(false)} />
      </IonContent>
    </IonPage>
  );
};

export default CalendarTab;

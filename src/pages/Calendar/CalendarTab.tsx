import React, { useContext, useState } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonIcon,
} from "@ionic/react";
import { checkmarkDoneOutline, eyeOffOutline } from "ionicons/icons";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { es } from "date-fns/locale";
import { useCalendar } from "../../context/CalendarContext";
import { OperarioContext } from "../../context/OperarioContext";
import { useAuth } from "../../context/AuthContext";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./CalendarTab.css";

type CalendarView = typeof Views[keyof typeof Views];

const locales = { es };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

const CalendarTab: React.FC = () => {
  const {
    events,
    operarioSeleccionado,
    setOperarioSeleccionado,
    mostrarCompletadas,
    setMostrarCompletadas,
  } = useCalendar();
  const { operarios } = useContext(OperarioContext);
  const { user } = useAuth();

  const [currentView, setCurrentView] = useState<CalendarView>(Views.MONTH);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const getTituloCalendario = () => {
    if (user?.rol !== "admin") {
      const opNombre = operarios.find(op => op.id_operario === user?.id_operario)?.nombre;
      return `Calendario de ${opNombre ?? "mi equipo"}`;
    }
    if (operarioSeleccionado === null) return "Calendario — Todos";
    const opNombre = operarios.find(op => op.id_operario === operarioSeleccionado)?.nombre;
    return `Calendario — ${opNombre ?? ""}`;
  };

  return (
    <IonPage className="calendar-page">
      <IonHeader>
        <IonToolbar className="calendar-toolbar">
          <IonTitle className="calendar-title">{getTituloCalendario()}</IonTitle>

          <IonButtons slot="end">
            {/* Botón mostrar/ocultar completadas */}
            <IonButton
              fill="clear"
              onClick={() => setMostrarCompletadas(!mostrarCompletadas)}
              className={`btn-completadas ${mostrarCompletadas ? "btn-completadas--activo" : ""}`}
              title={mostrarCompletadas ? "Ocultar completadas" : "Mostrar completadas"}
            >
              <IonIcon
                icon={mostrarCompletadas ? eyeOffOutline : checkmarkDoneOutline}
                slot="icon-only"
                className="btn-completadas-icon"
              />
            </IonButton>

            {/* Selector de operario solo para admin */}
            {user?.rol === "admin" && (
              <div className="calendar-operario-selector">
                <IonSelect
                  value={operarioSeleccionado}
                  placeholder="Todos"
                  interface="popover"
                  onIonChange={e => setOperarioSeleccionado(e.detail.value)}
                  className="calendar-select"
                >
                  <IonSelectOption value={null}>Todos</IonSelectOption>
                  {operarios.map(op => (
                    <IonSelectOption key={op.id_operario} value={op.id_operario}>
                      {op.nombre}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </div>
            )}
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="calendar-content">
        <div className="calendar-wrapper">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            titleAccessor="title"
            style={{ height: "100%" }}
            date={currentDate}
            view={currentView as any}
            onView={(view: any) => setCurrentView(view as CalendarView)}
            onNavigate={(d: Date) => setCurrentDate(d)}
            views={{ month: true, week: true, day: true }}
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
      </IonContent>
    </IonPage>
  );
};

export default CalendarTab;
import React, { createContext, useContext, useMemo, useState } from "react";
import { TareaContext } from "./TareaContext";
import { OperarioContext } from "./OperarioContext";
import { useAuth } from "./AuthContext";

interface Event {
  id: number;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  id_operario?: number;
  estado?: string;
}

interface CalendarContextType {
  events: Event[];
  operarioSeleccionado: number | null;
  setOperarioSeleccionado: (id: number | null) => void;
  addEvent: (event: Event) => void;
  mostrarCompletadas: boolean;
  setMostrarCompletadas: (v: boolean) => void;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export const CalendarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tareas } = useContext(TareaContext);
  const { user } = useAuth();
  const [eventsState, setEventsState] = useState<Event[]>([]);
  const [operarioSeleccionado, setOperarioSeleccionado] = useState<number | null>(null);
  const [mostrarCompletadas, setMostrarCompletadas] = useState<boolean>(false);

  const addEvent = (event: Event) => {
    setEventsState(prev => [...prev, event]);
  };

  const events = useMemo(() => {
    const tareasEvents = tareas
      .filter(t => t.fecha_prevista !== null)
      .map(t => ({
        id: t.id_tarea,
        title: t.tipo_tarea,
        start: new Date(t.fecha_prevista!),
        end: new Date(t.fecha_prevista!),
        description: t.descripcion,
        id_operario: t.id_operario,
        estado: t.estado,
      }));

    const todosEvents = [...tareasEvents, ...eventsState];

    // Filtrar completadas si no se quieren mostrar
    const filtradoPorEstado = mostrarCompletadas
      ? todosEvents
      : todosEvents.filter(e => e.estado !== "Completada");

    if (user?.rol === "admin" && operarioSeleccionado !== null) {
      return filtradoPorEstado.filter(e => e.id_operario === operarioSeleccionado);
    }

    if (user?.rol === "admin") {
      return filtradoPorEstado;
    }

    return filtradoPorEstado.filter(e => e.id_operario === user?.id_operario);

  }, [tareas, eventsState, user, operarioSeleccionado, mostrarCompletadas]);

  return (
    <CalendarContext.Provider value={{
      events,
      operarioSeleccionado,
      setOperarioSeleccionado,
      addEvent,
      mostrarCompletadas,
      setMostrarCompletadas,
    }}>
      {children}
    </CalendarContext.Provider>
  );
};

export const useCalendar = () => {
  const context = useContext(CalendarContext);
  if (!context) throw new Error("useCalendar debe usarse dentro de CalendarProvider");
  return context;
};
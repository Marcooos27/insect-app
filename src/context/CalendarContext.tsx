// src/context/CalendarContext.tsx
import React, { createContext, useContext, useMemo, useState } from "react";
//import { getEventos, addEvento } from "../services/calendarService";
import { TareaContext } from "./TareaContext";

interface Event {
  id: number;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  assigned_to?: string; // nombre o id del operario
  created_by?: string;  // 'empresa' o 'trabajador'
}

interface CalendarContextType {
  events: Event[];
  isOwnerView: boolean;
  toggleView: () => void;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export const CalendarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tareas } = useContext(TareaContext);
  const [isOwnerView, setIsOwnerView] = useState(true);

  const events = useMemo(() => {
    return tareas
      .filter(t => t.fecha_prevista !== null)
      .map(t => ({
        id: t.id_tarea,
        title: t.tipo_tarea,
        start: new Date(t.fecha_prevista!),
        end: new Date(t.fecha_prevista!), // evento de 1 día
        description: t.descripcion,
      }));
  }, [tareas]);

  const toggleView = () => setIsOwnerView(prev => !prev);

  return (
    <CalendarContext.Provider value={{ events, isOwnerView, toggleView }}>
      {children}
    </CalendarContext.Provider>
  );
};

export const useCalendar = () => {
  const context = useContext(CalendarContext);
  if (!context) throw new Error("useCalendar debe usarse dentro de CalendarProvider");
  return context;
};

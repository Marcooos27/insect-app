import React, { createContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import api from "../services/api";

/* =====================
   MODELOS
===================== */

export interface Tarea {
  id_tarea: number;
  id_cliente?: number | null;
  id_operario: number;
  estado: string;
  tipo_tarea: string;
  descripcion: string;
  cantidad?: number;
  fecha_entrega: string | null;
  fecha_prevista: string | null;
  fecha_creacion: string;
  fecha_completada: string | null;
  logistica?: string;
}

export interface TareaCreate {
  id_cliente: number | null;
  id_operario: number;
  estado: string;
  tipo_tarea: string;
  descripcion: string;
  fecha_prevista: string;
  logistica: string;
}

export interface TareaEdit {
  id_operario: number;
  tipo_tarea: string;
  descripcion: string;
  fecha_prevista: string;
}

/* =====================
   CONTEXT
===================== */

interface TareaContextType {
  tareas: Tarea[];
  loading: boolean;
  addTarea: (tarea: TareaCreate) => Promise<void>;
  completarTarea: (id_tarea: number) => Promise<void>;
  editarTarea: (id_tarea: number, tarea: TareaEdit) => Promise<void>;
}

export const TareaContext = createContext<TareaContextType>({
  tareas: [],
  loading: true,
  addTarea: async () => {},
  completarTarea: async () => {},
  editarTarea: async () => {},
});

/* =====================
   PROVIDER
===================== */

export const TareaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();

  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTareas = async () => {
    try {
      const res = await api.get("/tarea");
      setTareas(res.data ?? []);
    } catch (err) {
      console.error("Error cargando tareas:", err);
      setTareas([]);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        await fetchTareas();
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [authLoading, user]);

  const addTarea = async (tarea: TareaCreate) => {
    try {
      await api.post("/tarea", tarea);
      await fetchTareas();
    } catch (err) {
      console.error("Error addTarea:", err);
    }
  };

  const completarTarea = async (id_tarea: number) => {
    try {
      await api.put(`/tarea/${id_tarea}`, { estado: "Completada" });
      await fetchTareas();
    } catch (err) {
      console.error("Error completarTarea:", err);
    }
  };

  const editarTarea = async (id_tarea: number, tarea: TareaEdit) => {
    try {
      await api.put(`/tarea/${id_tarea}/editar`, tarea);
      await fetchTareas();
    } catch (err) {
      console.error("Error editarTarea:", err);
    }
  };

  return (
    <TareaContext.Provider value={{ tareas, loading, addTarea, completarTarea, editarTarea }}>
      {children}
    </TareaContext.Provider>
  );
};
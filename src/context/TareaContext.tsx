import React, { createContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";


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
  cantidad?: number; //el ? es para que no sea obligatorio en new pedido de assignTask
  fecha_entrega: string | null;
  fecha_prevista: string | null;
  fecha_creacion: string;
  logistica?: string;
}

export interface TareaCreate {
  id_cliente: number | null;
  id_operario: number;
  estado: string;
  tipo_tarea: string;
  descripcion: string;
  // frecuencia: string;  // COMENTADO - puede usarse en el futuro
  fecha_prevista: string;
  logistica: string;
}


/* =====================
   CONTEXT
===================== */

interface TareaContextType {
  tareas: Tarea[];
  loading: boolean;
  addTarea: (tarea: TareaCreate) => Promise<void>;
  completarTarea: (id_tarea: number) => Promise<void>;
}

export const TareaContext  = createContext<TareaContextType>({
  tareas: [],
  loading: true,
  addTarea: async () => {},
  completarTarea: async (id_tarea: number) => {},
});


/* =====================
   PROVIDER
===================== */

export const TareaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();

  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTareas = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    
      const res = await fetch("/api/tarea", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const text = await res.text(); // debug: ver qué devuelve realmente
      console.log("Raw tareas response:", text);

      if (!res.ok) {
        throw new Error(`Error cargando tareas: ${res.status} ${res.statusText}`);
      }

    try {
      const data = JSON.parse(text); // parseamos seguro después del debug
      setTareas(data);

    } catch (err) {
      console.error("No es JSON válido:", err);
      console.log("Texto recibido:", text);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
    console.log("Fetching tareas con token:", localStorage.getItem("token"));
    try {
      const res = await fetch("/api/tarea", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : [];
      console.log("Parsed tareas: ", data);
      setTareas(data);
    } catch (err) {
      console.error("Error cargando tareas:", err);
      setTareas([]);
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, [authLoading, user]);




  // const addTarea

  const addTarea = async (tarea: TareaCreate) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch("/api/tarea", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(tarea),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Error insertando tarea:", text);
        throw new Error(`Error insertando tarea: ${res.status}`);
      }

      await fetchTareas(); // recargamos tareas

    } catch (err) {
      console.error("Error addTarea:", err);
    }
  };

  const completarTarea = async (id_tarea: number) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`/api/tarea/${id_tarea}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ estado: "Completada" }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Error actualizando tarea:", text);
        throw new Error(`Error actualizando tarea: ${res.status}`);
      }

      await fetchTareas(); // recargamos tareas

    } catch (err) {
      console.error("Error completarTarea:", err);
    }
  };

  return (
    <TareaContext.Provider value={{ tareas, loading, addTarea, completarTarea }}>
      {children}
    </TareaContext.Provider>
  );
};
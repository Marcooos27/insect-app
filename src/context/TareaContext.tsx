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
  frecuencia: string;
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

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("token");

    console.log("Fetching tareas con token:", token);

    fetch("/api/tarea", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        const text = await res.text(); // 🔹 leer como texto para debug
        console.log("Respuesta fetch tareas:", text);

        if (!res.ok) throw new Error(`Error cargando tareas: ${res.status}`);
        try {
          return JSON.parse(text); // 🔹 parse manual para ver errores
        } catch (err) {
          console.error("Error parseando JSON:", err, text);
          throw err;
        }
      })
      .then((data) => setTareas(data))
      .catch((err) => console.error("Error cargando tareas:", err))
      .finally(() => setLoading(false));

  }, [user, authLoading]);



  const fetchTareas = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch("/api/tarea", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const text = await res.text();
      console.log("Respuesta recarga tareas:", text);

      if (!res.ok) throw new Error(`Error recargando tareas: ${res.status}`);

      try {
        const data: Tarea[] = JSON.parse(text); // parseamos seguro después del debug
        setTareas(data);
      } catch (err) {
        console.error("Error parseando JSON recarga:", err, text);
        setTareas([]); // fallback para que no rompa la app
      }
    } catch (err) {
      console.error("Error recargando tareas:", err);
    }
  };


  const addTarea  = async (tarea: TareaCreate) => {
    try {
      const res = await fetch("/api/tarea", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(tarea),
      });

      if (!res.ok) throw new Error("Error insertando tarea");

      //const savedTarea  = await res.json();

      // recargar tareas del backend
      await fetchTareas();

      //console.log("Tarea guardada:", savedTarea);


    } catch (error) {
      console.error("Error al añadir tarea:", error);
    }
  };


  const completarTarea = async (id_tarea: number) => {
    try {
      const res = await fetch(
        `/tarea/${id_tarea}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ estado: "Completada" }),
        }
      );

      if (!res.ok) throw new Error("Error actualizando tarea");

      // recargar tareas desde backend
      await fetchTareas();

    } catch (error) {
      console.error(error);
    }
  };


  return (
    <TareaContext.Provider value={{ tareas, loading, addTarea, completarTarea  }}>
      {children}
    </TareaContext.Provider>
  );
};

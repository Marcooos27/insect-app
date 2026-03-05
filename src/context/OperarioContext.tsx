import React, { createContext, useState, useEffect, ReactNode } from "react";
import {
  Operario,
  OperarioCreate,
  getOperarios,
  createOperario,
  removeOperario,
  updateOperario,
} from "../api/operarios.api";
import { useAuth } from "./AuthContext";

interface OperarioContextType {
  operarios: Operario[];
  loading: boolean;
  fetchOperarios: () => Promise<void>;
  addOperario: (op: OperarioCreate) => Promise<void>;
  deleteOperario: (id: number) => Promise<void>;
  updateOperario: (id: number, op: OperarioCreate) => Promise<void>;
}

export const OperarioContext = createContext<OperarioContextType>(
  {} as OperarioContextType
);

export const OperarioProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [operarios, setOperarios] = useState<Operario[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();

  /**
   * fetchOperarios:
   * - Cambiado para asegurarnos de que loading siempre se resetea
   * - Agregado console.log para depuración
   * - Manejo de usuario no logueado
   */
  const fetchOperarios = async () => {
    if (!user) {
      setOperarios([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await getOperarios();
      console.log("Operarios recibidos del backend:", data);
      setOperarios(data || []);
    } catch (err) {
      console.error("Error cargando operarios:", err);
      setOperarios([]);
    } finally {
      setLoading(false);
    }
  };

  // Añadir operario
  const addOperario = async (op: OperarioCreate) => {
    try {
      await createOperario(op);
      await fetchOperarios();
    } catch (err) {
      console.error("Error creando operario:", err);
    }
  };

  // Eliminar operario
  const deleteOperario = async (id: number) => {
    try {
      await removeOperario(id);
      await fetchOperarios();
    } catch (err) {
      console.error("Error eliminando operario:", err);
    }
  };

  // Actualizar operario
  const updateOperarioCtx = async (id: number, op: OperarioCreate) => {
    try {
      await updateOperario(id, op);
      await fetchOperarios();
    } catch (err) {
      console.error("Error actualizando operario:", err);
    }
  };

  // useEffect para cargar operarios al inicio
  useEffect(() => {
    if (authLoading) return;
    fetchOperarios();
  }, [user, authLoading]);

  return (
    <OperarioContext.Provider
      value={{
        operarios,
        loading,
        fetchOperarios,
        addOperario,
        deleteOperario,
        updateOperario: updateOperarioCtx,
      }}
    >
      {children}
    </OperarioContext.Provider>
  );
};
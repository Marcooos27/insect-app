
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

export const OperarioProvider: React.FC<{ children: ReactNode }> = ({ children, }) => {
  const [operarios, setOperarios] = useState<Operario[]>([]);
  const [loading, setLoading] = useState(true);

  const { user, loading: authLoading } = useAuth();


  const fetchOperarios = async () => {
    if (!user) return;

    try {
      const data = await getOperarios();
      setOperarios(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addOperario = async (op: OperarioCreate) => {
    await createOperario(op);
    await fetchOperarios();
  };

  const deleteOperario = async (id: number) => {
    await removeOperario(id);
    await fetchOperarios();
  };

  const updateOperarioCtx = async (
  id: number,
  op: OperarioCreate
  ) => {
    await updateOperario(id, op);
    await fetchOperarios();
  };


  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setLoading(false);
      return;
    }

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

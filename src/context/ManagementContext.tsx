import React, { createContext, useContext, useState } from "react";
import api from "../services/api"; // 🔥 IMPORTANTE

// ==============================
// CONTEXTO
// ==============================
const ManagementContext = createContext<any>(null);

// ==============================
// PROVIDER
// ==============================
export const ManagementProvider = ({ children }: any) => {

  // ----------------------
  // CLIENTES
  // ----------------------
  const [clientes, setClientes] = useState<any[]>([]);

  const fetchClientes = async () => {
    try {
      const res = await api.get("/cliente");
      const data = Array.isArray(res.data) ? res.data : [];
      setClientes(data);
    } catch (err) {
      console.error("Error cargando clientes:", err);
      setClientes([]); // 🔥 evita .map crash
    }
  };

  const createCliente = async (cliente: any) => {
    try {
      await api.post("/cliente", cliente);
      await fetchClientes();
      return true;
    } catch (err) {
      console.error("Error creando cliente:", err);
      return false;
    }
  };

  // ----------------------
  // PEDIDOS
  // ----------------------
  const [pedidos, setPedidos] = useState<any[]>([]);

  const fetchPedidos = async () => {
    try {
      const res = await api.get("/pedido");
      const data = Array.isArray(res.data) ? res.data : [];
      setPedidos(data);
    } catch (err) {
      console.error("Error cargando pedidos:", err);
      setPedidos([]);
    }
  };

  const createPedido = async (pedido: any) => {
    try {
      await api.post("/pedido", pedido);
      await fetchPedidos();
      return true;
    } catch (err) {
      console.error("Error creando pedido:", err);
      return false;
    }
  };

  return (
    <ManagementContext.Provider value={{
      clientes, fetchClientes, createCliente,
      pedidos, fetchPedidos, createPedido
    }}>
      {children}
    </ManagementContext.Provider>
  );
};

// ==============================
// HOOK
// ==============================
export const useManagement = () => useContext(ManagementContext);
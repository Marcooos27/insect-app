import React, { createContext, useContext, useState } from "react";

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
      const res = await fetch("http://127.0.0.1:8000/cliente");
      setClientes(await res.json());
    } catch (err) {
      console.error("Error cargando clientes:", err);
    }
  };

  const createCliente = async (cliente: any) => {
    try {
      const res = await fetch("http://127.0.0.1:8000/cliente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cliente),
      });

      if (res.ok) {
        fetchClientes();
        return true;
      }
    } catch (err) {
      console.error("Error creando cliente:", err);
    }
    return false;
  };

  // ----------------------
  // PEDIDOS
  // ----------------------
  const [pedidos, setPedidos] = useState<any[]>([]);

  const fetchPedidos = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/pedido");
      setPedidos(await res.json());
    } catch (err) {
      console.error("Error cargando pedidos:", err);
    }
  };

  const createPedido = async (pedido: any) => {
    try {
      const res = await fetch("http://127.0.0.1:8000/pedido", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pedido),
      });

      if (res.ok) {
        fetchPedidos();
        return true;
      }
    } catch (err) {
      console.error("Error creando pedido:", err);
    }
    return false;
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
// HOOK PARA USAR EL CONTEXTO
// ==============================
export const useManagement = () => useContext(ManagementContext);
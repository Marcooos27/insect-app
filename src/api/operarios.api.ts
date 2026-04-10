import api from "../services/api";

export interface Operario {
  id_operario: number;
  nombre: string;
  turno_trabajo: string;
}

export interface OperarioCreate {
  nombre: string;
  turno_trabajo: string;
}

export const getOperarios = async (): Promise<Operario[]> => {
  const res = await api.get("/operario");
  return res.data;
};

export const createOperario = async (op: OperarioCreate): Promise<void> => {
  await api.post("/operario", op);
};

export const removeOperario = async (id: number): Promise<void> => {
  await api.delete(`/operario/${id}`);
};

export const updateOperario = async (id: number, op: OperarioCreate): Promise<void> => {
  await api.put(`/operario/${id}`, op);
};
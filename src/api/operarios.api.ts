const BASE_URL = "http://127.0.0.1:8000/operario";

export interface Operario {
  id_operario: number;
  nombre: string;
  turno_trabajo: string;
}

export interface OperarioCreate {
  nombre: string;
  turno_trabajo: string;
}

// GET
export const getOperarios = async (): Promise<Operario[]> => {
  const res = await fetch(BASE_URL);
  if (!res.ok) throw new Error("Error cargando operarios");
  return res.json();
};

// POST
export const createOperario = async (
  op: OperarioCreate
): Promise<void> => {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(op),
  });

  if (!res.ok) throw new Error("Error creando operario");
};

// DELETE
export const removeOperario = async (
  id: number
): Promise<void> => {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) throw new Error("Error eliminando operario");
};


// UPDATE
export const updateOperario = async (
  id: number,
  op: OperarioCreate
): Promise<void> => {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(op),
  });

  if (!res.ok) throw new Error("Error actualizando operario");
};

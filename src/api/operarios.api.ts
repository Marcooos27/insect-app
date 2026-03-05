const BASE_URL = "/api/operario";

export interface Operario {
  id_operario: number;
  nombre: string;
  turno_trabajo: string;
}

export interface OperarioCreate {
  nombre: string;
  turno_trabajo: string;
}

/**
 * Helper para hacer fetch con token y parseo seguro de JSON
 */
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem("token");

  const headers = {
    ...options.headers,
    Authorization: token ? `Bearer ${token}` : "",
  };

  const res = await fetch(url, { ...options, headers });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (err) {
    console.error("Respuesta inválida del backend:", text);
    throw new Error("JSON inválido del backend");
  }

  if (!res.ok) {
    throw new Error(
      data?.detail || `Error en la petición ${res.status}: ${res.statusText}`
    );
  }

  return data;
};

// GET todos los operarios
export const getOperarios = async (): Promise<Operario[]> => {
  return fetchWithAuth(BASE_URL);
};

// POST crear operario
export const createOperario = async (op: OperarioCreate): Promise<void> => {
  await fetchWithAuth(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(op),
  });
};

// DELETE eliminar operario
export const removeOperario = async (id: number): Promise<void> => {
  await fetchWithAuth(`${BASE_URL}/${id}`, { method: "DELETE" });
};

// PUT actualizar operario
export const updateOperario = async (
  id: number,
  op: OperarioCreate
): Promise<void> => {
  await fetchWithAuth(`${BASE_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(op),
  });
};
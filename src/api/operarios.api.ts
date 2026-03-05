// Base URL actualizado a la ruta correcta del backend
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
 * Cambios:
 * 1. Ahora solo intenta parsear JSON si el content-type es application/json
 *    Esto evita SyntaxError cuando el backend devuelve HTML por error (404, 500, etc.)
 * 2. Headers combinados de forma segura (Content-Type + Authorization + cualquier header extra)
 */
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
    ...options.headers,
  };

  const res = await fetch(url, { ...options, headers });
  const text = await res.text();

  let data: any = null;
  const contentType = res.headers.get("content-type");

  if (contentType && contentType.includes("application/json")) {
    try {
      data = text ? JSON.parse(text) : null;
    } catch (err) {
      console.error("Respuesta JSON inválida del backend:", text);
      throw new Error("JSON inválido del backend");
    }
  } else if (text) {
    // Para depuración: si backend devuelve HTML u otro formato
    console.warn("Respuesta no JSON del backend:", text);
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
    body: JSON.stringify(op),
  });
};
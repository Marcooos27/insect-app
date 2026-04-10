import axios from "axios";

console.log("API URL:", import.meta.env.VITE_API_URL);

export const API_URL = import.meta.env.VITE_API_URL || "http://13.63.160.85/api";

console.log("API URL:", API_URL);

const api = axios.create({
  baseURL: API_URL,
});

// Interceptor automático JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redirige al login si el token expira
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;

// =====================
// PEDIDOS
// =====================
export const getPedidos = () => api.get("/pedido").then(res => res.data);
export const addPedido = (pedido: any) => api.post("/pedido", pedido);
export const deletePedido = (id: number) => api.delete(`/pedido/${id}`);

// =====================
// EVENTOS
// =====================
export const getEventos = () => api.get("/evento").then(res => res.data);
export const addEvento = (evento: any) => api.post("/evento", evento);
export const deleteEvento = (id: number) => api.delete(`/evento/${id}`);

// =====================
// TAREAS
// =====================
export const getTareas = () => api.get("/tarea").then(res => res.data);
export const addTarea = (tarea: any) => api.post("/tarea", tarea);
export const deleteTarea = (id: number) => api.delete(`/tarea/${id}`);
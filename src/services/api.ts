import axios from "axios";

export const API_URL = "http://13.63.160.85:8000";

const api = axios.create({
  baseURL: API_URL,
});

// 👉 interceptor automático JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});


// Esto sirve para cuando expire el token que te tire al logearte automaticamente otra vez, sin tener que esperar a que el backend te tire un 401 y recargar la página
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



// =====================
// PEDIDOS
// =====================

export const getPedidos = () =>
  api.get("/pedido").then(res => res.data);

export const addPedido = (pedido: any) =>
  api.post("/pedido", pedido);

export const deletePedido = (id: number) =>
  api.delete(`/pedido/${id}`);


// =====================
// EVENTOS
// =====================

export const getEventos = () =>
  api.get("/evento").then(res => res.data);

export const addEvento = (evento: any) =>
  api.post("/evento", evento);

export const deleteEvento = (id: number) =>
  api.delete(`/evento/${id}`);


// =====================
// TAREAS
// =====================

export const getTareas = () =>
  api.get("/tarea").then(res => res.data);

export const addTarea = (tarea: any) =>
  api.post("/tarea", tarea);

export const deleteTarea = (id: number) =>
  api.delete(`/tarea/${id}`);

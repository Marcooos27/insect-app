// Datos de ejemplo para campos que todavía no existen en el backend
// (CO2, ciclo de cámara, episodios de estrés, fechas de montaje/desmontaje,
// tareas por cámara, gramos de huevos). Deterministas por id_camara para que
// no cambien en cada render. Sustituir por llamadas reales cuando exista el
// endpoint correspondiente.

import type { Operario } from "../../../api/operarios.api";

function hashSeed(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rng(idCamara: number, key: string) {
  return mulberry32(hashSeed(`${idCamara}:${key}`));
}

function randRange(r: () => number, min: number, max: number): number {
  return min + r() * (max - min);
}

export function getDiasEnCiclo(idCamara: number): number {
  return Math.round(randRange(rng(idCamara, "dias_ciclo"), 3, 42));
}

export function getCO2(idCamara: number): number {
  return Math.round(randRange(rng(idCamara, "co2"), 420, 1100));
}

const MOTIVOS_ESTRES = [
  "Temperatura elevada",
  "Humedad fuera de rango",
  "Nivel de CO2 elevado",
  "Corte de suministro eléctrico",
];

export interface EpisodioEstres {
  activo: boolean;
  fecha: string;
  motivo: string;
}

export function getEpisodioEstres(idCamara: number): EpisodioEstres {
  const r = rng(idCamara, "estres");
  const activo = r() < 0.35;
  const horasAtras = Math.round(randRange(r, 1, 20));
  const fecha = new Date(Date.now() - horasAtras * 3600_000);
  const motivo = MOTIVOS_ESTRES[Math.floor(randRange(r, 0, MOTIVOS_ESTRES.length))];
  return {
    activo,
    fecha: fecha.toLocaleString("es-ES", {
      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
    }),
    motivo,
  };
}

export function getEpisodiosUltimas24h(camaras: { id_camara: number }[]): number {
  return camaras.reduce((acc, c) => acc + (getEpisodioEstres(c.id_camara).activo ? 1 : 0), 0);
}

export interface FechasCiclo {
  montaje: string;
  desmonteEstimado: string;
}

export function getFechasCiclo(idCamara: number): FechasCiclo {
  const dias = getDiasEnCiclo(idCamara);
  const montaje = new Date(Date.now() - dias * 86_400_000);
  const duracionCiclo = Math.round(randRange(rng(idCamara, "duracion_ciclo"), 45, 75));
  const desmonte = new Date(montaje.getTime() + duracionCiclo * 86_400_000);
  const fmt = (d: Date) => d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
  return { montaje: fmt(montaje), desmonteEstimado: fmt(desmonte) };
}

// Temperatura y humedad usan lecturas reales (ver lecturas.ts); el CO2 sigue siendo
// de ejemplo porque todavía no hay sensores de CO2 instalados.
const CO2_BASE = 700;
const CO2_AMPLITUD = 200;

export interface PuntoSerie {
  etiqueta: string;
  valor: number;
}

export function getSerieDiariaCO2(idCamara: number): PuntoSerie[] {
  const r = rng(idCamara, "diaria_co2");
  const puntos: PuntoSerie[] = [];
  for (let h = 0; h < 24; h++) {
    const onda = Math.sin((h / 24) * Math.PI * 2) * (CO2_AMPLITUD * 0.5);
    const ruido = randRange(r, -CO2_AMPLITUD * 0.25, CO2_AMPLITUD * 0.25);
    puntos.push({ etiqueta: `${String(h).padStart(2, "0")}:00`, valor: Math.round(CO2_BASE + onda + ruido) });
  }
  return puntos;
}

export function getSerieCicloCO2(idCamara: number, dias: number): PuntoSerie[] {
  const r = rng(idCamara, "ciclo_co2");
  const total = Math.max(1, dias);
  const puntos: PuntoSerie[] = [];
  for (let d = 1; d <= total; d++) {
    const deriva = ((d / total) - 0.5) * CO2_AMPLITUD * 0.4;
    const ruido = randRange(r, -CO2_AMPLITUD * 0.3, CO2_AMPLITUD * 0.3);
    puntos.push({ etiqueta: `D${d}`, valor: Math.round(CO2_BASE + deriva + ruido) });
  }
  return puntos;
}

function nombreOperario(operarios: Operario[], r: () => number, fallback: string): string {
  if (operarios.length === 0) return fallback;
  return operarios[Math.floor(randRange(r, 0, operarios.length))].nombre;
}

export interface TareaCamara {
  operario: string;
  descripcion: string;
}

const DESCRIPCIONES_TAREA = [
  "Revisión de pallets próximos a vencer",
  "Comprobación de sensores de temperatura",
  "Limpieza de la zona de acceso",
  "Registro de entrada de nuevos pallets",
];

export function getTareasCamara(idCamara: number, operarios: Operario[]): TareaCamara[] {
  const r = rng(idCamara, "tareas_camara");
  const n = Math.round(randRange(r, 1, 3));
  return Array.from({ length: n }).map((_, i) => ({
    operario: nombreOperario(operarios, r, `Operario ${i + 1}`),
    descripcion: DESCRIPCIONES_TAREA[Math.floor(randRange(r, 0, DESCRIPCIONES_TAREA.length))],
  }));
}

export interface TareasHoy {
  llenar: { camara: string; operario: string };
  vaciar: { camara: string; operario: string };
}

export function getTareasHoy(
  camaras: { id_camara: number; nombre: string }[],
  operarios: Operario[]
): TareasHoy | null {
  if (camaras.length === 0) return null;
  const seed = new Date().toISOString().slice(0, 10);
  const r = rng(hashSeed(seed), "tareas_hoy");
  const idxLlenar = Math.floor(randRange(r, 0, camaras.length));
  let idxVaciar = Math.floor(randRange(r, 0, camaras.length));
  if (camaras.length > 1 && idxVaciar === idxLlenar) {
    idxVaciar = (idxVaciar + 1) % camaras.length;
  }
  return {
    llenar: { camara: camaras[idxLlenar].nombre, operario: nombreOperario(operarios, r, "Sin asignar") },
    vaciar: { camara: camaras[idxVaciar].nombre, operario: nombreOperario(operarios, r, "Sin asignar") },
  };
}

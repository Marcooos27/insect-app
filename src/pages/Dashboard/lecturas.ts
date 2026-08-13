import api from "../../services/api";

export interface LecturaSensor {
  valor: number;
  fecha_lectura: string;
}

export type TipoSensor = "temperatura" | "humedad";

export async function getLecturasCamara(idCamara: number, tipo: TipoSensor): Promise<LecturaSensor[]> {
  const res = await api.get(`/dashboard/camara/${idCamara}/lecturas`, { params: { tipo } });
  return res.data.lecturas || [];
}

export interface PuntoSerie {
  etiqueta: string;
  valor: number;
}

// Lecturas de las últimas 24 horas (ventana móvil desde ahora), una por punto
// (hora:minuto exactos de la lectura real), ordenadas cronológicamente.
export function serieUltimas24h(lecturas: LecturaSensor[]): PuntoSerie[] {
  const desde = Date.now() - 24 * 60 * 60 * 1000;
  return lecturas
    .filter(l => new Date(l.fecha_lectura).getTime() >= desde)
    .sort((a, b) => new Date(a.fecha_lectura).getTime() - new Date(b.fecha_lectura).getTime())
    .map(l => ({
      etiqueta: new Date(l.fecha_lectura).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
      valor: l.valor,
    }));
}

// Media diaria de todas las lecturas disponibles, un punto por día natural.
export function serieCiclo(lecturas: LecturaSensor[]): PuntoSerie[] {
  const porDia = new Map<string, { suma: number; n: number; fecha: Date }>();
  for (const l of lecturas) {
    const fecha = new Date(l.fecha_lectura);
    const clave = fecha.toDateString();
    const actual = porDia.get(clave) ?? { suma: 0, n: 0, fecha };
    actual.suma += l.valor;
    actual.n += 1;
    porDia.set(clave, actual);
  }
  return Array.from(porDia.values())
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
    .map(({ suma, n, fecha }) => ({
      etiqueta: fecha.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" }),
      valor: Math.round((suma / n) * 10) / 10,
    }));
}

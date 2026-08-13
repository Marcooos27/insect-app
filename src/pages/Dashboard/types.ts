export interface CamaraResumen {
  id_camara: number;
  nombre: string;
  capacidad_max: number;
  pallets_dentro: number;
  pallets_vencidos: number;
  temperatura: number | null;
  humedad: number | null;
  ultima_lectura: string | null;
}

export interface Pallet {
  id_pallet: number;
  codigo_qr: string;
  dias_en_camara: number;
  fecha_salida_prevista: string;
  estado_ciclo: "en_ciclo" | "vencido";
}

export interface DetalleCamara {
  camara: CamaraResumen;
  pallets: Pallet[];
}

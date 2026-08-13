import React from "react";
import { IonIcon } from "@ionic/react";
import { thermometerOutline, waterOutline, cloudOutline, pieChartOutline } from "ionicons/icons";
import type { CamaraResumen } from "../types";
import { getDiasEnCiclo, getCO2, getEpisodioEstres } from "../mock/dashboardMock";

interface CameraCardProps {
  camara: CamaraResumen;
  selected: boolean;
  onClick: () => void;
}

const CameraCard: React.FC<CameraCardProps> = ({ camara, selected, onClick }) => {
  const diasEnCiclo = getDiasEnCiclo(camara.id_camara);
  const co2 = getCO2(camara.id_camara);
  const enEstres = getEpisodioEstres(camara.id_camara).activo;
  const pct = Math.round((camara.pallets_dentro / camara.capacidad_max) * 100);

  return (
    <div
      className={`cam-card${enEstres ? " estres" : ""}${selected ? " selected" : ""}`}
      onClick={onClick}
    >
      <div className="cam-card-top">
        <span className="cam-nombre">{camara.nombre}</span>
        <span className="cam-dias-ciclo">{diasEnCiclo}d ciclo</span>
      </div>

      <div className="cam-metricas">
        {camara.temperatura !== null ? (
          <span className="metrica">
            <IonIcon icon={thermometerOutline} />{camara.temperatura} ºC
          </span>
        ) : (
          <span className="metrica sin-datos">— ºC</span>
        )}
        {camara.humedad !== null ? (
          <span className="metrica">
            <IonIcon icon={waterOutline} />{camara.humedad}%
          </span>
        ) : (
          <span className="metrica sin-datos">— %</span>
        )}
        <span className="metrica">
          <IonIcon icon={cloudOutline} />{co2} ppm
        </span>
        <span className="metrica">
          <IonIcon icon={pieChartOutline} />{Number.isFinite(pct) ? pct : 0}%
        </span>
      </div>

      <div className="cam-meta">
        {camara.pallets_dentro} / {camara.capacidad_max} pallets
        {camara.pallets_vencidos > 0 && (
          <span className="cam-alerta"> · {camara.pallets_vencidos} vencidos</span>
        )}
      </div>
    </div>
  );
};

export default CameraCard;

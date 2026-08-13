import React from "react";
import { IonIcon } from "@ionic/react";
import { cubeOutline, warningOutline, arrowDownCircleOutline, arrowUpCircleOutline, eggOutline } from "ionicons/icons";
import type { CamaraResumen } from "../types";
import type { Operario } from "../../../api/operarios.api";
import { getEpisodiosUltimas24h, getTareasHoy } from "../mock/dashboardMock";

interface SummaryPanelProps {
  camaras: CamaraResumen[];
  operarios: Operario[];
}

const SummaryPanel: React.FC<SummaryPanelProps> = ({ camaras, operarios }) => {
  const totalPallets = camaras.reduce((acc, c) => acc + c.pallets_dentro, 0);
  const totalCapacidad = camaras.reduce((acc, c) => acc + c.capacidad_max, 0);
  const episodios24h = getEpisodiosUltimas24h(camaras);
  const tareasHoy = getTareasHoy(camaras, operarios);

  return (
    <div className="resumen">
      <div className="resumen-tiles">
        <div className="resumen-tile">
          <IonIcon icon={cubeOutline} />
          <div>
            <span className="resumen-tile-valor">{totalPallets} / {totalCapacidad}</span>
            <span className="resumen-tile-label">Pallets en cámara</span>
          </div>
        </div>
        <div className="resumen-tile">
          <IonIcon icon={warningOutline} />
          <div>
            <span className="resumen-tile-valor">{episodios24h}</span>
            <span className="resumen-tile-label">Episodios de estrés · 24h</span>
          </div>
        </div>
      </div>

      <div className="seccion-label">Tareas de hoy</div>
      <div className="resumen-tareas">
        <div className="resumen-tarea-box">
          <div className="resumen-tarea-icono llenar"><IonIcon icon={arrowDownCircleOutline} /></div>
          <div className="resumen-tarea-info">
            <span className="resumen-tarea-titulo">Cámara a llenar</span>
            <span className="resumen-tarea-camara">{tareasHoy?.llenar.camara ?? "—"}</span>
            <span className="resumen-tarea-operario">{tareasHoy?.llenar.operario ?? "Sin asignar"}</span>
          </div>
        </div>
        <div className="resumen-tarea-box">
          <div className="resumen-tarea-icono vaciar"><IonIcon icon={arrowUpCircleOutline} /></div>
          <div className="resumen-tarea-info">
            <span className="resumen-tarea-titulo">Cámara a vaciar</span>
            <span className="resumen-tarea-camara">{tareasHoy?.vaciar.camara ?? "—"}</span>
            <span className="resumen-tarea-operario">{tareasHoy?.vaciar.operario ?? "Sin asignar"}</span>
          </div>
        </div>
      </div>

      <div className="seccion-label">Producción</div>
      <div className="resumen-huevos">
        <IonIcon icon={eggOutline} />
        <div>
          <span className="resumen-huevos-titulo">Gramos de huevos</span>
          <span className="resumen-huevos-sub">Próximamente</span>
        </div>
      </div>
    </div>
  );
};

export default SummaryPanel;

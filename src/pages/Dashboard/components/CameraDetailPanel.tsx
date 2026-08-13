import React, { useEffect, useState } from "react";
import { IonIcon } from "@ionic/react";
import {
  cameraOutline, gridOutline, closeOutline, warningOutline, calendarOutline, checkmarkCircleOutline,
} from "ionicons/icons";
import type { CamaraResumen } from "../types";
import type { Operario } from "../../../api/operarios.api";
import {
  getDiasEnCiclo, getFechasCiclo, getEpisodioEstres, getSerieDiariaCO2, getSerieCicloCO2, getTareasCamara,
} from "../mock/dashboardMock";
import { getLecturasCamara, serieUltimas24h, serieCiclo, type LecturaSensor } from "../lecturas";
import SensorLineChart from "../Charts/SensorLineChart";
import SensorCycleBarChart from "../Charts/SensorCycleBarChart";

interface CameraDetailPanelProps {
  camara: CamaraResumen;
  operarios: Operario[];
  onClose: () => void;
  onOpenFotos: () => void;
  onOpenDistribucion: () => void;
}

const CameraDetailPanel: React.FC<CameraDetailPanelProps> = ({
  camara, operarios, onClose, onOpenFotos, onOpenDistribucion,
}) => {
  const diasEnCiclo = getDiasEnCiclo(camara.id_camara);
  const fechas = getFechasCiclo(camara.id_camara);
  const estres = getEpisodioEstres(camara.id_camara);
  const tareas = getTareasCamara(camara.id_camara, operarios);

  const [lecturasTemp, setLecturasTemp] = useState<LecturaSensor[]>([]);
  const [lecturasHum, setLecturasHum] = useState<LecturaSensor[]>([]);

  useEffect(() => {
    if (camara.temperatura !== null) {
      getLecturasCamara(camara.id_camara, "temperatura").then(setLecturasTemp).catch(() => setLecturasTemp([]));
    } else {
      setLecturasTemp([]);
    }
    if (camara.humedad !== null) {
      getLecturasCamara(camara.id_camara, "humedad").then(setLecturasHum).catch(() => setLecturasHum([]));
    } else {
      setLecturasHum([]);
    }
  }, [camara.id_camara, camara.temperatura, camara.humedad]);

  return (
    <div className="detalle-panel">
      <div className="detalle-header">
        <h2 className="detalle-titulo">{camara.nombre}</h2>
        <span className="detalle-dias-ciclo">{diasEnCiclo} días en ciclo</span>
        <span className="detalle-fecha"><IonIcon icon={calendarOutline} /> Montaje: {fechas.montaje}</span>
        <span className="detalle-fecha"><IonIcon icon={calendarOutline} /> Desmontaje estimado: {fechas.desmonteEstimado}</span>
        <div className="detalle-header-acciones">
          <button className="icon-btn" onClick={onOpenFotos} title="Ver fotos de pallets">
            <IonIcon icon={cameraOutline} />
          </button>
          <button className="icon-btn" onClick={onOpenDistribucion} title="Ver distribución de pallets">
            <IonIcon icon={gridOutline} />
          </button>
          <button className="icon-btn" onClick={onClose} title="Cerrar">
            <IonIcon icon={closeOutline} />
          </button>
        </div>
      </div>

      {estres.activo ? (
        <div className="estres-banner">
          <IonIcon icon={warningOutline} />
          <span>Episodio de estrés · {estres.fecha} — {estres.motivo}</span>
        </div>
      ) : (
        <div className="estres-banner ok">
          <IonIcon icon={checkmarkCircleOutline} />
          <span>Sin episodios de estrés recientes</span>
        </div>
      )}

      {camara.temperatura !== null ? (
        <div className="charts-grid">
          {serieUltimas24h(lecturasTemp).length > 0 ? (
            <SensorLineChart titulo="Temperatura" unidad=" ºC" color="#EF9F27" datos={serieUltimas24h(lecturasTemp)} subtitulo="últimas 24h" />
          ) : (
            <div className="mini-chart-card mini-chart-vacio">Temperatura — sin lecturas en las últimas 24h</div>
          )}
          {serieCiclo(lecturasTemp).length > 0 ? (
            <SensorCycleBarChart titulo="Temperatura" unidad=" ºC" color="#EF9F27" datos={serieCiclo(lecturasTemp)} />
          ) : (
            <div className="mini-chart-card mini-chart-vacio">Temperatura — sin histórico todavía</div>
          )}
        </div>
      ) : (
        <div className="sin-sensor">Temperatura — sin sensor instalado, datos no disponibles</div>
      )}

      {camara.humedad !== null ? (
        <div className="charts-grid">
          {serieUltimas24h(lecturasHum).length > 0 ? (
            <SensorLineChart titulo="Humedad" unidad="%" color="#4fc3f7" datos={serieUltimas24h(lecturasHum)} subtitulo="últimas 24h" />
          ) : (
            <div className="mini-chart-card mini-chart-vacio">Humedad — sin lecturas en las últimas 24h</div>
          )}
          {serieCiclo(lecturasHum).length > 0 ? (
            <SensorCycleBarChart titulo="Humedad" unidad="%" color="#4fc3f7" datos={serieCiclo(lecturasHum)} />
          ) : (
            <div className="mini-chart-card mini-chart-vacio">Humedad — sin histórico todavía</div>
          )}
        </div>
      ) : (
        <div className="sin-sensor">Humedad — sin sensor instalado, datos no disponibles</div>
      )}

      <div className="charts-grid">
        <SensorLineChart titulo="CO2" unidad=" ppm" color="#9c7ef0" datos={getSerieDiariaCO2(camara.id_camara)} />
        <SensorCycleBarChart titulo="CO2" unidad=" ppm" color="#9c7ef0" datos={getSerieCicloCO2(camara.id_camara, diasEnCiclo)} />
      </div>

      <div className="seccion-label">Tareas asociadas</div>
      <div className="tareas-lista">
        {tareas.map((t, i) => (
          <div key={i} className="tarea-row">
            <span className="tarea-operario">{t.operario}</span>
            <span className="tarea-descripcion">{t.descripcion}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CameraDetailPanel;

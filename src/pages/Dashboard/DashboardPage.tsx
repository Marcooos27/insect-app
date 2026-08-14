import React, { useEffect, useRef, useState } from "react";
import { IonPage, IonContent, IonSpinner } from "@ionic/react";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { getOperarios, type Operario } from "../../api/operarios.api";
import type { CamaraResumen } from "./types";
import CameraCard from "./components/CameraCard";
import SummaryPanel from "./components/SummaryPanel";
import CameraDetailPanel from "./components/CameraDetailPanel";
import DistributionModal from "./components/DistributionModal";
import PhotosModal from "./components/PhotosModal";
import "./DashboardPage.css";

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [vista, setVista] = useState<"propias" | "franquiciados">("propias");
  const [camarasPropias, setCamarasPropias] = useState<CamaraResumen[]>([]);
  const [camarasFranquiciados, setCamarasFranquiciados] = useState<CamaraResumen[]>([]);
  const [operarios, setOperarios] = useState<Operario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [distribucionId, setDistribucionId] = useState<number | null>(null);
  const [fotosCamara, setFotosCamara] = useState<string | null>(null);
  const [arrowTop, setArrowTop] = useState<number | null>(null);
  const splitRef = useRef<HTMLDivElement>(null);
  const splitLeftRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get("/dashboard/camaras")
      .then(res => {
        setCamarasPropias(res.data.propias || []);
        setCamarasFranquiciados(res.data.franquiciados || []);
      })
      .finally(() => setCargando(false));
    getOperarios().then(setOperarios).catch(() => setOperarios([]));
  }, []);

  const camaras = vista === "propias" ? camarasPropias : camarasFranquiciados;

  // Posiciona la flecha de la línea divisoria a la altura de la tarjeta
  // de cámara seleccionada, para señalarla visualmente.
  useEffect(() => {
    if (!selectedId || !splitLeftRef.current || !splitRef.current) {
      setArrowTop(null);
      return;
    }
    const cardEl = splitLeftRef.current.querySelector<HTMLDivElement>(".cam-card.selected");
    if (!cardEl) {
      setArrowTop(null);
      return;
    }
    const cardRect = cardEl.getBoundingClientRect();
    const splitRect = splitRef.current.getBoundingClientRect();
    setArrowTop(cardRect.top - splitRect.top + cardRect.height / 2);
  }, [selectedId, camaras]);

  const camaraSeleccionada = camaras.find(c => c.id_camara === selectedId) || null;

  const seleccionar = (id: number) => {
    setSelectedId(prev => (prev === id ? null : id));
  };

  const cambiarVista = (nuevaVista: "propias" | "franquiciados") => {
    setVista(nuevaVista);
    setSelectedId(null); // la cámara seleccionada no existe en la otra lista
  };

  if (cargando) return (
    <IonPage>
      <IonContent className="dash-content">
        <div className="dash-loading"><IonSpinner name="crescent" /></div>
      </IonContent>
    </IonPage>
  );

  return (
    <IonPage>
      <IonContent className="dash-content">
        <div className="dash-container">
          {user?.rol === "admin" && (
            <div className="segmentado">
              <button
                className={`seg-btn ${vista === "propias" ? "active" : ""}`}
                onClick={() => cambiarVista("propias")}
              >
                Mis cámaras
              </button>
              <button
                className={`seg-btn ${vista === "franquiciados" ? "active" : ""}`}
                onClick={() => cambiarVista("franquiciados")}
              >
                Franquiciados
              </button>
            </div>
          )}

          <div className="dash-split" ref={splitRef}>
            <div className="dash-split-left" ref={splitLeftRef}>
              {camaras.length === 0 && vista === "franquiciados" && (
                <div className="dash-vacio">Todavía no hay ninguna franquicia dada de alta</div>
              )}
              {camaras.map(c => (
                <CameraCard
                  key={c.id_camara}
                  camara={c}
                  selected={c.id_camara === selectedId}
                  onClick={() => seleccionar(c.id_camara)}
                />
              ))}
            </div>

            <div className="dash-divider">
              {arrowTop !== null && (
                <svg
                  className="dash-divider-arrow"
                  style={{ top: `${arrowTop}px` }}
                  width="10"
                  height="14"
                  viewBox="0 0 10 14"
                >
                  <polygon points="9,1 9,13 1,7" />
                </svg>
              )}
            </div>

            <div className="dash-split-right">
              {camaraSeleccionada ? (
                <CameraDetailPanel
                  camara={camaraSeleccionada}
                  operarios={operarios}
                  onClose={() => setSelectedId(null)}
                  onOpenFotos={() => setFotosCamara(camaraSeleccionada.nombre)}
                  onOpenDistribucion={() => setDistribucionId(camaraSeleccionada.id_camara)}
                />
              ) : (
                <SummaryPanel camaras={camaras} operarios={operarios} />
              )}
            </div>
          </div>
        </div>
      </IonContent>

      <DistributionModal idCamara={distribucionId} onClose={() => setDistribucionId(null)} />
      <PhotosModal nombreCamara={fotosCamara} onClose={() => setFotosCamara(null)} />
    </IonPage>
  );
};

export default DashboardPage;

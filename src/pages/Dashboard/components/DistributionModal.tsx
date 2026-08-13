import React, { useEffect, useState } from "react";
import { IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonSpinner } from "@ionic/react";
import api from "../../../services/api";
import type { DetalleCamara } from "../types";

interface DistributionModalProps {
  idCamara: number | null;
  onClose: () => void;
}

const DistributionModal: React.FC<DistributionModalProps> = ({ idCamara, onClose }) => {
  const [detalle, setDetalle] = useState<DetalleCamara | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (idCamara === null) {
      setDetalle(null);
      return;
    }
    setCargando(true);
    api.get(`/dashboard/camara/${idCamara}/pallets`)
      .then(res => setDetalle(res.data))
      .finally(() => setCargando(false));
  }, [idCamara]);

  return (
    <IonModal isOpen={idCamara !== null} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Distribución {detalle ? `· ${detalle.camara.nombre}` : ""}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>Cerrar</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="dash-content">
        <div className="dash-container">
          {cargando || !detalle ? (
            <div className="dash-loading"><IonSpinner name="crescent" /></div>
          ) : (
            <>
              <div className="leyenda">
                <span className="leyenda-item en-ciclo">En ciclo</span>
                <span className="leyenda-item vencido">Debería salir</span>
                <span className="leyenda-item vacio">Vacío</span>
              </div>
              <div className="pallet-grid">
                {detalle.pallets.map(p => (
                  <div
                    key={p.id_pallet}
                    className={`pallet-cell ${p.estado_ciclo === "vencido" ? "vencido" : "en-ciclo"}`}
                  >
                    <span className="pallet-dias">{p.dias_en_camara}d</span>
                    <span className="pallet-id">{p.codigo_qr.replace("PALLET-", "P-")}</span>
                  </div>
                ))}
                {Array.from({
                  length: Math.max(0, detalle.camara.capacidad_max - detalle.pallets.length)
                }).map((_, i) => (
                  <div key={`empty-${i}`} className="pallet-cell vacio" />
                ))}
              </div>
            </>
          )}
        </div>
      </IonContent>
    </IonModal>
  );
};

export default DistributionModal;

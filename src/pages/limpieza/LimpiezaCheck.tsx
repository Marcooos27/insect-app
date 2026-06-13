import React, { useState } from "react";
import {
  IonPage,
  IonContent,
  IonButton,
  IonSpinner,
  IonIcon,
} from "@ionic/react";
import { checkmarkCircleOutline, shirtOutline } from "ionicons/icons";
import api from "../../services/api";  // ← usa el default export (axios)
import "./LimpiezaCheck.css";

interface Props {
  onConfirmado: () => void;
}

const LimpiezaCheck: React.FC<Props> = ({ onConfirmado }) => {
  const [cargando, setCargando] = useState(false);

  const handleListo = async () => {
    setCargando(true);
    try {
      await api.post("/limpieza/confirmar");  // ← axios directo
      onConfirmado();
    } catch (e) {
      console.error("Error confirmando limpieza", e);
    } finally {
      setCargando(false);
    }
  };

  return (
    <IonPage>
      <IonContent className="limpieza-content">
        <div className="limpieza-container">
          <div className="limpieza-icon">
            <IonIcon icon={shirtOutline} />
          </div>
          <h1 className="limpieza-titulo">Registro de Limpieza</h1>
          <p className="limpieza-texto">
            Adecúa tu vestimenta para trabajar
          </p>
          <div className="limpieza-checklist">
            <div className="limpieza-item">
              <IonIcon icon={checkmarkCircleOutline} />
              <span>Ropa de trabajo limpia</span>
            </div>
            <div className="limpieza-item">
              <IonIcon icon={checkmarkCircleOutline} />
              <span>EPIs correctamente colocados</span>
            </div>
            <div className="limpieza-item">
              <IonIcon icon={checkmarkCircleOutline} />
              <span>Higiene personal completada</span>
            </div>
          </div>
          <IonButton
            className="limpieza-boton"
            expand="block"
            onClick={handleListo}
            disabled={cargando}
          >
            {cargando ? <IonSpinner name="crescent" /> : "✓ Listo"}
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default LimpiezaCheck;
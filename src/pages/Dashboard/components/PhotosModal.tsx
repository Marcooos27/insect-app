import React from "react";
import { IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon } from "@ionic/react";
import { cameraOutline } from "ionicons/icons";

interface PhotosModalProps {
  nombreCamara: string | null;
  onClose: () => void;
}

const PhotosModal: React.FC<PhotosModalProps> = ({ nombreCamara, onClose }) => {
  return (
    <IonModal isOpen={nombreCamara !== null} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Fotos {nombreCamara ? `· ${nombreCamara}` : ""}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>Cerrar</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="dash-content">
        <div className="fotos-vacio">
          <IonIcon icon={cameraOutline} />
          <p>Aún no hay fotos.</p>
          <p className="fotos-vacio-sub">
            Esta función estará disponible cuando los franquiciados empiecen a subir fotos de los pallets.
          </p>
        </div>
      </IonContent>
    </IonModal>
  );
};

export default PhotosModal;

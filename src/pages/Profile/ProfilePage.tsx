import { IonPage, IonContent, IonButton, IonIcon } from "@ionic/react";
import { personCircleOutline, mailOutline, shieldOutline, logOutOutline } from "ionicons/icons";
import { useAuth } from "../../context/AuthContext";
import { useContext } from "react";
import { OperarioContext } from "../../context/OperarioContext";
import "./ProfilePage.css";

const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const { operarios } = useContext(OperarioContext);

  const nombreOperario = operarios.find(op => op.id_operario === user?.id_operario)?.nombre ?? "—";

  return (
    <IonPage>
      <IonContent className="profile-content">

        <div className="profile-header">
          <IonIcon icon={personCircleOutline} className="profile-avatar" />
          <h2 className="profile-username">{nombreOperario}</h2>
        </div>

        <div className="profile-card">
          <div className="profile-row">
            <IonIcon icon={mailOutline} className="profile-row-icon" />
            <div className="profile-row-info">
              <span className="profile-row-label">Email</span>
              <span className="profile-row-value">{user?.email}</span>
            </div>
          </div>

          <div className="profile-divider" />

          <div className="profile-row">
            <IonIcon icon={shieldOutline} className="profile-row-icon" />
            <div className="profile-row-info">
              <span className="profile-row-label">Rol</span>
              <span className="profile-row-value">
                {user?.rol === "admin" ? "Administrador" : "Operario"}
              </span>
            </div>
          </div>
        </div>

        <div className="profile-logout">
          <IonButton
            expand="block"
            className="profile-logout-btn"
            onClick={logout}
          >
            <IonIcon icon={logOutOutline} slot="start" />
            Cerrar sesión
          </IonButton>
        </div>

      </IonContent>
    </IonPage>
  );
};

export default Profile;
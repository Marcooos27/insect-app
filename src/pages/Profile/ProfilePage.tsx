import { IonPage, IonContent, IonButton } from "@ionic/react";
import { useAuth } from "../../context/AuthContext";
import "./ProfilePage.css";

const Profile: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <IonPage>
      <IonContent className="ion-padding profile-container">
        <h2 className="profile-title">Perfil</h2>

        <p className="profile-text">Email: {user?.email}</p>
        <p className="profile-text">Rol: {user?.rol}</p>

        <IonButton expand="full" color="danger" onClick={logout}>
          Cerrar sesión
        </IonButton>
      </IonContent>
    </IonPage>
  );
};

export default Profile;


import { useState } from "react";
import {
  IonPage, IonContent, IonInput, IonButton, IonSelect,
  IonSelectOption, IonToast, IonIcon,
} from "@ionic/react";
import { mailOutline, lockClosedOutline, personOutline, shieldOutline, keyOutline, leafOutline, chevronDownOutline } from "ionicons/icons";
import { useHistory } from "react-router";
import api from "../../services/api";
import "./LoginPage.css";

const Register: React.FC = () => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const history = useHistory();

  const handleRegister = async () => {
    if (!email || !username || !password || !rol) {
      setToastMsg("Rellena todos los campos");
      return;
    }

    try {
      await api.post("/auth/register", {
        email,
        username,
        password,
        rol,
        admin_password: adminPassword,
      });

      setToastMsg("Usuario creado correctamente. Vuelve al login.");
      setTimeout(() => history.push("/login"), 2000);
    } catch (err: any) {
      setToastMsg(err.response?.data?.detail || "Error creando usuario");
    }
  };

  return (
    <IonPage>
      <IonContent className="login-content">
        <div className="login-container">

          <div className="login-header">
            <IonIcon icon={leafOutline} className="login-logo-icon" />
            <h1 className="login-title">InsectEat</h1>
            <p className="login-subtitle">Crear cuenta nueva</p>
          </div>

          <div className="login-form">

            <div className="login-field">
              <IonIcon icon={mailOutline} className="login-field-icon" />
              <IonInput label="Email" labelPlacement="floating" type="email"
                value={email} onIonChange={e => setEmail(e.detail.value!)} className="login-input" />
            </div>

            <div className="login-field">
              <IonIcon icon={personOutline} className="login-field-icon" />
              <IonInput label="Nombre de usuario" labelPlacement="floating"
                value={username} onIonChange={e => setUsername(e.detail.value!)} className="login-input" />
            </div>

            <div className="login-field">
              <IonIcon icon={lockClosedOutline} className="login-field-icon" />
              <IonInput label="Contraseña" labelPlacement="floating" type="password"
                value={password} onIonChange={e => setPassword(e.detail.value!)} className="login-input" />
            </div>

            <div className="login-field">
              <IonIcon icon={shieldOutline} className="login-field-icon" />
              <IonSelect label="Selecciona un rol" labelPlacement="floating"
                value={rol} onIonChange={e => setRol(e.detail.value)}
                className="login-select" toggleIcon={chevronDownOutline} interface="popover">
                <IonSelectOption value="user">Operario</IonSelectOption>
                <IonSelectOption value="admin">Administrador</IonSelectOption>
              </IonSelect>
            </div>

            <div className="login-field">
              <IonIcon icon={keyOutline} className="login-field-icon" />
              <IonInput label="Contraseña de administrador" labelPlacement="floating" type="password"
                onIonChange={e => setAdminPassword(e.detail.value!)} className="login-input" />
            </div>

            <IonButton expand="block" className="login-btn-primary" onClick={handleRegister}>
              Crear cuenta
            </IonButton>

            <IonButton expand="block" fill="clear" className="login-btn-secondary"
              onClick={() => history.push("/login")}>
              Volver al login
            </IonButton>

          </div>
        </div>

        <IonToast isOpen={!!toastMsg} message={toastMsg} duration={2000} onDidDismiss={() => setToastMsg("")} />
      </IonContent>
    </IonPage>
  );
};

export default Register;
import { useState } from "react";
import {
  IonPage,
  IonContent,
  IonInput,
  IonButton,
  IonSelect,
  IonSelectOption,
  IonToast,
  IonIcon,
} from "@ionic/react";
import { mailOutline, lockClosedOutline, personOutline, shieldOutline, keyOutline, leafOutline } from "ionicons/icons";
import { useHistory } from "react-router";
import "./LoginPage.css";

const Register: React.FC = () => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState("user");
  const [toastMsg, setToastMsg] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const history = useHistory();

  const handleRegister = async () => {
    if (!email || !username || !password || !rol) {
      setToastMsg("Rellena todos los campos");
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password, rol, admin_password: adminPassword }),
      });

      if (!res.ok) {
        const data = await res.json();
        setToastMsg(data.detail || "Error creando usuario");
        return;
      }

      setToastMsg("Usuario creado correctamente. Vuelve al login.");
      setTimeout(() => history.push("/login"), 2000);

    } catch (err) {
      console.error(err);
      setToastMsg("Error conectando con el backend");
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
              <IonInput
                type="email"
                placeholder="Email"
                value={email}
                onIonChange={e => setEmail(e.detail.value!)}
                className="login-input"
              />
            </div>

            <div className="login-field">
              <IonIcon icon={personOutline} className="login-field-icon" />
              <IonInput
                placeholder="Nombre de usuario"
                value={username}
                onIonChange={e => setUsername(e.detail.value!)}
                className="login-input"
              />
            </div>

            <div className="login-field">
              <IonIcon icon={lockClosedOutline} className="login-field-icon" />
              <IonInput
                type="password"
                placeholder="Contraseña"
                value={password}
                onIonChange={e => setPassword(e.detail.value!)}
                className="login-input"
              />
            </div>

            <div className="login-field">
              <IonIcon icon={shieldOutline} className="login-field-icon" />
              <IonSelect
                value={rol}
                placeholder="Selecciona un rol"
                onIonChange={e => setRol(e.detail.value)}
                className="login-select"
              >
                <IonSelectOption value="user">Operario</IonSelectOption>
                <IonSelectOption value="admin">Administrador</IonSelectOption>
              </IonSelect>
            </div>

            <div className="login-field">
              <IonIcon icon={keyOutline} className="login-field-icon" />
              <IonInput
                type="password"
                placeholder="Contraseña de administrador"
                onIonChange={e => setAdminPassword(e.detail.value!)}
                className="login-input"
              />
            </div>

            <IonButton
              expand="block"
              className="login-btn-primary"
              onClick={handleRegister}
            >
              Crear cuenta
            </IonButton>

            <IonButton
              expand="block"
              fill="clear"
              className="login-btn-secondary"
              onClick={() => history.push("/login")}
            >
              Volver al login
            </IonButton>

          </div>

        </div>

        <IonToast
          isOpen={!!toastMsg}
          message={toastMsg}
          duration={2000}
          onDidDismiss={() => setToastMsg("")}
        />

      </IonContent>
    </IonPage>
  );
};

export default Register;
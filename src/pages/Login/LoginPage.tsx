import { useState } from "react";
import {
  IonPage,
  IonContent,
  IonInput,
  IonButton,
  IonIcon,
} from "@ionic/react";
import { mailOutline, lockClosedOutline, leafOutline } from "ionicons/icons";
import { useAuth } from "../../context/AuthContext";
import { useHistory } from "react-router";
import "./LoginPage.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { login } = useAuth();
  const history = useHistory();

  const handleLogin = async () => {
    const ok = await login(email, password);
    if (ok) history.push("/home");
    else alert("Login incorrecto");
  };

  return (
    <IonPage>
      <IonContent className="login-content">

        <div className="login-container">

          {/* Logo / título */}
          <div className="login-header">
            <IonIcon icon={leafOutline} className="login-logo-icon" />
            <h1 className="login-title">InsectEat</h1>
            <p className="login-subtitle">Gestión de producción</p>
          </div>

          {/* Formulario */}
          <div className="login-form">

            <div className="login-field">
              <IonIcon icon={mailOutline} className="login-field-icon" />
              <IonInput
                label="Email" // Texto que va a flotar
                labelPlacement="floating" //Activo el efecto de flotar
                type="email"
                value={email}
                onIonChange={e => setEmail(e.detail.value!)}
                className="login-input"
              />
            </div>

            <div className="login-field">
              <IonIcon icon={lockClosedOutline} className="login-field-icon" />
              <IonInput
                label="Contraseña"
                labelPlacement="floating"
                type="password"
                value={password}
                onIonChange={e => setPassword(e.detail.value!)}
                className="login-input"
              />
            </div>

            <IonButton
              expand="block"
              className="login-btn-primary"
              onClick={handleLogin}
            >
              Iniciar sesión
            </IonButton>

            <IonButton
              expand="block"
              fill="clear"
              className="login-btn-secondary"
              onClick={() => history.push("/register")}
            >
              Crear cuenta nueva
            </IonButton>

          </div>

        </div>

      </IonContent>
    </IonPage>
  );
};

export default Login;
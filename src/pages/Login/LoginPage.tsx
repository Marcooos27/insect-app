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
import logo from "./LogoInsectEAT.png";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { login } = useAuth();
  const history = useHistory();

  const handleLogin = async () => {
    console.log("LOGIN CLICK - Intentando entrar con:", email); // LOG 1: Ver si el botón funciona

    try {
      const ok = await login(email, password);
      
      console.log("RESULTADO LOGIN:", ok); // LOG 2: Ver si el contexto devuelve true o false

      if (ok) {
        console.log("Login exitoso, redirigiendo...");
        history.push("/home");
      } else {
        console.warn("Login incorrecto: Las credenciales no coinciden");
        alert("Login incorrecto");
      }
    } catch (error) {
      console.error("ERROR LOGIN:", JSON.stringify(error, null, 2)); // LOG 3: Ver si la conexión falló
    }
  };

  return (
    <IonPage>
      <IonContent className="login-content">

        <div className="login-container">

          {/* Logo / título */}
          <div className="login-header">

            <img
              src={logo}
              alt="InsectEat Logo"
              className="login-logo"
            />
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
                onIonInput={e => setEmail((e.target as HTMLIonInputElement).value as string)}
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
                onIonInput={e => setPassword((e.target as HTMLIonInputElement).value as string)}
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
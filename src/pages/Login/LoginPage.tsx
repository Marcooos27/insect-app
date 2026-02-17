import { useState } from "react";
import {
  IonPage,
  IonContent,
  IonInput,
  IonButton,
  IonItem,
  IonLabel
} from "@ionic/react";

import { useAuth } from "../../context/AuthContext";
import { useHistory } from "react-router";

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

  const handleRegister = async () => {

    history.push("/register");
  };

  return (
    <IonPage>
      <IonContent className="ion-padding">

        <IonItem>
          <IonLabel position="floating">Email</IonLabel>
          <IonInput onIonChange={e => setEmail(e.detail.value!)} />
        </IonItem>

        <IonItem>
          <IonLabel position="floating">Password</IonLabel>
          <IonInput
            type="password"
            onIonChange={e => setPassword(e.detail.value!)}
          />
        </IonItem>

        <IonButton expand="full" onClick={handleLogin}>
          Login
        </IonButton>

        <IonButton expand="full" onClick={handleRegister}>
          Register
        </IonButton>

      </IonContent>
    </IonPage>
  );
};

export default Login;

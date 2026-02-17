import { useState } from "react";
import {
  IonPage,
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonSelect,
  IonSelectOption,
  IonToast
} from "@ionic/react";

import { useHistory } from "react-router";

const Register: React.FC = () => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState("user"); // por defecto
  const [toastMsg, setToastMsg] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const history = useHistory();

  const handleRegister = async () => {
    if (!email || !username || !password || !rol) {
      setToastMsg("Rellena todos los campos");
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/auth/register", {
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
      // opcional: redirigir automáticamente después de 2 seg
      setTimeout(() => history.push("/login"), 2000);

    } catch (err) {
      console.error(err);
      setToastMsg("Error conectando con el backend");
    }
  };

  return (
    <IonPage>
      <IonContent className="ion-padding">

        <h2>Crear Usuario</h2>

        <IonItem>
          <IonLabel position="floating">Email</IonLabel>
          <IonInput
            value={email}
            onIonChange={e => setEmail(e.detail.value!)}
          />
        </IonItem>

        <IonItem>
          <IonLabel position="floating">Nombre de Usuario</IonLabel>
          <IonInput
            value={username}
            onIonChange={e => setUsername(e.detail.value!)}
          />
        </IonItem>

        <IonItem>
          <IonLabel position="floating">Contraseña</IonLabel>
          <IonInput
            type="password"
            value={password}
            onIonChange={e => setPassword(e.detail.value!)}
          />
        </IonItem>

        <IonItem>
          <IonLabel>Rol</IonLabel>
          <IonSelect
            value={rol}
            placeholder="Selecciona un rol"
            onIonChange={e => setRol(e.detail.value)}
          >
            <IonSelectOption value="user">Usuario</IonSelectOption>
            <IonSelectOption value="admin">Administrador</IonSelectOption>
          </IonSelect>
        </IonItem>

        <IonItem>
          <IonLabel position="floating">Contraseña de Administrador</IonLabel>
          <IonInput
            type="password"
            onIonChange={e => setAdminPassword(e.detail.value!)}
          />
        </IonItem>


        <IonButton expand="full" onClick={handleRegister}>
          Crear Usuario
        </IonButton>

        <IonButton expand="full" fill="outline" onClick={() => history.push("/login")}>
          Volver al Login
        </IonButton>

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

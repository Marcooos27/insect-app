import React, { useState } from "react";
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle,
  IonInput, IonTextarea, IonButton, IonToast, IonIcon
} from "@ionic/react";
import { warningOutline } from "ionicons/icons";
import { API_URL } from "../../services/api";
import "./InicidenciasPage.css";

const apiFetch = async (path: string, options: RequestInit = {}) => {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const data = await res.json();

  if (!res.ok) throw new Error(data.detail || "Error");

  return data;
};

const IncidenciasPage: React.FC = () => {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");

  const [toast, setToast] = useState("");
  const [color, setColor] = useState<"success" | "danger">("success");

  const enviarIncidencia = async () => {
    if (!titulo || !descripcion) {
      setToast("Completa todos los campos");
      setColor("danger");
      return;
    }

    try {
      await apiFetch("/incidencias", {
        method: "POST",
        body: JSON.stringify({
          titulo,
          descripcion,
        }),
      });

      setTitulo("");
      setDescripcion("");

      setToast("Incidencia enviada correctamente");
      setColor("success");

    } catch (err: any) {
      setToast(err.message);
      setColor("danger");
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>
            <IonIcon icon={warningOutline} style={{ marginRight: 8 }} />
            Incidencias
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="incidencias-content">

        <div className="incidencias-container">

          <IonInput
            value={titulo}
            placeholder="Título de la incidencia"
            onIonChange={(e) => setTitulo(e.detail.value!)}
          />

          <IonTextarea
            value={descripcion}
            placeholder="Describe el problema..."
            onIonChange={(e) => setDescripcion(e.detail.value!)}
          />

          <IonButton expand="block" color="danger" onClick={enviarIncidencia}>
            Enviar incidencia
          </IonButton>

        </div>

        <IonToast
          isOpen={!!toast}
          message={toast}
          duration={2500}
          color={color}
          onDidDismiss={() => setToast("")}
        />

      </IonContent>
    </IonPage>
  );
};

export default IncidenciasPage;
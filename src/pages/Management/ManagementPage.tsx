/*

import React from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonIcon
} from "@ionic/react";
import { people, cube, cart, layers, settings } from "ionicons/icons";
import { useHistory } from "react-router-dom";

const ManagementPage: React.FC = () => {
  const history = useHistory();

  const goTo = (path: string) => {
    history.push(path);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Gestión</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList>
          <IonItem button onClick={() => goTo("/management/clientes")}>
            <IonIcon slot="start" icon={people} />
            <IonLabel>Clientes</IonLabel>
          </IonItem>
          <IonItem button onClick={() => goTo("/management/pedidos")}>
            <IonIcon slot="start" icon={cart} />
            <IonLabel>Pedidos</IonLabel>
          </IonItem>
          <IonItem button onClick={() => goTo("/management/operarios")}>
            <IonIcon slot="start" icon={people} />
            <IonLabel>Operarios</IonLabel>
          </IonItem>
          <IonItem button onClick={() => goTo("/management/lotes")}>
            <IonIcon slot="start" icon={layers} />
            <IonLabel>Lotes</IonLabel>
          </IonItem>
          <IonItem button onClick={() => goTo("/management/incubacion")}>
            <IonIcon slot="start" icon={cube} />
            <IonLabel>Incubación</IonLabel>
          </IonItem>
          <IonItem button onClick={() => goTo("/management/otros")}>
            <IonIcon slot="start" icon={settings} />
            <IonLabel>Otros</IonLabel>
          </IonItem>
        </IonList>
      </IonContent>
    </IonPage>
  );
};

export default ManagementPage;


*/








import React from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonIcon
} from "@ionic/react";
import { people, cube, cart, layers, settings, leaf } from "ionicons/icons";
import { useHistory } from "react-router-dom";
import "./ManagementPage.css";

const secciones = [
  {
    path: "/management/clientes",
    icon: people,
    titulo: "Clientes",
    descripcion: "Gestiona tus clientes"
  },
  {
    path: "/management/pedidos",
    icon: cart,
    titulo: "Pedidos",
    descripcion: "Gestiona los pedidos"
  },
  {
    path: "/management/operarios",
    icon: people,
    titulo: "Operarios",
    descripcion: "Gestiona el equipo"
  },
  {
    path: "/management/lotes",
    icon: layers,
    titulo: "Lotes",
    descripcion: "Control de lotes"
  },
  {
    path: "/management/incubacion",
    icon: cube,
    titulo: "Incubación",
    descripcion: "Control de incubación"
  },
  {
    path: "/management/otros",
    icon: settings,
    titulo: "Otros",
    descripcion: "Configuración adicional"
  }
];

const ManagementPage: React.FC = () => {
  const history = useHistory();

  return (
    <IonPage className="management-page">
      {/*
      <IonHeader>
        <IonToolbar className="management-toolbar">
          <IonTitle className="management-title">Gestión</IonTitle>
        </IonToolbar>
      </IonHeader>*/}

      <IonContent className="management-content">
        <div className="management-grid">
          {secciones.map((s) => (
            <div
              key={s.path}
              className="management-card"
              onClick={() => history.push(s.path)}
            >
              <div className="management-card-icon">
                <IonIcon icon={s.icon} />
              </div>
              <h3 className="management-card-titulo">{s.titulo}</h3>
              <p className="management-card-descripcion">{s.descripcion}</p>
            </div>
          ))}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ManagementPage;
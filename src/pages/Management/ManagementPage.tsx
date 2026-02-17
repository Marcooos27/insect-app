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

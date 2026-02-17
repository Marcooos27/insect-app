import React, { useState } from "react";
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonDatetime,
} from "@ionic/react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pedido: any) => void;
}

const PedidoFormModal: React.FC<Props> = ({ isOpen, onClose, onSave }) => {
  const [id_pedido, setIdPedido] = useState("");
  const [id_cliente, setIdCliente] = useState("");
  const [estado, setEstado] = useState("");
  const [tipo_producto, setTipoProducto] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [fecha_entrega, setFechaEntrega] = useState("");
  const [fecha_prevista, setFechaPrevista] = useState("");
  const [logistica, setLogistica] = useState("");

  const handleSubmit = () => {
    const pedido = {
      id_pedido: Number(id_pedido),
      id_cliente: Number(id_cliente),
      estado,
      tipo_producto,
      cantidad: Number(cantidad),
      fecha_entrega,
      fecha_prevista,
      logistica,
    };

    onSave(pedido); // Enviamos el pedido al manager
    onClose(); // Cerramos modal
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Crear Pedido</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>Cerrar</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">

        <IonItem>
          <IonLabel position="stacked">ID Pedido</IonLabel>
          <IonInput
            type="number"
            value={id_pedido}
            onIonChange={e => setIdPedido(e.detail.value!)}
          />
        </IonItem>

        <IonItem>
          <IonLabel position="stacked">ID Cliente</IonLabel>
          <IonInput
            type="number"
            value={id_cliente}
            onIonChange={e => setIdCliente(e.detail.value!)}
          />
        </IonItem>

        <IonItem>
          <IonLabel position="stacked">Estado</IonLabel>
          <IonInput
            value={estado}
            onIonChange={e => setEstado(e.detail.value!)}
          />
        </IonItem>

        <IonItem>
          <IonLabel position="stacked">Tipo Producto</IonLabel>
          <IonSelect
            value={tipo_producto}
            placeholder="Seleccionar"
            onIonChange={e => setTipoProducto(e.detail.value)}
          >
            <IonSelectOption value="almacen">Almacén</IonSelectOption>
            <IonSelectOption value="engorde">Engorde</IonSelectOption>
            <IonSelectOption value="procesado">Procesado</IonSelectOption>
            <IonSelectOption value="incubacion">Incubación</IonSelectOption>
            <IonSelectOption value="reproduccion">Reproducción</IonSelectOption>
            <IonSelectOption value="especial">Especial</IonSelectOption>
          </IonSelect>
        </IonItem>

        <IonItem>
          <IonLabel position="stacked">Cantidad</IonLabel>
          <IonInput
            type="number"
            value={cantidad}
            onIonChange={e => setCantidad(e.detail.value!)}
          />
        </IonItem>

        <IonItem>
          <IonLabel position="stacked">Fecha Entrega</IonLabel>
          <IonDatetime
            presentation="date"
            value={fecha_entrega}
            onIonChange={e => setFechaEntrega(e.detail.value as string)}
          />
        </IonItem>

        <IonItem>
          <IonLabel position="stacked">Fecha Prevista</IonLabel>
          <IonDatetime
            presentation="date"
            value={fecha_prevista}
            onIonChange={e => setFechaPrevista(e.detail.value as string)}
          />
        </IonItem>

        <IonItem>
          <IonLabel position="stacked">Logística</IonLabel>
          <IonInput
            value={logistica}
            onIonChange={e => setLogistica(e.detail.value!)}
          />
        </IonItem>

        <IonButton expand="block" className="ion-margin-top" onClick={handleSubmit}>
          Crear Pedido
        </IonButton>

      </IonContent>
    </IonModal>
  );
};

export default PedidoFormModal;

import React, { useEffect, useState } from "react";
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonList, IonItem, IonLabel, IonIcon
} from "@ionic/react";
import { add, trash } from "ionicons/icons";
import api from "../../services/api";
import PedidoFormModal from "./PedidoFormModal";

const PedidosManager = () => {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);

  const loadPedidos = async () => {
    try {
      const res = await api.get("/pedido");
      setPedidos(res.data);
    } catch (err) {
      console.error("Error cargando pedidos:", err);
    }
  };

  useEffect(() => {
    loadPedidos();
  }, []);

  const handleSavePedido = async (pedido: any) => {
    try {
      await api.post("/pedido", pedido);
      loadPedidos();
    } catch (err) {
      console.error("Error insertando pedido:", err);
      alert("Error insertando pedido");
    }
  };

  const deletePedido = async (id: number) => {
    try {
      await api.delete(`/pedido/${id}`);
      loadPedidos();
    } catch (err) {
      console.error("Error eliminando pedido:", err);
    }
  };

  return (
    <IonPage className="pedidos-page">
      <IonHeader>
        <IonToolbar>
          <IonTitle>Gestión de Pedidos</IonTitle>
          <IonButton slot="end" onClick={() => setShowModal(true)}>
            <IonIcon icon={add} />
          </IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonList>
          {pedidos.map(p => (
            <IonItem key={p.id_pedido}>
              <IonLabel>
                <h2>Pedido #{p.id_pedido}</h2>
                <p>Cliente: {p.id_cliente}</p>
                <p>Estado: {p.estado}</p>
                <p>Tipo: {p.tipo_producto}</p>
              </IonLabel>
              <IonButton color="danger" onClick={() => deletePedido(p.id_pedido)}>
                <IonIcon icon={trash} />
              </IonButton>
            </IonItem>
          ))}
        </IonList>

        <PedidoFormModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSave={handleSavePedido}
        />
      </IonContent>
    </IonPage>
  );
};

export default PedidosManager;
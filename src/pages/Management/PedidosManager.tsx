import React, { useEffect, useState } from "react";
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonList, IonItem, IonLabel, IonIcon
} from "@ionic/react";
import { add, trash } from "ionicons/icons";
import PedidoFormModal from "./PedidoFormModal";

const PedidosManager = () => {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);

  const loadPedidos = async () => {
    const res = await fetch("http://127.0.0.1:8000/pedido");
    const data = await res.json();
    setPedidos(data);
  };

  useEffect(() => {
    loadPedidos();
  }, []);

  const handleSavePedido = async (pedido: any) => {
    try {
      const response = await fetch("http://127.0.0.1:8000/pedido", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pedido),
      });

      if (!response.ok) {
        console.error(await response.text());
        alert("Error insertando pedido");
        return;
      }

      loadPedidos(); // recargar lista
    } catch (error) {
      console.error(error);
    }
  };

  const deletePedido = async (id: number) => {
    await fetch(`http://127.0.0.1:8000/pedido/${id}`, { method: "DELETE" });
    loadPedidos();
  };

  return (
    <IonPage>
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
          {pedidos.map((p) => (
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

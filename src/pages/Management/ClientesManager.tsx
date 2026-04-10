import React, { useState, useEffect } from "react";
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonIcon, IonList, IonItem,
  IonLabel, IonSpinner, IonAlert
} from "@ionic/react";
import { add, create, trash } from "ionicons/icons";
import api from "../../services/api";
import "./ClientesManager.css";

interface Cliente {
  id_cliente: number;
  nombre: string;
  telefono?: string;
  direccion?: string;
  pedido?: string;
  satisfaccion?: string;
}

type ClienteNuevo = Omit<Cliente, "id_cliente">;

const ClientesManager: React.FC = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [showAlert, setShowAlert] = useState(false);
  const [showAddAlert, setShowAddAlert] = useState(false);
  const [alertKey, setAlertKey] = useState(0);

  useEffect(() => {
    api.get("/cliente")
      .then(res => {
        setClientes(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error cargando clientes:", err);
        setLoading(false);
      });
  }, []);

  const getNextId = () => {
    if (clientes.length === 0) return 1;
    const ids = clientes.map(c => c.id_cliente);
    let nextId = 1;
    while (ids.includes(nextId)) nextId++;
    return nextId;
  };

  const handleCreate = (nuevo: ClienteNuevo) => {
    const nuevoCliente: Cliente = { id_cliente: getNextId(), ...nuevo };

    api.post("/cliente", nuevoCliente)
      .then(() => {
        setClientes([...clientes, nuevoCliente]);
        setShowAddAlert(false);
        setAlertKey(k => k + 1);
      })
      .catch(err => console.error("Error creando cliente:", err));
  };

  const handleDelete = (id: number) => {
    api.delete(`/cliente/${id}`)
      .then(() => setClientes(clientes.filter(c => c.id_cliente !== id)))
      .catch(err => console.error("Error eliminando cliente:", err));
  };

  const handleUpdate = (cliente: Cliente) => {
    api.put(`/cliente/${cliente.id_cliente}`, cliente)
      .then(() => {
        setClientes(clientes.map(c => c.id_cliente === cliente.id_cliente ? cliente : c));
      })
      .catch(err => console.error("Error actualizando cliente:", err));
  };

  return (
    <IonPage className="clientes-page">
      <IonHeader>
        <IonToolbar>
          <IonTitle>Gestión de Clientes</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setShowAddAlert(true)}>
              <IonIcon icon={add} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {loading ? (
          <div className="ion-text-center ion-padding">
            <IonSpinner />
            <p>Cargando clientes...</p>
          </div>
        ) : (
          <IonList>
            {clientes.map(cliente => (
              <IonItem key={cliente.id_cliente}>
                <IonLabel>
                  <h2>{cliente.nombre}</h2>
                  <p>{cliente.telefono}</p>
                </IonLabel>
                <IonButton slot="end" fill="clear" onClick={() => { setSelectedCliente(cliente); setShowAlert(true); }}>
                  <IonIcon icon={create} />
                </IonButton>
                <IonButton slot="end" fill="clear" color="danger" onClick={() => handleDelete(cliente.id_cliente)}>
                  <IonIcon icon={trash} />
                </IonButton>
              </IonItem>
            ))}
          </IonList>
        )}

        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header="Editar Cliente"
          inputs={[
            { name: "nombre", type: "text", placeholder: "Nombre", value: selectedCliente?.nombre },
            { name: "telefono", type: "text", placeholder: "Teléfono", value: selectedCliente?.telefono },
            { name: "direccion", type: "text", placeholder: "Dirección", value: selectedCliente?.direccion },
            { name: "pedido", type: "text", placeholder: "Pedido", value: selectedCliente?.pedido },
            { name: "satisfaccion", type: "text", placeholder: "Satisfacción", value: selectedCliente?.satisfaccion },
          ]}
          buttons={[
            { text: "Cancelar", role: "cancel" },
            {
              text: "Guardar",
              handler: (data) => {
                if (selectedCliente) handleUpdate({ ...selectedCliente, ...data });
              },
            },
          ]}
        />

        <IonAlert
          key={alertKey}
          isOpen={showAddAlert}
          onDidDismiss={() => setShowAddAlert(false)}
          header="Nuevo Cliente"
          inputs={[
            { name: "nombre", type: "text", placeholder: "Nombre" },
            { name: "telefono", type: "text", placeholder: "Teléfono" },
            { name: "direccion", type: "text", placeholder: "Dirección" },
            { name: "pedido", type: "text", placeholder: "Pedido" },
            { name: "satisfaccion", type: "text", placeholder: "Satisfacción" },
          ]}
          buttons={[
            { text: "Cancelar", role: "cancel" },
            {
              text: "Añadir",
              handler: (data) => handleCreate(data),
            },
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default ClientesManager;
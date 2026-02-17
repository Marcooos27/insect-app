import React, { useState, useEffect } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonSpinner,
  IonAlert
} from "@ionic/react";
import { add, create, trash } from "ionicons/icons";
import "./ClientesManager.css";

interface Cliente {
  id_cliente: number;
  nombre: string;
  telefono?: string;
  direccion?: string;
  pedido?: string;
  satisfaccion?: string;
}

// Nuevo cliente SIN id_cliente
type ClienteNuevo = Omit<Cliente, "id_cliente">;


const ClientesManager: React.FC = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [showAlert, setShowAlert] = useState(false);
  const [showAddAlert, setShowAddAlert] = useState(false);
  const [alertKey, setAlertKey] = useState(0);

  // Cargar clientes desde tu backend
  useEffect(() => {
    fetch("http://localhost:8000/cliente") // 👈 endpoint de FastAPI
      .then((res) => res.json())
      .then((data) => {
        setClientes(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error cargando clientes:", err);
        setLoading(false);
      });
  }, []);

  const handleAdd = () => {
    setShowAddAlert(true);
  };

  const getNextId = () => {
    if (clientes.length === 0) return 1;
    const ids = clientes.map((c) => c.id_cliente);
    let nextId = 1;
    while (ids.includes(nextId)) {
      nextId++;
    }
    return nextId;
};

  const handleCreate = (nuevo: ClienteNuevo) => {
    const nuevoCliente: Cliente = { id_cliente: getNextId(), ...nuevo };

    fetch("http://localhost:8000/cliente", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nuevoCliente),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Error insertando cliente");
        return res.json();
      })
      .then(() => {
        setClientes([...clientes, nuevoCliente]);
        setShowAddAlert(false);
        setAlertKey((k) => k + 1);
      })
      .catch((err) => console.error(err));
  };

  const handleEdit = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setShowAlert(true);
  };

  const handleDelete = (id: number) => {
    fetch(`http://localhost:8000/cliente/${id}`, { method: "DELETE" })
      .then((res) => {
        if (res.ok) {
          setClientes(clientes.filter((c) => c.id_cliente !== id));
        }
      })
      .catch((err) => console.error("Error eliminando cliente:", err));
  };

  const handleUpdate = (cliente: Cliente) => {
    fetch(`http://localhost:8000/cliente/${cliente.id_cliente}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cliente),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("Cliente actualizado:", data);
        setClientes(clientes.map((c) => (c.id_cliente === cliente.id_cliente ? cliente : c)));
      })
      .catch((err) => console.error("Error actualizando cliente:", err));
  };

  return (
    <IonPage className="clientes-page">
      <IonHeader>
        <IonToolbar>
          <IonTitle>Gestión de Clientes</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleAdd}>
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
            {clientes.map((cliente) => (
              <IonItem key={cliente.id_cliente}>
                <IonLabel>
                  <h2>{cliente.nombre}</h2>
                  <p>{cliente.telefono}</p>
                </IonLabel>
                <IonButton
                  slot="end"
                  fill="clear"
                  onClick={() => handleEdit(cliente)}
                >
                  <IonIcon icon={create} />
                </IonButton>
                <IonButton
                  slot="end"
                  fill="clear"
                  color="danger"
                  onClick={() => handleDelete(cliente.id_cliente)}
                >
                  <IonIcon icon={trash} />
                </IonButton>
              </IonItem>
            ))}
          </IonList>
        )}

        {/* Modal de edición con IonAlert */}
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
                if (selectedCliente) {
                  const updatedCliente: Cliente = { ...selectedCliente, ...data };
                  handleUpdate(updatedCliente);
                }
              },
            },
          ]}
        />

        {/* ALERTA PARA CREAR */}
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
              handler: (data) => {
                handleCreate({
                  nombre: data.nombre,
                  telefono: data.telefono,
                  direccion: data.direccion,
                  pedido: data.pedido,
                  satisfaccion: data.satisfaccion,
                });
              },
            },
          ]}
        />

      </IonContent>
    </IonPage>
  );
};

export default ClientesManager;

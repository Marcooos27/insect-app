import React, { useContext, useState } from "react";
import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonAlert,
} from "@ionic/react";
import { add, create, trash } from "ionicons/icons";
import { OperarioContext } from "../../context/OperarioContext";
import "./OperariosManager.css";

interface Operario {
  id_operario: number;
  nombre: string;
  turno_trabajo: string;
}

const OperariosManager: React.FC = () => {
  const { 
    operarios, 
    addOperario, 
    deleteOperario,
    updateOperario,
   } = useContext(OperarioContext);

  const [showAddAlert, setShowAddAlert] = useState(false);
  const [showEditAlert, setShowEditAlert] = useState(false);
  const [selectedOperario, setSelectedOperario] = useState<Operario | null>(null);
  
  const [nombre, setNombre] = useState("");
  const [turno, setTurno] = useState("");


  const capitalize = (str: string) => {
    if (!str) return "";
    return str[0].toUpperCase() + str.slice(1).toLowerCase();
  };



  return (
    <IonPage className="operarios-page">
      <IonHeader>
        <IonToolbar className="header-toolbar">
          <IonTitle>Operarios</IonTitle>

          <IonButtons slot="end">
            <IonButton 
              className="add-button"
              onClick={() => { setSelectedOperario(null); setShowAddAlert(true); }}
            >
              <IonIcon icon={add} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonList>
          {operarios.map((op) => (
            <IonItem key={op.id_operario}>
              <IonLabel>
                <h2>{op.nombre}</h2>
                <p>Turno: {op.turno_trabajo}</p>
              </IonLabel>

              <IonButton
                slot="end"
                fill="clear"
                className="edit-button"
                onClick={() => { setSelectedOperario(op); setShowEditAlert(true); }}
              >
                <IonIcon icon={create} />
              </IonButton>


              <IonButton
                slot="end"
                fill="clear"
                color="danger"
                onClick={() => deleteOperario(op.id_operario)}
              >
                <IonIcon icon={trash} />
              </IonButton>
            </IonItem>
          ))}
        </IonList>

        {/* ALERTA PARA CREAR */}
        <IonAlert
          isOpen={showAddAlert}
          onDidDismiss={() => setShowAddAlert(false)}
          header="Nuevo Operario"
          inputs={[
            { name: "nombre", type: "text", placeholder: "Nombre" },
            { name: "turno", type: "text", placeholder: "Turno" },
          ]}
          buttons={[
            { text: "Cancelar", role: "cancel" },
            {
              text: "Añadir",
              handler: async (data: { nombre: string; turno: string }) => {
                const validTurnos = ["mañana", "tarde", "noche"];
                const turnoLower = data.turno.toLowerCase();

                if (!validTurnos.includes(turnoLower)) {
                  window.alert("Debes escribir una de estas opciones: mañana, tarde o noche");
                  return false; // cancelar el cierre del alert
                }

                if (!data.nombre.trim()) {
                  window.alert("Debes escribir un nombre");
                  return false;
                }

                try {
                  await addOperario({ nombre: data.nombre, turno_trabajo: capitalize(turnoLower) });
                } catch (err) {
                  window.alert("Error creando operario");
                  return false;
                }
              },
            },
          ]}
        />

        {/* ALERTA PARA EDITAR */}
        <IonAlert
          isOpen={showEditAlert}
          onDidDismiss={() => setShowEditAlert(false)}
          header="Editar Operario"
          inputs={[
            { name: "nombre", type: "text", placeholder: "Nombre", value: selectedOperario?.nombre },
            { name: "turno", type: "text", placeholder: "Turno", value: selectedOperario?.turno_trabajo },
          ]}
          buttons={[
            { text: "Cancelar", role: "cancel" },
            {
              text: "Guardar",
              handler: (data: { nombre: string; turno: string }) => {
                const validTurnos = ["mañana", "tarde", "noche"];
                const turnoLower = data.turno.toLowerCase();

                if (!validTurnos.includes(turnoLower)) {
                  window.alert("Debes escribir una de estas opciones: mañana, tarde o noche");
                  return false; // evitar cerrar la alerta
                }

                if (!data.nombre.trim()) {
                  window.alert("Debes escribir un nombre");
                  return false;
                }
                
                if (selectedOperario) {
                  updateOperario(selectedOperario.id_operario, { nombre: data.nombre, turno_trabajo: capitalize(turnoLower) });
                }
              },
            },
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default OperariosManager;
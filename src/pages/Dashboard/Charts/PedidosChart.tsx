import React, { useEffect } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle,
  IonContent, IonList, IonItem
} from '@ionic/react';

import { useLocation } from 'react-router-dom';
import { useManagement } from '../../../context/ManagementContext'; // 🔥 usamos contexto

const Tab1: React.FC = () => {
  const { clientes, fetchClientes } = useManagement();
  const location = useLocation<{ nuevoCliente?: any }>();

  useEffect(() => {
    fetchClientes(); // 🔥 YA NO HAY FETCH DIRECTO
  }, []);

  // si viene cliente nuevo
  useEffect(() => {
    if (location.state?.nuevoCliente) {
      const nuevo = location.state.nuevoCliente;

      // 🔥 esto ya no hace falta casi, pero lo dejo seguro
      if (!clientes.find((c: any) => c.id_cliente === nuevo.id_cliente)) {
        fetchClientes(); // mejor refrescar desde backend
      }
    }
  }, [location.state]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Clientes</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonList>
          {(Array.isArray(clientes) ? clientes : []).map((c: any, idx: number) => (
            <IonItem key={idx}>
              {c.id_cliente} - {c.nombre} ({c.telefono})
            </IonItem>
          ))}
        </IonList>
      </IonContent>
    </IonPage>
  );
};

export default Tab1;
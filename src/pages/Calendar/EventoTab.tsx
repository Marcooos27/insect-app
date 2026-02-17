import React, { useEffect, useState } from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem } from '@ionic/react';

import { useLocation } from 'react-router-dom';

const Tab1: React.FC = () => {
  const [clientes, setClientes] = useState<any[]>([]);
  const location = useLocation<{ nuevoCliente?: any }>();

  useEffect(() => {
    fetch("http://127.0.0.1:8000/cliente")   // aquí llamas a tu endpoint FastAPI
      .then(res => res.json())
      .then(data => {setClientes(data);})
      .catch(err => console.error("Error cargando clientes:", err));
  }, []);


  // si venimos de Tab2 con un cliente nuevo -> añadirlo a la lista
  useEffect(() => {
    if (location.state?.nuevoCliente) {
      const nuevo = location.state.nuevoCliente;
      setClientes(prev => {
        // evita duplicados (por si el backend lo devuelve al volver a cargar)
        if (!prev.find(c => c.id_cliente === nuevo.id_cliente)) {
          return [...prev, nuevo];
        }
        return prev;
      });
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
          {clientes.map((c, idx) => (
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


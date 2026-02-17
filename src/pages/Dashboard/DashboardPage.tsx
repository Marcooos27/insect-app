import { IonContent, IonHeader, IonPage, IonSegment, IonSegmentButton, IonLabel, IonToolbar, IonTitle } from '@ionic/react';
import React, { useState } from 'react';

import EmpresaDashboard from './EmpresaDashboard';
import FranquiciadoDashboard from './FranquiciadoDashboard';

import CamaraCharts from './Charts/CamarasChart';
import PedidosCharts from './Charts/PedidosChart';
import ProduccionChart from './Charts/ProduccionChart';

const Dashboard: React.FC = () => {
  const [selectedDashboard, setSelectedDashboard] = useState<'empresa' | 'franquiciado'>('empresa');

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Dashboard</IonTitle>
          <IonSegment value={selectedDashboard} onIonChange={e => setSelectedDashboard(e.detail.value as 'empresa' | 'franquiciado')}>
            <IonSegmentButton value="empresa">
              <IonLabel>Empresa</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="franquiciado">
              <IonLabel>Franquiciado</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        {selectedDashboard === 'empresa' && <EmpresaDashboard />}
        {selectedDashboard === 'franquiciado' && <FranquiciadoDashboard />}
      </IonContent>
    </IonPage>
  );
};

export default Dashboard;

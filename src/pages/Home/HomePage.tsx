import "./HomePage.css"
import React, { useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSegment,
  IonSegmentButton,
  IonLabel
} from '@ionic/react';
import TaskList from './TaskList';
import AssignTask from './AssignTask';

const HomePage: React.FC = () => {
  const [selectedSegment, setSelectedSegment] = useState<'list' | 'assign'>('list');

  return (
    <IonPage className="homepage">
      {/* <IonHeader>
        <IonToolbar>
          <IonTitle>MENÚ DE TAREAS</IonTitle>
        </IonToolbar>
      </IonHeader> */}

      <IonContent className="homepage-content">
        {/* Segmento para elegir entre lista y asignar */}
        <IonSegment className="homepage-segment"
          value={selectedSegment}
          onIonChange={(e) => setSelectedSegment(e.detail.value as 'list' | 'assign')}
        >
          <IonSegmentButton value="list" className="segment-button list-button">
            <IonLabel>Tareas asignadas</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="assign" className="segment-button assign-button">
            <IonLabel>Asignar tarea</IonLabel>
          </IonSegmentButton>
        </IonSegment>

        <div className="card-container">
          {/* Render condicional según el segmento */}
          {selectedSegment === 'list' && <TaskList />}
          {selectedSegment === 'assign' && <AssignTask />}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default HomePage;

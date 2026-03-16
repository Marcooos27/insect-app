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
import CompletedTask from './CompletedTask';
import UserTask from './UserTask';

import { useAuth } from "../../context/AuthContext";

type AdminSegments = "list" | "assign" | "completed"

type UserSegments = "retrasadas" | "hoy" | "proximas"

type SegmentType = AdminSegments | UserSegments

const HomePage: React.FC = () => {

  const { user } = useAuth();

  const [selectedSegment, setSelectedSegment] =
    useState<SegmentType>(user?.rol === "admin" ? "list" : "hoy");

  return (
    <IonPage className="homepage">

      <IonContent className="homepage-content">

        <IonSegment
          className="homepage-segment"
          value={selectedSegment}
          onIonChange={(e) => setSelectedSegment(e.detail.value as SegmentType)}
        >

          {user?.rol === "admin" ? (
            <>
              <IonSegmentButton className="homepage-seg-btn" value="list">
                <IonLabel>Tareas asignadas</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton className="homepage-seg-btn" value="assign">
                <IonLabel>Asignar tarea</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton className="homepage-seg-btn" value="completed">
                <IonLabel>Tareas completadas</IonLabel>
              </IonSegmentButton>
            </>
          ) : (
            <>
              <IonSegmentButton className="homepage-seg-btn" value="retrasadas">
                <IonLabel>Tareas Retrasadas</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton className="homepage-seg-btn" value="hoy">
                <IonLabel>Tareas de Hoy</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton className="homepage-seg-btn" value="proximas">
                <IonLabel>Tareas Próximas</IonLabel>
              </IonSegmentButton>
            </>
          )}

        </IonSegment>

        <div className="card-container">

          {user?.rol === "admin" ? (
            <>
              {selectedSegment === "list" && <TaskList />}
              {selectedSegment === "assign" && <AssignTask />}
              {selectedSegment === "completed" && <CompletedTask />}
            </>
          ) : (
            <>
              <UserTask tipo={selectedSegment as "retrasadas" | "hoy" | "proximas"} />
            </>
          )}

        </div>

      </IonContent>
    </IonPage>
  );
};

export default HomePage;

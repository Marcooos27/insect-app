import {
IonCard,
IonCardContent,
IonItem,
IonLabel,
IonSelect,
IonSelectOption,
IonDatetime,
IonButton
} from "@ionic/react";

import { useContext, useState } from "react";
import { TareaContext } from "../../context/TareaContext";
import { OperarioContext } from "../../context/OperarioContext";

const CompletedTasks: React.FC = () => {

  const { tareas } = useContext(TareaContext);
  const { operarios } = useContext(OperarioContext);

  const [operarioFiltro,setOperarioFiltro] = useState<number | null>(null);
  const [fechaFiltro,setFechaFiltro] = useState<string>("");

  const [tareasFiltradas,setTareasFiltradas] = useState<any[]>([]);

  const filtrar = () => {

    let filtradas = tareas.filter(t => t.estado === "Completada");

    if(operarioFiltro){
      filtradas = filtradas.filter(t => t.id_operario === operarioFiltro);
    }

    if(fechaFiltro){
      filtradas = filtradas.filter(t =>
      t.fecha_prevista?.startsWith(fechaFiltro)
      );
    }

    setTareasFiltradas(filtradas);

  };

  return (

  <IonCard>

    <IonCardContent>

      <IonItem>

        <IonLabel>Operario</IonLabel>

        <IonSelect
          value={operarioFiltro}
          onIonChange={e=>setOperarioFiltro(e.detail.value)}
          >

          <IonSelectOption value={null}>Todos</IonSelectOption>

          {operarios.map(op=>(
          <IonSelectOption key={op.id_operario} value={op.id_operario}>
            {op.nombre}
          </IonSelectOption>
          ))}

        </IonSelect>

      </IonItem>


      <IonItem>

        <IonLabel>Día</IonLabel>

        <IonDatetime
        presentation="date"
        value={fechaFiltro}
        onIonChange={e=>setFechaFiltro(e.detail.value as string)}
        />

      </IonItem>

      <IonButton expand="full" onClick={filtrar}>
        Filtrar
      </IonButton>


      {tareasFiltradas.map(t=>(
        <IonItem key={t.id_tarea}>
        <IonLabel>

          <p>{t.tipo_tarea}</p>
          <p>{t.descripcion}</p>

        </IonLabel>
        </IonItem>
      ))}

    </IonCardContent>

  </IonCard>

  );
};

export default CompletedTasks;
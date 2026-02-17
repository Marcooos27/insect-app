import { IonCard, IonCardContent, IonCardHeader, IonCardTitle } from '@ionic/react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import React from 'react';

ChartJS.register(ArcElement, Tooltip, Legend);

interface CamarasChartProps {
  ocupacion: number; // porcentaje de ocupación
}

const CamarasChart: React.FC<CamarasChartProps> = ({ ocupacion }) => {
  const data = {
    labels: ['Ocupado', 'Libre'],
    datasets: [
      {
        data: [ocupacion, 100 - ocupacion],
        backgroundColor: ['#FF6384', '#36A2EB'],
      },
    ],
  };

  return (
    <IonCard
      style={{
        maxWidth: '300px',  // tamaño máximo del card
        margin: '8px auto', // centrado y separación
      }}
    >
      <IonCardHeader>
        <IonCardTitle style={{ fontSize: '1rem' }}>Ocupación de la cámara</IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        <div style={{ height: 150 }}> {/* Contenedor del gráfico con altura fija */}
          <Doughnut
            data={data}
            options={{
              responsive: true,
              maintainAspectRatio: false, // permite que se ajuste al contenedor
            }}
          />
        </div>
      </IonCardContent>
    </IonCard>
  );
};

export default CamarasChart;

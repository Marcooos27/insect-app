import React from 'react';
import CamarasChart from './Charts/CamarasChart';
// Si quieres más gráficos para franquiciados, los puedes importar aquí:
// import PedidosCharts from './Charts/PedidosCharts';
// import ProduccionChart from './Charts/ProduccionChart';

const FranquiciadoDashboard: React.FC = () => {
  // Datos simulados para el franquiciado
  const ocupacionCamaras = 60; // porcentaje, ejemplo diferente al de empresa

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '12px',
        padding: '8px',
      }}
    >
      <CamarasChart ocupacion={ocupacionCamaras} />
      {/* Puedes añadir más charts si quieres: */}
      {/* <PedidosCharts pedidosRealizados={80} /> */}
      {/* <ProduccionChart produccionDiaria={150} /> */}
    </div>
  );
};

export default FranquiciadoDashboard;

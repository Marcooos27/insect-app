import React from 'react';
import CamarasChart from './Charts/CamarasChart';


const EmpresaDashboard: React.FC = () => {
  // SIMULACION DE DATOS
  const ocupacionCamaras = 75; // porcentaje

  return (
    <div>
      <CamarasChart ocupacion={ocupacionCamaras} />
      {/* Aquí puedes añadir PedidosChart y ProduccionChart */}
    </div>
  );
};

export default EmpresaDashboard;

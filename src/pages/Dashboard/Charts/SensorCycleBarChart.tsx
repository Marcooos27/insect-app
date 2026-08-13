import React from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

interface Punto {
  etiqueta: string;
  valor: number;
}

interface SensorCycleBarChartProps {
  titulo: string;
  unidad: string;
  color: string;
  datos: Punto[];
}

const SensorCycleBarChart: React.FC<SensorCycleBarChartProps> = ({ titulo, unidad, color, datos }) => {
  const data = {
    labels: datos.map(d => d.etiqueta),
    datasets: [{
      data: datos.map(d => d.valor),
      backgroundColor: color,
      borderRadius: 2,
      barPercentage: 0.7,
    }],
  };

  return (
    <div className="mini-chart-card">
      <div className="mini-chart-titulo">{titulo} <span className="mini-chart-sub">· ciclo</span></div>
      <div className="mini-chart-box">
        <Bar
          data={data}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.parsed.y}${unidad}` } },
            },
            scales: {
              x: { ticks: { display: false }, grid: { display: false } },
              y: { ticks: { color: "#7a8577", font: { size: 9 } }, grid: { color: "rgba(19,22,15,0.08)" } },
            },
          }}
        />
      </div>
    </div>
  );
};

export default SensorCycleBarChart;

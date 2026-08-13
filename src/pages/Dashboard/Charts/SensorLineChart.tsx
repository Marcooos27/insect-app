import React from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip);

interface Punto {
  etiqueta: string;
  valor: number;
}

interface SensorLineChartProps {
  titulo: string;
  unidad: string;
  color: string;
  datos: Punto[];
  subtitulo?: string;
}

const SensorLineChart: React.FC<SensorLineChartProps> = ({ titulo, unidad, color, datos, subtitulo = "hoy" }) => {
  const data = {
    labels: datos.map(d => d.etiqueta),
    datasets: [{
      data: datos.map(d => d.valor),
      borderColor: color,
      backgroundColor: color,
      pointRadius: 0,
      borderWidth: 1.5,
      tension: 0.35,
    }],
  };

  return (
    <div className="mini-chart-card">
      <div className="mini-chart-titulo">{titulo} <span className="mini-chart-sub">· {subtitulo}</span></div>
      <div className="mini-chart-box">
        <Line
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

export default SensorLineChart;

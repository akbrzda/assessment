<template>
  <div>
    <Bar :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup>
import { computed } from "vue";
import { Bar } from "vue-chartjs";
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, LineElement, CategoryScale, LinearScale, PointElement } from "chart.js";

ChartJS.register(Title, Tooltip, Legend, BarElement, LineElement, CategoryScale, LinearScale, PointElement);

const props = defineProps({
  data: {
    type: Array,
    required: true,
  },
  title: {
    type: String,
    default: "",
  },
});

// Цвета для разных должностей
const colors = [
  "#36a2ebcc", // синий
  "#ff6384cc", // красный
  "#4bc0c0cc", // зеленый
  "#ff9f40cc", // оранжевый
  "#9966ffcc", // фиолетовый
  "#ffcd56cc", // желтый
];

const chartData = computed(() => {
  // Группируем данные по филиалам и должностям
  const branches = [...new Set(props.data.map((item) => item.branch_name))];
  const positions = [...new Set(props.data.map((item) => item.position_name))];

  const datasets = positions.map((position, index) => {
    const data = branches.map((branch) => {
      const item = props.data.find((d) => d.branch_name === branch && d.position_name === position);
      return item ? item.avg_score : null;
    });

    return {
      type: "line",
      label: position,
      data,
      borderColor: colors[index % colors.length],
      backgroundColor: colors[index % colors.length],
      fill: false,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6,
    };
  });

  return {
    labels: branches,
    datasets,
  };
});

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: "top",
      labels: {
        usePointStyle: true,
        padding: 15,
      },
    },
    title: {
      display: !!props.title,
      text: props.title,
    },
    tooltip: {
      enabled: true,
      backgroundColor: "#000000cc",
      padding: 12,
      callbacks: {
        title: (tooltipItems) => {
          return `Филиал: ${tooltipItems[0].label}`;
        },
        label: (context) => {
          const value = context.parsed.y;
          return value !== null ? `${context.dataset.label}: ${value.toFixed(2)}%` : `${context.dataset.label}: нет данных`;
        },
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      max: 100,
      ticks: {
        callback: (value) => `${value}%`,
      },
    },
  },
  interaction: {
    intersect: false,
    mode: "index",
  },
}));
</script>

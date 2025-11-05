<template>
  <div>
    <Bar :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup>
import { computed } from "vue";
import { Bar } from "vue-chartjs";
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from "chart.js";

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

const props = defineProps({
  data: {
    type: Array,
    required: true,
  },
  labelKey: {
    type: String,
    required: true,
  },
  valueKey: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    default: "",
  },
  color: {
    type: String,
    default: "#36a2ebcc",
  },
  // Дополнительные поля для детальной информации
  detailFields: {
    type: Array,
    default: () => [],
  },
});

const chartData = computed(() => ({
  labels: props.data.map((item) => item[props.labelKey]),
  datasets: [
    {
      label: props.title,
      data: props.data.map((item) => item[props.valueKey]),
      backgroundColor: props.color,
      borderColor: props.color.replace("0.8", "1"),
      borderWidth: 1,
    },
  ],
}));

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    title: {
      display: !!props.title,
      text: props.title,
    },
    tooltip: {
      enabled: true,
      backgroundColor: "#000000cc",
      padding: 12,
      titleColor: "#fff",
      bodyColor: "#fff",
      borderColor: "#ffffff33",
      borderWidth: 1,
      callbacks: {
        title: (tooltipItems) => {
          return tooltipItems[0].label;
        },
        label: (context) => {
          const dataIndex = context.dataIndex;
          const item = props.data[dataIndex];
          const lines = [`${props.title || "Значение"}: ${item[props.valueKey].toFixed(2)}%`];

          // Добавляем детальную информацию
          if (props.detailFields.length > 0) {
            props.detailFields.forEach((field) => {
              if (item[field.key] !== undefined && item[field.key] !== null) {
                lines.push(`${field.label}: ${field.format ? field.format(item[field.key]) : item[field.key]}`);
              }
            });
          }

          return lines;
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

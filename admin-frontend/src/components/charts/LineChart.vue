<template>
  <div :style="{ height: `${chartHeight}px` }">
    <Line :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup>
import { computed } from "vue";
import { Line } from "vue-chartjs";
import { Chart as ChartJS, Title, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement, Filler } from "chart.js";

ChartJS.register(Title, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement, Filler);

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
    default: "",
  },
  datasets: {
    type: Array,
    default: () => [],
  },
  dataKeys: {
    type: Array,
    default: () => [],
  },
  labels: {
    type: Array,
    default: () => [],
  },
  colors: {
    type: Array,
    default: () => [],
  },
  title: {
    type: String,
    default: "",
  },
  color: {
    type: String,
    default: "#4bc0c0cc",
  },
  height: {
    type: [Number, String],
    default: 220,
  },
});

const chartHeight = computed(() => {
  const numeric = Number(props.height);
  return Number.isNaN(numeric) ? 220 : numeric;
});

const withAlpha = (baseColor, alpha) => {
  if (!baseColor) return `rgba(75, 192, 192, ${alpha})`;
  if (baseColor.startsWith("rgba")) {
    return baseColor.replace(/rgba\(([^)]+),\s*[\d.]+\)/, (_match, values) => `rgba(${values}, ${alpha})`);
  }
  if (baseColor.startsWith("rgb")) {
    return baseColor.replace(/rgb\(([^)]+)\)/, (_match, values) => `rgba(${values}, ${alpha})`);
  }
  // HEX -> rgba
  const hex = baseColor.replace("#", "");
  const bigint = parseInt(
    hex.length === 3
      ? hex
          .split("")
          .map((char) => char + char)
          .join("")
      : hex,
    16
  );
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const resolveDatasets = computed(() => {
  // Если переданы готовые datasets, используем их
  if (props.datasets && props.datasets.length > 0) {
    return props.datasets.map((dataset) => ({
      ...dataset,
      tension: dataset.tension ?? 0.4,
      fill: dataset.fill ?? true,
      pointRadius: dataset.pointRadius ?? 3,
    }));
  }

  if (props.dataKeys.length > 0) {
    return props.dataKeys.map((key, index) => {
      const color = props.colors[index] || props.colors[0] || props.color;
      return {
        label: props.labels[index] || key,
        data: props.data.map((item) => item[key]),
        borderColor: color,
        backgroundColor: withAlpha(color, 0.2),
        tension: 0.4,
        fill: true,
        pointRadius: 3,
      };
    });
  }

  if (!props.valueKey) {
    return [];
  }

  return [
    {
      label: props.title || props.valueKey,
      data: props.data.map((item) => item[props.valueKey]),
      borderColor: props.color,
      backgroundColor: withAlpha(props.color, 0.2),
      tension: 0.4,
      fill: true,
      pointRadius: 3,
    },
  ];
});

const chartData = computed(() => ({
  labels: props.data.map((item) => item[props.labelKey]),
  datasets: resolveDatasets.value,
}));

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: resolveDatasets.value.length > 1,
      position: "bottom",
      labels: {
        usePointStyle: true,
      },
    },
    title: {
      display: !!props.title,
      text: props.title,
    },
    tooltip: {
      mode: "index",
      intersect: false,
      backgroundColor: "#000000cc",
      padding: 12,
      callbacks: {
        title: (tooltipItems) => {
          return tooltipItems[0].label;
        },
        label: (context) => {
          const dataIndex = context.dataIndex;
          const item = props.data[dataIndex];
          const value = context.parsed.y;
          const lines = [`${context.dataset.label}: ${value.toFixed(2)}`];

          // Добавляем процент изменения, если есть
          if (item.change_percent !== undefined && item.change_direction) {
            const sign = item.change_percent > 0 ? "+" : "";
            const arrow = item.change_direction === "positive" ? "↑" : item.change_direction === "negative" ? "↓" : "→";
            lines.push(`Изменение: ${arrow} ${sign}${item.change_percent}%`);
          }

          return lines;
        },
        labelTextColor: (context) => {
          const dataIndex = context.dataIndex;
          const item = props.data[dataIndex];

          // Цвет подсказки в зависимости от направления изменения
          if (item.change_direction === "positive") {
            return "#10b981"; // зелёный
          } else if (item.change_direction === "negative") {
            return "#ef4444"; // красный
          }
          return "#fff";
        },
      },
    },
  },
  interaction: {
    mode: "index",
    intersect: false,
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
    },
    y: {
      beginAtZero: true,
      ticks: {
        precision: 0,
      },
    },
  },
}));
</script>

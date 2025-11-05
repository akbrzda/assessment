<template>
  <div>
    <Doughnut :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup>
import { computed } from "vue";
import { Doughnut } from "vue-chartjs";
import { Chart as ChartJS, Title, Tooltip, Legend, ArcElement } from "chart.js";

ChartJS.register(Title, Tooltip, Legend, ArcElement);

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
  colors: {
    type: Array,
    default: () => [
      "#ff6384cc",
      "#36a2ebcc",
      "#ffce56cc",
      "#4bc0c0cc",
      "#9966ffcc",
      "#ff9f40cc",
    ],
  },
});

const chartData = computed(() => ({
  labels: props.data.map((item) => item[props.labelKey]),
  datasets: [
    {
      data: props.data.map((item) => item[props.valueKey]),
      backgroundColor: props.colors,
      borderColor: props.colors.map((c) => c.replace("0.8", "1")),
      borderWidth: 1,
    },
  ],
}));

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "bottom",
    },
    title: {
      display: !!props.title,
      text: props.title,
    },
  },
}));
</script>

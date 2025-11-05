<template>
  <svg :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`" class="sparkline">
    <polyline :points="points" fill="none" :stroke="color" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" />
    <circle v-if="showDot && points" :cx="lastPoint.x" :cy="lastPoint.y" :r="dotRadius" :fill="color" />
  </svg>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  data: {
    type: Array,
    required: true,
    default: () => [],
  },
  width: {
    type: Number,
    default: 100,
  },
  height: {
    type: Number,
    default: 30,
  },
  color: {
    type: String,
    default: "#3b82f6",
  },
  strokeWidth: {
    type: Number,
    default: 2,
  },
  showDot: {
    type: Boolean,
    default: true,
  },
  dotRadius: {
    type: Number,
    default: 3,
  },
});

const points = computed(() => {
  if (!props.data || props.data.length === 0) return "";

  const values = props.data.map((d) => parseFloat(d.value || d));
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const padding = 5;
  const stepX = (props.width - padding * 2) / (values.length - 1 || 1);

  return values
    .map((value, index) => {
      const x = padding + index * stepX;
      const y = props.height - padding - ((value - min) / range) * (props.height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");
});

const lastPoint = computed(() => {
  if (!props.data || props.data.length === 0) return { x: 0, y: 0 };

  const pointsArray = points.value.split(" ");
  const lastPointStr = pointsArray[pointsArray.length - 1];
  const [x, y] = lastPointStr.split(",").map(Number);

  return { x, y };
});
</script>

<style scoped>
.sparkline {
  display: block;
}
</style>

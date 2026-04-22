<template>
  <div class="progress-track" role="progressbar" :aria-valuenow="normalizedValue" aria-valuemin="0" aria-valuemax="100">
    <div class="progress-fill" :style="{ width: `${normalizedValue}%` }"></div>
  </div>
</template>

<script>
import { computed } from "vue";

export default {
  name: "ProgressBar",
  props: {
    value: {
      type: Number,
      default: 0,
    },
  },
  setup(props) {
    const normalizedValue = computed(() => {
      const numeric = Number(props.value || 0);
      if (!Number.isFinite(numeric)) {
        return 0;
      }
      return Math.min(Math.max(Math.round(numeric), 0), 100);
    });

    return {
      normalizedValue,
    };
  },
};
</script>

<style scoped>
.progress-track {
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.14);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #1d4ed8, #3b82f6);
  transition: width 0.2s ease;
}
</style>

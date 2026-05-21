<template>
  <div class="ui-progress-track" role="progressbar" :aria-valuenow="normalizedValue" aria-valuemin="0" aria-valuemax="100">
    <div class="ui-progress-fill" :style="{ width: `${normalizedValue}%` }"></div>
  </div>
</template>

<script>
import { computed } from "vue";

export default {
  name: "UiProgressBar",
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
      return Math.min(100, Math.max(0, Math.round(numeric)));
    });

    return {
      normalizedValue,
    };
  },
};
</script>

<style scoped>
.ui-progress-track {
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent-blue) 18%, var(--bg-primary) 82%);
  overflow: hidden;
}

.ui-progress-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #6c63ff, #5446f0);
  transition: width 0.25s ease;
}
</style>

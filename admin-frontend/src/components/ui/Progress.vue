<template>
  <div class="flex flex-col gap-1.5 w-full">
    <div v-if="label || showValue" class="flex items-center justify-between gap-2">
      <span v-if="label" class="text-sm font-medium text-foreground">{{ label }}</span>
      <span v-if="showValue" class="text-xs text-muted-foreground ml-auto tabular-nums font-semibold">{{ displayValue }}</span>
    </div>
    <div
      :class="['w-full overflow-hidden rounded-full bg-muted', trackSizeClass]"
      role="progressbar"
      :aria-valuenow="clampedValue"
      aria-valuemin="0"
      :aria-valuemax="max"
      :aria-label="label || 'Прогресс'"
    >
      <div
        :class="['h-full rounded-full transition-all duration-500 ease-out', colorClass]"
        :style="{ width: `${percent}%` }"
      />
    </div>
    <!-- Мотивационная подпись при достижении порога -->
    <p v-if="motivationText" class="text-xs font-medium leading-tight" :style="{ color: motivationColor }">{{ motivationText }}</p>
    <!-- Контекстная подпись под баром -->
    <p v-else-if="subtitle" class="text-xs text-muted-foreground leading-tight">{{ subtitle }}</p>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  value: {
    type: Number,
    default: 0,
  },
  max: {
    type: Number,
    default: 100,
  },
  label: String,
  subtitle: String,
  showValue: Boolean,
  showMotivation: {
    type: Boolean,
    default: false,
  },
  size: {
    type: String,
    default: "md",
    validator: (v) => ["xs", "sm", "md", "lg", "xl"].includes(v),
  },
  variant: {
    type: String,
    default: "primary",
    validator: (v) => ["primary", "success", "warning", "danger", "info", "gradient"].includes(v),
  },
});

const clampedValue = computed(() => Math.min(Math.max(0, props.value), props.max));
const percent = computed(() => (clampedValue.value / props.max) * 100);
const displayValue = computed(() => `${Math.round(percent.value)}%`);

const trackSizeClass = computed(
  () =>
    ({
      xs: "h-1",
      sm: "h-1.5",
      md: "h-2.5",
      lg: "h-4",
      xl: "h-5",
    })[props.size],
);

const colorClass = computed(
  () =>
    ({
      primary: "bg-primary",
      success: "bg-accent-green",
      warning: "bg-accent-orange",
      danger: "bg-destructive",
      info: "bg-accent-blue",
      gradient: "progress-gradient",
    })[props.variant],
);

const motivationText = computed(() => {
  if (!props.showMotivation) return null;
  const p = percent.value;
  if (p >= 100) return "🎉 Завершено!";
  if (p >= 75) return "🔥 Почти готово!";
  if (p >= 50) return "💪 На верном пути!";
  if (p >= 25) return "✨ Хорошее начало";
  return null;
});

const motivationColor = computed(() => {
  const p = percent.value;
  if (p >= 100) return "hsl(var(--accent-green))";
  if (p >= 75) return "hsl(var(--accent-orange))";
  return "hsl(var(--primary))";
});
</script>

<style>
.progress-gradient {
  background: linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--accent-blue)) 50%, hsl(var(--accent-green)) 100%);
}
</style>

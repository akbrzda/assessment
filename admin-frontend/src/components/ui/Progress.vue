<template>
  <div class="flex flex-col gap-1.5 w-full">
    <div v-if="label || showValue" class="flex items-center justify-between gap-2">
      <span v-if="label" class="text-sm font-medium text-foreground">{{ label }}</span>
      <span v-if="showValue" class="text-xs text-muted-foreground ml-auto">{{ displayValue }}</span>
    </div>
    <div
      :class="['w-full overflow-hidden rounded-full bg-muted', trackSizeClass]"
      role="progressbar"
      :aria-valuenow="clampedValue"
      aria-valuemin="0"
      :aria-valuemax="max"
    >
      <div :class="['h-full rounded-full transition-all duration-500 ease-out', colorClass]" :style="{ width: `${percent}%` }" />
    </div>
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
  showValue: Boolean,
  size: {
    type: String,
    default: "md",
    validator: (v) => ["xs", "sm", "md", "lg"].includes(v),
  },
  variant: {
    type: String,
    default: "primary",
    validator: (v) => ["primary", "success", "warning", "danger", "info"].includes(v),
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
    })[props.variant],
);
</script>

<template>
  <div
    :class="[
      'rounded-xl border border-border/90 bg-card shadow-[var(--elevation-soft)] transition-all duration-[var(--motion-base)]',
      size === 'secondary' ? 'p-4' : 'p-5',
      clickable && 'cursor-pointer hover:-translate-y-0.5 hover:border-ring/45 hover:shadow-[var(--elevation-float)]',
    ]"
    v-bind="clickable ? { role: 'button', tabindex: 0 } : {}"
    @click="clickable && $emit('click')"
    @keydown.enter.prevent="clickable && $emit('click')"
  >
    <div class="flex items-start gap-4">
      <div :class="['admin-metric-icon', `admin-metric-icon--${color}`]" aria-hidden="true">
        <Icon :name="icon" :size="size === 'secondary' ? 20 : 24" />
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">{{ label }}</p>
        <p :class="['font-bold tabular-nums leading-none', size === 'secondary' ? 'text-2xl' : 'text-[2.25rem]']">
          {{ value }}
        </p>
        <div v-if="trend !== undefined" class="mt-2">
          <span v-if="trend > 0" class="trend-up"
            >↑ {{ Math.abs(trend).toFixed(1) }}%<span v-if="trendLabel" class="font-normal"> {{ trendLabel }}</span></span
          >
          <span v-else-if="trend < 0" class="trend-down"
            >↓ {{ Math.abs(trend).toFixed(1) }}%<span v-if="trendLabel" class="font-normal"> {{ trendLabel }}</span></span
          >
          <span v-else class="trend-neutral">— без изменений</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import Icon from "./Icon.vue";

defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  icon: { type: String, required: true },
  color: {
    type: String,
    default: "blue",
    validator: (v) => ["blue", "green", "purple", "orange"].includes(v),
  },
  size: {
    type: String,
    default: "primary",
    validator: (v) => ["primary", "secondary"].includes(v),
  },
  trend: { type: Number, default: undefined },
  trendLabel: { type: String, default: "" },
  clickable: Boolean,
});

defineEmits(["click"]);
</script>

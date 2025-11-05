<template>
  <span :class="badgeClasses">
    <slot></slot>
  </span>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  variant: {
    type: String,
    default: "default",
    validator: (value) => ["default", "primary", "success", "warning", "danger", "info"].includes(value),
  },
  size: {
    type: String,
    default: "md",
    validator: (value) => ["sm", "md", "lg"].includes(value),
  },
  pill: {
    type: Boolean,
    default: false,
  },
});

const badgeClasses = computed(() => {
  const classes = ["ui-badge", `ui-badge-${props.variant}`, `ui-badge-${props.size}`];

  if (props.pill) {
    classes.push("ui-badge-pill");
  }

  return classes.join(" ");
});
</script>

<style scoped>
.ui-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  border-radius: 6px;
  white-space: nowrap;
  transition: all 0.2s ease;
}

/* Sizes */
.ui-badge-sm {
  padding: 0.125rem 0.5rem;
  font-size: 0.75rem;
  line-height: 1.25rem;
}

.ui-badge-md {
  padding: 0.25rem 0.625rem;
  font-size: 0.8125rem;
  line-height: 1.25rem;
}

.ui-badge-lg {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  line-height: 1.5rem;
}

/* Variants */
.ui-badge-default {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--divider);
}

.ui-badge-primary {
  background-color: var(--accent-blue-soft);
  color: var(--accent-blue);
  border: 1px solid transparent;
}

.ui-badge-success {
  background-color: var(--accent-green-soft);
  color: var(--accent-green);
  border: 1px solid transparent;
}

.ui-badge-warning {
  background-color: var(--accent-orange-soft);
  color: var(--accent-orange);
  border: 1px solid transparent;
}

.ui-badge-danger {
  background-color: var(--accent-red-soft);
  color: var(--accent-red);
  border: 1px solid transparent;
}

.ui-badge-info {
  background-color: var(--accent-purple-soft);
  color: var(--accent-purple);
  border: 1px solid transparent;
}

/* Pill */
.ui-badge-pill {
  border-radius: 9999px;
}
</style>

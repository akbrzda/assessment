<template>
  <span class="badge" :class="['badge-' + variant, 'badge-' + size]">
    <slot></slot>
  </span>
</template>

<script setup>
defineProps({
  variant: {
    type: String,
    default: "default",
    validator: (value) => ["default", "secondary", "primary", "success", "warning", "danger", "info"].includes(value),
  },
  size: {
    type: String,
    default: "md",
    validator: (value) => ["sm", "md", "lg"].includes(value),
  },
});
</script>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  font-weight: 500;
  white-space: nowrap;
}

/* Sizes */
.badge-sm {
  padding: 0.25rem 0.625rem;
  font-size: 0.75rem;
}

.badge-md {
  padding: 0.375rem 0.875rem;
  font-size: 0.875rem;
}

.badge-lg {
  padding: 0.5rem 1rem;
  font-size: 0.9375rem;
}

/* Variants */
.badge-default {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.badge-secondary {
  background-color: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--divider);
}

.badge-primary {
  background-color: var(--accent-blue);
  color: #ffffff;
}

.badge-success {
  background-color: var(--accent-green);
  color: #ffffff;
}

.badge-warning {
  background-color: var(--accent-orange);
  color: #ffffff;
}

.badge-danger {
  background-color: #ef4444;
  color: #ffffff;
}

.badge-info {
  background-color: var(--accent-purple);
  color: #ffffff;
}
</style>

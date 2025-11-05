<template>
  <button :type="type" :disabled="disabled || loading" :class="buttonClasses" @click="handleClick">
    <span v-if="loading" class="ui-button-spinner"></span>
    <span v-if="icon && !loading" class="ui-button-icon">{{ icon }}</span>
    <span v-if="$slots.default" class="ui-button-text"><slot></slot></span>
  </button>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  variant: {
    type: String,
    default: "primary",
    validator: (value) => ["primary", "secondary", "danger", "success", "ghost", "outline"].includes(value),
  },
  size: {
    type: String,
    default: "md",
    validator: (value) => ["sm", "md", "lg"].includes(value),
  },
  type: {
    type: String,
    default: "button",
  },
  disabled: Boolean,
  loading: Boolean,
  icon: String,
  fullWidth: Boolean,
});

const emit = defineEmits(["click"]);

const buttonClasses = computed(() => {
  const classes = ["ui-button", `ui-button-${props.variant}`, `ui-button-${props.size}`];

  if (props.disabled || props.loading) {
    classes.push("ui-button-disabled");
  }

  if (props.fullWidth) {
    classes.push("ui-button-full");
  }

  return classes.join(" ");
});

const handleClick = (event) => {
  if (!props.disabled && !props.loading) {
    emit("click", event);
  }
};
</script>

<style scoped>
.ui-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-weight: 500;
  border-radius: 8px;
  transition: all 0.2s ease;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  position: relative;
}

.ui-button:focus {
  outline: none;
  box-shadow: 0 0 0 3px var(--accent-blue-soft);
}

/* Sizes */
.ui-button-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
  line-height: 1.25rem;
}

.ui-button-md {
  padding: 0.625rem 1rem;
  font-size: 0.9375rem;
  line-height: 1.5rem;
}

.ui-button-lg {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  line-height: 1.5rem;
}

/* Variants */
.ui-button-primary {
  background-color: var(--accent-blue);
  color: #ffffff;
}

.ui-button-primary:hover:not(.ui-button-disabled) {
  background-color: var(--accent-blue-hover);
}

.ui-button-secondary {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--divider);
}

.ui-button-secondary:hover:not(.ui-button-disabled) {
  background-color: var(--surface-card);
  border-color: var(--text-secondary);
}

.ui-button-danger {
  background-color: var(--accent-red);
  color: #ffffff;
}

.ui-button-danger:hover:not(.ui-button-disabled) {
  background-color: #dc2626;
}

.ui-button-success {
  background-color: var(--accent-green);
  color: #ffffff;
}

.ui-button-success:hover:not(.ui-button-disabled) {
  background-color: #059669;
}

.ui-button-ghost {
  background-color: transparent;
  color: var(--text-secondary);
}

.ui-button-ghost:hover:not(.ui-button-disabled) {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.ui-button-outline {
  background-color: transparent;
  color: var(--accent-blue);
  border: 1px solid var(--accent-blue);
}

.ui-button-outline:hover:not(.ui-button-disabled) {
  background-color: var(--accent-blue-soft);
}

/* States */
.ui-button-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ui-button-full {
  width: 100%;
}

/* Spinner */
.ui-button-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: ui-button-spin 0.6s linear infinite;
}

@keyframes ui-button-spin {
  to {
    transform: rotate(360deg);
  }
}

.ui-button-icon {
  font-size: 1rem;
  line-height: 1;
}

.ui-button-text {
  line-height: 1;
}
</style>

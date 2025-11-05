<template>
  <button :type="type" :disabled="disabled || loading" :class="buttonClasses" @click="handleClick">
    <span v-if="loading" class="button-spinner"></span>
    <span v-if="icon && !loading" class="button-icon">{{ icon }}</span>
    <span v-if="$slots.default" class="button-text"><slot></slot></span>
  </button>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  variant: {
    type: String,
    default: "primary",
    validator: (value) => ["primary", "secondary", "danger", "success", "ghost"].includes(value),
  },
  size: {
    type: String,
    default: "md", // sm, md, lg
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
  const classes = ["button", `button-${props.variant}`, `button-${props.size}`];

  if (props.disabled || props.loading) {
    classes.push("button-disabled");
  }

  if (props.fullWidth) {
    classes.push("button-full");
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
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-weight: 600;
  border-radius: 14px;
  transition: all 0.2s ease;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  position: relative;
}

.button:focus {
  outline: none;
  box-shadow: 0 0 0 3px var(--accent-blue-soft);
}

/* Sizes */
.button-sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.button-md {
  padding: 0.625rem 1.25rem;
  font-size: 0.9375rem;
  line-height: 1.5rem;
}

.button-lg {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  line-height: 1.5rem;
}

/* Variants */
.button-primary {
  background-color: var(--nav-active-bg);
  color: var(--nav-active-text);
}

.button-primary:hover:not(.button-disabled) {
  opacity: 0.9;
}

.button-secondary {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--divider);
}

.button-secondary:hover:not(.button-disabled) {
  background-color: var(--surface-card);
  transform: translateY(-1px);
}

.button-danger {
  background-color: #ff3b30;
  color: #ffffff;
}

.button-danger:hover:not(.button-disabled) {
  background-color: #e6342a;
  transform: translateY(-1px);
}

.button-success {
  background-color: var(--accent-green);
  color: #ffffff;
}

.button-success:hover:not(.button-disabled) {
  background-color: #30b350;
  transform: translateY(-1px);
}

.button-ghost {
  background-color: transparent;
  color: var(--text-secondary);
}

.button-ghost:hover:not(.button-disabled) {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

/* States */
.button-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.button-full {
  width: 100%;
}

/* Spinner */
.button-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.button-icon {
  font-size: 1.125rem;
  line-height: 1;
}

.button-text {
  line-height: 1;
}
</style>

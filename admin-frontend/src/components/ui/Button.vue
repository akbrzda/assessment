<template>
  <button :type="type" :disabled="disabled || loading" :class="buttonClasses" @click="handleClick">
    <span v-if="loading" class="button-spinner"></span>
    <Icon v-if="icon && !loading" :name="icon" class="button-icon" />
    <span v-if="$slots.default" class="button-text"><slot></slot></span>
  </button>
</template>

<script setup>
import { computed } from "vue";
import Icon from "./Icon.vue";

const props = defineProps({
  icon: String,
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
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
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
}

/* Sizes */
.button-sm {
  padding: 8px 16px;
  font-size: 14px;
  line-height: 20px;
}

.button-md {
  padding: 10px 20px;
  font-size: 15px;
  line-height: 24px;
}

.button-lg {
  padding: 12px 24px;
  font-size: 16px;
  line-height: 24px;
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
  opacity: 0.7;
}

.button-danger {
  background-color: #ff3b30;
  color: #ffffff;
}

.button-danger:hover:not(.button-disabled) {
  opacity: 0.9;
}

.button-success {
  background-color: var(--accent-green);
  color: #ffffff;
}

.button-success:hover:not(.button-disabled) {
  opacity: 0.9;
}

.button-ghost {
  background-color: transparent;
  color: var(--text-secondary);
}

.button-ghost:hover:not(.button-disabled) {
  opacity: 0.9;
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
  width: 16px;
  height: 16px;
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
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.button-text {
  line-height: 1;
}
</style>

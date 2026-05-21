<template>
  <button :type="type" :class="buttonClasses" :disabled="disabled || loading" @click="$emit('click', $event)">
    <span v-if="loading" class="base-button__spinner" aria-hidden="true"></span>
    <slot />
  </button>
</template>

<script>
import { computed } from "vue";

export default {
  name: "BaseButton",
  props: {
    type: {
      type: String,
      default: "button",
    },
    variant: {
      type: String,
      default: "primary",
    },
    size: {
      type: String,
      default: "md",
    },
    fullWidth: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    loading: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["click"],
  setup(props) {
    const buttonClasses = computed(() => [
      "base-button",
      `base-button--${props.variant}`,
      `base-button--${props.size}`,
      props.fullWidth ? "base-button--full" : "",
    ]);

    return {
      buttonClasses,
    };
  },
};
</script>

<style scoped>
.base-button {
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
  min-height: 44px;
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.base-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.base-button--primary {
  background: var(--accent);
  color: #ffffff;
}

.base-button--secondary {
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--divider);
}

.base-button--danger {
  background: var(--error);
  color: #ffffff;
}

.base-button--ghost {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid transparent;
}

.base-button--sm {
  min-height: 36px;
  padding: 0 12px;
  font-size: 13px;
}

.base-button--md {
  min-height: 44px;
}

.base-button--lg {
  min-height: 48px;
  font-size: 15px;
}

.base-button--full {
  width: 100%;
}

.base-button__spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.45);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

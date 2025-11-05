<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="confirm-overlay" @click="handleCancel">
        <div class="confirm-dialog" @click.stop>
          <div class="confirm-header">
            <div class="confirm-icon" :class="`confirm-icon-${variant}`">{{ icon }}</div>
            <h2 class="confirm-title">{{ title }}</h2>
          </div>

          <div class="confirm-content">
            <p class="confirm-message">{{ message }}</p>
            <slot></slot>
          </div>

          <div class="confirm-actions">
            <Button variant="ghost" @click="handleCancel">{{ cancelText }}</Button>
            <Button :variant="actionVariant" :loading="loading" @click="handleConfirm">
              {{ confirmText }}
            </Button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import Button from "./Button.vue";

defineProps({
  modelValue: Boolean,
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  confirmText: {
    type: String,
    default: "Подтвердить",
  },
  cancelText: {
    type: String,
    default: "Отмена",
  },
  variant: {
    type: String,
    default: "warning", // warning, danger, info, success
    validator: (value) => ["warning", "danger", "info", "success"].includes(value),
  },
  loading: Boolean,
});

const emit = defineEmits(["update:modelValue", "confirm", "cancel"]);

const actionVariant = (() => {
  const variantMap = {
    warning: "primary",
    danger: "danger",
    info: "primary",
    success: "success",
  };
  return variantMap[props.variant] || "primary";
})();

const icon = (() => {
  const iconMap = {
    warning: "⚠️",
    danger: "🗑️",
    info: "ℹ️",
    success: "✅",
  };
  return iconMap[props.variant] || "❓";
})();

const handleConfirm = () => {
  emit("confirm");
};

const handleCancel = () => {
  emit("cancel");
  emit("update:modelValue", false);
};
</script>

<style scoped>
.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #00000080;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.confirm-dialog {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 24px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 20px 60px #0000004d;
  border: 1px solid var(--divider);
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.confirm-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.confirm-icon {
  font-size: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  flex-shrink: 0;
}

.confirm-icon-warning {
  background: #fbbf241a;
}

.confirm-icon-danger {
  background: #ef44441a;
}

.confirm-icon-info {
  background: #3b82f61a;
}

.confirm-icon-success {
  background: #10b9811a;
}

.confirm-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.confirm-content {
  margin-bottom: 24px;
}

.confirm-message {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0 0 12px 0;
  line-height: 1.5;
}

.confirm-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

:deep(.modal-enter-active),
:deep(.modal-leave-active) {
  transition: opacity 0.3s ease;
}

:deep(.modal-enter-from),
:deep(.modal-leave-to) {
  opacity: 0;
}

@media (max-width: 480px) {
  .confirm-dialog {
    padding: 20px;
  }

  .confirm-actions {
    flex-direction: column-reverse;
  }
}
</style>

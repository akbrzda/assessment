<template>
  <div v-if="visible" class="error-alert">
    <div class="error-alert__content">
      <div class="error-alert__icon">⚠️</div>
      <div class="error-alert__message">{{ message }}</div>
      <button 
        v-if="showCloseButton" 
        class="error-alert__close"
        @click="$emit('close')"
      >
        ✕
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ErrorAlert',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    message: {
      type: String,
      default: 'Произошла ошибка'
    },
    showCloseButton: {
      type: Boolean,
      default: true
    }
  },
  emits: ['close']
}
</script>

<style scoped>
.error-alert {
  position: fixed;
  top: 20px;
  left: 16px;
  right: 16px;
  z-index: 1000;
  animation: slideDown 0.3s ease-out;
}

.error-alert__content {
  background-color: var(--tg-theme-destructive-text-color);
  color: white;
  padding: 16px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  position: relative;
}

.error-alert__icon {
  font-size: 20px;
  margin-right: 12px;
  flex-shrink: 0;
}

.error-alert__message {
  flex: 1;
  font-size: 14px;
  line-height: 1.4;
}

.error-alert__close {
  background: none;
  border: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
  margin-left: 12px;
  opacity: 0.8;
  flex-shrink: 0;
}

.error-alert__close:hover {
  opacity: 1;
}

@keyframes slideDown {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>

<template>
  <button 
    :class="['btn', `btn--${variant}`, { 'btn--loading': loading, 'btn--disabled': disabled }]"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <span v-if="loading" class="btn__spinner"></span>
    <span :class="{ 'btn__text--hidden': loading }">
      <slot />
    </span>
  </button>
</template>

<script>
import { hapticFeedback } from '@/utils/telegram'

export default {
  name: 'AppButton',
  props: {
    variant: {
      type: String,
      default: 'primary',
      validator: (value) => ['primary', 'secondary', 'outline', 'danger'].includes(value)
    },
    loading: {
      type: Boolean,
      default: false
    },
    disabled: {
      type: Boolean,
      default: false
    },
    haptic: {
      type: String,
      default: 'impact',
      validator: (value) => ['impact', 'selection', 'notification', 'none'].includes(value)
    }
  },
  emits: ['click'],
  methods: {
    handleClick(event) {
      if (this.disabled || this.loading) return
      
      // Вибрация при клике
      if (this.haptic !== 'none') {
        hapticFeedback(this.haptic)
      }
      
      this.$emit('click', event)
    }
  }
}
</script>

<style scoped>
.btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 48px;
  width: 100%;
  text-decoration: none;
  box-sizing: border-box;
}

.btn--primary {
  background-color: var(--tg-theme-button-color);
  color: var(--tg-theme-button-text-color);
}

.btn--primary:hover {
  opacity: 0.8;
}

.btn--secondary {
  background-color: var(--tg-theme-secondary-bg-color);
  color: var(--tg-theme-text-color);
}

.btn--outline {
  background-color: transparent;
  color: var(--tg-theme-button-color);
  border: 1px solid var(--tg-theme-button-color);
}

.btn--danger {
  background-color: var(--tg-theme-destructive-text-color);
  color: white;
}

.btn--loading {
  pointer-events: none;
}

.btn--disabled {
  opacity: 0.5;
  pointer-events: none;
}

.btn__spinner {
  position: absolute;
  width: 20px;
  height: 20px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.btn__text--hidden {
  opacity: 0;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Активное состояние для тачскринов */
.btn:active {
  transform: scale(0.98);
}
</style>

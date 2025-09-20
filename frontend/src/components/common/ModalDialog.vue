<template>
  <transition name="modal-fade">
    <div v-if="modelValue" class="modal" @click.self="handleClose">
      <div class="modal__content">
        <header class="modal__header">
          <h3 class="modal__title">{{ title }}</h3>
          <button type="button" class="modal__close" @click="handleClose">&times;</button>
        </header>
        <div class="modal__body">
          <slot />
        </div>
        <footer v-if="$slots.footer" class="modal__footer">
          <slot name="footer" />
        </footer>
      </div>
    </div>
  </transition>
</template>

<script setup>
const emit = defineEmits(['update:modelValue']);

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  }
});

function handleClose() {
  emit('update:modelValue', false);
}
</script>

<style scoped>
.modal {
  position: fixed;
  inset: 0;
  background: rgba(10, 15, 25, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  z-index: 50;
}

.modal__content {
  width: min(420px, 100%);
  background: var(--tg-theme-bg-color, #ffffff);
  border-radius: 16px;
  box-shadow: 0 12px 32px rgba(15, 26, 44, 0.16);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.modal__title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}

.modal__close {
  border: none;
  background: transparent;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  color: var(--tg-theme-hint-color, #6f7a8b);
}

.modal__body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal__footer {
  padding: 16px 20px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>

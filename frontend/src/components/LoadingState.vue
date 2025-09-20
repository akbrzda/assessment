<template>
  <div class="loading">
    <div class="spinner" />
    <p class="loading__text">{{ message }}</p>
  </div>
</template>

<script setup>
const props = defineProps({
  message: {
    type: String,
    default: 'Загрузка...'
  }
});
</script>

<style scoped>
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 0;
}

.spinner {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-top-color: var(--tg-theme-button-color, #0a84ff);
  animation: spin 1s linear infinite;
}

.loading__text {
  margin: 0;
  color: var(--tg-theme-hint-color, #6f7a8b);
  font-size: 14px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>

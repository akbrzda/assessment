<template>
  <div class="preloader-container">
    <div class="preloader-spinner"></div>
    <p class="preloader-text">Загрузка...</p>
  </div>
</template>

<script setup></script>

<style scoped>
.preloader-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 0;
  min-height: 200px;
}

.preloader-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--divider);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.preloader-text {
  margin-top: 16px;
  color: var(--text-secondary, #6b7280);
  font-size: 14px;
  font-weight: 500;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

<template>
  <div v-if="isVisible" class="preloader">
    <div class="preloader__content">
      <div class="preloader__spinner"></div>
      <div class="preloader__text">{{ text }}</div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Preloader',
  props: {
    isVisible: {
      type: Boolean,
      default: false
    },
    text: {
      type: String,
      default: 'Загрузка...'
    }
  }
}
</script>

<style scoped>
.preloader {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: var(--tg-theme-bg-color);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.preloader__content {
  text-align: center;
}

.preloader__spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--tg-theme-hint-color);
  border-top: 3px solid var(--tg-theme-button-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

.preloader__text {
  color: var(--tg-theme-text-color);
  font-size: 16px;
  font-weight: 500;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>

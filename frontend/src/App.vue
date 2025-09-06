<template>
  <div id="app">
    <!-- Preloader показывается при инициализации -->
    <Preloader 
      :is-visible="authStore.isLoading && !initialized" 
      text="Инициализация приложения..."
    />
    
    <!-- Основной контент приложения -->
    <router-view v-if="initialized" />
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import Preloader from '@/components/Preloader.vue'
import { initTelegramApp, applyTheme } from '@/utils/telegram'

export default {
  name: 'App',
  components: {
    Preloader
  },
  setup() {
    const authStore = useAuthStore()
    const initialized = ref(false)
    
    onMounted(async () => {
      try {
        // Инициализируем Telegram Mini App
        initTelegramApp()
        
        // Применяем тему Telegram
        applyTheme()
        
        // Инициализируем store авторизации
        await authStore.initialize()
        
      } catch (error) {
        console.error('Ошибка инициализации приложения:', error)
      } finally {
        initialized.value = true
      }
    })
    
    return {
      authStore,
      initialized
    }
  }
}
</script>

<style>
/* Глобальные стили */
#app {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: var(--tg-theme-bg-color);
  color: var(--tg-theme-text-color);
  min-height: 100vh;
}

/* Сброс стилей */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  background-color: var(--tg-theme-bg-color);
  overflow-x: hidden;
}

/* Стили для form элементов */
input, select, textarea, button {
  font-family: inherit;
}

/* Убираем outline у кнопок в Safari */
button:focus {
  outline: none;
}

/* Стили для скроллбара */
::-webkit-scrollbar {
  width: 4px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--tg-theme-hint-color);
  border-radius: 2px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--tg-theme-text-color);
}

/* Анимации */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.slide-enter-active, .slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from {
  transform: translateX(100%);
}

.slide-leave-to {
  transform: translateX(-100%);
}

/* Утилитарные классы */
.text-center {
  text-align: center;
}

.text-left {
  text-align: left;
}

.text-right {
  text-align: right;
}

.mb-16 {
  margin-bottom: 16px;
}

.mb-24 {
  margin-bottom: 24px;
}

.mt-16 {
  margin-top: 16px;
}

.mt-24 {
  margin-top: 24px;
}

.p-16 {
  padding: 16px;
}

.p-20 {
  padding: 20px;
}

.rounded-12 {
  border-radius: 12px;
}

.rounded-16 {
  border-radius: 16px;
}

/* Адаптивность */
@media (max-width: 480px) {
  #app {
    font-size: 14px;
  }
}
</style>

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// Создание приложения Vue
const app = createApp(App)

// Подключение Pinia для управления состоянием
const pinia = createPinia()
app.use(pinia)

// Подключение Vue Router
app.use(router)

// Монтирование приложения
app.mount('#app')

console.log('🚀 Frontend приложение запущено')

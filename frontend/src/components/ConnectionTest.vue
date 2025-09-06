<template>
  <div class="connection-test">
    <h2>🔗 Тест соединения</h2>
    
    <div class="test-section">
      <h3>Конфигурация</h3>
      <div class="config-info">
        <div><strong>API URL:</strong> {{ apiUrl }}</div>
        <div><strong>App URL:</strong> {{ appUrl }}</div>
        <div><strong>Environment:</strong> {{ environment }}</div>
      </div>
    </div>

    <div class="test-section">
      <h3>Backend Health Check</h3>
      <AppButton @click="testBackendHealth" :loading="testing.health">
        Проверить Backend
      </AppButton>
      <div v-if="results.health" class="test-result" :class="results.health.success ? 'success' : 'error'">
        {{ results.health.message }}
      </div>
    </div>

    <div class="test-section">
      <h3>Справочные данные</h3>
      <AppButton @click="testReferenceData" :loading="testing.reference">
        Загрузить справочные данные
      </AppButton>
      <div v-if="results.reference" class="test-result" :class="results.reference.success ? 'success' : 'error'">
        {{ results.reference.message }}
        <pre v-if="results.reference.data">{{ JSON.stringify(results.reference.data, null, 2) }}</pre>
      </div>
    </div>

    <div class="test-section">
      <h3>Telegram Integration</h3>
      <div class="telegram-info">
        <div><strong>WebApp доступен:</strong> {{ telegramAvailable ? '✅' : '❌' }}</div>
        <div><strong>InitData:</strong> {{ initDataAvailable ? '✅' : '❌' }}</div>
        <div v-if="telegramUser"><strong>Пользователь:</strong> {{ telegramUser.first_name }} {{ telegramUser.last_name }}</div>
      </div>
    </div>

    <div class="test-section">
      <h3>CORS Test</h3>
      <AppButton @click="testCors" :loading="testing.cors">
        Проверить CORS
      </AppButton>
      <div v-if="results.cors" class="test-result" :class="results.cors.success ? 'success' : 'error'">
        {{ results.cors.message }}
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import AppButton from '@/components/AppButton.vue'
import api from '@/utils/api'
import { isTelegramWebApp, getTelegramUser, getInitData } from '@/utils/telegram'

export default {
  name: 'ConnectionTest',
  components: {
    AppButton
  },
  setup() {
    const testing = ref({
      health: false,
      reference: false,
      cors: false
    })
    
    const results = ref({
      health: null,
      reference: null,
      cors: null
    })
    
    const apiUrl = computed(() => import.meta.env.VITE_API_URL)
    const appUrl = computed(() => import.meta.env.VITE_APP_URL)
    const environment = computed(() => import.meta.env.VITE_NODE_ENV)
    
    const telegramAvailable = computed(() => isTelegramWebApp())
    const initDataAvailable = computed(() => !!getInitData())
    const telegramUser = computed(() => getTelegramUser())
    
    const testBackendHealth = async () => {
      testing.value.health = true
      try {
        const response = await api.get('/health')
        results.value.health = {
          success: true,
          message: `✅ Backend доступен: ${response.data.message}`
        }
      } catch (error) {
        results.value.health = {
          success: false,
          message: `❌ Backend недоступен: ${error.message}`
        }
      } finally {
        testing.value.health = false
      }
    }
    
    const testReferenceData = async () => {
      testing.value.reference = true
      try {
        const response = await api.get('/auth/reference-data')
        results.value.reference = {
          success: true,
          message: '✅ Справочные данные загружены',
          data: response.data
        }
      } catch (error) {
        results.value.reference = {
          success: false,
          message: `❌ Ошибка загрузки данных: ${error.message}`
        }
      } finally {
        testing.value.reference = false
      }
    }
    
    const testCors = async () => {
      testing.value.cors = true
      try {
        // Прямой fetch для проверки CORS
        const response = await fetch(`${apiUrl.value}/health`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          results.value.cors = {
            success: true,
            message: '✅ CORS настроен корректно'
          }
        } else {
          results.value.cors = {
            success: false,
            message: `❌ CORS ошибка: ${response.status}`
          }
        }
      } catch (error) {
        results.value.cors = {
          success: false,
          message: `❌ CORS ошибка: ${error.message}`
        }
      } finally {
        testing.value.cors = false
      }
    }
    
    onMounted(() => {
      console.log('🔧 Connection Test Component mounted')
      console.log('API URL:', apiUrl.value)
      console.log('App URL:', appUrl.value)
      console.log('Environment:', environment.value)
      console.log('Telegram WebApp:', window.Telegram?.WebApp ? 'Available' : 'Not Available')
      
      // Автоматически запускаем тесты при загрузке
      setTimeout(() => {
        testBackendHealth()
        testReferenceData()
        testCors()
      }, 1000)
    })
    
    return {
      testing,
      results,
      apiUrl,
      appUrl,
      environment,
      telegramAvailable,
      initDataAvailable,
      telegramUser,
      testBackendHealth,
      testReferenceData,
      testCors
    }
  }
}
</script>

<style scoped>
.connection-test {
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
}

.test-section {
  margin-bottom: 24px;
  padding: 16px;
  background-color: var(--tg-theme-secondary-bg-color);
  border-radius: 12px;
}

.test-section h3 {
  color: var(--tg-theme-text-color);
  margin-bottom: 12px;
  font-size: 16px;
}

.config-info div,
.telegram-info div {
  margin-bottom: 8px;
  font-size: 14px;
  color: var(--tg-theme-text-color);
}

.test-result {
  margin-top: 12px;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
}

.test-result.success {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.test-result.error {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.test-result pre {
  margin-top: 8px;
  background-color: rgba(0, 0, 0, 0.1);
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
  overflow-x: auto;
}
</style>

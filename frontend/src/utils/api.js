import axios from 'axios'

// Базовая конфигурация API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

console.log('🌐 API Base URL:', API_BASE_URL)

// Создание экземпляра axios
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Интерцептор для добавления токена авторизации и логирования
api.interceptors.request.use(
  (config) => {
    const timestamp = new Date().toISOString()
    console.log(`\n📤 [${timestamp}] API Request:`)
    console.log(`🎯 ${config.method?.toUpperCase()} ${config.url}`)
    console.log(`🌐 Full URL: ${config.baseURL}${config.url}`)
    
    // Добавляем initData только для POST запросов, которые требуют авторизации
    if (config.method === 'post' && config.data) {
      const initData = window.Telegram?.WebApp?.initData
      console.log('🔍 Telegram WebApp доступен:', !!window.Telegram?.WebApp)
      console.log('🔑 InitData доступен:', !!initData)
      
      if (initData) {
        config.data.initData = initData
        console.log('✅ InitData добавлен в запрос')
      } else {
        console.log('⚠️  InitData недоступен')
      }
    }
    
    if (config.data) {
      console.log('📦 Request Data:', config.data)
    }
    
    return config
  },
  (error) => {
    console.error('\n❌ API Request Error:', error)
    return Promise.reject(error)
  }
)

// Интерцептор для обработки ошибок и логирования ответов
api.interceptors.response.use(
  (response) => {
    const timestamp = new Date().toISOString()
    console.log(`\n📥 [${timestamp}] API Response:`)
    console.log(`✅ ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`)
    console.log('📦 Response Data:', response.data)
    return response
  },
  (error) => {
    const timestamp = new Date().toISOString()
    console.error(`\n❌ [${timestamp}] API Error:`)
    
    if (error.response) {
      console.error(`🔴 ${error.response.status} ${error.config?.method?.toUpperCase()} ${error.config?.url}`)
      console.error('📦 Error Data:', error.response.data)
      console.error('🔍 Headers:', error.response.headers)
    } else if (error.request) {
      console.error('📡 Network Error - No response received')
      console.error('🔍 Request:', error.request)
    } else {
      console.error('⚙️  Setup Error:', error.message)
    }
    
    console.error('🔧 Error Config:', error.config)
    
    // Обработка различных типов ошибок
    if (error.response) {
      // Ошибка от сервера
      const { status, data } = error.response
      
      if (status === 401) {
        // Ошибка авторизации
        console.error('Ошибка авторизации:', data.error)
      } else if (status >= 500) {
        // Ошибка сервера
        console.error('Ошибка сервера:', data.error)
      }
    } else if (error.request) {
      // Ошибка сети
      console.error('Ошибка сети:', error.message)
    }
    
    return Promise.reject(error)
  }
)

export default api

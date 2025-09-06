import { defineStore } from 'pinia'
import api from '@/utils/api'
import { getTelegramUser, getInitData } from '@/utils/telegram'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    // Состояние авторизации
    isAuthenticated: false,
    isLoading: false,
    
    // Данные пользователя
    user: null,
    
    // Данные из Telegram
    telegramUser: null,
    
    // Справочные данные
    positions: [],
    branches: [],
    
    // Ошибки
    error: null
  }),
  
  getters: {
    // Проверка роли пользователя
    isEmployee: (state) => state.user?.role === 'employee',
    isManager: (state) => state.user?.role === 'manager',
    isSuperAdmin: (state) => state.user?.role === 'superadmin',
    
    // Полное имя пользователя
    userFullName: (state) => {
      if (!state.user) return ''
      return `${state.user.first_name} ${state.user.last_name}`
    },
    
    // Проверка готовности к регистрации
    canRegister: (state) => {
      return state.telegramUser && !state.isAuthenticated
    }
  },
  
  actions: {
    // Инициализация - проверка авторизации
    async initialize() {
      console.log('\n🚀 [Auth Store] Инициализация')
      this.isLoading = true
      this.error = null
      
      try {
        // Получаем данные пользователя из Telegram
        console.log('👤 Получение данных пользователя из Telegram...')
        this.telegramUser = getTelegramUser()
        console.log('📱 Telegram User:', this.telegramUser)
        
        if (!this.telegramUser) {
          throw new Error('Данные пользователя Telegram недоступны')
        }
        
        // Проверяем авторизацию на сервере
        console.log('🔐 Проверка авторизации на сервере...')
        await this.checkAuth()
        
      } catch (error) {
        console.error('❌ [Auth Store] Ошибка инициализации:')
        console.error('Error:', error.message)
        console.error('Stack:', error.stack)
        this.error = error.message
      } finally {
        this.isLoading = false
        console.log('🏁 [Auth Store] Инициализация завершена')
      }
    },
    
    // Проверка авторизации на сервере
    async checkAuth() {
      console.log('\n🔍 [Auth Store] Проверка авторизации')
      
      try {
        const initData = getInitData()
        console.log('🔑 InitData получен:', !!initData)
        
        if (!initData) {
          throw new Error('initData недоступен')
        }
        
        console.log('📤 Отправка запроса на проверку авторизации...')
        const response = await api.post('/auth/check', { initData })
        console.log('📥 Ответ от сервера:', response.data)
        
        if (response.data.success) {
          if (response.data.isRegistered) {
            console.log('✅ Пользователь уже зарегистрирован')
            this.user = response.data.user
            this.isAuthenticated = true
          } else {
            console.log('⚠️  Пользователь не зарегистрирован')
            this.isAuthenticated = false
          }
        } else {
          throw new Error(response.data.error || 'Ошибка проверки авторизации')
        }
        
      } catch (error) {
        console.error('❌ [Auth Store] Ошибка проверки авторизации:')
        console.error('Error:', error.message)
        if (error.response) {
          console.error('Response status:', error.response.status)
          console.error('Response data:', error.response.data)
        }
        throw error
      }
    },
    // Регистрация пользователя
    async register(userData) {
      this.isLoading = true
      this.error = null
      
      try {
        const initData = getInitData()
        
        if (!initData) {
          throw new Error('initData недоступен')
        }
        
        const response = await api.post('/auth/register', {
          initData,
          ...userData
        })
        
        if (response.data.success) {
          this.user = response.data.user
          this.isAuthenticated = true
          return true
        }
        
      } catch (error) {
        console.error('Ошибка регистрации:', error)
        this.error = error.response?.data?.error || error.message
        return false
      } finally {
        this.isLoading = false
      }
    },
    
    // Получение справочных данных
    async loadReferenceData() {
      try {
        const response = await api.get('/auth/reference-data')
        
        if (response.data.success) {
          this.positions = response.data.data.positions
          this.branches = response.data.data.branches
        }
        
      } catch (error) {
        console.error('Ошибка загрузки справочных данных:', error)
        this.error = error.response?.data?.error || error.message
        
        // Fallback - используем статические данные
        this.positions = [
          'Официант',
          'Повар',
          'Старший повар',
          'Шеф повар',
          'Администратор',
          'Бармен',
          'Логист',
          'Курьер'
        ]
        this.branches = [
          'Сургут-1 (30 лет Победы)',
          'Сургут-2 (Усольцева)',
          'Сургут-3 (Магистральная)',
          'Парковая (Нефтеюганск)'
        ]
      }
    },
    
    // Обновление профиля пользователя
    async updateProfile(updateData) {
      this.isLoading = true
      this.error = null
      
      try {
        // Здесь будет вызов API для обновления профиля
        // Пока что обновляем локально
        if (this.user) {
          this.user = { ...this.user, ...updateData }
        }
        return true
        
      } catch (error) {
        console.error('Ошибка обновления профиля:', error)
        this.error = error.response?.data?.error || error.message
        return false
      } finally {
        this.isLoading = false
      }
    },
    
    // Выход из системы
    logout() {
      this.isAuthenticated = false
      this.user = null
      this.error = null
    },
    
    // Очистка ошибок
    clearError() {
      this.error = null
    }
  }
})

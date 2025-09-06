<template>
  <div class="register-page">
    <div class="register-page__header">
      <h1 class="title">Регистрация</h1>
      <p class="subtitle">Заполните информацию о себе</p>
    </div>

    <form @submit.prevent="handleSubmit" class="register-form">
      <div class="form-group">
        <label class="form-label">Имя *</label>
        <input
          v-model="form.first_name"
          type="text"
          class="form-input"
          placeholder="Введите имя"
          required
        />
      </div>

      <div class="form-group">
        <label class="form-label">Фамилия *</label>
        <input
          v-model="form.last_name"
          type="text"
          class="form-input"
          placeholder="Введите фамилию"
          required
        />
      </div>

      <div class="form-group">
        <label class="form-label">Должность *</label>
        <select
          v-model="form.position"
          class="form-select"
          required
        >
          <option value="">Выберите должность</option>
          <option 
            v-for="position in authStore.positions" 
            :key="position" 
            :value="position"
          >
            {{ position }}
          </option>
        </select>
        <div v-if="authStore.positions.length === 0" class="form-help">
          Загрузка должностей...
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Филиал *</label>
        <select
          v-model="form.branch"
          class="form-select"
          required
        >
          <option value="">Выберите филиал</option>
          <option 
            v-for="branch in authStore.branches" 
            :key="branch" 
            :value="branch"
          >
            {{ branch }}
          </option>
        </select>
        <div v-if="authStore.branches.length === 0" class="form-help">
          Загрузка филиалов...
        </div>
      </div>

      <div class="register-form__actions">
        <AppButton 
          type="submit"
          :loading="isLoading"
          :disabled="!isFormValid"
        >
          Зарегистрироваться
        </AppButton>
      </div>
    </form>

    <!-- Отображение ошибок -->
    <ErrorAlert 
      :visible="!!authStore.error"
      :message="authStore.error"
      @close="authStore.clearError()"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppButton from '@/components/AppButton.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import { showBackButton, hideBackButton, hapticFeedback } from '@/utils/telegram'

export default {
  name: 'RegisterPage',
  components: {
    AppButton,
    ErrorAlert
  },
  setup() {
    const router = useRouter()
    const authStore = useAuthStore()
    
    // Форма регистрации
    const form = ref({
      first_name: '',
      last_name: '',
      position: '',
      branch: ''
    })
    
    // Вычисляемые свойства
    const isLoading = computed(() => authStore.isLoading)
    const isFormValid = computed(() => {
      return form.value.first_name && 
             form.value.last_name && 
             form.value.position && 
             form.value.branch
    })
    
    // Инициализация
    onMounted(async () => {
      try {
        // Загружаем справочные данные
        await authStore.loadReferenceData()
        
        // Предзаполняем имя и фамилию из Telegram
        if (authStore.telegramUser) {
          form.value.first_name = authStore.telegramUser.first_name || ''
          form.value.last_name = authStore.telegramUser.last_name || ''
        }
        
        // Показываем кнопку назад
        showBackButton(() => {
          router.push('/login')
        })
      } catch (error) {
        console.error('Ошибка инициализации страницы регистрации:', error)
      }
    })
    
    // Методы
    const handleSubmit = async () => {
      if (!isFormValid.value) return
      
      const success = await authStore.register(form.value)
      
      if (success) {
        hapticFeedback('notification', 'success')
        router.push('/dashboard')
      } else {
        hapticFeedback('notification', 'error')
      }
    }
    
    return {
      authStore,
      form,
      isLoading,
      isFormValid,
      handleSubmit
    }
  },
  beforeUnmount() {
    hideBackButton()
  }
}
</script>

<style scoped>
.register-page {
  min-height: 100vh;
  padding: 20px;
  background-color: var(--tg-theme-bg-color);
}

.register-page__header {
  text-align: center;
  margin-bottom: 32px;
}

.title {
  color: var(--tg-theme-text-color);
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 8px;
}

.subtitle {
  color: var(--tg-theme-hint-color);
  font-size: 16px;
  margin: 0;
}

.register-form {
  max-width: 400px;
  margin: 0 auto;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  color: var(--tg-theme-text-color);
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
}

.form-input,
.form-select {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--tg-theme-hint-color);
  border-radius: 12px;
  font-size: 16px;
  background-color: var(--tg-theme-bg-color);
  color: var(--tg-theme-text-color);
  box-sizing: border-box;
  transition: border-color 0.2s ease;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: var(--tg-theme-button-color);
}

.form-select {
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,<svg viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'><path d='M7 10L12 15L17 10' stroke='%23999999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/></svg>");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 20px;
  padding-right: 44px;
}

.register-form__actions {
  margin-top: 32px;
}

.form-help {
  font-size: 12px;
  color: var(--tg-theme-hint-color);
  margin-top: 4px;
  font-style: italic;
}

/* Стили для placeholder */
.form-input::placeholder {
  color: var(--tg-theme-hint-color);
}

/* Адаптивность для маленьких экранов */
@media (max-width: 480px) {
  .register-page {
    padding: 16px;
  }
  
  .register-form {
    max-width: none;
  }
}
</style>

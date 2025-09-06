<template>
  <div class="profile-page">
    <div class="profile-header">
      <div class="profile-avatar">
        {{ userInitials }}
      </div>
      <h1 class="profile-name">{{ authStore.userFullName }}</h1>
      <p class="profile-role">{{ roleText }}</p>
    </div>

    <div class="profile-content">
      <!-- Основная информация -->
      <div class="info-section">
        <h2 class="section-title">Основная информация</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Должность</div>
            <div class="info-value">{{ user.position }}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Филиал</div>
            <div class="info-value">{{ user.branch }}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Уровень</div>
            <div class="info-value">{{ user.level || 1 }}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Очки</div>
            <div class="info-value">{{ user.points || 0 }}</div>
          </div>
        </div>
      </div>

      <!-- Редактирование профиля -->
      <div class="edit-section">
        <h2 class="section-title">Редактирование профиля</h2>
        
        <form @submit.prevent="handleSave" class="edit-form">
          <div class="form-group">
            <label class="form-label">Имя</label>
            <input
              v-model="editForm.first_name"
              type="text"
              class="form-input"
              placeholder="Введите имя"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label">Фамилия</label>
            <input
              v-model="editForm.last_name"
              type="text"
              class="form-input"
              placeholder="Введите фамилию"
              required
            />
          </div>

          <div class="form-actions">
            <AppButton 
              type="submit"
              :loading="isLoading"
              :disabled="!hasChanges"
            >
              Сохранить изменения
            </AppButton>
          </div>
        </form>
      </div>

      <!-- Статистика (заглушка) -->
      <div class="stats-section">
        <h2 class="section-title">Статистика</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-number">0</div>
            <div class="stat-label">Пройдено тестов</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">0%</div>
            <div class="stat-label">Средний балл</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">0</div>
            <div class="stat-label">Бейджей получено</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Сообщения об ошибках -->
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
  name: 'ProfilePage',
  components: {
    AppButton,
    ErrorAlert
  },
  setup() {
    const router = useRouter()
    const authStore = useAuthStore()
    
    const user = computed(() => authStore.user)
    const isLoading = computed(() => authStore.isLoading)
    
    // Форма редактирования
    const editForm = ref({
      first_name: '',
      last_name: ''
    })
    
    // Вычисляемые свойства
    const userInitials = computed(() => {
      if (!user.value) return '?'
      const first = user.value.first_name?.charAt(0) || ''
      const last = user.value.last_name?.charAt(0) || ''
      return (first + last).toUpperCase()
    })
    
    const roleText = computed(() => {
      switch (user.value?.role) {
        case 'employee': return 'Сотрудник'
        case 'manager': return 'Управляющий'
        case 'superadmin': return 'Суперадмин'
        default: return 'Пользователь'
      }
    })
    
    const hasChanges = computed(() => {
      if (!user.value) return false
      return editForm.value.first_name !== user.value.first_name ||
             editForm.value.last_name !== user.value.last_name
    })
    
    // Инициализация
    onMounted(() => {
      if (user.value) {
        editForm.value.first_name = user.value.first_name
        editForm.value.last_name = user.value.last_name
      }
      
      // Показываем кнопку назад
      showBackButton(() => {
        router.push('/dashboard')
      })
    })
    
    // Методы
    const handleSave = async () => {
      if (!hasChanges.value) return
      
      const success = await authStore.updateProfile({
        first_name: editForm.value.first_name,
        last_name: editForm.value.last_name
      })
      
      if (success) {
        hapticFeedback('notification', 'success')
      } else {
        hapticFeedback('notification', 'error')
      }
    }
    
    return {
      authStore,
      user,
      isLoading,
      editForm,
      userInitials,
      roleText,
      hasChanges,
      handleSave
    }
  },
  beforeUnmount() {
    hideBackButton()
  }
}
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background-color: var(--tg-theme-bg-color);
  padding: 20px;
}

.profile-header {
  text-align: center;
  margin-bottom: 32px;
}

.profile-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: var(--tg-theme-button-color);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: 600;
  margin: 0 auto 16px;
}

.profile-name {
  color: var(--tg-theme-text-color);
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 4px 0;
}

.profile-role {
  color: var(--tg-theme-hint-color);
  font-size: 16px;
  margin: 0;
}

.profile-content {
  max-width: 500px;
  margin: 0 auto;
}

.section-title {
  color: var(--tg-theme-text-color);
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 16px 0;
}

/* Секция информации */
.info-section {
  background-color: var(--tg-theme-secondary-bg-color);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.info-item {
  text-align: center;
}

.info-label {
  color: var(--tg-theme-hint-color);
  font-size: 12px;
  margin-bottom: 4px;
}

.info-value {
  color: var(--tg-theme-text-color);
  font-size: 16px;
  font-weight: 500;
}

/* Секция редактирования */
.edit-section {
  background-color: var(--tg-theme-secondary-bg-color);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
}

.edit-form {
  space-y: 16px;
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  color: var(--tg-theme-text-color);
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
}

.form-input {
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

.form-input:focus {
  outline: none;
  border-color: var(--tg-theme-button-color);
}

.form-actions {
  margin-top: 20px;
}

/* Секция статистики */
.stats-section {
  background-color: var(--tg-theme-secondary-bg-color);
  border-radius: 16px;
  padding: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.stat-card {
  text-align: center;
  padding: 16px;
  background-color: var(--tg-theme-bg-color);
  border-radius: 12px;
}

.stat-number {
  color: var(--tg-theme-text-color);
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 4px;
}

.stat-label {
  color: var(--tg-theme-hint-color);
  font-size: 12px;
}

/* Адаптивность */
@media (max-width: 480px) {
  .profile-page {
    padding: 16px;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}
</style>

<template>
  <div class="dashboard-page">
    <div class="dashboard-header">
      <div class="user-info">
        <div class="user-avatar">
          {{ userInitials }}
        </div>
        <div class="user-details">
          <h1 class="user-name">{{ authStore.userFullName }}</h1>
          <p class="user-position">{{ user.position }}</p>
          <p class="user-branch">{{ user.branch }}</p>
        </div>
      </div>
      
      <div class="user-stats">
        <div class="stat-item">
          <div class="stat-value">{{ user.level || 1 }}</div>
          <div class="stat-label">Уровень</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ user.points || 0 }}</div>
          <div class="stat-label">Очки</div>
        </div>
      </div>
    </div>

    <div class="dashboard-content">
      <div class="welcome-card">
        <h2>Добро пожаловать в систему аттестации! 🎓</h2>
        <p>Система готова к работе. Авторизация через Telegram Mini App настроена успешно.</p>
      </div>

      <div class="quick-actions">
        <h3>Быстрые действия</h3>
        <div class="action-grid">
          <div class="action-card" @click="goToProfile">
            <div class="action-icon">👤</div>
            <div class="action-title">Профиль</div>
            <div class="action-desc">Просмотр и редактирование</div>
          </div>
          
          <div class="action-card disabled">
            <div class="action-icon">📝</div>
            <div class="action-title">Аттестации</div>
            <div class="action-desc">Скоро доступно</div>
          </div>
          
          <div class="action-card disabled">
            <div class="action-icon">🏆</div>
            <div class="action-title">Лидерборды</div>
            <div class="action-desc">Скоро доступно</div>
          </div>
          
          <div class="action-card disabled">
            <div class="action-icon">🎖️</div>
            <div class="action-title">Бейджи</div>
            <div class="action-desc">Скоро доступно</div>
          </div>
        </div>
      </div>

      <div class="system-info">
        <h3>Информация о системе</h3>
        <ul>
          <li>✅ Авторизация через Telegram</li>
          <li>✅ Валидация initData</li>
          <li>✅ Регистрация пользователей</li>
          <li>⏳ Создание аттестаций (следующий этап)</li>
          <li>⏳ Система геймификации (следующий этап)</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { hapticFeedback } from '@/utils/telegram'

export default {
  name: 'DashboardPage',
  setup() {
    const router = useRouter()
    const authStore = useAuthStore()
    
    const user = computed(() => authStore.user)
    
    const userInitials = computed(() => {
      if (!user.value) return '?'
      const first = user.value.first_name?.charAt(0) || ''
      const last = user.value.last_name?.charAt(0) || ''
      return (first + last).toUpperCase()
    })
    
    const goToProfile = () => {
      hapticFeedback('selection')
      router.push('/profile')
    }
    
    return {
      authStore,
      user,
      userInitials,
      goToProfile
    }
  }
}
</script>

<style scoped>
.dashboard-page {
  min-height: 100vh;
  background-color: var(--tg-theme-bg-color);
  padding: 20px;
}

.dashboard-header {
  background-color: var(--tg-theme-secondary-bg-color);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
}

.user-info {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.user-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background-color: var(--tg-theme-button-color);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 600;
  margin-right: 16px;
}

.user-details {
  flex: 1;
}

.user-name {
  color: var(--tg-theme-text-color);
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 4px 0;
}

.user-position {
  color: var(--tg-theme-accent-text-color);
  font-size: 14px;
  font-weight: 500;
  margin: 0 0 2px 0;
}

.user-branch {
  color: var(--tg-theme-hint-color);
  font-size: 12px;
  margin: 0;
}

.user-stats {
  display: flex;
  gap: 24px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  color: var(--tg-theme-text-color);
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 4px;
}

.stat-label {
  color: var(--tg-theme-hint-color);
  font-size: 12px;
}

.dashboard-content {
  space-y: 24px;
}

.welcome-card {
  background-color: var(--tg-theme-secondary-bg-color);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
  text-align: center;
}

.welcome-card h2 {
  color: var(--tg-theme-text-color);
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.welcome-card p {
  color: var(--tg-theme-hint-color);
  font-size: 14px;
  line-height: 1.4;
  margin: 0;
}

.quick-actions {
  margin-bottom: 24px;
}

.quick-actions h3 {
  color: var(--tg-theme-text-color);
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 16px 0;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.action-card {
  background-color: var(--tg-theme-secondary-bg-color);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-card:not(.disabled):hover {
  opacity: 0.8;
}

.action-card:not(.disabled):active {
  transform: scale(0.98);
}

.action-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.action-title {
  color: var(--tg-theme-text-color);
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
}

.action-desc {
  color: var(--tg-theme-hint-color);
  font-size: 12px;
}

.system-info {
  background-color: var(--tg-theme-secondary-bg-color);
  border-radius: 16px;
  padding: 20px;
}

.system-info h3 {
  color: var(--tg-theme-text-color);
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 12px 0;
}

.system-info ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.system-info li {
  color: var(--tg-theme-text-color);
  font-size: 14px;
  padding: 4px 0;
}

/* Адаптивность */
@media (max-width: 480px) {
  .dashboard-page {
    padding: 16px;
  }
  
  .action-grid {
    grid-template-columns: 1fr;
  }
  
  .user-stats {
    justify-content: center;
  }
}
</style>

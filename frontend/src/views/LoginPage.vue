<template>
  <div class="login-page">
    <div class="login-page__content">
      <div class="login-page__logo">
        <div class="logo">🎓</div>
        <h1 class="title">Система аттестации</h1>
        <p class="subtitle">Добро пожаловать!</p>
      </div>
      
      <div class="login-page__message">
        <p>Для продолжения работы необходимо пройти регистрацию в системе.</p>
      </div>
      
      <div class="login-page__actions">
        <AppButton 
          @click="goToRegister"
          :loading="isLoading"
        >
          Пройти регистрацию
        </AppButton>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppButton from '@/components/AppButton.vue'

export default {
  name: 'LoginPage',
  components: {
    AppButton
  },
  setup() {
    const router = useRouter()
    const authStore = useAuthStore()
    
    const isLoading = computed(() => authStore.isLoading)
    
    const goToRegister = () => {
      router.push('/register')
    }
    
    return {
      authStore,
      isLoading,
      goToRegister
    }
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background-color: var(--tg-theme-bg-color);
}

.login-page__content {
  width: 100%;
  max-width: 400px;
  text-align: center;
}

.login-page__logo {
  margin-bottom: 40px;
}

.logo {
  font-size: 64px;
  margin-bottom: 16px;
}

.title {
  color: var(--tg-theme-text-color);
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 8px;
}

.subtitle {
  color: var(--tg-theme-hint-color);
  font-size: 18px;
  margin: 0;
}

.login-page__message {
  margin-bottom: 32px;
  padding: 20px;
  background-color: var(--tg-theme-secondary-bg-color);
  border-radius: 12px;
}

.login-page__message p {
  color: var(--tg-theme-text-color);
  font-size: 16px;
  line-height: 1.5;
  margin: 0;
}

.login-page__actions {
  margin-top: 24px;
}
</style>

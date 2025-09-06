import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Импорт страниц
import LoginPage from '@/views/LoginPage.vue'
import RegisterPage from '@/views/RegisterPage.vue'
import DashboardPage from '@/views/DashboardPage.vue'
import ProfilePage from '@/views/ProfilePage.vue'
import ConnectionTest from '@/components/ConnectionTest.vue'

// Определение маршрутов
const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginPage,
    meta: { 
      requiresAuth: false,
      hideForAuth: true // скрываем для авторизованных пользователей
    }
  },
  {
    path: '/register',
    name: 'Register',
    component: RegisterPage,
    meta: { 
      requiresAuth: false,
      hideForAuth: true // скрываем для авторизованных пользователей
    }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: DashboardPage,
    meta: { requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: ProfilePage,
    meta: { requiresAuth: true }
  },
  {
    path: '/test',
    name: 'ConnectionTest',
    component: ConnectionTest,
    meta: { requiresAuth: false }
  },
  {
    // Обработка 404
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard'
  }
]

// Создание роутера
const router = createRouter({
  history: createWebHistory(),
  routes
})

// Навигационные хуки
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  // Инициализируем store если еще не инициализирован
  if (!authStore.isAuthenticated && !authStore.isLoading) {
    await authStore.initialize()
  }
  
  const requiresAuth = to.meta.requiresAuth
  const hideForAuth = to.meta.hideForAuth
  const isAuthenticated = authStore.isAuthenticated
  
  if (requiresAuth && !isAuthenticated) {
    // Страница требует авторизации, но пользователь не авторизован
    next('/login')
  } else if (hideForAuth && isAuthenticated) {
    // Страница должна быть скрыта для авторизованных пользователей
    next('/dashboard')
  } else {
    // Разрешаем переход
    next()
  }
})

export default router

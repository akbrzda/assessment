<template>
  <div class="app" :class="classes">
    <LoadingState v-if="isBooting" message="Загружаем данные" />
    <div v-else class="app__content">
      <RouterView />
    </div>
    <BottomNav v-if="showNav" :items="navItems" />
    <div v-if="appStore.error" class="error-banner">{{ appStore.error }}</div>
    <transition name="fade">
      <div v-if="isBusy" class="app__overlay">
        <LoadingState message="Обрабатываем запрос" />
      </div>
    </transition>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import LoadingState from './components/LoadingState.vue';
import BottomNav from './components/BottomNav.vue';
import { useAppStore } from './store/appStore';
import {
  ensureReady,
  onViewportChanged,
  onThemeChange,
  getThemeParams,
  getColorScheme
} from './services/telegram';

const appStore = useAppStore();
const route = useRoute();

const theme = ref(getThemeParams());
const colorScheme = ref(getColorScheme());

const isBooting = computed(() => !appStore.isInitialized && appStore.isLoading);
const isBusy = computed(() => appStore.isInitialized && appStore.isLoading);

const classes = computed(() => ({
  'app--loading': isBooting.value
}));

const showNav = computed(() => appStore.isAuthenticated && !['register', 'invite'].includes(route.name));
const navItems = computed(() => {
  const user = appStore.user;
  const items = [
    { name: 'dashboard', label: 'Главная', icon: '🏠' },
    { name: 'assessments', label: 'Аттестации', icon: '📝' },
    { name: 'leaderboard', label: 'Лидеры', icon: '🏆' },
    {
      name: 'profile',
      label: 'Профиль',
      avatar: user
        ? {
            url: user.avatarUrl,
            firstName: user.firstName,
            lastName: user.lastName
          }
        : null,
      icon: user ? null : '👤'
    }
  ];
  return items;
});

onMounted(() => {
  const webApp = ensureReady();
  if (webApp) {
    onThemeChange((params) => {
      theme.value = params;
      colorScheme.value = getColorScheme();
    });
    onViewportChanged(() => {
      // В этой версии только фиксируем событие; тяжелые пересчеты не требуются
    });
  }
  appStore.ensureReady();
});

watch(
  theme,
  (params) => {
    if (typeof document === 'undefined') {
      return;
    }
    const root = document.documentElement;
    Object.entries(params || {}).forEach(([key, value]) => {
      root.style.setProperty(`--tg-theme-${key.replace(/_/g, '-')}`, value);
    });
  },
  { immediate: true }
);

watch(
  colorScheme,
  (scheme) => {
    if (typeof document === 'undefined') {
      return;
    }
    document.documentElement.dataset.colorScheme = scheme || 'light';
  },
  { immediate: true }
);
</script>

<style scoped>
.app {
  min-height: 100vh;
  background: var(--tg-theme-secondary-bg-color, #f5f7fb);
  position: relative;
}

.app__content {
  padding-bottom: 100px;
  overflow-y: auto;
}

.app--loading {
  display: flex;
  justify-content: center;
  align-items: center;
}

.app__overlay {
  position: fixed;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(2px);
  z-index: 20;
}

.error-banner {
  position: fixed;
  bottom: 80px;
  left: 16px;
  right: 16px;
  background: rgba(214, 45, 48, 0.92);
  color: #ffffff;
  padding: 10px 14px;
  border-radius: 12px;
  text-align: center;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

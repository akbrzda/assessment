<template>
  <header class="topbar">
    <div class="topbar-content">
      <!-- Кнопка меню (мобильные) -->
      <button @click="$emit('toggle-sidebar')" class="menu-btn">
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div class="page-title-container">
        <h1 class="page-title">{{ pageTitle }}</h1>
      </div>

      <div class="topbar-actions">
        <!-- Индикатор подключения WebSocket -->
        <div
          class="connection-status"
          :class="{ connected: isConnected, disconnected: !isConnected }"
          :title="isConnected ? 'Подключено' : 'Отключено'"
        >
          <span class="status-dot"></span>
        </div>

        <!-- Переключатель темы -->
        <button @click="toggleTheme" class="action-btn" title="Переключить тему">
          <span class="theme-icon">
            <Icon v-if="theme === 'light'" name="Moon" size="24" color="black" />
            <Icon v-else name="Sun" size="24" color="white" />
          </span>
        </button>
        <!-- Профиль пользователя -->
        <div class="user-profile">
          <div class="user-info">
            <div class="user-name">{{ user?.first_name }} {{ user?.last_name }}</div>
            <div class="user-role">
              {{ roleLabel }}
            </div>
          </div>

          <!-- Кнопка выхода -->
          <button @click="handleLogout" class="logout-btn">Выйти</button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "../../stores/auth";
import { useThemeStore } from "../../stores/theme";
import { useWebSocket } from "../../composables/useWebSocket";
import Icon from "../ui/Icon.vue";

const themeStore = useThemeStore();
const theme = computed(() => themeStore.theme);

const toggleTheme = () => {
  themeStore.toggleTheme();
};

const { isConnected } = useWebSocket();

defineEmits(["toggle-sidebar"]);

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const user = computed(() => authStore.user);

const pageTitle = computed(() => {
  const titles = {
    dashboard: "Дашборд",
    users: "Управление пользователями",
    invitations: "Приглашения для управляющих",
    assessments: "Управление аттестациями",
    questions: "Банк вопросов",
    reports: "Отчёты и аналитика",
    branches: "Управление филиалами",
    positions: "Управление должностями",
    settings: "Настройки системы",
    logs: "Журнал действий",
  };
  return titles[route.name?.toLowerCase()] || "Админ-панель";
});

const roleLabel = computed(() => {
  return authStore.isSuperAdmin ? "Суперадмин" : "Управляющий";
});

const handleLogout = async () => {
  await authStore.logout();
  router.push("/login");
};
</script>

<style scoped>
.topbar {
  height: 72px;
  background: var(--nav-bg);
  border-bottom: 1px solid var(--divider);
  position: fixed;
  top: 0;
  right: 0;
  left: 264px;
  z-index: 30;
  transition: left 0.3s ease;
  backdrop-filter: blur(18px);
}

@media (max-width: 1023px) {
  .topbar {
    left: 0;
  }
}

.topbar-content {
  height: 100%;
  padding: 0 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.menu-btn {
  display: none;
  padding: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-primary);
  border-radius: 6px;
  transition: all 0.2s;
}

@media (max-width: 1023px) {
  .menu-btn {
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.menu-btn:hover {
  background: var(--bg-secondary);
}

.menu-btn .icon {
  width: 24px;
  height: 24px;
}

.page-title-container {
  flex: 1;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

@media (max-width: 768px) {
  .page-title {
    font-size: 16px;
  }
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.action-btn {
  padding: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover {
  background: var(--bg-secondary);
}

.theme-icon {
  font-size: 20px;
  display: block;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-left: 12px;
  border-left: 1px solid var(--border-color);
}

.user-info {
  text-align: right;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1.4;
}

.user-role {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
}

.logout-btn {
  padding: 10px 18px;
  background: #ffffff14;
  color: var(--text-primary);
  border: 1px solid var(--divider);
  border-radius: 14px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.logout-btn:hover {
  opacity: 0.6;
}

.connection-status {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 12px;
  cursor: help;
  transition: all 0.2s;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.connection-status.connected .status-dot {
  background: #10b981;
  box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5);
}

.connection-status.disconnected .status-dot {
  background: #ef4444;
  box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5);
  animation: pulse-red 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(16, 185, 129, 0);
  }
}

@keyframes pulse-red {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(239, 68, 68, 0);
  }
}

@media (max-width: 1024px) {
  .topbar-content {
    padding: 0 12px;
  }
}

@media (max-width: 640px) {
  .logout-btn {
    padding: 8px 12px;
    font-size: 13px;
  }
  .user-info {
    display: none;
  }
  .user-profile {
    border-left: none;
    padding-left: 0;
  }
}
</style>

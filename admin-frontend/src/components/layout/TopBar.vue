<template>
  <header class="topbar" :class="{ collapsed: sidebarCollapsed }">
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

        <div class="theme-toggle">
          <div class="theme-toggle-group" role="group" aria-label="Переключение темы">
            <button
              v-for="option in themeOptions"
              :key="option.mode"
              class="theme-toggle-btn"
              :class="{ active: isThemeActive(option.mode) }"
              :title="getThemeButtonTitle(option.mode)"
              @click="selectTheme(option.mode)"
            >
              <Icon :name="option.icon" size="16" aria-hidden="true" />
              <span class="theme-toggle-label">{{ option.label }}</span>
            </button>
          </div>
        </div>

        <!-- Профильное меню -->
        <div class="profile-menu" :class="{ 'is-open': isProfileMenuOpen }">
          <button @click="toggleProfileMenu" class="profile-trigger" title="Меню профиля">
            <div class="profile-avatar">
              <img v-if="authStore.user?.avatarUrl" :src="authStore.user.avatarUrl" alt="Avatar" />
              <Icon v-else name="User" size="18" />
            </div>
            <div class="profile-info">
              <p class="profile-name">{{ getUserFullName }}</p>
              <p class="profile-role">{{ getRoleLabel(authStore.user?.role) }}</p>
            </div>
            <Icon name="ChevronDown" size="16" class="profile-chevron" />
          </button>

          <transition name="dropdown">
            <div v-if="isProfileMenuOpen" class="profile-dropdown">
              <router-link to="/profile" class="dropdown-item" @click="handleProfileClick">
                <Icon name="User" size="16" />
                <span>Профиль</span>
              </router-link>
              <button @click="handleLogout" class="dropdown-item">
                <Icon name="LogOut" size="16" />
                <span>Выйти</span>
              </button>
            </div>
          </transition>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useThemeStore } from "../../stores/theme";
import { useAuthStore } from "../../stores/auth";
import { useWebSocket } from "../../composables/useWebSocket";
import Icon from "../ui/Icon.vue";

const authStore = useAuthStore();
const router = useRouter();
const isProfileMenuOpen = ref(false);
const profileMenuRef = ref(null);

defineProps({
  sidebarCollapsed: {
    type: Boolean,
    default: false,
  },
});

const themeStore = useThemeStore();
const themeMode = computed(() => themeStore.themeMode);

const themeOptions = [
  { mode: "light", label: "", icon: "Sun" },
  { mode: "dark", label: "", icon: "Moon" },
];

const isThemeActive = (mode) => themeMode.value === mode;

const selectTheme = (mode) => {
  if (!mode || themeMode.value === mode) {
    return;
  }
  themeStore.setThemeMode(mode);
};

const getThemeButtonTitle = (mode) => {
  const label = mode === "dark" ? "тёмную" : "светлую";
  if (themeMode.value === mode) {
    return `Сейчас активна ${label} тема`;
  }
  return `Переключить на ${label} тему`;
};

const { isConnected } = useWebSocket();

defineEmits(["toggle-sidebar"]);

const route = useRoute();

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

const getUserFullName = computed(() => {
  const firstName = authStore.user?.firstName || authStore.user?.first_name || "";
  const lastName = authStore.user?.lastName || authStore.user?.last_name || "";
  return `${firstName} ${lastName}`.trim() || "Пользователь";
});

const getRoleLabel = (role) => {
  const labels = {
    superadmin: "Суперадмин",
    manager: "Управляющий",
    user: "Пользователь",
  };
  return labels[role] || role;
};

const toggleProfileMenu = () => {
  isProfileMenuOpen.value = !isProfileMenuOpen.value;
};

const handleProfileClick = () => {
  isProfileMenuOpen.value = false;
};

const handleLogout = async () => {
  isProfileMenuOpen.value = false;
  await authStore.logout();
  router.push("/login");
};

// Закрытие меню при клике вне его
const handleClickOutside = (event) => {
  const profileMenu = document.querySelector('.profile-menu');
  if (profileMenu && !profileMenu.contains(event.target)) {
    isProfileMenuOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
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

.topbar.collapsed {
  left: 72px;
}

@media (max-width: 1023px) {
  .topbar {
    left: 0;
  }

  .topbar.collapsed {
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

.theme-toggle {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.theme-toggle-group {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--divider);
  border-radius: 999px;
  padding: 2px;
  background: var(--surface-card);
  gap: 4px;
}

.theme-toggle-btn {
  border: none;
  background: transparent;
  border-radius: 999px;
  padding: 6px 14px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.theme-toggle-btn:hover {
  color: var(--text-primary);
}

.theme-toggle-btn.active {
  background: var(--nav-active-bg);
  color: var(--nav-active-text);
}

.theme-toggle-label {
  white-space: nowrap;
}

@media (max-width: 768px) {
  .theme-toggle {
    align-items: center;
  }

  .theme-toggle-btn {
    padding: 6px;
  }

  .theme-toggle-label {
    display: none;
  }
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

/* Profile Menu */
.profile-menu {
  position: relative;
}

.profile-trigger {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border: none;
  background: var(--surface-card);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-primary);
}

.profile-trigger:hover {
  background: var(--nav-hover-bg);
}

.profile-menu.is-open .profile-trigger {
  background: var(--nav-hover-bg);
}

.profile-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--text-secondary);
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-info {
  text-align: left;
  min-width: 0;
}

.profile-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.profile-role {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.profile-chevron {
  flex-shrink: 0;
  transition: transform 0.2s;
  color: var(--text-secondary);
}

.profile-menu.is-open .profile-chevron {
  transform: rotate(180deg);
}

.profile-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  background: var(--surface-card);
  border: 1px solid var(--divider);
  border-radius: 12px;
  margin-top: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  min-width: 200px;
  z-index: 50;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
}

.dropdown-item:hover {
  background: var(--nav-hover-bg);
}

.dropdown-item:not(:last-child) {
  border-bottom: 1px solid var(--divider);
}

/* Dropdown Animation */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.dropdown-enter-to,
.dropdown-leave-from {
  opacity: 1;
  transform: translateY(0);
}

@media (max-width: 1024px) {
  .topbar-content {
    padding: 0 12px;
  }
}

@media (max-width: 768px) {
  .profile-info {
    display: none;
  }
  
  .profile-chevron {
    display: none;
  }
  
  .profile-trigger {
    padding: 8px;
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

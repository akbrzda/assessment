<template>
  <header class="topbar" :class="{ collapsed: sidebarCollapsed }">
    <div class="topbar-content">
      <!-- Кнопка меню -->
      <button @click="$emit('toggle-sidebar')" class="menu-btn">
        <Icon name="Menu" class="menu-icon" :size="24" aria-hidden="true" />
      </button>

      <!-- Хлебные крошки -->
      <nav class="breadcrumb" aria-label="Навигация">
        <router-link to="/dashboard" class="breadcrumb-home" title="Главная">
          <Icon name="Home" :size="16" />
        </router-link>
        <template v-for="(crumb, i) in breadcrumbs" :key="crumb.path">
          <span class="breadcrumb-sep">›</span>
          <router-link :to="crumb.path" class="breadcrumb-item" :class="{ 'is-last': i === breadcrumbs.length - 1 }">{{ crumb.label }}</router-link>
        </template>
      </nav>

      <div class="topbar-actions">
        <div class="global-search">
          <Icon name="Search" :size="16" class="search-icon" aria-hidden="true" />
          <input v-model="searchQuery" type="search" class="global-search-input" placeholder="Поиск..." @input="handleSearchInput" />
          <kbd class="search-kbd">⌘K</kbd>
          <div v-if="showSearchResults" class="global-search-dropdown">
            <div v-if="searchLoading" class="global-search-empty">Поиск...</div>
            <template v-else>
              <button v-for="item in flattenedSearchResults" :key="item.key" class="global-search-item" @click="openSearchResult(item)">
                <span class="global-search-type">{{ item.type }}</span>
                <span class="global-search-title">{{ item.title }}</span>
              </button>
              <div v-if="flattenedSearchResults.length === 0" class="global-search-empty">Ничего не найдено</div>
            </template>
          </div>
        </div>

        <!-- Переключатель темы -->
        <button class="theme-btn" @click="toggleTheme" :title="themeToggleTitle" aria-label="Переключить тему">
          <Icon :name="themeMode === 'dark' ? 'Sun' : 'Moon'" :size="18" aria-hidden="true" />
        </button>

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
              <div class="dropdown-header">
                <div class="dropdown-avatar">
                  <img v-if="authStore.user?.avatarUrl" :src="authStore.user.avatarUrl" alt="Avatar" />
                  <Icon v-else name="User" size="22" />
                </div>
                <div class="dropdown-user-info">
                  <p class="dropdown-name">{{ getUserFullName }}</p>
                  <p class="dropdown-role">{{ getRoleLabel(authStore.user?.role) }}</p>
                </div>
              </div>
              <div class="dropdown-divider"></div>
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
import { globalSearch } from "../../api/users";
import Icon from "../ui/Icon.vue";

const authStore = useAuthStore();
const router = useRouter();
const isProfileMenuOpen = ref(false);
const searchQuery = ref("");
const searchLoading = ref(false);
const searchResults = ref({ users: [], assessments: [], questions: [] });
const showSearchResults = ref(false);
let searchDebounceTimer = null;

defineProps({
  sidebarCollapsed: {
    type: Boolean,
    default: false,
  },
});

const themeStore = useThemeStore();
const themeMode = computed(() => themeStore.themeMode);

const toggleTheme = () => {
  themeStore.setThemeMode(themeMode.value === "dark" ? "light" : "dark");
};

const themeToggleTitle = computed(() => (themeMode.value === "dark" ? "Переключить на светлую тему" : "Переключить на тёмную тему"));

defineEmits(["toggle-sidebar"]);

const route = useRoute();

const sectionLabels = {
  dashboard: "Дашборд",
  users: "Пользователи",
  courses: "Курсы",
  assessments: "Аттестации",
  questions: "Банк вопросов",
  reports: "Отчёты",
  branches: "Филиалы",
  positions: "Должности",
  invitations: "Приглашения",
  settings: "Настройки",
  profile: "Профиль",
};

const breadcrumbs = computed(() => {
  const segments = route.path.split("/").filter(Boolean);
  if (!segments.length) return [];

  const crumbs = [];
  const sectionLabel = sectionLabels[segments[0]];
  if (sectionLabel) {
    crumbs.push({ label: sectionLabel, path: "/" + segments[0] });
  }

  if (segments.length > 1 && route.meta?.title) {
    crumbs.push({ label: route.meta.title, path: route.path });
  }

  return crumbs;
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

const flattenedSearchResults = computed(() => {
  const users = (searchResults.value.users || []).map((user) => ({
    key: `u-${user.id}`,
    type: "Пользователь",
    title: `${user.first_name} ${user.last_name}`,
    route: `/users`,
  }));
  const assessments = (searchResults.value.assessments || []).map((assessment) => ({
    key: `a-${assessment.id}`,
    type: "Аттестация",
    title: assessment.title,
    route: `/assessments/${assessment.id}`,
  }));
  const questions = (searchResults.value.questions || []).map((question) => ({
    key: `q-${question.id}`,
    type: "Вопрос",
    title: question.question_text,
    route: `/questions/${question.id}`,
  }));

  return [...users, ...assessments, ...questions].slice(0, 10);
});

const handleSearchInput = () => {
  const query = String(searchQuery.value || "").trim();
  showSearchResults.value = query.length >= 2;

  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
  }

  if (query.length < 2) {
    searchResults.value = { users: [], assessments: [], questions: [] };
    return;
  }

  searchDebounceTimer = setTimeout(async () => {
    try {
      searchLoading.value = true;
      searchResults.value = await globalSearch({ query, limit: 6 });
    } catch {
      searchResults.value = { users: [], assessments: [], questions: [] };
    } finally {
      searchLoading.value = false;
    }
  }, 250);
};

const openSearchResult = (item) => {
  showSearchResults.value = false;
  searchQuery.value = "";
  router.push(item.route);
};

// Закрытие меню при клике вне его
const handleClickOutside = (event) => {
  const profileMenu = document.querySelector(".profile-menu");
  if (profileMenu && !profileMenu.contains(event.target)) {
    isProfileMenuOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
  }
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
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-primary);
  border-radius: 6px;
  transition: all 0.2s;
  flex-shrink: 0;
}

.menu-btn:hover {
  background: var(--bg-secondary);
}

.menu-btn .menu-icon {
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

/* Хлебные крошки */
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.breadcrumb-home {
  display: flex;
  align-items: center;
  color: var(--text-secondary);
  flex-shrink: 0;
  transition: color 0.15s;
}

.breadcrumb-home:hover {
  color: var(--text-primary);
}

.breadcrumb-sep {
  color: var(--text-secondary);
  font-size: 16px;
  flex-shrink: 0;
  line-height: 1;
  font-weight: 300;
}

.breadcrumb-item {
  font-size: 14px;
  color: var(--text-secondary);
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.15s;
}

.breadcrumb-item:hover {
  color: var(--text-primary);
}

.breadcrumb-item.is-last {
  color: #7c3aed;
  font-weight: 500;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Переключатель темы */
.theme-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--divider);
  background: var(--surface-card);
  color: var(--text-secondary);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.theme-btn:hover {
  background: var(--nav-hover-bg);
  color: var(--text-primary);
}

/* Dropdown header с инфо о пользователе */
.dropdown-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
}

.dropdown-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--text-secondary);
}

.dropdown-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.dropdown-user-info {
  min-width: 0;
}

.dropdown-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dropdown-role {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
  white-space: nowrap;
}

.dropdown-divider {
  height: 1px;
  background: var(--divider);
  margin: 0;
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
.global-search {
  position: relative;
  width: 280px;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 10px;
  color: var(--text-secondary);
  pointer-events: none;
  z-index: 1;
}

.global-search-input {
  width: 100%;
  height: 36px;
  border-radius: 10px;
  border: 1px solid var(--divider);
  background: var(--bg-secondary);
  color: var(--text-primary);
  padding: 0 56px 0 34px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.global-search-input:focus {
  border-color: #7c3aed;
}

.global-search-input::placeholder {
  color: var(--text-secondary);
}

.search-kbd {
  position: absolute;
  right: 8px;
  font-family: inherit;
  font-size: 11px;
  color: var(--text-secondary);
  background: var(--surface-card);
  border: 1px solid var(--divider);
  border-radius: 6px;
  padding: 2px 5px;
  pointer-events: none;
  line-height: 1.4;
}

.global-search-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: var(--bg-elevated);
  border: 1px solid var(--divider);
  border-radius: 10px;
  box-shadow: 0 12px 24px #00000026;
  overflow: hidden;
  z-index: 40;
}

.global-search-item {
  width: 100%;
  border: none;
  background: transparent;
  text-align: left;
  padding: 10px 12px;
  display: grid;
  grid-template-columns: 90px 1fr;
  gap: 8px;
  cursor: pointer;
}

.global-search-item:hover {
  background: var(--bg-secondary);
}

.global-search-type {
  color: var(--text-muted);
  font-size: 12px;
}

.global-search-title {
  color: var(--text-primary);
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.global-search-empty {
  padding: 12px;
  color: var(--text-muted);
  font-size: 13px;
}

@media (max-width: 1023px) {
  .global-search {
    display: none;
  }
}
</style>

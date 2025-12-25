<template>
  <aside class="sidebar" :class="{ 'is-open': isOpen, 'is-collapsed': isCollapsed }">
    <div class="sidebar-inner">
      <div class="sidebar-header">
        <div class="sidebar-brand">
          <div v-if="!isCollapsed" class="sidebar-title-wrapper">
            <h1 class="sidebar-title">Управление</h1>
            <!-- <p class="sidebar-subtitle">Центр управления</p>-->
          </div>
        </div>
        <div class="sidebar-header-actions">
          <button
            v-if="!isMobile"
            @click="$emit('toggle-collapse')"
            class="collapse-btn"
            :title="collapseTitle"
            aria-label="Переключить ширину сайдбара"
          >
            <Icon :name="isCollapsed ? 'ChevronRight' : 'ChevronLeft'" size="18" aria-hidden="true" />
          </button>
          <button @click="$emit('close')" class="close-btn" aria-label="Закрыть меню">
            <Icon name="X" size="18" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div class="sidebar-content">
        <nav class="sidebar-nav">
          <router-link
            v-for="item in menuItems"
            :key="item.path"
            :to="item.path"
            class="nav-item"
            active-class="active"
            :title="item.label"
            @click="handleNavClick"
          >
            <span class="nav-icon">
              <Icon :name="item.icon" size="20" aria-hidden="true" />
            </span>
            <span class="nav-label">{{ item.label }}</span>
          </router-link>
        </nav>
      </div>

      <div class="sidebar-footer">
        <div class="profile-menu" :class="{ 'is-open': isProfileMenuOpen }">
          <button @click="toggleProfileMenu" class="profile-trigger" :title="profileTitle">
            <div class="profile-avatar">
              <img v-if="authStore.user?.avatarUrl" :src="authStore.user.avatarUrl" alt="Avatar" />
              <Icon v-else name="User" size="18" />
            </div>
            <div v-if="!isCollapsed" class="profile-info">
              <p class="profile-name">{{ getUserFullName }}</p>
              <p class="profile-role">{{ getRoleLabel(authStore.user?.role) }}</p>
            </div>
            <Icon v-if="!isCollapsed" name="ChevronUp" size="16" class="profile-chevron" />
          </button>

          <transition name="dropdown">
            <div v-if="isProfileMenuOpen" class="profile-dropdown" :class="{ 'is-collapsed': isCollapsed }">
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
  </aside>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../../stores/auth";
const authStore = useAuthStore();
import { Icon } from "../ui";

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: true,
  },
  isCollapsed: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["close", "toggle-collapse"]);

const router = useRouter();
const isMobile = ref(false);
const isProfileMenuOpen = ref(false);

const collapseTitle = computed(() => (props.isCollapsed ? "Развернуть меню" : "Свернуть меню"));

const getUserFullName = computed(() => {
  // Поддержка старого формата (first_name, last_name) и нового (firstName, lastName)
  const firstName = authStore.user?.firstName || authStore.user?.first_name || "";
  const lastName = authStore.user?.lastName || authStore.user?.last_name || "";
  return `${firstName} ${lastName}`.trim() || "Пользователь";
});

const profileTitle = computed(() => {
  return props.isCollapsed ? getUserFullName.value : "Меню профиля";
});

const getRoleLabel = (role) => {
  const labels = {
    superadmin: "Суперадмин",
    manager: "Управляющий",
    user: "Пользователь",
  };
  return labels[role] || role;
};

const menuItems = computed(() => {
  const items = [
    { path: "/dashboard", label: "Дашборд", icon: "LayoutDashboard" },
    { path: "/users", label: "Пользователи", icon: "Users", module: "users" },
    { path: "/assessments", label: "Аттестации", icon: "ClipboardList", module: "assessments" },
    { path: "/questions", label: "Банк вопросов", icon: "FileQuestion", module: "questions" },
    { path: "/reports", label: "Отчёты", icon: "BarChart3", module: "analytics" },
  ];

  // Разделы только для superadmin (или с индивидуальными правами для manager)
  if (authStore.isSuperAdmin || authStore.hasModuleAccess("invitations")) {
    items.splice(2, 0, { path: "/invitations", label: "Приглашения", icon: "Link2", module: "invitations" });
  }

  if (authStore.isSuperAdmin || authStore.hasModuleAccess("branches")) {
    items.push({ path: "/branches", label: "Филиалы", icon: "Building2", module: "branches" });
  }

  if (authStore.isSuperAdmin || authStore.hasModuleAccess("positions")) {
    items.push({ path: "/positions", label: "Должности", icon: "Briefcase", module: "positions" });
  }

  if (authStore.isSuperAdmin || authStore.hasModuleAccess("settings")) {
    items.push({ path: "/settings", label: "Настройки", icon: "Settings", module: "settings" });
  }

  // Фильтруем пункты меню на основе прав
  return items.filter((item) => {
    if (!item.module) return true; // Если нет модуля, показываем всегда
    return authStore.hasModuleAccess(item.module);
  });
});

const handleNavClick = () => {
  // Закрыть сайдбар на мобильных после клика
  if (window.innerWidth < 1024) {
    emit("close");
  }
  // Закрыть профильное меню при переходе
  isProfileMenuOpen.value = false;
};

const toggleProfileMenu = () => {
  isProfileMenuOpen.value = !isProfileMenuOpen.value;
};

const handleProfileClick = () => {
  isProfileMenuOpen.value = false;
  if (window.innerWidth < 1024) {
    emit("close");
  }
};

const handleLogout = async () => {
  isProfileMenuOpen.value = false;
  await authStore.logout();
  router.push("/login");
};

const updateIsMobile = () => {
  isMobile.value = window.innerWidth < 1024;
};

onMounted(() => {
  updateIsMobile();
  window.addEventListener("resize", updateIsMobile);
});

onUnmounted(() => {
  window.removeEventListener("resize", updateIsMobile);
});
</script>

<style scoped>
.sidebar {
  width: 264px;
  background: var(--nav-bg);
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  border-right: 1px solid var(--divider);
  z-index: 40;
  transition: transform 0.3s ease;
  backdrop-filter: blur(18px);
  display: flex;
}

.sidebar-inner {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.sidebar.is-collapsed {
  width: 72px;
}

@media (max-width: 1023px) {
  .sidebar {
    transform: translateX(-100%);
  }

  .sidebar.is-open {
    transform: translateX(0);
  }

  .sidebar.is-collapsed {
    width: 264px;
  }
}

.sidebar-header {
  border-bottom: 1px solid var(--divider);
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  gap: 12px;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.brand-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  color: var(--text-primary);
  flex-shrink: 0;
}

.sidebar-title-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sidebar-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.sidebar-subtitle {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
}

.sidebar-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.collapse-btn {
  border: 1px solid var(--divider);
  background: var(--surface-card);
  color: var(--text-secondary);
  border-radius: 999px;
  padding: 6px;
  cursor: pointer;
  transition: all 0.2s;
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.collapse-btn:hover {
  background: var(--nav-hover-bg);
  color: var(--text-primary);
}

.close-btn {
  border: 1px solid var(--divider);
  background: transparent;
  color: var(--text-secondary);
  border-radius: 999px;
  padding: 6px;
  cursor: pointer;
  transition: all 0.2s;
  width: 36px;
  height: 36px;
  display: none;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: var(--nav-hover-bg);
  color: var(--text-primary);
}

@media (max-width: 1023px) {
  .close-btn {
    display: inline-flex;
  }

  .collapse-btn {
    display: none;
  }
}

.sidebar-content {
  padding: 18px;
  flex: 1;
  overflow-y: auto;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-radius: 20px;
}

.sidebar.is-collapsed .sidebar-nav {
  align-items: center;
}

.sidebar.is-collapsed .sidebar-brand {
  display: none;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 14px;
  color: var(--text-secondary);
  text-decoration: none;
  transition: all 0.2s;
  font-weight: 500;
  position: relative;
  min-height: 44px;
  width: 100%;
}

.sidebar.is-collapsed .nav-item {
  justify-content: center;
  width: auto;
}

.nav-item:hover {
  background: var(--nav-hover-bg);
  color: var(--nav-hover-text);
}

.nav-item.active {
  background: var(--nav-active-bg);
  color: var(--nav-active-text);
  font-weight: 600;
}

.nav-icon {
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  flex-shrink: 0;
}

.nav-label {
  font-size: 14px;
  line-height: 1.3;
  white-space: nowrap;
}

.sidebar.is-collapsed .nav-label {
  display: none;
}

/* Sidebar Footer */
.sidebar-footer {
  border-top: 1px solid var(--divider);
  padding: 12px 18px;
  margin-top: auto;
}

.profile-menu {
  position: relative;
}

.profile-trigger {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: var(--surface-card);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-primary);
}

.sidebar.is-collapsed .profile-trigger {
  justify-content: center;
  padding: 8px;
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
  flex: 1;
  text-align: left;
  min-width: 0;
}

.sidebar.is-collapsed .profile-info {
  display: none;
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

.sidebar.is-collapsed .profile-chevron {
  display: none;
}

.profile-dropdown {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  background: var(--surface-card);
  border: 1px solid var(--divider);
  border-radius: 12px;
  margin-bottom: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.profile-dropdown.is-collapsed {
  left: 100%;
  right: auto;
  bottom: 0;
  margin-left: 8px;
  margin-bottom: 0;
  min-width: 180px;
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
  transform: translateY(8px);
}

.dropdown-enter-to,
.dropdown-leave-from {
  opacity: 1;
  transform: translateY(0);
}
</style>

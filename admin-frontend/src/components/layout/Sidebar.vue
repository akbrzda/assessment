<template>
  <aside class="sidebar" :class="{ 'is-open': isOpen }">
    <div class="sidebar-header">
      <h1 class="sidebar-title">Админ-панель</h1>
      <!-- Кнопка закрытия для мобильных -->
      <button @click="$emit('close')" class="close-btn" aria-label="Закрыть меню">
        <Icon name="X" size="20" aria-hidden="true" />
      </button>
    </div>

    <nav class="sidebar-nav">
      <router-link v-for="item in menuItems" :key="item.path" :to="item.path" class="nav-item" active-class="active" @click="handleNavClick">
        <span class="nav-icon">
          <Icon :name="item.icon" size="20" aria-hidden="true" />
        </span>
        <span class="nav-label">{{ item.label }}</span>
      </router-link>
    </nav>
  </aside>
</template>

<script setup>
import { computed } from "vue";
import { useAuthStore } from "../../stores/auth";
import { Icon } from "../ui";

defineProps({
  isOpen: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(["close"]);

const authStore = useAuthStore();

const menuItems = computed(() => {
  const items = [
    { path: "/dashboard", label: "Дашборд", icon: "LayoutDashboard" },
    { path: "/users", label: "Пользователи", icon: "Users" },
    { path: "/assessments", label: "Аттестации", icon: "ClipboardList" },
    { path: "/questions", label: "Банк вопросов", icon: "FileQuestion" },
    { path: "/reports", label: "Отчёты", icon: "BarChart3" },
  ];

  // Разделы только для superadmin
  if (authStore.isSuperAdmin) {
    items.splice(2, 0, { path: "/invitations", label: "Приглашения", icon: "Link2" });
    items.push({ path: "/branches", label: "Филиалы", icon: "Building2" });
    items.push({ path: "/positions", label: "Должности", icon: "Briefcase" });
    items.push({ path: "/settings", label: "Настройки", icon: "Settings" });
  }

  return items;
});

const handleNavClick = () => {
  // Закрыть сайдбар на мобильных после клика
  if (window.innerWidth < 1024) {
    emit("close");
  }
};
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
  overflow-y: auto;
  z-index: 40;
  transition: transform 0.3s ease;
  backdrop-filter: blur(18px);
}

@media (max-width: 1023px) {
  .sidebar {
    transform: translateX(-100%);
  }

  .sidebar.is-open {
    transform: translateX(0);
  }
}

.sidebar-header {
  border-bottom: 1px solid var(--divider);
  position: relative;
  min-height: 72px;
  display: flex;
  align-items: center;
  padding-left: 20px;
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
  margin: 4px 0 0 0;
}

.close-btn {
  display: none;
  position: absolute;
  right: 16px;
  top: 16px;
  padding: 6px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  border-radius: 6px;
  transition: all 0.2s;
}

@media (max-width: 1023px) {
  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.close-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.close-btn .icon {
  width: 20px;
  height: 20px;
}

.sidebar-nav {
  padding: 18px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  margin-bottom: 10px;
  border-radius: 14px;
  color: var(--text-secondary);
  text-decoration: none;
  transition: all 0.2s;
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
}

.nav-label {
  font-size: 14px;
}
</style>

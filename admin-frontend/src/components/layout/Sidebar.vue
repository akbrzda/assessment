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
    </div>
  </aside>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from "vue";
import { useAuthStore } from "../../stores/auth";
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

const authStore = useAuthStore();
const isMobile = ref(false);

const collapseTitle = computed(() => (props.isCollapsed ? "Развернуть меню" : "Свернуть меню"));

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
</style>

<template>
  <nav class="bottom-navigation">
    <div class="bottom-nav-divider"></div>
    <div class="bottom-nav-content">
      <router-link v-for="item in navigationItems" :key="item.name" :to="item.to" class="nav-item" :class="{ active: $route.name === item.name }">
        <div class="nav-icon">
          <component :is="item.icon" />
        </div>
        <span class="nav-label">{{ item.label }}</span>
      </router-link>
    </div>
  </nav>
</template>

<script>
import { computed } from "vue";
import { BookOpenCheck, Home, Trophy, User } from "lucide-vue-next";
import { useUserStore } from "../stores/user";

export default {
  name: "BottomNavigation",
  setup() {
    const userStore = useUserStore();

    const navigationItems = computed(() =>
      [
        {
          name: "dashboard",
          to: "/dashboard",
          label: "Главная",
          icon: Home,
        },
        userStore.hasModuleAccess("courses") && {
          name: "assessments",
          to: "/assessments",
          label: "Курсы",
          icon: BookOpenCheck,
          featured: true,
        },
        userStore.hasModuleAccess("gamification") && {
          name: "leaderboard",
          to: "/leaderboard",
          label: "Лидерборд",
          icon: Trophy,
        },
        {
          name: "profile",
          to: "/profile",
          label: "Профиль",
          icon: User,
        },
      ].filter(Boolean),
    );

    return {
      navigationItems,
    };
  },
};
</script>

<style scoped>
.bottom-navigation {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: var(--bg-primary);
  border-top: 1px solid var(--divider);
  z-index: 1000;
}

.bottom-nav-divider {
  display: none;
}

.bottom-nav-content {
  display: flex;
  height: 60px;
  align-items: stretch;
}

.platform-mobile .bottom-nav-content {
  height: 78px;
  padding-bottom: 18px;
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: var(--text-secondary);
  transition: color 0.18s ease;
  padding: 6px 4px;
  gap: 3px;
}

.nav-item:nth-child(2) {
  position: relative;
}

.nav-item:nth-child(2)::after {
  content: "";
  position: absolute;
  bottom: 4px;
  width: 28px;
  height: 2px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 70%, transparent 30%);
  opacity: 0.7;
}

.nav-item.active {
  color: var(--accent);
}

.nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-icon :deep(svg) {
  width: 26px;
  height: 26px;
}

.nav-item.active .nav-icon :deep(svg) {
  stroke-width: 2.2;
}

.nav-label {
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
}
</style>

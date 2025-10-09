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
import { useUserStore } from "../stores/user";
import HomeIcon from "./icons/HomeIcon.vue";
import AssessmentIcon from "./icons/AssessmentIcon.vue";
import TrophyIcon from "./icons/TrophyIcon.vue";
import UserAvatar from "./UserAvatar.vue";

export default {
  name: "BottomNavigation",
  components: {
    HomeIcon,
    AssessmentIcon,
    TrophyIcon,
    UserAvatar,
  },
  setup() {
    const userStore = useUserStore();

    const navigationItems = computed(() => [
      {
        name: "dashboard",
        to: "/dashboard",
        label: "Главная",
        icon: HomeIcon,
      },
      {
        name: "assessments",
        to: "/assessments",
        label: "Аттестации",
        icon: AssessmentIcon,
      },
      {
        name: "leaderboard",
        to: "/leaderboard",
        label: "Рейтинг",
        icon: TrophyIcon,
      },
      {
        name: "profile",
        to: "/profile",
        label: "Профиль",
        icon: UserAvatar,
      },
    ]);

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
  background-color: var(--blur-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  z-index: 1000;
}

.bottom-nav-divider {
  height: 1px;
  background-color: var(--divider);
}

.bottom-nav-content {
  display: flex;
  height: 56px;
  align-items: stretch;
}

.platform-mobile .bottom-nav-content {
  height: 76px;
  padding-bottom: 16px;
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: var(--text-secondary);
  transition: color 0.2s ease;
  padding: 6px 4px;
}

.nav-item.active {
  color: var(--accent-blue);
}

.nav-icon {
  width: 24px;
  height: 24px;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-icon :deep(svg) {
  width: 24px;
  height: 24px;
}

.nav-label {
  font-size: 10px;
  font-weight: 500;
  line-height: 1;
}

@media (max-width: 480px) {
  .nav-label {
    font-size: 9px;
  }
}
</style>

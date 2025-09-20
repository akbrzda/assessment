<template>
  <nav class="bottom-nav">
    <RouterLink
      v-for="item in items"
      :key="item.name"
      :to="{ name: item.name }"
      class="bottom-nav__item"
      :class="{ 'bottom-nav__item--active': route.name === item.name }"
    >
      <AvatarCircle
        v-if="item.avatar"
        :avatar-url="item.avatar.url"
        :first-name="item.avatar.firstName"
        :last-name="item.avatar.lastName"
        :size="28"
        class="bottom-nav__avatar"
      />
      <span v-else class="bottom-nav__icon">{{ item.icon }}</span>
      <span class="bottom-nav__label">{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>

<script setup>
import { useRoute } from 'vue-router';
import AvatarCircle from './common/AvatarCircle.vue';

const props = defineProps({
  items: {
    type: Array,
    default: () => [
      { name: 'dashboard', label: 'Главная', icon: '🏠' },
      { name: 'assessments', label: 'Аттестации', icon: '📝' },
      { name: 'leaderboard', label: 'Лидеры', icon: '🏆' },
      { name: 'profile', label: 'Профиль', icon: '👤' }
    ]
  }
});

const route = useRoute();
</script>

<style scoped>
.bottom-nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(64px, 1fr));
  background: var(--tg-theme-secondary-bg-color, #f5f7fb);
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  padding-bottom: env(safe-area-inset-bottom);
}

.bottom-nav__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px 8px;
  text-decoration: none;
  color: var(--tg-theme-hint-color, #6f7a8b);
  font-size: 12px;
  transition: color 0.2s ease;
  gap: 2px;
}

.bottom-nav__item--active {
  color: var(--tg-theme-button-color, #0a84ff);
  font-weight: 600;
}

.bottom-nav__icon {
  font-size: 16px;
  line-height: 1;
}

.bottom-nav__avatar {
  width: 28px;
  height: 28px;
}

.bottom-nav__label {
  margin-top: 2px;
}
</style>

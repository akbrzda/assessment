<template>
  <div class="user-avatar" :class="{ active: isActive }">
    <img v-if="avatarUrl" :src="avatarUrl" :alt="user?.firstName || 'User'" />
    <span v-else class="initials">{{ userInitials }}</span>
  </div>
</template>

<script>
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useUserStore } from "../stores/user";
import { useTelegramStore } from "../stores/telegram";

export default {
  name: "UserAvatar",
  setup() {
    const route = useRoute();
    const userStore = useUserStore();
    const telegramStore = useTelegramStore();

    const user = computed(() => userStore.user);
    const userInitials = computed(() => userStore.initials);
    const isActive = computed(() => route.name === "profile");

    // Проверяем аватар: сначала из профиля, потом из Telegram
    const avatarUrl = computed(() => {
      return user.value?.avatar || telegramStore.user?.photo_url || null;
    });

    return {
      user,
      userInitials,
      isActive,
      avatarUrl,
    };
  },
};
</script>

<style scoped>
.user-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 10px;
  font-weight: 600;
  overflow: hidden;
}

.user-avatar.active {
  background-color: var(--accent-blue);
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.initials {
  font-size: 10px;
  font-weight: 600;
}
</style>

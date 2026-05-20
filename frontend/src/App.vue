<template>
  <div id="app" :data-theme="theme" :class="platformClass">
    <router-view />
    <BottomNavigation v-if="showBottomNav" />
    <div v-if="showMiniAppOnboarding" class="miniapp-onboarding-overlay">
      <div class="miniapp-onboarding-card">
        <h2 class="title-medium">Добро пожаловать в систему аттестации</h2>
        <p class="body-medium text-secondary">Здесь вы будете проходить курсы, сдавать аттестации и получать сертификаты.</p>
        <ul class="miniapp-onboarding-list body-small">
          <li>Открывайте назначенные курсы в разделе «Курсы».</li>
          <li>Изучайте материалы и проходите тесты по шагам.</li>
          <li>Следите за прогрессом, баллами и достижениями в профиле.</li>
        </ul>
        <button class="btn btn-primary btn-full" :disabled="onboardingSubmitting" @click="finishMiniAppOnboarding">
          {{ onboardingSubmitting ? "Сохраняем..." : "Понятно, начать" }}
        </button>
      </div>
    </div>
    <Preloader v-if="isLoading" />
  </div>
</template>

<script>
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useRoute } from "vue-router";
import { useTelegramStore } from "./stores/telegram";
import { useThemeStore } from "./stores/theme";
import { useUserStore } from "./stores/user";
import { useBackButton } from "./composables/useBackButton";
import { useTimezone } from "./composables/useTimezone";
import BottomNavigation from "./components/BottomNavigation.vue";
import Preloader from "./components/Preloader.vue";

export default {
  name: "App",
  components: {
    BottomNavigation,
    Preloader,
  },
  setup() {
    const route = useRoute();
    const telegramStore = useTelegramStore();
    const themeStore = useThemeStore();
    const userStore = useUserStore();
    const { initTimezone } = useTimezone();

    const { platform } = storeToRefs(telegramStore);

    // Инициализируем управление кнопкой назад
    useBackButton();

    const theme = computed(() => themeStore.theme);
    const isLoading = computed(() => userStore.isLoading);
    const onboardingSubmitting = ref(false);

    const platformClass = computed(() => {
      const value = (platform.value || "").toLowerCase();
      const mobilePlatforms = ["android", "android_x", "ios", "iphone", "ipad"];

      if (mobilePlatforms.some((name) => value.includes(name))) {
        return "platform-mobile";
      }

      return "platform-desktop";
    });

    const showBottomNav = computed(() => {
      const hideRoutes = ["invitation", "assessment-process"];
      return !hideRoutes.includes(route.name) && userStore.isAuthenticated;
    });

    const showMiniAppOnboarding = computed(() => {
      return Boolean(userStore.isAuthenticated && userStore.user && !userStore.user.onboardingCompletedAt);
    });

    async function finishMiniAppOnboarding() {
      if (onboardingSubmitting.value) {
        return;
      }

      onboardingSubmitting.value = true;
      const result = await userStore.completeMiniAppOnboarding();
      if (!result.success) {
        telegramStore.showAlert(result.error || "Не удалось завершить онбординг");
      }
      onboardingSubmitting.value = false;
    }

    onMounted(async () => {
      telegramStore.initTelegram();
      themeStore.initTheme();
      if (!telegramStore.hasValidInitData) {
        telegramStore.showAlert("Не удалось получить данные Mini App. Откройте приложение из бота Telegram или MAX.");
        return;
      }
      try {
        await userStore.ensureStatus();

        // Инициализируем timezone после успешной аутентификации
        if (userStore.isAuthenticated) {
          initTimezone();
        }
      } catch (error) {
        console.error("Не удалось инициализировать пользователя", error);
      }
    });

    return {
      theme,
      isLoading,
      showBottomNav,
      platformClass,
      showMiniAppOnboarding,
      onboardingSubmitting,
      finishMiniAppOnboarding,
    };
  },
};
</script>

<style scoped>
.miniapp-onboarding-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(10, 16, 24, 0.45);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 16px;
}

.miniapp-onboarding-card {
  width: 100%;
  max-width: 560px;
  background: var(--bg-secondary);
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.2);
}

.miniapp-onboarding-list {
  margin: 12px 0 20px;
  padding-left: 18px;
}

.miniapp-onboarding-list li + li {
  margin-top: 8px;
}

@media (max-width: 480px) {
  .miniapp-onboarding-card {
    border-radius: 18px;
    padding: 16px;
  }
}
</style>

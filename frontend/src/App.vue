<template>
  <div id="app" :data-theme="theme" :class="platformClass">
    <router-view />
    <BottomNavigation v-if="showBottomNav" />
    <Preloader v-if="isLoading" />
  </div>
</template>

<script>
import { computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useRoute } from "vue-router";
import { useTelegramStore } from "./stores/telegram";
import { useThemeStore } from "./stores/theme";
import { useUserStore } from "./stores/user";
import { useBackButton } from "./composables/useBackButton";
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

    const { platform } = storeToRefs(telegramStore);

    // Инициализируем управление кнопкой назад
    useBackButton();

    const theme = computed(() => themeStore.theme);
    const isLoading = computed(() => userStore.isLoading);

    const platformClass = computed(() => {
      const value = (platform.value || "").toLowerCase();
      const mobilePlatforms = ["android", "android_x", "ios", "iphone", "ipad"];

      if (mobilePlatforms.some((name) => value.includes(name))) {
        return "platform-mobile";
      }

      return "platform-desktop";
    });

    const showBottomNav = computed(() => {
      const hideRoutes = ["registration", "invitation", "assessment-process"];
      return !hideRoutes.includes(route.name) && userStore.isAuthenticated;
    });

    onMounted(async () => {
      telegramStore.initTelegram();
      themeStore.initTheme();
      try {
        await userStore.ensureStatus();
      } catch (error) {
        console.error("Не удалось инициализировать пользователя", error);
      }
    });

    return {
      theme,
      isLoading,
      showBottomNav,
      platformClass,
    };
  },
};
</script>

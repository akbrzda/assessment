import { onMounted } from "vue";

export function useTelegramInit({ telegramStore, themeStore, userStore, onAuthenticated } = {}) {
  onMounted(async () => {
    telegramStore.initTelegram();
    themeStore.initTheme();

    if (!telegramStore.hasValidInitData) {
      telegramStore.showAlert("Не удалось получить данные Mini App. Откройте приложение из бота Telegram или MAX.");
      return;
    }

    try {
      await userStore.ensureStatus();
      if (userStore.isAuthenticated && typeof onAuthenticated === "function") {
        onAuthenticated();
      }
    } catch (error) {
      console.error("Не удалось инициализировать пользователя", error);
    }
  });
}

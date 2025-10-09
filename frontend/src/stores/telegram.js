import { defineStore } from "pinia";
import { ref, computed } from "vue";

function extractInviteFromUrl() {
  if (typeof window === "undefined") {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  const direct = params.get("invite") || params.get("code");
  if (direct) {
    return direct;
  }

  const startApp = params.get("startapp");
  if (startApp && startApp.startsWith("invite_")) {
    return startApp.replace("invite_", "");
  }

  return null;
}

export const useTelegramStore = defineStore("telegram", () => {
  const tg = ref(null);
  const user = ref(null);
  const initData = ref("");
  const inviteToken = ref(null);

  const isReady = computed(() => Boolean(tg.value));
  const theme = computed(() => tg.value?.colorScheme || "light");
  const platform = computed(() => tg.value?.platform || "unknown");

  function initTelegram() {
    if (tg.value) {
      return;
    }

    const hasWebApp = typeof window !== "undefined" && window.Telegram?.WebApp;
    const urlInvite = extractInviteFromUrl();

    if (!hasWebApp) {
      console.error("Telegram WebApp API недоступен. Откройте мини-приложение внутри Telegram.");
      if (urlInvite) {
        const token = `invite_${urlInvite}`;
        window.__telegramInitDataOverride = "";
        window.__telegramStartParam = token;
      }
      return;
    }

    const webApp = window.Telegram.WebApp;
    tg.value = webApp;
    user.value = webApp.initDataUnsafe?.user || null;
    initData.value = webApp.initData || "";

    let inviteCode = null;
    // Проверяем start_param (для /start команды) и startapp (для прямого открытия MiniApp)
    const startParam = webApp.initDataUnsafe?.start_param;
    const startApp = webApp.initDataUnsafe?.startapp;

    // Также проверяем tgWebAppStartParam (это специальный параметр для startapp)
    const tgWebAppStartParam = webApp.initDataUnsafe?.tgWebAppStartParam;

    console.log("🔍 Проверка параметров приглашения:", {
      startParam,
      startApp,
      tgWebAppStartParam,
      initDataUnsafe: webApp.initDataUnsafe,
    });

    if (typeof tgWebAppStartParam === "string" && tgWebAppStartParam.startsWith("invite_")) {
      inviteCode = tgWebAppStartParam.replace("invite_", "");
    } else if (typeof startApp === "string" && startApp.startsWith("invite_")) {
      inviteCode = startApp.replace("invite_", "");
    } else if (typeof startParam === "string" && startParam.startsWith("invite_")) {
      inviteCode = startParam.replace("invite_", "");
    } else if (urlInvite) {
      inviteCode = urlInvite;
    }

    console.log("📩 Найден код приглашения:", inviteCode);

    if (inviteCode) {
      const token = `invite_${inviteCode}`;
      inviteToken.value = token;

      // ВАЖНО: НЕ изменяем initData, чтобы не сломать подпись!
      // Просто сохраняем токен для передачи отдельно
      window.__telegramStartParam = token;
      window.__telegramInviteCode = inviteCode;

      console.log("✅ Токен приглашения сохранен:", token);
    } else {
      inviteToken.value = startParam || startApp || tgWebAppStartParam || null;
      window.__telegramStartParam = startParam || startApp || tgWebAppStartParam || null;
    }

    // Сохраняем оригинальный initData БЕЗ изменений
    window.__telegramInitDataOverride = initData.value;

    webApp.ready();
    webApp.expand();

    if (typeof webApp.disableVerticalSwipes === "function") {
      webApp.disableVerticalSwipes();
    }

    if (typeof webApp.disableClosingConfirmation === "function") {
      webApp.disableClosingConfirmation();
    }
  }

  function resolveTelegramApp() {
    return window.Telegram?.WebApp || tg.value || null;
  }

  function showAlert(message) {
    const telegramApp = resolveTelegramApp();
    if (telegramApp?.showAlert) {
      telegramApp.showAlert(message);
    } else if (typeof window !== "undefined") {
      window.alert(message);
    }
  }

  function showConfirm(message) {
    return new Promise((resolve) => {
      const telegramApp = resolveTelegramApp();
      if (telegramApp?.showConfirm) {
        telegramApp.showConfirm(message, (result) => resolve(Boolean(result)));
      } else if (typeof window !== "undefined") {
        resolve(window.confirm(message));
      } else {
        resolve(false);
      }
    });
  }

  function hapticFeedback(type = "impact", style = "medium") {
    const telegramApp = resolveTelegramApp();
    const haptic = telegramApp?.HapticFeedback;
    if (!haptic) {
      return;
    }

    if (type === "impact" && haptic.impactOccurred) {
      haptic.impactOccurred(style);
    } else if (type === "notification" && haptic.notificationOccurred) {
      haptic.notificationOccurred(style);
    } else if (type === "selection" && haptic.selectionChanged) {
      haptic.selectionChanged();
    }
  }

  function setMainButton(text, onClick) {
    const telegramApp = resolveTelegramApp();
    const mainButton = telegramApp?.MainButton;
    if (!mainButton) {
      return;
    }

    if (typeof text === "string") {
      mainButton.setText(text);
    }

    if (typeof onClick === "function") {
      mainButton.onClick(onClick);
    }

    mainButton.show();
  }

  function hideMainButton() {
    const telegramApp = resolveTelegramApp();
    const mainButton = telegramApp?.MainButton;
    if (mainButton?.hide) {
      mainButton.hide();
    }
  }

  function enableVerticalSwipes() {
    const telegramApp = resolveTelegramApp();
    if (typeof telegramApp?.enableVerticalSwipes === "function") {
      telegramApp.enableVerticalSwipes();
      return true;
    }
    return false;
  }

  function disableVerticalSwipes() {
    const telegramApp = resolveTelegramApp();
    if (typeof telegramApp?.disableVerticalSwipes === "function") {
      telegramApp.disableVerticalSwipes();
      return true;
    }
    return false;
  }

  function getVerticalSwipesEnabled() {
    const telegramApp = resolveTelegramApp();
    if (telegramApp && telegramApp.isVerticalSwipesEnabled !== undefined) {
      return telegramApp.isVerticalSwipesEnabled;
    }
    return true;
  }

  function showBackButton(onClick) {
    const telegramApp = resolveTelegramApp();
    const backButton = telegramApp?.BackButton;
    if (!backButton) {
      return false;
    }

    if (typeof onClick === "function" && typeof backButton.offClick === "function") {
      backButton.offClick(onClick);
    }

    backButton.show();

    if (typeof onClick === "function" && typeof backButton.onClick === "function") {
      backButton.onClick(onClick);
    }

    return true;
  }

  function hideBackButton(onClick) {
    const telegramApp = resolveTelegramApp();
    const backButton = telegramApp?.BackButton;
    if (!backButton) {
      return false;
    }

    if (typeof onClick === "function" && typeof backButton.offClick === "function") {
      backButton.offClick(onClick);
    }

    backButton.hide();
    return true;
  }

  function setBackButtonHandler(onClick) {
    const telegramApp = resolveTelegramApp();
    const backButton = telegramApp?.BackButton;
    if (!backButton || typeof onClick !== "function" || typeof backButton.onClick !== "function") {
      return false;
    }

    if (typeof backButton.offClick === "function") {
      backButton.offClick(onClick);
    }

    backButton.onClick(onClick);
    return true;
  }

  function enableClosingConfirmation() {
    const telegramApp = resolveTelegramApp();
    if (typeof telegramApp?.enableClosingConfirmation === "function") {
      telegramApp.enableClosingConfirmation();
      return true;
    }
    return false;
  }

  function disableClosingConfirmation() {
    const telegramApp = resolveTelegramApp();
    if (typeof telegramApp?.disableClosingConfirmation === "function") {
      telegramApp.disableClosingConfirmation();
      return true;
    }
    return false;
  }

  return {
    // state
    tg,
    user,
    initData,
    inviteToken,

    // getters
    isReady,
    theme,
    platform,

    // actions
    initTelegram,
    showAlert,
    showConfirm,
    hapticFeedback,
    setMainButton,
    hideMainButton,
    enableVerticalSwipes,
    disableVerticalSwipes,
    getVerticalSwipesEnabled,
    showBackButton,
    hideBackButton,
    setBackButtonHandler,
    enableClosingConfirmation,
    disableClosingConfirmation,
  };
});

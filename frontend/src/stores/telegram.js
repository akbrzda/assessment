import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { clearTelegramRuntimeState, setTelegramRuntimeState } from "../services/telegramRuntimeState";

const INIT_DATA_MAX_AGE_SECONDS = 5 * 60;

function extractAuthDateFromInitData(initDataString) {
  if (!initDataString) {
    return null;
  }

  const params = new URLSearchParams(initDataString);
  const authDate = Number(params.get("auth_date"));
  if (!Number.isInteger(authDate) || authDate <= 0) {
    return null;
  }

  return authDate;
}

function isInitDataFresh(initDataString) {
  const authDate = extractAuthDateFromInitData(initDataString);
  if (!authDate) {
    return false;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  return nowSeconds - authDate <= INIT_DATA_MAX_AGE_SECONDS;
}

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
  let activeBackButtonHandler = null;

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
        setTelegramRuntimeState({
          initDataOverride: "",
          startParam: token,
          inviteCode: urlInvite,
        });
      }
      return;
    }

    const webApp = window.Telegram.WebApp;
    tg.value = webApp;

    // Восстанавливаем initData из sessionStorage только если он еще актуален
    let currentInitData = webApp.initData || "";
    let currentInitDataUnsafe = webApp.initDataUnsafe || {};

    if (!currentInitData) {
      const savedInitData = sessionStorage.getItem("tg_init_data");
      const savedInitDataUnsafe = sessionStorage.getItem("tg_init_data_unsafe");

      if (savedInitData && isInitDataFresh(savedInitData)) {
        console.log("🔄 Восстанавливаем initData из sessionStorage");
        currentInitData = savedInitData;

        if (savedInitDataUnsafe) {
          try {
            currentInitDataUnsafe = JSON.parse(savedInitDataUnsafe);
          } catch (e) {
            console.error("Ошибка при парсинге сохранённого initDataUnsafe:", e);
          }
        }
      } else if (savedInitData) {
        console.warn("⚠️ Сохраненный initData устарел, очищаем sessionStorage");
        sessionStorage.removeItem("tg_init_data");
        sessionStorage.removeItem("tg_init_data_unsafe");
      } else {
        console.warn("⚠️ initData пустой и не найден в sessionStorage. Возможно, приложение открыто некорректно.");
      }
    } else {
      // Сохраняем initData при первом запуске
      console.log("💾 Сохраняем initData в sessionStorage");
      sessionStorage.setItem("tg_init_data", currentInitData);

      if (webApp.initDataUnsafe) {
        sessionStorage.setItem("tg_init_data_unsafe", JSON.stringify(webApp.initDataUnsafe));
      }
    }

    user.value = currentInitDataUnsafe?.user || null;
    initData.value = currentInitData;

    let inviteCode = null;
    // Проверяем start_param (для /start команды) и startapp (для прямого открытия MiniApp)
    const startParam = currentInitDataUnsafe?.start_param;
    const startApp = currentInitDataUnsafe?.startapp;

    // Также проверяем tgWebAppStartParam (это специальный параметр для startapp)
    const tgWebAppStartParam = currentInitDataUnsafe?.tgWebAppStartParam;

    console.log("🔍 Проверка параметров приглашения:", {
      startParam,
      startApp,
      tgWebAppStartParam,
      initDataUnsafe: currentInitDataUnsafe,
      initDataLength: currentInitData.length,
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
      setTelegramRuntimeState({
        startParam: token,
        inviteCode,
      });

      console.log("✅ Токен приглашения сохранен:", token);
    } else {
      inviteToken.value = startParam || startApp || tgWebAppStartParam || null;
      setTelegramRuntimeState({
        startParam: startParam || startApp || tgWebAppStartParam || null,
        inviteCode: null,
      });
    }

    // Сохраняем оригинальный initData БЕЗ изменений (используем currentInitData, который может быть восстановлен)
    setTelegramRuntimeState({
      initDataOverride: currentInitData,
    });

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
    const safeMessage = String(message || "").trim();
    if (!safeMessage) return;
    const telegramApp = resolveTelegramApp();
    if (telegramApp?.showAlert) {
      telegramApp.showAlert(safeMessage);
    } else if (typeof window !== "undefined") {
      window.alert(safeMessage);
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

    if (typeof backButton.offClick === "function" && typeof activeBackButtonHandler === "function") {
      backButton.offClick(activeBackButtonHandler);
    }

    backButton.show();

    if (typeof onClick === "function" && typeof backButton.onClick === "function") {
      backButton.onClick(onClick);
      activeBackButtonHandler = onClick;
    } else {
      activeBackButtonHandler = null;
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
      if (activeBackButtonHandler === onClick) {
        activeBackButtonHandler = null;
      }
    } else if (typeof backButton.offClick === "function" && typeof activeBackButtonHandler === "function") {
      backButton.offClick(activeBackButtonHandler);
      activeBackButtonHandler = null;
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

    if (typeof backButton.offClick === "function" && typeof activeBackButtonHandler === "function") {
      backButton.offClick(activeBackButtonHandler);
    }

    backButton.onClick(onClick);
    activeBackButtonHandler = onClick;
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

  function clearSavedInitData() {
    // Очищаем сохранённые данные (например, при выходе пользователя)
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("tg_init_data");
      sessionStorage.removeItem("tg_init_data_unsafe");
      clearTelegramRuntimeState();
      console.log("🗑️ Сохранённые initData очищены");
    }
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
    clearSavedInitData,
  };
});

import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { clearTelegramRuntimeState, getClientPlatform, setTelegramRuntimeState } from "../services/telegramRuntimeState";

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

function parseInviteCodeCandidate(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const lower = trimmed.toLowerCase();
  let candidate = trimmed;

  if (lower.startsWith("invite_")) {
    candidate = trimmed.slice(7);
  } else if (lower.startsWith("invite-")) {
    candidate = trimmed.slice(7);
  } else if (lower.startsWith("code-")) {
    candidate = trimmed.slice(5);
  }

  const normalized = candidate.trim().toUpperCase();
  if (!/^[A-Z0-9]{4,16}$/.test(normalized)) {
    return null;
  }

  return normalized;
}

function getLocationParams() {
  if (typeof window === "undefined") {
    return new URLSearchParams();
  }

  const combined = new URLSearchParams(window.location.search);
  const hash = (window.location.hash || "").replace(/^#/, "");
  if (hash) {
    const hashParams = new URLSearchParams(hash);
    for (const [key, value] of hashParams.entries()) {
      if (!combined.has(key)) {
        combined.set(key, value);
      }
    }
  }

  return combined;
}

function extractInviteFromUrl() {
  if (typeof window === "undefined") {
    return null;
  }

  const params = getLocationParams();
  const candidates = [params.get("invite"), params.get("code"), params.get("startapp"), params.get("start_param"), params.get("tgWebAppStartParam")];

  for (const candidate of candidates) {
    const inviteCode = parseInviteCodeCandidate(candidate);
    if (inviteCode) {
      return inviteCode;
    }
  }

  return null;
}

function extractPhoneFromContactQuery(rawValue) {
  if (typeof rawValue !== "string" || !rawValue.trim()) {
    return null;
  }

  try {
    const params = new URLSearchParams(rawValue);
    const contactRaw = params.get("contact");
    if (!contactRaw) {
      return null;
    }

    const parsedContact = JSON.parse(contactRaw);
    return parsedContact?.phone_number || parsedContact?.phone || null;
  } catch (error) {
    console.error("Ошибка парсинга contact payload:", error);
    return null;
  }
}

function extractPhoneFromUnknownPayload(payload) {
  if (!payload) {
    return null;
  }

  if (typeof payload === "string") {
    return extractPhoneFromContactQuery(payload);
  }

  if (typeof payload !== "object") {
    return null;
  }

  return (
    payload.phone ||
    payload.phoneNumber ||
    payload.phone_number ||
    payload.contact?.phone_number ||
    payload.contact?.phone ||
    extractPhoneFromContactQuery(payload.result) ||
    extractPhoneFromContactQuery(payload.response) ||
    null
  );
}

export const useTelegramStore = defineStore("telegram", () => {
  const tg = ref(null);
  const user = ref(null);
  const initData = ref("");
  const inviteToken = ref(null);
  const pendingCourseId = ref(null);
  let activeBackButtonHandler = null;

  const isReady = computed(() => Boolean(tg.value));
  const theme = computed(() => tg.value?.colorScheme || "light");
  const platform = computed(() => tg.value?.platform || "unknown");

  function detectMiniAppRuntime() {
    if (typeof window === "undefined") {
      return { provider: "none", webApp: null };
    }

    if (window.Telegram?.WebApp) {
      return { provider: "telegram", webApp: window.Telegram.WebApp };
    }

    if (window.WebApp && typeof window.WebApp === "object") {
      return { provider: "max", webApp: window.WebApp };
    }

    return { provider: "none", webApp: null };
  }

  function initTelegram() {
    if (tg.value) {
      return;
    }

    const { provider, webApp } = detectMiniAppRuntime();
    const urlInvite = extractInviteFromUrl();

    if (!webApp) {
      console.error("WebApp API недоступен. Откройте мини-приложение внутри Telegram или MAX.");
      if (urlInvite) {
        const token = `invite_${urlInvite}`;
        setTelegramRuntimeState({
          initDataOverride: "",
          startParam: token,
          inviteCode: urlInvite,
          clientPlatform: "telegram",
        });
      }
      return;
    }

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

    inviteCode = parseInviteCodeCandidate(tgWebAppStartParam) || parseInviteCodeCandidate(startApp) || parseInviteCodeCandidate(startParam) || null;

    if (!inviteCode && urlInvite) {
      inviteCode = urlInvite;
    }

    // Обработка deep link для открытия курса: startapp=course_[id]
    const rawStartParam = tgWebAppStartParam || startApp || startParam || "";
    if (typeof rawStartParam === "string" && rawStartParam.startsWith("course_")) {
      const parsedCourseId = Number(rawStartParam.replace("course_", ""));
      if (Number.isInteger(parsedCourseId) && parsedCourseId > 0) {
        pendingCourseId.value = parsedCourseId;
      }
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
        clientPlatform: provider,
      });

      console.log("✅ Токен приглашения сохранен:", token);
    } else {
      inviteToken.value = startParam || startApp || tgWebAppStartParam || null;
      setTelegramRuntimeState({
        startParam: startParam || startApp || tgWebAppStartParam || null,
        inviteCode: null,
        clientPlatform: provider,
      });
    }

    // Сохраняем оригинальный initData БЕЗ изменений (используем currentInitData, который может быть восстановлен)
    setTelegramRuntimeState({
      initDataOverride: currentInitData,
      clientPlatform: provider,
    });

    webApp.ready();
    if (typeof webApp.expand === "function") {
      webApp.expand();
    }

    if (typeof webApp.disableVerticalSwipes === "function") {
      webApp.disableVerticalSwipes();
    }

    if (typeof webApp.disableClosingConfirmation === "function") {
      webApp.disableClosingConfirmation();
    }
  }

  function resolveTelegramApp() {
    const detected = detectMiniAppRuntime();
    return detected.webApp || tg.value || null;
  }

  async function requestContactPayload() {
    const app = resolveTelegramApp();
    if (!app || typeof app.requestContact !== "function") {
      throw new Error("Платформа не поддерживает запрос контакта");
    }

    const source = getClientPlatform() === "max" ? "max_contact" : "telegram_contact";
    const currentUserId = user.value?.id || app?.initDataUnsafe?.user?.id;
    if (!currentUserId) {
      throw new Error("Не удалось определить пользователя платформы");
    }

    const timeoutMs = 10000;
    const CONTACT_EVENT_NAMES = ["contactRequested", "contact_requested", "phoneRequested", "phone_requested", "custom_method_invoked", "web_app_method_invoked", "WebAppRequestPhone"];

    const phoneFromRequest = await new Promise((resolve, reject) => {
      let resolved = false;
      let timerId = null;

      const clearListeners = () => {
        if (typeof app.offEvent !== "function") {
          return;
        }
        CONTACT_EVENT_NAMES.forEach((eventName) => {
          app.offEvent(eventName, onContactEvent);
          app.offEvent(eventName, onCustomMethodEvent);
        });
      };

      const finish = (phoneValue) => {
        if (resolved) {
          return;
        }
        resolved = true;
        if (timerId) {
          clearTimeout(timerId);
        }
        clearListeners();
        resolve(phoneValue || null);
      };

      const onContactEvent = (payload) => {
        const extractedPhone = extractPhoneFromUnknownPayload(payload);
        if (extractedPhone) {
          finish(extractedPhone);
        }
      };

      const onCustomMethodEvent = (payload) => {
        const extractedPhone = extractPhoneFromUnknownPayload(payload);
        if (extractedPhone) {
          finish(extractedPhone);
        }
      };

      timerId = setTimeout(() => finish(null), timeoutMs);

      if (typeof app.onEvent === "function") {
        CONTACT_EVENT_NAMES.forEach((eventName) => {
          app.onEvent(eventName, onContactEvent);
          app.onEvent(eventName, onCustomMethodEvent);
        });
      }

      try {
        const directResult = app.requestContact((callbackPayload) => {
          const callbackPhone = extractPhoneFromUnknownPayload(callbackPayload);
          if (callbackPhone) {
            finish(callbackPhone);
          }
        });

        if (directResult === false) {
          if (timerId) {
            clearTimeout(timerId);
          }
          clearListeners();
          resolved = true;
          reject(new Error("Подтверждение номера отменено"));
          return;
        }

        const directPhone = extractPhoneFromUnknownPayload(directResult);
        if (directPhone) {
          finish(directPhone);
          return;
        }

        if (directResult && typeof directResult.then === "function") {
          directResult
            .then((resolvedPayload) => {
              const resolvedPhone = extractPhoneFromUnknownPayload(resolvedPayload);
              if (resolvedPhone) {
                finish(resolvedPhone);
              }
            })
            .catch((error) => {
              console.error("Ошибка promise-режима requestContact:", error);
            });
        }
      } catch (error) {
        if (timerId) {
          clearTimeout(timerId);
        }
        clearListeners();
        resolved = true;
        reject(error);
      }
    });

    const phone = phoneFromRequest;

    if (!phone) {
      throw new Error("Платформа не вернула номер телефона. Проверьте доступ к контактам и повторите попытку.");
    }

    return {
      source,
      userId: currentUserId,
      phoneNumber: phone,
    };
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
    pendingCourseId,

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
    requestContactPayload,
  };
});

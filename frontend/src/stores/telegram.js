import { defineStore } from "pinia";
import { ref, shallowRef, computed, markRaw } from "vue";
import {
  clearTelegramRuntimeState,
  getClientPlatform,
  setTelegramRuntimeState,
} from "../services/telegramRuntimeState";

const INIT_DATA_MAX_AGE_SECONDS = 24 * 60 * 60;

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

function parseInviteCodeFromStartParam(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const lower = trimmed.toLowerCase();
  if (
    !lower.startsWith("invite_") &&
    !lower.startsWith("invite-") &&
    !lower.startsWith("code-")
  ) {
    return null;
  }

  return parseInviteCodeCandidate(trimmed);
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

function extractWebAppDataFromUrl() {
  if (typeof window === "undefined") {
    return "";
  }

  const params = getLocationParams();
  const rawValue =
    params.get("WebAppData") ||
    params.get("webAppData") ||
    params.get("webapp_data") ||
    params.get("initData") ||
    "";
  if (!rawValue) {
    return "";
  }

  // URLSearchParams уже декодирует значение, повторный decode ломает hash подпись.
  return rawValue;
}

function hasMaxUrlInitData() {
  if (typeof window === "undefined") {
    return false;
  }

  const params = getLocationParams();
  return Boolean(
    String(
      window.WebAppData ||
        window.MAX?.WebAppData ||
        window.Max?.WebAppData ||
        params.get("WebAppData") ||
        params.get("webAppData") ||
        params.get("webapp_data") ||
        params.get("initData") ||
        "",
    ).trim(),
  );
}

function extractUserFromInitData(initDataString) {
  if (typeof initDataString !== "string" || !initDataString.trim()) {
    return null;
  }

  try {
    const params = new URLSearchParams(initDataString);
    const rawUser = params.get("user");
    if (!rawUser) {
      return null;
    }

    const parsedUser = JSON.parse(rawUser);
    if (!parsedUser || typeof parsedUser !== "object") {
      return null;
    }

    return parsedUser;
  } catch (_error) {
    return null;
  }
}

function extractInviteFromUrl() {
  if (typeof window === "undefined") {
    return null;
  }

  const params = getLocationParams();
  const directInviteCode =
    parseInviteCodeCandidate(params.get("invite")) ||
    parseInviteCodeCandidate(params.get("code"));
  if (directInviteCode) {
    return directInviteCode;
  }

  const startParamInviteCode =
    parseInviteCodeFromStartParam(params.get("startapp")) ||
    parseInviteCodeFromStartParam(params.get("start_param")) ||
    parseInviteCodeFromStartParam(params.get("tgWebAppStartParam"));

  return startParamInviteCode || null;
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

function hasTelegramAuthContext(webApp) {
  if (!webApp || typeof webApp !== "object") {
    return false;
  }

  const initData = String(webApp.initData || "").trim();
  if (initData) {
    return true;
  }

  const unsafe = webApp.initDataUnsafe || {};
  const queryId = String(unsafe.query_id || "").trim();
  if (queryId) {
    return true;
  }

  return Boolean(unsafe.user?.id);
}

function hasMaxAuthContext(webApp) {
  if (!webApp || typeof webApp !== "object") {
    return false;
  }

  const initData = String(webApp.InitData || webApp.initData || "").trim();
  if (initData) {
    return true;
  }

  const unsafe = webApp.InitDataUnsafe || webApp.initDataUnsafe || {};
  return Boolean(unsafe.user?.id);
}

function safelyCallPlatformMethod(callback) {
  try {
    const result = callback();
    if (result && typeof result.then === "function") {
      result.catch(() => {});
    }
    return true;
  } catch (_error) {
    return false;
  }
}

export const useTelegramStore = defineStore("telegram", () => {
  const tg = shallowRef(null);
  const user = ref(null);
  const initData = ref("");
  const inviteToken = ref(null);
  const pendingCourseId = ref(null);
  let isRuntimeDetectionCompleted = false;
  let activeBackButtonHandler = null;

  const isReady = computed(() => Boolean(tg.value));
  const theme = computed(() => tg.value?.colorScheme || "light");
  const platform = computed(() => tg.value?.platform || "unknown");
  const hasValidInitData = computed(() =>
    Boolean(initData.value && String(initData.value).trim().length > 0),
  );

  function parseVersionTuple(version) {
    const source = String(version || "0");
    const [majorRaw, minorRaw = "0"] = source.split(".");
    const major = Number.parseInt(majorRaw, 10);
    const minor = Number.parseInt(minorRaw, 10);
    return {
      major: Number.isFinite(major) ? major : 0,
      minor: Number.isFinite(minor) ? minor : 0,
    };
  }

  function isAtLeastVersion(current, targetMajor, targetMinor = 0) {
    const parsed = parseVersionTuple(current);
    if (parsed.major > targetMajor) return true;
    if (parsed.major < targetMajor) return false;
    return parsed.minor >= targetMinor;
  }

  function detectMiniAppRuntime() {
    if (typeof window === "undefined") {
      return { provider: "none", webApp: null };
    }

    const telegramWebApp = window.Telegram?.WebApp || null;
    const maxWebApp =
      window.MAX?.WebApp || window.Max?.WebApp || window.WebApp || null;
    const hasTelegramContext = hasTelegramAuthContext(telegramWebApp);
    const hasMaxContext = hasMaxAuthContext(maxWebApp) || hasMaxUrlInitData();

    // В MAX окружении иногда присутствует Telegram.WebApp shim без initData.
    if (hasMaxContext && !hasTelegramContext) {
      return { provider: "max", webApp: maxWebApp };
    }

    if (telegramWebApp && hasTelegramContext) {
      return { provider: "telegram", webApp: telegramWebApp };
    }

    if (maxWebApp && typeof maxWebApp === "object" && hasMaxContext) {
      return { provider: "max", webApp: maxWebApp };
    }

    return { provider: "none", webApp: null };
  }

  function initTelegram() {
    if (tg.value || isRuntimeDetectionCompleted) {
      return;
    }

    isRuntimeDetectionCompleted = true;
    const { provider, webApp } = detectMiniAppRuntime();
    const urlInvite = extractInviteFromUrl();

    if (!webApp) {
      const urlInitData = extractWebAppDataFromUrl();
      const hasMaxInitData = Boolean(
        urlInitData ||
        window?.WebAppData ||
        window?.MAX?.WebAppData ||
        window?.Max?.WebAppData,
      );

      if (hasMaxInitData) {
        initData.value =
          urlInitData ||
          String(
            window.WebAppData ||
              window.MAX?.WebAppData ||
              window.Max?.WebAppData ||
              "",
          );
        user.value = extractUserFromInitData(initData.value);
        setTelegramRuntimeState({
          initDataOverride: initData.value,
          clientPlatform: "max",
        });
        console.warn(
          "WebApp API недоступен, используем initData из URL/global переменных MAX.",
        );
      } else {
        console.error(
          "WebApp API недоступен. Откройте мини-приложение внутри Telegram или MAX.",
        );
      }

      if (urlInvite) {
        const token = `invite_${urlInvite}`;
        setTelegramRuntimeState({
          initDataOverride: initData.value || "",
          startParam: token,
          inviteCode: urlInvite,
          clientPlatform: hasMaxInitData ? "max" : "telegram",
        });
      }
      return;
    }

    tg.value = markRaw(webApp);

    // Восстанавливаем initData из sessionStorage только если он еще актуален
    let currentInitData =
      webApp.initData || webApp.InitData || extractWebAppDataFromUrl() || "";
    let currentInitDataUnsafe =
      webApp.initDataUnsafe || webApp.InitDataUnsafe || {};

    if (!currentInitData) {
      const savedInitData = sessionStorage.getItem("tg_init_data");
      const savedInitDataUnsafe = sessionStorage.getItem("tg_init_data_unsafe");

      if (savedInitData && isInitDataFresh(savedInitData)) {
        currentInitData = savedInitData;

        if (savedInitDataUnsafe) {
          try {
            currentInitDataUnsafe = JSON.parse(savedInitDataUnsafe);
          } catch (e) {
            console.error(
              "Ошибка при парсинге сохранённого initDataUnsafe:",
              e,
            );
          }
        }
      } else if (savedInitData) {
        sessionStorage.removeItem("tg_init_data");
        sessionStorage.removeItem("tg_init_data_unsafe");
      }
    } else {
      // Сохраняем initData при первом запуске
      sessionStorage.setItem("tg_init_data", currentInitData);

      const liveInitDataUnsafe = webApp.initDataUnsafe || webApp.InitDataUnsafe;
      if (liveInitDataUnsafe) {
        sessionStorage.setItem(
          "tg_init_data_unsafe",
          JSON.stringify(liveInitDataUnsafe),
        );
      }
    }

    user.value = currentInitDataUnsafe?.user || null;
    initData.value = currentInitData;
    if (!user.value) {
      user.value = extractUserFromInitData(currentInitData);
    }

    let inviteCode = null;
    // Проверяем start_param (для /start команды) и startapp (для прямого открытия MiniApp)
    const startParam = currentInitDataUnsafe?.start_param;
    const startApp = currentInitDataUnsafe?.startapp;

    // Также проверяем tgWebAppStartParam (это специальный параметр для startapp)
    const tgWebAppStartParam = currentInitDataUnsafe?.tgWebAppStartParam;

    inviteCode =
      parseInviteCodeFromStartParam(tgWebAppStartParam) ||
      parseInviteCodeFromStartParam(startApp) ||
      parseInviteCodeFromStartParam(startParam) ||
      null;

    if (!inviteCode && urlInvite) {
      inviteCode = urlInvite;
    }

    // Обработка deep link для открытия курса: startapp=course_[id]
    const rawStartParam = tgWebAppStartParam || startApp || startParam || "";
    if (
      typeof rawStartParam === "string" &&
      rawStartParam.startsWith("course_")
    ) {
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

    safelyCallPlatformMethod(() => webApp.ready());
    if (typeof webApp.expand === "function") {
      safelyCallPlatformMethod(() => webApp.expand());
    }

    const canUseAdvancedChromeApi =
      provider !== "telegram" || isAtLeastVersion(webApp.version, 6, 1);

    if (
      canUseAdvancedChromeApi &&
      typeof webApp.disableVerticalSwipes === "function"
    ) {
      safelyCallPlatformMethod(() => webApp.disableVerticalSwipes());
    }

    if (
      canUseAdvancedChromeApi &&
      typeof webApp.disableClosingConfirmation === "function"
    ) {
      safelyCallPlatformMethod(() => webApp.disableClosingConfirmation());
    }
  }

  function resolveTelegramApp() {
    if (tg.value) {
      return tg.value;
    }

    if (getClientPlatform() === "max") {
      return (
        window?.WebApp || window?.MAX?.WebApp || window?.Max?.WebApp || null
      );
    }

    const detected = detectMiniAppRuntime();
    return detected.webApp || null;
  }

  function isTelegramShimInMaxMode(app) {
    if (!app || typeof window === "undefined") {
      return false;
    }
    return getClientPlatform() === "max" && app === window.Telegram?.WebApp;
  }

  async function requestContactPayload() {
    const app = resolveTelegramApp();
    if (
      !app ||
      isTelegramShimInMaxMode(app) ||
      typeof app.requestContact !== "function"
    ) {
      throw new Error(
        "Не удалось запросить контакт через MAX SDK. Откройте мини-приложение напрямую в приложении MAX и повторите попытку.",
      );
    }

    const source =
      getClientPlatform() === "max" ? "max_contact" : "telegram_contact";
    const currentUserId =
      user.value?.id ||
      app?.initDataUnsafe?.user?.id ||
      app?.InitDataUnsafe?.user?.id;
    if (!currentUserId) {
      throw new Error("Не удалось определить пользователя платформы");
    }

    const timeoutMs = 10000;
    const CONTACT_EVENT_NAMES = [
      "contactRequested",
      "contact_requested",
      "phoneRequested",
      "phone_requested",
      "custom_method_invoked",
      "web_app_method_invoked",
      "WebAppRequestPhone",
    ];

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
              const resolvedPhone =
                extractPhoneFromUnknownPayload(resolvedPayload);
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
      throw new Error(
        "Платформа не вернула номер телефона. Проверьте доступ к контактам и повторите попытку.",
      );
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
    if (isTelegramShimInMaxMode(telegramApp)) {
      if (typeof window !== "undefined") {
        window.alert(safeMessage);
      }
      return;
    }

    const canUseNativeAlert =
      telegramApp &&
      (getClientPlatform() !== "telegram" ||
        isAtLeastVersion(telegramApp.version, 6, 2));
    // Для MAX SDK нативный showAlert ненадёжен (no-op без callback) — используем window.alert напрямую
    if (
      canUseNativeAlert &&
      telegramApp?.showAlert &&
      getClientPlatform() !== "max"
    ) {
      try {
        telegramApp.showAlert(safeMessage);
        return;
      } catch (_error) {
        // На старых SDK showAlert может выбрасывать unsupported.
      }
    }

    if (typeof window !== "undefined") {
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
    if (isTelegramShimInMaxMode(telegramApp)) {
      return;
    }
    const haptic = telegramApp?.HapticFeedback;
    if (!haptic) {
      return;
    }

    const safeInvoke = (callback) => {
      try {
        const result = callback();
        if (result && typeof result.then === "function") {
          result.catch((error) => {
            console.warn("Ошибка haptic feedback:", error);
          });
        }
      } catch (error) {
        console.warn("Ошибка haptic feedback:", error);
      }
    };

    if (type === "impact" && haptic.impactOccurred) {
      safeInvoke(() => haptic.impactOccurred(style));
    } else if (type === "notification" && haptic.notificationOccurred) {
      safeInvoke(() => haptic.notificationOccurred(style));
    } else if (type === "selection" && haptic.selectionChanged) {
      safeInvoke(() => haptic.selectionChanged());
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
      return safelyCallPlatformMethod(() => telegramApp.enableVerticalSwipes());
    }
    return false;
  }

  function disableVerticalSwipes() {
    const telegramApp = resolveTelegramApp();
    if (typeof telegramApp?.disableVerticalSwipes === "function") {
      return safelyCallPlatformMethod(() => telegramApp.disableVerticalSwipes());
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
    if (isTelegramShimInMaxMode(telegramApp)) {
      return false;
    }
    const backButton = telegramApp?.BackButton;
    const canUseBackButton =
      telegramApp &&
      (getClientPlatform() !== "telegram" ||
        isAtLeastVersion(telegramApp.version, 6, 1));
    if (!backButton || !canUseBackButton) {
      return false;
    }

    if (
      typeof backButton.offClick === "function" &&
      typeof activeBackButtonHandler === "function"
    ) {
      backButton.offClick(activeBackButtonHandler);
    }

    if (!safelyCallPlatformMethod(() => backButton.show())) {
      return false;
    }

    if (
      typeof onClick === "function" &&
      typeof backButton.onClick === "function"
    ) {
      backButton.onClick(onClick);
      activeBackButtonHandler = onClick;
    } else {
      activeBackButtonHandler = null;
    }

    return true;
  }

  function hideBackButton(onClick) {
    const telegramApp = resolveTelegramApp();
    if (isTelegramShimInMaxMode(telegramApp)) {
      return false;
    }
    const backButton = telegramApp?.BackButton;
    const canUseBackButton =
      telegramApp &&
      (getClientPlatform() !== "telegram" ||
        isAtLeastVersion(telegramApp.version, 6, 1));
    if (!backButton || !canUseBackButton) {
      return false;
    }

    if (
      typeof onClick === "function" &&
      typeof backButton.offClick === "function"
    ) {
      backButton.offClick(onClick);
      if (activeBackButtonHandler === onClick) {
        activeBackButtonHandler = null;
      }
    } else if (
      typeof backButton.offClick === "function" &&
      typeof activeBackButtonHandler === "function"
    ) {
      backButton.offClick(activeBackButtonHandler);
      activeBackButtonHandler = null;
    }

    return safelyCallPlatformMethod(() => backButton.hide());
  }

  function setBackButtonHandler(onClick) {
    const telegramApp = resolveTelegramApp();
    if (isTelegramShimInMaxMode(telegramApp)) {
      return false;
    }
    const backButton = telegramApp?.BackButton;
    const canUseBackButton =
      telegramApp &&
      (getClientPlatform() !== "telegram" ||
        isAtLeastVersion(telegramApp.version, 6, 1));
    if (
      !backButton ||
      !canUseBackButton ||
      typeof onClick !== "function" ||
      typeof backButton.onClick !== "function"
    ) {
      return false;
    }

    if (
      typeof backButton.offClick === "function" &&
      typeof activeBackButtonHandler === "function"
    ) {
      backButton.offClick(activeBackButtonHandler);
    }

    backButton.onClick(onClick);
    activeBackButtonHandler = onClick;
    return true;
  }

  function enableClosingConfirmation() {
    const telegramApp = resolveTelegramApp();
    if (typeof telegramApp?.enableClosingConfirmation === "function") {
      return safelyCallPlatformMethod(() =>
        telegramApp.enableClosingConfirmation(),
      );
    }
    return false;
  }

  function disableClosingConfirmation() {
    const telegramApp = resolveTelegramApp();
    if (typeof telegramApp?.disableClosingConfirmation === "function") {
      return safelyCallPlatformMethod(() =>
        telegramApp.disableClosingConfirmation(),
      );
    }
    return false;
  }

  function clearSavedInitData() {
    // Очищаем сохранённые данные (например, при выходе пользователя)
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("tg_init_data");
      sessionStorage.removeItem("tg_init_data_unsafe");
      clearTelegramRuntimeState();
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
    hasValidInitData,

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

let webAppInstance = null;
const themeListeners = new Set();
const viewportListeners = new Set();

const envBaseUrl = typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL.trim() : "";
const runtimeBaseUrl = typeof window !== "undefined" && window.location ? window.location.origin : "";
const API_BASE_URL = (envBaseUrl || runtimeBaseUrl || "").replace(/\/$/, "");
const CLOUD_STORAGE_ENDPOINT = "/cloud-storage";

function resolveWebApp() {
  if (webAppInstance) {
    return webAppInstance;
  }
  if (typeof window !== "undefined" && window.Telegram?.WebApp) {
    webAppInstance = window.Telegram.WebApp;
  }
  return webAppInstance;
}

export function getWebApp() {
  return resolveWebApp();
}

export function ensureReady() {
  const webApp = resolveWebApp();
  if (!webApp) {
    console.warn("Telegram WebApp is not available.");
    return null;
  }
  webApp.ready();
  webApp.expand();
  setSwipeBehavior({ allowVertical: false, allowHorizontal: true });
  return webApp;
}

export function onThemeChange(handler) {
  const webApp = resolveWebApp();
  if (!webApp) {
    return () => {};
  }

  const wrapper = () => handler(webApp.themeParams || {});
  themeListeners.add(wrapper);
  webApp.onEvent("themeChanged", wrapper);
  return () => {
    webApp.offEvent("themeChanged", wrapper);
    themeListeners.delete(wrapper);
  };
}

export function getThemeParams() {
  const webApp = resolveWebApp();
  return webApp?.themeParams || {};
}

export function getColorScheme() {
  const webApp = resolveWebApp();
  return webApp?.colorScheme || "light";
}

export function onViewportChanged(handler) {
  const webApp = resolveWebApp();
  if (!webApp) {
    return () => {};
  }
  const wrapper = () => {
    if (webApp.isStateStable) {
      handler(webApp);
    }
  };
  viewportListeners.add(wrapper);
  webApp.onEvent("viewportChanged", wrapper);
  return () => {
    webApp.offEvent("viewportChanged", wrapper);
    viewportListeners.delete(wrapper);
  };
}

export function getInitData() {
  // Приоритет отдаём данным, которые обновил telegramStore (учитывает start_param приглашения)
  if (typeof window !== "undefined" && window.__telegramInitDataOverride) {
    return window.__telegramInitDataOverride;
  }

  const webApp = resolveWebApp();
  return webApp?.initData || "";
}

export function getStartParam() {
  if (typeof window !== "undefined" && window.__telegramStartParam) {
    return window.__telegramStartParam;
  }

  const webApp = resolveWebApp();
  return webApp?.initDataUnsafe?.start_param || "";
}

export function getInvitationCode() {
  // Проверяем start параметр из Telegram
  const startParam = getStartParam();
  if (startParam && startParam.startsWith('invite_')) {
    return startParam.replace('invite_', '');
  }
  
  // Проверяем URL параметры (fallback)
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('invite') || urlParams.get('code');
  if (code) {
    return code;
  }
  
  return null;
}

function getCloudStorage() {
  const webApp = resolveWebApp();
  return webApp?.cloudStorage || null;
}

function callCloudStorage(method, key, value) {
  const storage = getCloudStorage();
  if (!storage || typeof storage[method] !== "function") {
    throw new Error("CloudStorage API not available");
  }
  return new Promise((resolve, reject) => {
    const done = (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    };

    if (value === undefined) {
      storage[method](key, done);
    } else {
      storage[method](key, value, done);
    }
  });
}

async function requestCloudStorageFallback(path, { method = "POST", body } = {}) {
  if (!API_BASE_URL) {
    throw new Error("API base URL is not configured");
  }
  if (typeof fetch !== "function") {
    throw new Error("Fetch API is not available");
  }

  const url = `${API_BASE_URL}${path}`;
  const headers = new Headers({ "Content-Type": "application/json" });
  const initData = getInitData();
  if (initData) {
    headers.set("x-telegram-init-data", initData);
  }

  const response = await fetch(url, {
    method,
    headers,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody?.error || "Cloud storage fallback request failed";
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json().catch(() => null);
}

function serializeCloudValue(value) {
  if (value === undefined) {
    throw new Error("Value must be defined for cloudStorage");
  }
  return typeof value === "string" ? value : JSON.stringify(value);
}

export async function setCloudItem(key, value, { fallback = true } = {}) {
  const serializedValue = serializeCloudValue(value);

  try {
    await callCloudStorage("setItem", key, serializedValue);
    return true;
  } catch (error) {
    if (!fallback) {
      throw error;
    }
    console.warn("Telegram cloudStorage setItem failed, fallback to backend", error);
  }

  try {
    await requestCloudStorageFallback(CLOUD_STORAGE_ENDPOINT, {
      method: "POST",
      body: { key, value: serializedValue },
    });
    return true;
  } catch (fallbackError) {
    console.error("Backend fallback setCloudItem failed", fallbackError);
    throw fallbackError;
  }
}

export async function getCloudItem(key, { fallback = true } = {}) {
  try {
    const raw = await callCloudStorage("getItem", key);
    return typeof raw === "string" ? raw : raw ?? null;
  } catch (error) {
    if (!fallback) {
      throw error;
    }
    console.warn("Telegram cloudStorage getItem failed, fallback to backend", error);
  }

  try {
    const data = await requestCloudStorageFallback(`${CLOUD_STORAGE_ENDPOINT}/${encodeURIComponent(key)}`, { method: "GET" });
    const value = data?.value;
    return typeof value === "string" ? value : value ?? null;
  } catch (fallbackError) {
    console.error("Backend fallback getCloudItem failed", fallbackError);
    throw fallbackError;
  }
}

export async function removeCloudItem(key, { fallback = true } = {}) {
  try {
    await callCloudStorage("removeItem", key);
    return true;
  } catch (error) {
    if (!fallback) {
      throw error;
    }
    console.warn("Telegram cloudStorage removeItem failed, fallback to backend", error);
  }

  try {
    await requestCloudStorageFallback(`${CLOUD_STORAGE_ENDPOINT}/${encodeURIComponent(key)}`, { method: "DELETE" });
    return true;
  } catch (fallbackError) {
    console.error("Backend fallback removeCloudItem failed", fallbackError);
    throw fallbackError;
  }
}

export function setMainButton({ text, isVisible = true, color, textColor, onClick }) {
  const webApp = resolveWebApp();
  if (!webApp) {
    return () => {};
  }

  if (text) {
    webApp.MainButton.setText(text);
  }

  if (color || textColor) {
    webApp.MainButton.setParams({ color, text_color: textColor });
  }

  if (isVisible) {
    webApp.MainButton.show();
  } else {
    webApp.MainButton.hide();
  }

  if (onClick) {
    webApp.MainButton.onClick(onClick);
    return () => {
      webApp.MainButton.offClick(onClick);
    };
  }

  return () => {};
}

export function hideMainButton() {
  const webApp = resolveWebApp();
  if (webApp) {
    webApp.MainButton.hide();
  }
}

export function showMainButtonProgress() {
  const webApp = resolveWebApp();
  if (webApp?.MainButton?.showProgress) {
    webApp.MainButton.showProgress(true);
  }
}

export function hideMainButtonProgress() {
  const webApp = resolveWebApp();
  if (webApp?.MainButton?.hideProgress) {
    webApp.MainButton.hideProgress();
  }
}

export function showBackButton(handler) {
  const webApp = resolveWebApp();
  if (!webApp) {
    return () => {};
  }

  webApp.BackButton.show();
  if (handler) {
    webApp.onEvent("backButtonClicked", handler);
    return () => {
      webApp.offEvent("backButtonClicked", handler);
      webApp.BackButton.hide();
    };
  }

  return () => {
    webApp.BackButton.hide();
  };
}

export function hideBackButton() {
  const webApp = resolveWebApp();
  if (webApp) {
    webApp.BackButton.hide();
  }
}

export function setSwipeBehavior({ allowVertical = true, allowHorizontal = true } = {}) {
  const webApp = resolveWebApp();
  if (!webApp) {
    return;
  }

  const verticalAllowed = false;
  const horizontalAllowed = allowHorizontal;

  if (typeof webApp.setSwipeBehavior === "function") {
    webApp.setSwipeBehavior({
      allow_vertical: verticalAllowed,
      allow_horizontal: horizontalAllowed,
      allowVertical: verticalAllowed,
      allowHorizontal: horizontalAllowed,
    });
    return;
  }

  if (!verticalAllowed && typeof webApp.disableVerticalSwipes === "function") {
    webApp.disableVerticalSwipes();
  }

  // Вертикальные свайпы всегда запрещены, поэтому обратное включение не требуется.
}

export function disableVerticalSwipes() {
  setSwipeBehavior({ allowVertical: false });
}

export function enableVerticalSwipes() {
  setSwipeBehavior({ allowVertical: true });
}

export function showAlert(message) {
  const webApp = resolveWebApp();
  if (webApp?.showAlert) {
    webApp.showAlert(message);
  } else {
    window.alert(message);
  }
}

export function showConfirm(message) {
  const webApp = resolveWebApp();
  if (webApp?.showConfirm) {
    return new Promise((resolve) => {
      webApp.showConfirm(message, (result) => resolve(Boolean(result)));
    });
  }
  return Promise.resolve(window.confirm(message));
}

export function showPopup({ title = "", message = "", buttons = [] } = {}) {
  const webApp = resolveWebApp();
  const configuredButtons = buttons.map(({ onClick, ...rest }) => rest);

  if (webApp?.showPopup) {
    return new Promise((resolve) => {
      webApp.showPopup({ title, message, buttons: configuredButtons }, (buttonId) => {
        const selected = buttons.find((button) => button.id === buttonId);
        if (selected?.onClick) {
          try {
            selected.onClick();
          } catch (error) {
            console.error("Popup button handler threw an error", error);
          }
        }
        resolve(buttonId ?? null);
      });
    });
  }

  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }

  if (buttons.length <= 1) {
    if (message) {
      window.alert(message);
    }
    const single = buttons[0];
    if (single?.onClick) {
      try {
        single.onClick();
      } catch (error) {
        console.error("Popup button handler threw an error", error);
      }
    }
    return Promise.resolve(single?.id ?? null);
  }

  const primary = buttons.find((button) => button.type !== "cancel") || buttons[0];
  const cancel = buttons.find((button) => button.type === "cancel");
  const confirmed = window.confirm(message);
  const chosen = confirmed ? primary : cancel || (confirmed ? primary : null);
  if (chosen?.onClick) {
    try {
      chosen.onClick();
    } catch (error) {
      console.error("Popup button handler threw an error", error);
    }
  }
  return Promise.resolve(chosen?.id ?? null);
}

export function hapticImpact(style = "light") {
  const webApp = resolveWebApp();
  if (webApp?.HapticFeedback) {
    webApp.HapticFeedback.impactOccurred(style);
  }
}

export const setViewportListener = onViewportChanged;

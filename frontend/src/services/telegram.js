let webAppInstance = null;
const themeListeners = new Set();
const viewportListeners = new Set();

function resolveWebApp() {
  if (webAppInstance) {
    return webAppInstance;
  }
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
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
    console.warn('Telegram WebApp is not available.');
    return null;
  }
  webApp.ready();
  webApp.expand();
  return webApp;
}

export function onThemeChange(handler) {
  const webApp = resolveWebApp();
  if (!webApp) {
    return () => {};
  }

  const wrapper = () => handler(webApp.themeParams || {});
  themeListeners.add(wrapper);
  webApp.onEvent('themeChanged', wrapper);
  return () => {
    webApp.offEvent('themeChanged', wrapper);
    themeListeners.delete(wrapper);
  };
}

export function getThemeParams() {
  const webApp = resolveWebApp();
  return webApp?.themeParams || {};
}

export function getColorScheme() {
  const webApp = resolveWebApp();
  return webApp?.colorScheme || 'light';
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
  webApp.onEvent('viewportChanged', wrapper);
  return () => {
    webApp.offEvent('viewportChanged', wrapper);
    viewportListeners.delete(wrapper);
  };
}

export function getInitData() {
  const webApp = resolveWebApp();
  return webApp?.initData || '';
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
    webApp.onEvent('backButtonClicked', handler);
    return () => {
      webApp.offEvent('backButtonClicked', handler);
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

export function hapticImpact(style = 'light') {
  const webApp = resolveWebApp();
  if (webApp?.HapticFeedback) {
    webApp.HapticFeedback.impactOccurred(style);
  }
}

export const setViewportListener = onViewportChanged;

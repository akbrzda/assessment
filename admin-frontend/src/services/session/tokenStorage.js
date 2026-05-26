const USER_KEY = "user";
const ACCESS_TOKEN_KEY = "access_token";
const DISABLED_MODULES_KEY = "disabled_modules";
const AVAILABLE_MODULES_KEY = "available_modules";
let accessTokenMemory = null;

const parseUser = (value) => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const parseDisabledModules = (value) => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((item) => String(item || "").trim().toLowerCase()).filter(Boolean);
  } catch {
    return [];
  }
};

const parseAvailableModules = (value) => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((item) => String(item || "").trim().toLowerCase()).filter(Boolean);
  } catch {
    return [];
  }
};

function readAccessTokenFromSession() {
  try {
    return sessionStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export const getAccessToken = () => {
  if (accessTokenMemory) {
    return accessTokenMemory;
  }

  const persistedToken = readAccessTokenFromSession();
  if (persistedToken) {
    accessTokenMemory = persistedToken;
    return persistedToken;
  }

  return null;
};

export const setAccessToken = (token) => {
  const normalizedToken = token || null;
  accessTokenMemory = normalizedToken;

  try {
    if (normalizedToken) {
      sessionStorage.setItem(ACCESS_TOKEN_KEY, normalizedToken);
    } else {
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  } catch {
    // Безопасный fallback: оставляем токен только в памяти
  }
};

export const clearAccessToken = () => {
  accessTokenMemory = null;
  try {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch {
    // Игнорируем ошибки недоступного sessionStorage
  }
};

export const getUser = () => parseUser(localStorage.getItem(USER_KEY));

export const setUser = (user) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearUser = () => {
  localStorage.removeItem(USER_KEY);
};

export const getDisabledModules = () => parseDisabledModules(localStorage.getItem(DISABLED_MODULES_KEY));

export const setDisabledModules = (disabledModules = []) => {
  const normalized = Array.isArray(disabledModules)
    ? disabledModules.map((item) => String(item || "").trim().toLowerCase()).filter(Boolean)
    : [];
  localStorage.setItem(DISABLED_MODULES_KEY, JSON.stringify(normalized));
};

export const clearDisabledModules = () => {
  localStorage.removeItem(DISABLED_MODULES_KEY);
};

export const getAvailableModules = () => parseAvailableModules(localStorage.getItem(AVAILABLE_MODULES_KEY));

export const setAvailableModules = (availableModules = []) => {
  const normalized = Array.isArray(availableModules)
    ? availableModules.map((item) => String(item || "").trim().toLowerCase()).filter(Boolean)
    : [];
  localStorage.setItem(AVAILABLE_MODULES_KEY, JSON.stringify(normalized));
};

export const clearAvailableModules = () => {
  localStorage.removeItem(AVAILABLE_MODULES_KEY);
};

export const clearSession = () => {
  clearAccessToken();
  clearUser();
  clearDisabledModules();
  clearAvailableModules();
};

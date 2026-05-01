const USER_KEY = "user";
const ACCESS_TOKEN_KEY = "access_token";
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

export const clearSession = () => {
  clearAccessToken();
  clearUser();
};

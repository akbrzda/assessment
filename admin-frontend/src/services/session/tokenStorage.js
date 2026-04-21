const USER_KEY = "user";
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

export const getAccessToken = () => accessTokenMemory;

export const setAccessToken = (token) => {
  accessTokenMemory = token || null;
};

export const clearAccessToken = () => {
  accessTokenMemory = null;
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

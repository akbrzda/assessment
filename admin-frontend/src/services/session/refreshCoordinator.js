import axios from "axios";
import { API_BASE_URL } from "@/env";
import { clearSession, setAccessToken } from "./tokenStorage";

const DEFAULT_API_BASE_URL = API_BASE_URL || "http://localhost:3001/api";

let isRefreshing = false;
let failedQueue = [];
let refreshPromise = null;
const accessTokenListeners = new Set();

const processQueue = (error, token = null) => {
  failedQueue.forEach((requestPromise) => {
    if (error) {
      requestPromise.reject(error);
      return;
    }

    requestPromise.resolve(token);
  });

  failedQueue = [];
};

const notifyAccessTokenListeners = (token) => {
  accessTokenListeners.forEach((listener) => {
    try {
      listener(token);
    } catch (error) {
      console.error("Ошибка при обработке обновления access token:", error);
    }
  });
};

const requestTokenRefresh = async () => {
  const { data } = await axios.post(`${DEFAULT_API_BASE_URL}/admin/auth/refresh`, null, {
    withCredentials: true,
  });

  return data.accessToken;
};

export const onAccessTokenRefreshed = (listener) => {
  accessTokenListeners.add(listener);
  return () => {
    accessTokenListeners.delete(listener);
  };
};

export const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = requestTokenRefresh()
      .then((newAccessToken) => {
        setAccessToken(newAccessToken);
        notifyAccessTokenListeners(newAccessToken);
        return newAccessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

export const resolveUnauthorizedRequest = async ({ error, originalRequest, requestClient }) => {
  if (error.response?.status !== 401 || originalRequest?._retry) {
    throw error;
  }

  if (isRefreshing) {
    const token = await new Promise((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    });

    originalRequest.headers = originalRequest.headers || {};
    originalRequest.headers.Authorization = `Bearer ${token}`;
    return requestClient(originalRequest);
  }

  originalRequest._retry = true;
  isRefreshing = true;

  try {
    const newAccessToken = await refreshAccessToken();

    processQueue(null, newAccessToken);
    originalRequest.headers = originalRequest.headers || {};
    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

    return requestClient(originalRequest);
  } catch (refreshError) {
    processQueue(refreshError, null);
    clearSession();
    throw refreshError;
  } finally {
    isRefreshing = false;
  }
};

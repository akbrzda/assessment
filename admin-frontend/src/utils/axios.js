import axios from "axios";
import { API_BASE_URL } from "@/env";
import cacheService from "@/composables/useCache";

const DEFAULT_API_BASE_URL = API_BASE_URL || "http://localhost:3001/api";

const apiClient = axios.create({
  baseURL: DEFAULT_API_BASE_URL,
  withCredentials: true,
});

// Добавление токена в каждый запрос
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Проверяем кеш для GET запросов
  if (config.method === "get" && config.cache !== false) {
    const cacheKey = `${config.method}:${config.url}:${JSON.stringify(config.params || {})}`;
    const maxAge = config.cacheMaxAge || 300000; // 5 минут по умолчанию

    const cached = cacheService.get(cacheKey, maxAge);
    if (cached !== undefined) {
      // Возвращаем закешированные данные
      config.adapter = () => {
        return Promise.resolve({
          data: cached,
          status: 200,
          statusText: "OK (cached)",
          headers: {},
          config,
          request: {},
        });
      };
    }
  }

  return config;
});

// Флаг для предотвращения множественных одновременных обновлений токена
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Обновление токена при 401
apiClient.interceptors.response.use(
  (response) => {
    // Кешируем успешные GET запросы
    if (response.config.method === "get" && response.config.cache !== false && response.status === 200) {
      const cacheKey = `${response.config.method}:${response.config.url}:${JSON.stringify(response.config.params || {})}`;
      cacheService.set(cacheKey, response.data);
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Если уже идёт обновление токена, добавляем запрос в очередь
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(`${DEFAULT_API_BASE_URL}/admin/auth/refresh`, null, {
          withCredentials: true,
        });

        const newAccessToken = data.accessToken;
        localStorage.setItem("accessToken", newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        // Синхронно обновляем токен в store и переподключаем WebSocket
        const { useAuthStore } = await import("@/stores/auth");
        const authStore = useAuthStore();
        authStore.setTokenAndReconnectWS(newAccessToken);

        // Обрабатываем очередь запросов с новым токеном
        processQueue(null, newAccessToken);

        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        console.error("❌ Failed to refresh token:", refreshError);
        localStorage.clear();
        // Перенаправляем на login только если мы не на странице login
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Инвалидировать кеш для определенных паттернов
 * @param {string|RegExp} pattern - Паттерн URL для инвалидации
 */
export const invalidateCache = (pattern) => {
  return cacheService.invalidate(pattern);
};

/**
 * Выполнить запрос с инвалидацией кеша после успешного выполнения
 * @param {Function} requestFn - Функция запроса
 * @param {string|RegExp} cachePattern - Паттерн для инвалидации
 */
export const mutateWithInvalidation = async (requestFn, cachePattern) => {
  try {
    const result = await requestFn();
    if (cachePattern) {
      invalidateCache(cachePattern);
    }
    return result;
  } catch (error) {
    throw error;
  }
};

export default apiClient;

import axios from "axios";
import { API_BASE_URL } from "@/env";
import cacheService from "@/composables/useCache";

const DEFAULT_API_BASE_URL = API_BASE_URL || "http://localhost:3001/api";

const apiClient = axios.create({
  baseURL: DEFAULT_API_BASE_URL,
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
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        const { data } = await axios.post(`${DEFAULT_API_BASE_URL}/admin/auth/refresh`, {
          refreshToken,
        });

        localStorage.setItem("accessToken", data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;

        // Синхронно обновляем токен в store и переподключаем WebSocket
        const { useAuthStore } = await import("@/stores/auth");
        const authStore = useAuthStore();
        authStore.setTokenAndReconnectWS(data.accessToken);

        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error("Failed to refresh token:", refreshError);
        localStorage.clear();
        // Перенаправляем на login только если мы не на странице login
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
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

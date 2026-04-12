import axios from "axios";
import { API_BASE_URL } from "@/env";
import cacheService from "@/composables/useCache";
import { resolveUnauthorizedRequest } from "@/services/session/refreshCoordinator";
import { getAccessToken } from "@/services/session/tokenStorage";

const DEFAULT_API_BASE_URL = API_BASE_URL || "http://localhost:3001/api";

const apiClient = axios.create({
  baseURL: DEFAULT_API_BASE_URL,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (config.method === "get" && config.cache !== false) {
    const cacheKey = `${config.method}:${config.url}:${JSON.stringify(config.params || {})}`;
    const maxAge = config.cacheMaxAge || 300000;

    const cached = cacheService.get(cacheKey, maxAge);
    if (cached !== undefined) {
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

apiClient.interceptors.response.use(
  (response) => {
    if (response.config.method === "get" && response.config.cache !== false && response.status === 200) {
      const cacheKey = `${response.config.method}:${response.config.url}:${JSON.stringify(response.config.params || {})}`;
      cacheService.set(cacheKey, response.data);
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest?._retry) {
      try {
        return await resolveUnauthorizedRequest({
          error,
          originalRequest,
          requestClient: apiClient,
        });
      } catch (refreshError) {
        console.error("Не удалось обновить токен:", refreshError);

        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const invalidateCache = (pattern) => {
  return cacheService.invalidate(pattern);
};

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

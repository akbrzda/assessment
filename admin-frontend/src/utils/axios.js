import axios from "axios";
import { API_BASE_URL } from "@/env";

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
  return config;
});

// Обновление токена при 401
apiClient.interceptors.response.use(
  (response) => response,
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

        // Обновляем токен в store и переподключаем WebSocket
        try {
          const { useAuthStore } = await import("@/stores/auth");
          const authStore = useAuthStore();
          authStore.setToken(data.accessToken);
        } catch (storeError) {
          console.error("Failed to update auth store:", storeError);
        }

        return apiClient(originalRequest);
      } catch (refreshError) {
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

export default apiClient;

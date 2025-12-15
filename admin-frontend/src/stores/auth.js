import { defineStore } from "pinia";
import authApi from "../api/auth";
import websocketService from "../services/websocket";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: JSON.parse(localStorage.getItem("user")) || null,
    accessToken: localStorage.getItem("accessToken") || null,
    refreshToken: localStorage.getItem("refreshToken") || null,
    tokenRefreshTimer: null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.accessToken,
    isSuperAdmin: (state) => state.user?.role === "superadmin",
    isManager: (state) => state.user?.role === "manager",
    token: (state) => state.accessToken,
  },

  actions: {
    async login(credentials) {
      try {
        const { data } = await authApi.login(credentials);

        this.user = data.user;
        this.accessToken = data.accessToken;
        this.refreshToken = data.refreshToken;

        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);

        // Подключаем WebSocket после успешного логина
        websocketService.connect();

        // Запускаем автообновление токена
        this.startTokenRefresh();

        return true;
      } catch (error) {
        console.error("Login failed:", error);
        return false;
      }
    },

    startTokenRefresh() {
      // Очищаем предыдущий таймер если есть
      if (this.tokenRefreshTimer) {
        clearInterval(this.tokenRefreshTimer);
      }

      // Обновляем токен каждые 10 минут (токен живёт 15 минут)
      this.tokenRefreshTimer = setInterval(async () => {
        try {
          const { data } = await authApi.refresh();
          this.setToken(data.accessToken);
          console.log("Токен автоматически обновлён");
        } catch (error) {
          console.error("Не удалось обновить токен:", error);
          // Останавливаем таймер, axios interceptor сам сделает redirect на login
          clearInterval(this.tokenRefreshTimer);
          this.tokenRefreshTimer = null;
        }
      }, 10 * 60 * 1000); // 10 минут
    },

    setToken(newAccessToken) {
      this.accessToken = newAccessToken;
      localStorage.setItem("accessToken", newAccessToken);

      // Переподключаем WebSocket с новым токеном
      if (websocketService.isConnected) {
        websocketService.reconnectWithNewToken(newAccessToken);
      }
    },

    async logout() {
      try {
        await authApi.logout();
      } catch (error) {
        console.error("Logout error:", error);
      } finally {
        // Останавливаем автообновление токена
        if (this.tokenRefreshTimer) {
          clearInterval(this.tokenRefreshTimer);
          this.tokenRefreshTimer = null;
        }

        // Отключаем WebSocket перед выходом
        websocketService.disconnect();

        this.user = null;
        this.accessToken = null;
        this.refreshToken = null;
        localStorage.clear();
      }
    },
  },
});

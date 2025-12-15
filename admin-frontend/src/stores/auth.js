import { defineStore } from "pinia";
import authApi from "../api/auth";
import websocketService from "../services/websocket";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: JSON.parse(localStorage.getItem("user")) || null,
    accessToken: localStorage.getItem("accessToken") || null,
    refreshToken: localStorage.getItem("refreshToken") || null,
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

        return true;
      } catch (error) {
        console.error("Login failed:", error);
        return false;
      }
    },

    async logout() {
      try {
        await authApi.logout();
      } catch (error) {
        console.error("Logout error:", error);
      } finally {
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

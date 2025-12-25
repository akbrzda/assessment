import { defineStore } from "pinia";
import authApi from "../api/auth";
import websocketService from "../services/websocket";
import apiClient from "../utils/axios";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: JSON.parse(localStorage.getItem("user")) || null,
    accessToken: localStorage.getItem("accessToken") || null,
    refreshToken: localStorage.getItem("refreshToken") || null,
    tokenRefreshTimer: null,
    isRefreshing: false,
    userPermissions: null, // Индивидуальные права пользователя
    permissionsLoaded: false,
  }),

  getters: {
    isAuthenticated: (state) => !!state.accessToken,
    isSuperAdmin: (state) => state.user?.role === "superadmin",
    isManager: (state) => state.user?.role === "manager",
    token: (state) => state.accessToken,

    /**
     * Проверяет доступ к модулю на основе роли и индивидуальных прав
     */
    hasModuleAccess: (state) => (moduleCode) => {
      // Superadmin имеет доступ ко всем модулям
      if (state.user?.role === "superadmin") {
        return true;
      }

      // Если права не загружены, используем дефолтные права роли
      if (!state.permissionsLoaded || !state.userPermissions) {
        // Дефолтные права для manager
        if (state.user?.role === "manager") {
          const managerModules = ["assessments", "analytics", "users", "reports", "questions"];
          return managerModules.includes(moduleCode);
        }
        return false;
      }

      // Ищем право для модуля
      const permission = state.userPermissions.find((p) => p.moduleCode === moduleCode);
      
      // Если есть кастомное право, используем его
      if (permission && permission.isCustom) {
        return permission.hasAccess;
      }

      // Если индивидуального права нет или оно не кастомное, используем дефолтное право роли
      if (state.user?.role === "manager") {
        const managerModules = ["assessments", "analytics", "users", "reports", "questions"];
        return managerModules.includes(moduleCode);
      }

      return false;
    },
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

        // Загружаем права пользователя
        await this.loadUserPermissions();

        return true;
      } catch (error) {
        console.error("Login failed:", error);
        return false;
      }
    },

    async loadUserPermissions() {
      if (!this.user?.id) {
        this.permissionsLoaded = false;
        return;
      }

      try {
        const { data } = await apiClient.get(`/admin/permissions/users/${this.user.id}`);
        this.userPermissions = data.permissions || [];
        this.permissionsLoaded = true;
      } catch (error) {
        console.error("Не удалось загрузить права пользователя:", error);
        this.permissionsLoaded = false;
      }
    },

    startTokenRefresh() {
      // Очищаем предыдущий таймер если есть
      if (this.tokenRefreshTimer) {
        clearInterval(this.tokenRefreshTimer);
      }

      // Обновляем токен каждые 10 минут (токен живёт 15 минут)
      this.tokenRefreshTimer = setInterval(async () => {
        // Предотвращаем параллельные обновления
        if (this.isRefreshing) {
          console.log("Обновление токена уже выполняется, пропускаем");
          return;
        }

        this.isRefreshing = true;
        try {
          const { data } = await authApi.refresh();
          this.setTokenAndReconnectWS(data.accessToken);
          console.log("Токен автоматически обновлён");
        } catch (error) {
          console.error("Не удалось обновить токен:", error);
          // Останавливаем таймер, axios interceptor сам сделает redirect на login
          clearInterval(this.tokenRefreshTimer);
          this.tokenRefreshTimer = null;
        } finally {
          this.isRefreshing = false;
        }
      }, 10 * 60 * 1000); // 10 минут
    },

    setToken(newAccessToken) {
      this.accessToken = newAccessToken;
      localStorage.setItem("accessToken", newAccessToken);
    },

    updateUser(userData) {
      this.user = { ...this.user, ...userData };
      localStorage.setItem("user", JSON.stringify(this.user));
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
        this.userPermissions = null;
        this.permissionsLoaded = false;
        localStorage.clear();
      }
    },
  },
});

import { defineStore } from "pinia";
import authApi from "../api/auth";
import websocketService from "../services/websocket";
import apiClient from "../utils/axios";
import {
  clearSession,
  getAccessToken,
  getUser,
  setAccessToken,
  setUser,
} from "../services/session/tokenStorage";
import { onAccessTokenRefreshed, refreshAccessToken } from "../services/session/refreshCoordinator";

const MANAGER_DEFAULT_MODULES = ["assessments", "analytics", "users", "reports", "questions"];

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: getUser(),
    accessToken: getAccessToken(),
    tokenRefreshTimer: null,
    sessionSyncUnsubscribe: null,
    userPermissions: null,
    permissionsLoaded: false,
  }),

  getters: {
    isAuthenticated: (state) => !!state.accessToken,
    isSuperAdmin: (state) => state.user?.role === "superadmin",
    isManager: (state) => state.user?.role === "manager",
    token: (state) => state.accessToken,

    hasModuleAccess: (state) => (moduleCode) => {
      if (state.user?.role === "superadmin") {
        return true;
      }

      if (!state.permissionsLoaded || !state.userPermissions) {
        if (state.user?.role === "manager") {
          return MANAGER_DEFAULT_MODULES.includes(moduleCode);
        }

        return false;
      }

      const permission = state.userPermissions.find((item) => item.moduleCode === moduleCode);

      if (permission && permission.isCustom) {
        return permission.hasAccess;
      }

      if (state.user?.role === "manager") {
        return MANAGER_DEFAULT_MODULES.includes(moduleCode);
      }

      return false;
    },
  },

  actions: {
    initSessionSync() {
      if (this.sessionSyncUnsubscribe) {
        return;
      }

      this.sessionSyncUnsubscribe = onAccessTokenRefreshed((newAccessToken) => {
        this.accessToken = newAccessToken;

        if (websocketService.isConnected) {
          websocketService.reconnectWithNewToken(newAccessToken);
        }
      });
    },

    stopSessionSync() {
      if (!this.sessionSyncUnsubscribe) {
        return;
      }

      this.sessionSyncUnsubscribe();
      this.sessionSyncUnsubscribe = null;
    },

    async login(credentials) {
      try {
        const { data } = await authApi.login(credentials);

        this.user = data.user;
        this.accessToken = data.accessToken;

        setUser(data.user);
        setAccessToken(data.accessToken);

        websocketService.connect();
        this.startTokenRefresh();
        await this.loadUserPermissions();

        return true;
      } catch (error) {
        console.error("Ошибка входа:", error);
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
      if (this.tokenRefreshTimer) {
        clearInterval(this.tokenRefreshTimer);
      }

      this.tokenRefreshTimer = setInterval(async () => {
        try {
          await refreshAccessToken();
        } catch (error) {
          console.error("Не удалось автоматически обновить токен:", error);
          clearInterval(this.tokenRefreshTimer);
          this.tokenRefreshTimer = null;
        }
      }, 25 * 60 * 1000);
    },

    setToken(newAccessToken) {
      this.accessToken = newAccessToken;
      setAccessToken(newAccessToken);
    },

    setTokenAndReconnectWS(newAccessToken) {
      this.setToken(newAccessToken);
      websocketService.reconnectWithNewToken(newAccessToken);
    },

    updateUser(userData) {
      this.user = { ...this.user, ...userData };
      setUser(this.user);
    },

    async logout() {
      try {
        await authApi.logout();
      } catch (error) {
        console.error("Ошибка выхода:", error);
      } finally {
        if (this.tokenRefreshTimer) {
          clearInterval(this.tokenRefreshTimer);
          this.tokenRefreshTimer = null;
        }

        websocketService.disconnect();

        this.user = null;
        this.accessToken = null;
        this.userPermissions = null;
        this.permissionsLoaded = false;
        clearSession();
      }
    },
  },
});

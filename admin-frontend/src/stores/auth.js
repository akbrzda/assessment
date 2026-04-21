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

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: getUser(),
    accessToken: getAccessToken(),
    tokenRefreshTimer: null,
    sessionSyncUnsubscribe: null,
    userPermissions: null,
    permissionsLoaded: false,
    defaultModulesByRole: {},
    restorePromise: null,
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

      const roleDefaults = state.defaultModulesByRole[state.user?.role] || [];
      const hasRoleDefault = roleDefaults.includes("*") || roleDefaults.includes(moduleCode);

      if (!state.permissionsLoaded || !state.userPermissions) {
        return hasRoleDefault;
      }

      const permission = state.userPermissions.find((item) => item.moduleCode === moduleCode);
      if (permission && permission.isCustom) {
        return permission.hasAccess;
      }

      return hasRoleDefault;
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
        this.setToken(data.accessToken);
        setUser(data.user);

        websocketService.connect();
        this.startTokenRefresh();
        await this.loadUserPermissions();

        return true;
      } catch (error) {
        console.error("Ошибка входа:", error);
        return false;
      }
    },

    async loadDefaultModules() {
      try {
        const { data } = await apiClient.get("/admin/permissions/default-modules", {
          cacheMaxAge: 300000,
        });

        this.defaultModulesByRole = data.defaultModules || {};
      } catch (error) {
        console.error("Не удалось загрузить default-модули:", error);
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

        if (data.roleName && Array.isArray(data.defaultModules)) {
          this.defaultModulesByRole = {
            ...this.defaultModulesByRole,
            [data.roleName]: data.defaultModules,
          };
        } else if (!Object.keys(this.defaultModulesByRole).length) {
          await this.loadDefaultModules();
        }
      } catch (error) {
        console.error("Не удалось загрузить права пользователя:", error);
        this.permissionsLoaded = false;
      }
    },

    async tryRestoreSession() {
      if (this.isAuthenticated) {
        return true;
      }

      if (this.restorePromise) {
        return this.restorePromise;
      }

      this.restorePromise = (async () => {
        try {
          const { data } = await authApi.refresh();
          if (!data?.accessToken) {
            return false;
          }

          this.setToken(data.accessToken);

          if (data.user) {
            this.user = data.user;
            setUser(data.user);
          }

          this.startTokenRefresh();
          await this.loadUserPermissions();
          websocketService.connect();
          return true;
        } catch {
          this.user = null;
          this.accessToken = null;
          this.userPermissions = null;
          this.permissionsLoaded = false;
          clearSession();
          return false;
        } finally {
          this.restorePromise = null;
        }
      })();

      return this.restorePromise;
    },

    startTokenRefresh() {
      if (this.tokenRefreshTimer) {
        clearInterval(this.tokenRefreshTimer);
      }

      this.tokenRefreshTimer = setInterval(async () => {
        try {
          await refreshAccessToken();
        } catch (error) {
          console.error("Не удалось обновить access token:", error);
          clearInterval(this.tokenRefreshTimer);
          this.tokenRefreshTimer = null;
        }
      }, 25 * 60 * 1000);
    },

    setToken(newAccessToken) {
      this.accessToken = newAccessToken || null;
      setAccessToken(newAccessToken || null);
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
        this.defaultModulesByRole = {};
        clearSession();
      }
    },
  },
});

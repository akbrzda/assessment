import { defineStore } from "pinia";
import authApi from "../api/auth";
import websocketService from "../services/websocket";
import {
  clearSession,
  getAccessToken,
  getDisabledModules,
  getUser,
  setAccessToken,
  setDisabledModules as persistDisabledModules,
  setUser,
} from "../services/session/tokenStorage";
import { onAccessTokenRefreshed, refreshAccessToken } from "../services/session/refreshCoordinator";

const HARD_CODED_ROLE_MODULES = {
  superadmin: ["*"],
  manager: ["assessments", "analytics", "users", "questions", "courses", "invitations"],
};

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: getUser(),
    accessToken: getAccessToken(),
    tokenRefreshTimer: null,
    sessionSyncUnsubscribe: null,
    userPermissions: null,
    permissionsLoaded: false,
    defaultModulesByRole: {},
    disabledModules: getDisabledModules(),
    restorePromise: null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.accessToken,
    isSuperAdmin: (state) => state.user?.role === "superadmin",
    isManager: (state) => state.user?.role === "manager",
    token: (state) => state.accessToken,

    hasModuleAccess: (state) => (moduleCode) => {
      if (state.disabledModules.includes(moduleCode)) {
        return false;
      }

      const roleName = state.user?.role;
      const roleDefaults = HARD_CODED_ROLE_MODULES[roleName] || [];
      return roleDefaults.includes("*") || roleDefaults.includes(moduleCode);
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
        this.disabledModules = Array.isArray(data.disabledModules) ? data.disabledModules : [];
        persistDisabledModules(this.disabledModules);
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
      this.defaultModulesByRole = { ...HARD_CODED_ROLE_MODULES };
    },

    async loadUserPermissions() {
      this.userPermissions = null;
      this.permissionsLoaded = true;
      this.defaultModulesByRole = { ...HARD_CODED_ROLE_MODULES };
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
          this.disabledModules = Array.isArray(data.disabledModules) ? data.disabledModules : [];
          persistDisabledModules(this.disabledModules);

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

    setDisabledModules(disabledModules = []) {
      this.disabledModules = Array.isArray(disabledModules) ? disabledModules : [];
      persistDisabledModules(this.disabledModules);
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
        this.disabledModules = [];
        clearSession();
      }
    },
  },
});

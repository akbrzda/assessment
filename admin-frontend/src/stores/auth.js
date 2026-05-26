import { defineStore } from "pinia";
import authApi from "../api/auth";
import websocketService from "../services/websocket";
import {
  clearSession,
  getAccessToken,
  getAvailableModules,
  getDisabledModules,
  getUser,
  setAccessToken,
  setAvailableModules as persistAvailableModules,
  setDisabledModules as persistDisabledModules,
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
    disabledModules: getDisabledModules(),
    availableModules: getAvailableModules(),
    restorePromise: null,
    featureFlagsUnsubscribe: null,
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

      if (!moduleCode) {
        return true;
      }

      return state.availableModules.includes("*") || state.availableModules.includes(moduleCode);
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

      if (!this.featureFlagsUnsubscribe) {
        this.featureFlagsUnsubscribe = websocketService.on("feature_flags_updated", (payload) => {
          this.setDisabledModules(payload?.disabledModules || []);
        });
      }
    },

    stopSessionSync() {
      if (!this.sessionSyncUnsubscribe) {
        return;
      }

      this.sessionSyncUnsubscribe();
      this.sessionSyncUnsubscribe = null;

      if (this.featureFlagsUnsubscribe) {
        this.featureFlagsUnsubscribe();
        this.featureFlagsUnsubscribe = null;
      }
    },

    async login(credentials) {
      try {
        const { data } = await authApi.login(credentials);

        this.user = data.user;
        this.disabledModules = Array.isArray(data.disabledModules) ? data.disabledModules : [];
        this.availableModules = Array.isArray(data.availableModules) ? data.availableModules : [];
        persistDisabledModules(this.disabledModules);
        persistAvailableModules(this.availableModules);
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
      this.defaultModulesByRole = {};
    },

    async loadUserPermissions() {
      this.userPermissions = null;
      this.permissionsLoaded = true;
      this.defaultModulesByRole = {};
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
          this.availableModules = Array.isArray(data.availableModules) ? data.availableModules : [];
          persistDisabledModules(this.disabledModules);
          persistAvailableModules(this.availableModules);

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

    setAvailableModules(availableModules = []) {
      this.availableModules = Array.isArray(availableModules) ? availableModules : [];
      persistAvailableModules(this.availableModules);
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
        this.availableModules = [];
        clearSession();
      }
    },
  },
});

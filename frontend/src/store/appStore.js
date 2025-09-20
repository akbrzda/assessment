import { defineStore } from 'pinia';
import { apiClient } from '../services/apiClient';
import { hapticImpact, hideMainButton } from '../services/telegram';
import { getItem, setItem } from '../services/storage';
import router from '../router';

const STORAGE_INVITE_ACCEPTED = 'invite_accepted';

export const useAppStore = defineStore('app', {
  state: () => ({
    isLoading: false,
    isInitialized: false,
    user: null,
    defaults: { firstName: '', lastName: '', avatarUrl: null },
    invitation: null,
    invitationAccepted: false,
    references: { branches: [], positions: [], roles: [] },
    error: null
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.user),
    isManager: (state) => state.user?.roleName === 'manager',
    isSuperAdmin: (state) => state.user?.roleName === 'superadmin'
  },
  actions: {
    async ensureReady() {
      if (this.isInitialized) {
        return;
      }
      this.isLoading = true;
      try {
        const accepted = await getItem(STORAGE_INVITE_ACCEPTED);
        this.invitationAccepted = Boolean(accepted);

        const status = await apiClient.getStatus();
        if (status.registered) {
          this.user = status.user;
          this.invitation = null;
          this.invitationAccepted = true;
          const currentRoute = router.currentRoute?.value;
          if (currentRoute && ['register', 'invite'].includes(currentRoute.name)) {
            router.replace({ name: 'dashboard' });
          }
        } else {
          this.defaults = status.defaults || { firstName: '', lastName: '', avatarUrl: null };
          this.invitation = status.invitation;
          if (!this.invitation) {
            this.invitationAccepted = true;
          } else {
            this.invitationAccepted = false;
          }
          await this.loadReferences();
        }
      } catch (error) {
        if (error.status === 401) {
          this.error = 'Откройте мини-приложение из Telegram, чтобы пройти авторизацию.';
        } else {
          this.error = error.message;
        }
        console.error('Failed to init app', error);
      } finally {
        this.isInitialized = true;
        this.isLoading = false;
      }
    },
    async loadReferences() {
      try {
        const data = await apiClient.getReferences();
        this.references = {
          branches: data.branches || [],
          positions: data.positions || [],
          roles: data.roles || []
        };
      } catch (error) {
        console.error('Failed to load references', error);
      }
    },
    async submitRegistration(form) {
      this.isLoading = true;
      this.error = null;
      try {
        const response = await apiClient.register(form);
        this.user = response.user;
        this.invitation = null;
        this.invitationAccepted = true;
        await setItem(STORAGE_INVITE_ACCEPTED, true);
        hapticImpact('medium');
        return response.user;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.isLoading = false;
        hideMainButton();
      }
    },
    async refreshProfile() {
      if (!this.user) {
        return;
      }
      try {
        const response = await apiClient.getProfile();
        this.user = response.user;
      } catch (error) {
        console.error('Failed to refresh profile', error);
      }
    },
    async updateProfile(payload) {
      if (!this.user) {
        return null;
      }
      this.isLoading = true;
      try {
        const response = await apiClient.updateProfile(payload);
        this.user = response.user;
        hapticImpact('light');
        return response.user;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.isLoading = false;
        hideMainButton();
      }
    },
    async acceptInvitation() {
      this.invitationAccepted = true;
      await setItem(STORAGE_INVITE_ACCEPTED, true);
    }
  }
});

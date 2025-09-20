import { defineStore } from 'pinia';
import { apiClient } from '../services/apiClient';

export const useInvitationsStore = defineStore('invitations', {
  state: () => ({
    isLoading: false,
    isSubmitting: false,
    pendingAction: null,
    pendingId: null,
    error: null,
    invitations: []
  }),
  actions: {
    async fetchInvitations() {
      this.isLoading = true;
      this.error = null;
      try {
        const { invitations } = await apiClient.listInvitations();
        this.invitations = invitations;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.isLoading = false;
      }
    },
    async createInvitation(payload) {
      this.isSubmitting = true;
      this.pendingAction = 'create';
      this.pendingId = null;
      this.error = null;
      try {
        const { invitation } = await apiClient.createInvitation(payload);
        this.invitations.unshift(invitation);
        return invitation;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.isSubmitting = false;
        this.pendingAction = null;
        this.pendingId = null;
      }
    },
    async extendInvitation(id, payload) {
      this.isSubmitting = true;
      this.pendingAction = 'extend';
      this.pendingId = id;
      this.error = null;
      try {
        const { invitation } = await apiClient.extendInvitation(id, payload);
        this.invitations = this.invitations.map((item) => (item.id === id ? invitation : item));
        return invitation;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.isSubmitting = false;
        this.pendingAction = null;
        this.pendingId = null;
      }
    },
    async deleteInvitation(id) {
      this.isSubmitting = true;
      this.pendingAction = 'delete';
      this.pendingId = id;
      this.error = null;
      try {
        await apiClient.deleteInvitation(id);
        this.invitations = this.invitations.filter((item) => item.id !== id);
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.isSubmitting = false;
        this.pendingAction = null;
        this.pendingId = null;
      }
    }
  }
});

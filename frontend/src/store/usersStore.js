import { defineStore } from 'pinia';
import { apiClient } from '../services/apiClient';

export const useUsersStore = defineStore('users', {
  state: () => ({
    isLoading: false,
    isSubmitting: false,
    pendingAction: null,
    pendingId: null,
    error: null,
    users: []
  }),
  actions: {
    async fetchUsers() {
      this.isLoading = true;
      this.error = null;
      try {
        const { users } = await apiClient.listUsers();
        this.users = users;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.isLoading = false;
      }
    },
    async updateUser(id, payload) {
      this.isSubmitting = true;
      this.pendingAction = 'update';
      this.pendingId = id;
      this.error = null;
      try {
        const { user } = await apiClient.updateUser(id, payload);
        this.users = this.users.map((item) => (item.id === id ? user : item));
        return user;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.isSubmitting = false;
        this.pendingAction = null;
        this.pendingId = null;
      }
    },
    async deleteUser(id) {
      this.isSubmitting = true;
      this.pendingAction = 'delete';
      this.pendingId = id;
      this.error = null;
      try {
        await apiClient.deleteUser(id);
        this.users = this.users.filter((item) => item.id !== id);
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

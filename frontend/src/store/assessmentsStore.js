import { defineStore } from 'pinia';
import { apiClient } from '../services/apiClient';

export const useAssessmentsStore = defineStore('assessments', {
  state: () => ({
    isLoading: false,
    isSubmitting: false,
    targetsLoading: false,
    error: null,
    assessments: [],
    currentAssessment: null,
    targets: {
      users: [],
      positions: [],
      branches: []
    },
    pendingAction: null,
    pendingId: null
  }),
  actions: {
    async fetchAssessments() {
      this.isLoading = true;
      this.error = null;
      try {
        const { assessments } = await apiClient.listAssessmentsAdmin();
        this.assessments = assessments;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.isLoading = false;
      }
    },
    async fetchTargets(force = false) {
      if (!force && this.targets.users.length && this.targets.positions.length && this.targets.branches.length) {
        return this.targets;
      }
      this.targetsLoading = true;
      this.error = null;
      try {
        const { users, positions, branches } = await apiClient.getAssessmentTargets();
        this.targets = {
          users: users || [],
          positions: positions || [],
          branches: branches || []
        };
        return this.targets;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.targetsLoading = false;
      }
    },
    async fetchAssessment(id) {
      this.isLoading = true;
      this.error = null;
      try {
        const { assessment } = await apiClient.getAssessmentDetail(id);
        this.currentAssessment = assessment;
        return assessment;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.isLoading = false;
      }
    },
    async createAssessment(payload) {
      this.isSubmitting = true;
      this.pendingAction = 'create';
      this.pendingId = null;
      this.error = null;
      try {
        const { assessment } = await apiClient.createAssessment(payload);
        this.assessments.unshift(assessment);
        this.currentAssessment = assessment;
        return assessment;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.isSubmitting = false;
        this.pendingAction = null;
        this.pendingId = null;
      }
    },
    async updateAssessment(id, payload) {
      this.isSubmitting = true;
      this.pendingAction = 'update';
      this.pendingId = id;
      this.error = null;
      try {
        const { assessment } = await apiClient.updateAssessment(id, payload);
        this.currentAssessment = assessment;
        this.assessments = this.assessments.map((item) => (item.id === id ? assessment : item));
        return assessment;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.isSubmitting = false;
        this.pendingAction = null;
        this.pendingId = null;
      }
    },
    async deleteAssessment(id) {
      this.isSubmitting = true;
      this.pendingAction = 'delete';
      this.pendingId = id;
      this.error = null;
      try {
        await apiClient.deleteAssessment(id);
        this.assessments = this.assessments.filter((item) => item.id !== id);
        if (this.currentAssessment?.id === id) {
          this.currentAssessment = null;
        }
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

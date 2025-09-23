import { defineStore } from 'pinia';
import { apiClient } from '../services/apiClient';

function normalizeDateInput(value) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

export const useAnalyticsStore = defineStore('analytics', {
  state: () => ({
    isLoading: false,
    summary: null,
    branches: [],
    employees: [],
    error: null,
    branchFilter: null,
    positionFilter: null,
    dateFrom: null,
    dateTo: null,
    sortBy: 'score'
  }),
  getters: {
    hasDateFilter(state) {
      return Boolean(state.dateFrom || state.dateTo);
    }
  },
  actions: {
    setFilters({ branchId = null, positionId = null, from = null, to = null }) {
      this.branchFilter = branchId;
      this.positionFilter = positionId;
      this.dateFrom = normalizeDateInput(from);
      this.dateTo = normalizeDateInput(to);
    },
    async fetchSummary() {
      this.isLoading = true;
      this.error = null;
      try {
        const params = new URLSearchParams();
        if (this.branchFilter) {
          params.set('branchId', this.branchFilter);
        }
        if (this.positionFilter) {
          params.set('positionId', this.positionFilter);
        }
        if (this.dateFrom) {
          params.set('from', this.dateFrom);
        }
        if (this.dateTo) {
          params.set('to', this.dateTo);
        }
        const query = params.toString();
        const response = await apiClient.getAnalyticsSummary(query ? `?${query}` : '');
        this.summary = response.summary;
        this.branchesReference = response.filters?.branches || [];
        this.positionsReference = response.filters?.positions || [];
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.isLoading = false;
      }
    },
    async fetchBranches() {
      const params = new URLSearchParams();
      if (this.branchFilter) {
        params.set('branchId', this.branchFilter);
      }
      if (this.positionFilter) {
        params.set('positionId', this.positionFilter);
      }
      if (this.dateFrom) {
        params.set('from', this.dateFrom);
      }
      if (this.dateTo) {
        params.set('to', this.dateTo);
      }
      const response = await apiClient.getAnalyticsBranches(params.toString() ? `?${params.toString()}` : '');
      this.branches = response.branches || [];
    },
    async fetchEmployees() {
      const params = new URLSearchParams();
      if (this.branchFilter) {
        params.set('branchId', this.branchFilter);
      }
      if (this.positionFilter) {
        params.set('positionId', this.positionFilter);
      }
      if (this.dateFrom) {
        params.set('from', this.dateFrom);
      }
      if (this.dateTo) {
        params.set('to', this.dateTo);
      }
      if (this.sortBy) {
        params.set('sortBy', this.sortBy);
      }
      const response = await apiClient.getAnalyticsEmployees(params.toString() ? `?${params.toString()}` : '');
      this.employees = response.employees || [];
    },
    async refreshAll() {
      await this.fetchSummary();
      await Promise.all([this.fetchBranches(), this.fetchEmployees()]);
    },
    setSort(sort) {
      this.sortBy = sort;
    }
  }
});

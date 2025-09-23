import { defineStore } from 'pinia';
import { apiClient } from '../services/apiClient';

function normalizeId(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

export const useLeaderboardStore = defineStore('leaderboard', {
  state: () => ({
    isLoading: false,
    leaders: [],
    currentUser: null,
    error: null,
    filterBranchId: null,
    filterPositionId: null,
    branches: [],
    positions: [],
    lastLoadedAt: null
  }),
  getters: {
    hasFilters(state) {
      return Boolean(state.filterBranchId || state.filterPositionId);
    }
  },
  actions: {
    async fetchLeaders({ branchId = null, positionId = null } = {}) {
      if (this.isLoading) {
        return this.leaders;
      }
      this.isLoading = true;
      this.error = null;
      try {
        const params = {
          branchId: normalizeId(branchId ?? this.filterBranchId),
          positionId: normalizeId(positionId ?? this.filterPositionId),
          limit: 30
        };
        const response = await apiClient.getLeaderboardUsers(params);
        this.leaders = Array.isArray(response.leaders) ? response.leaders : [];
        this.currentUser = response.currentUser || null;
        this.filterBranchId = normalizeId(response.filters?.branchId);
        this.filterPositionId = normalizeId(response.filters?.positionId);
        this.branches = Array.isArray(response.filters?.branches)
          ? response.filters.branches.map((item) => ({
              id: Number(item.id),
              name: item.name
            }))
          : [];
        this.positions = Array.isArray(response.filters?.positions)
          ? response.filters.positions.map((item) => ({
              id: Number(item.id),
              name: item.name
            }))
          : [];
        this.lastLoadedAt = new Date().toISOString();
        return this.leaders;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.isLoading = false;
      }
    },
    resetFilters() {
      this.filterBranchId = null;
      this.filterPositionId = null;
      return this.fetchLeaders({ branchId: null, positionId: null });
    }
  }
});

import { defineStore } from 'pinia';
import { apiClient } from '../services/apiClient';

function mergeBadges(existing = [], awarded = []) {
  if (!awarded.length) {
    return existing;
  }
  const map = new Map(existing.map((badge) => [badge.code, { ...badge }]));
  const awardedAt = new Date().toISOString();
  awarded.forEach((badge) => {
    if (!badge?.code) {
      return;
    }
    if (map.has(badge.code)) {
      const current = map.get(badge.code);
      current.earned = true;
      current.awardedAt = current.awardedAt || awardedAt;
    } else {
      map.set(badge.code, {
        ...badge,
        earned: true,
        awardedAt
      });
    }
  });
  return Array.from(map.values());
}

export const useGamificationStore = defineStore('gamification', {
  state: () => ({
    isLoading: false,
    isTeamLoading: false,
    overview: null,
    teamChallenges: [],
    error: null,
    teamError: null,
    lastLoadedAt: null,
    participationAllowed: true
  }),
  getters: {
    userPoints: (state) => (state.participationAllowed ? state.overview?.user?.points || 0 : 0),
    userLevel: (state) => (state.participationAllowed ? state.overview?.user?.level || 1 : 1),
    nextLevel: (state) => (state.participationAllowed ? state.overview?.nextLevel || null : null),
    progressPercent: (state) => {
      if (!state.participationAllowed) {
        return 0;
      }
      const current = state.overview?.user?.points || 0;
      const currentLevelMin = state.overview?.levelInfo?.minPoints || 0;
      const nextLevel = state.overview?.nextLevel;
      if (!nextLevel) {
        return 100;
      }
      const span = Math.max(nextLevel.minPoints - currentLevelMin, 1);
      return Math.min(100, Math.round(((current - currentLevelMin) / span) * 100));
    }
  },
  actions: {
    async loadOverview({ force = false } = {}) {
      if (this.isLoading) {
        return this.overview;
      }
      if (this.overview && !force) {
        return this.overview;
      }
      this.isLoading = true;
      this.error = null;
      try {
        const { overview } = await apiClient.getGamificationOverview();
        this.overview = overview || null;
        this.participationAllowed = overview?.participationAllowed !== false;
        if (this.overview) {
          this.overview.participationAllowed = this.participationAllowed;
        }
        this.lastLoadedAt = new Date().toISOString();
        return overview;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.isLoading = false;
      }
    },
    async refreshOverview() {
      return this.loadOverview({ force: true });
    },
    async loadTeamChallenges({ force = false } = {}) {
      if (this.isTeamLoading) {
        return this.teamChallenges;
      }
      if (this.teamChallenges.length && !force) {
        return this.teamChallenges;
      }
      this.isTeamLoading = true;
      this.teamError = null;
      try {
        const data = await apiClient.getTeamChallenges();
        this.teamChallenges = data?.challenges || [];
        return this.teamChallenges;
      } catch (error) {
        this.teamError = error.message;
        throw error;
      } finally {
        this.isTeamLoading = false;
      }
    },
    applyGamificationUpdate(payload) {
      if (!payload || payload.skipped || !this.participationAllowed) {
        return;
      }
      if (!this.overview) {
        this.overview = {
          user: {
            points: payload.totals?.currentPoints || 0,
            level: payload.totals?.currentLevel || 1
          },
          levelInfo: null,
          nextLevel: payload.totals?.nextLevel || null,
          stats: {
            currentStreak: payload.streak?.current || 0,
            longestStreak: payload.streak?.longest || 0
          },
          monthlyPoints: payload.monthlyPoints || 0,
          badges: payload.badges?.map((badge) => ({
            ...badge,
            earned: true,
            awardedAt: new Date().toISOString()
          })) || [],
          levels: [],
          participationAllowed: true
        };
        return;
      }
      if (payload.totals) {
        if (this.overview.user) {
          this.overview.user.points = payload.totals.currentPoints;
          this.overview.user.level = payload.totals.currentLevel;
        }
        if (payload.totals.nextLevel) {
          this.overview.nextLevel = {
            ...payload.totals.nextLevel
          };
        } else {
          this.overview.nextLevel = null;
        }
        if (this.overview.levelInfo) {
          this.overview.levelInfo.levelNumber = payload.totals.currentLevel;
          this.overview.levelInfo.minPoints = Math.min(
            this.overview.levelInfo.minPoints || 0,
            payload.totals.currentPoints
          );
        }
      }
      if (payload.streak) {
        this.overview.stats = {
          ...(this.overview.stats || {}),
          currentStreak: payload.streak.current,
          longestStreak: payload.streak.longest
        };
      }
      if (payload.monthlyPoints != null) {
        this.overview.monthlyPoints = payload.monthlyPoints;
      }
      if (Array.isArray(payload.badges) && payload.badges.length) {
        this.overview.badges = mergeBadges(this.overview.badges, payload.badges);
      }
      this.overview.participationAllowed = true;
    }
  }
});

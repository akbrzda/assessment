<template>
  <div class="page-container">
    <div class="container">
      <!-- Page Header -->
      <div class="page-header mb-16">
        <h1 class="title-large">Лидерборд</h1>
      </div>

      <!-- Filter Tabs -->
      <div class="filter-tabs mb-12">
        <button
          v-for="filter in filters"
          :key="filter.key"
          class="filter-tab"
          :class="{ active: activeFilter === filter.key }"
          @click="setFilter(filter.key)"
        >
          {{ filter.label }}
        </button>
      </div>

      <!-- Sub-filters for branch/position -->
      <div v-if="activeFilter !== 'all'" class="sub-filter-section mb-12">
        <div class="sub-filter-header">
          <span class="body-small text-secondary">
            {{ activeFilter === "branch" ? "Выберите филиал:" : "Выберите должность:" }}
          </span>
        </div>
        <div class="sub-filter-grid">
          <button
            v-for="option in subFilterOptions"
            :key="option.value"
            class="sub-filter-btn"
            :class="{ active: selectedSubFilter === option.value }"
            @click="setSubFilter(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
        <button v-if="selectedSubFilter" class="sub-filter-clear" @click="setSubFilter('')">Сбросить</button>
      </div>

      <!-- Sort Options -->
      <div class="sort-section mb-12">
        <div class="sort-info">
          <span class="body-small text-secondary">Сортировка по:</span>
        </div>
        <select v-model="sortBy" @change="handleSortChange" class="sort-select">
          <option value="points">Баллам</option>
          <option value="time">Времени</option>
          <option value="accuracy">% правильных</option>
        </select>
      </div>

      <!-- Leaders List -->
      <div v-if="leaders.length" class="leaders-list">
        <div v-for="(leader, index) in leaders" :key="leader.id" class="leader-item" :class="{ 'current-user': leader.isCurrentUser }">
          <div class="leader-rank">
            <span class="rank-number">#{{ leader.rank }}</span>
          </div>

          <div class="leader-avatar">
            <img v-if="leader.avatar" :src="leader.avatar" :alt="leader.name" />
            <span v-else class="initials">{{ getInitials(leader.name) }}</span>
          </div>

          <div class="leader-info">
            <div class="leader-name">
              {{ leader.name }}
              <span v-if="leader.isCurrentUser" class="you-badge">Вы</span>
            </div>
            <div class="leader-position">{{ getPositionName(leader.positionName) }} • {{ getBranchName(leader.branchName) }}</div>
          </div>

            <div class="leader-stats">
              <div class="stat-item">
              <span class="stat-icon">
                <Star />
              </span>
              <span class="stat-value">{{ leader.points }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-icon">
                <Timer />
              </span>
              <span class="stat-value">{{ leader.averageTime }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-icon">
                <CheckCircle />
              </span>
              <span class="stat-value">{{ leader.accuracy }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="empty-state">
        <div class="empty-icon">
          <Trophy />
        </div>
        <h3 class="title-small mb-8">Рейтинг пока недоступен</h3>
        <p class="body-small text-secondary">Данные появятся после первых аттестаций</p>
      </div>

      <!-- Current User Position (if not in top) -->
      <div v-if="currentUserPosition && !isCurrentUserInTop" class="current-user-card">
        <div class="card">
          <div class="current-user-header mb-12">
            <h3 class="title-small">Ваша позиция</h3>
          </div>

          <div class="leader-item current-user">
            <div class="leader-rank">
              <span class="rank-number">#{{ currentUserPosition.rank }}</span>
            </div>

            <div class="leader-avatar">
              <img v-if="currentUserPosition.avatar" :src="currentUserPosition.avatar" :alt="currentUserPosition.name" />
              <span v-else class="initials">{{ getInitials(currentUserPosition.name) }}</span>
            </div>

            <div class="leader-info">
              <div class="leader-name">
                {{ currentUserPosition.name }}
                <span class="you-badge">Вы</span>
              </div>
              <div class="leader-position">{{ getPositionName(currentUserPosition.positionName) }} • {{ getBranchName(currentUserPosition.branchName) }}</div>
            </div>

            <div class="leader-stats">
              <div class="stat-item">
                <span class="stat-icon">
                  <Star />
                </span>
                <span class="stat-value">{{ currentUserPosition.points }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-icon">
                  <Timer />
                </span>
                <span class="stat-value">{{ currentUserPosition.averageTime }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-icon">
                  <CheckCircle />
                </span>
                <span class="stat-value">{{ currentUserPosition.accuracy }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import { CheckCircle, Star, Timer, Trophy } from "lucide-vue-next";
import { useUserStore } from "../stores/user";
import { useTelegramStore } from "../stores/telegram";
import { apiClient } from "../services/apiClient";

export default {
  name: "LeaderboardView",
  components: {
    CheckCircle,
    Star,
    Timer,
    Trophy,
  },
  setup() {
    const userStore = useUserStore();
    const telegramStore = useTelegramStore();

    const leaders = ref([]);
    const currentUserPosition = ref(null);
    const activeFilter = ref("all");
    const sortBy = ref("points");
    const selectedSubFilter = ref("");
    const availableBranches = ref([]);
    const availablePositions = ref([]);
    const isLoading = ref(false);

    const filters = [
      { key: "all", label: "Все сотрудники" },
      { key: "branch", label: "По филиалам" },
      { key: "position", label: "По должностям" },
    ];

    const subFilterOptions = computed(() => {
      if (activeFilter.value === "branch") {
        return availableBranches.value.map((branch) => ({
          value: String(branch.id),
          label: branch.name,
        }));
      }
      if (activeFilter.value === "position") {
        return availablePositions.value.map((position) => ({
          value: String(position.id),
          label: position.name,
        }));
      }
      return [];
    });

    const isCurrentUserInTop = computed(() => {
      return leaders.value.some((leader) => leader.isCurrentUser);
    });

    function setFilter(filter) {
      activeFilter.value = filter;
      selectedSubFilter.value = "";
      telegramStore.hapticFeedback("selection");
      loadLeaderboard();
    }

    function setSubFilter(value) {
      selectedSubFilter.value = value;
      telegramStore.hapticFeedback("selection");
      loadLeaderboard();
    }

    function handleSortChange() {
      telegramStore.hapticFeedback("selection");
      applySorting();
    }

    function getInitials(name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase();
    }

    function getPositionName(position) {
      return position || "—";
    }

    function getBranchName(branch) {
      return branch || "—";
    }

    function formatAverageTime(avgTimeSeconds) {
      if (!Number.isFinite(avgTimeSeconds) || avgTimeSeconds <= 0) {
        return "--:--";
      }
      const minutes = Math.floor(avgTimeSeconds / 60);
      const seconds = Math.floor(avgTimeSeconds % 60);
      return `${minutes}:${String(seconds).padStart(2, "0")}`;
    }

    function normalizeLeader(leader, currentUserId) {
      const accuracy = Number.isFinite(leader.avgScorePercent) ? Math.round(leader.avgScorePercent) : 0;
      return {
        id: leader.userId || leader.id,
        name: leader.fullName || `${leader.firstName || ""} ${leader.lastName || ""}`.trim(),
        positionName: leader.positionName,
        branchName: leader.branchName,
        positionId: leader.positionId || null,
        branchId: leader.branchId || null,
        points: Number(leader.points || 0),
        averageTime: formatAverageTime(leader.avgTimeSeconds),
        accuracy,
        avatar: leader.avatarUrl || null,
        rank: Number(leader.rank || 0),
        isCurrentUser: currentUserId ? (leader.userId || leader.id) === currentUserId : false,
      };
    }

    function applySorting() {
      leaders.value = [...leaders.value]
        .sort((a, b) => {
          switch (sortBy.value) {
            case "points":
              return b.points - a.points;
            case "time": {
              const toSeconds = (value) => {
                if (!value || value === "--:--") return Number.POSITIVE_INFINITY;
                const [mm, ss] = value.split(":");
                return Number(mm) * 60 + Number(ss);
              };
              return toSeconds(a.averageTime) - toSeconds(b.averageTime);
            }
            case "accuracy":
              return b.accuracy - a.accuracy;
            default:
              return b.points - a.points;
          }
        })
        .map((leader, index) => ({
          ...leader,
          rank: index + 1,
        }));
    }

    async function loadLeaderboard() {
      isLoading.value = true;
      try {
        if (!userStore.isInitialized) {
          await userStore.ensureStatus();
        }

        const params = {};
        if (activeFilter.value === "branch" && selectedSubFilter.value) {
          params.branchId = Number(selectedSubFilter.value);
        }
        if (activeFilter.value === "position" && selectedSubFilter.value) {
          params.positionId = Number(selectedSubFilter.value);
        }

        const response = await apiClient.getLeaderboardUsers(params);
        availableBranches.value = response.filters?.branches || [];
        availablePositions.value = response.filters?.positions || [];

        const currentUserId = userStore.user?.id || null;

        leaders.value = (response.leaders || []).map((leader) => normalizeLeader(leader, currentUserId));
        applySorting();

        if (response.currentUser) {
          currentUserPosition.value = normalizeLeader(response.currentUser, currentUserId);
        } else {
          currentUserPosition.value = null;
        }
      } catch (error) {
        console.error("Не удалось загрузить лидерборд", error);
        telegramStore.showAlert(error.message || "Не удалось загрузить лидерборд");
        leaders.value = [];
        currentUserPosition.value = null;
      } finally {
        isLoading.value = false;
      }
    }

    onMounted(() => {
      loadLeaderboard();
    });

    return {
      leaders,
      currentUserPosition,
      activeFilter,
      sortBy,
      selectedSubFilter,
      subFilterOptions,
      filters,
      isCurrentUserInTop,
      setFilter,
      handleSortChange,
      setSubFilter,
      getInitials,
      getPositionName,
      getBranchName,
      isLoading,
    };
  },
};
</script>

<style scoped>
.page-header {
  padding-top: 20px;
}

.filter-tabs {
  display: flex;
  gap: 8px;
  padding: 4px;
  background-color: var(--bg-secondary);
  border-radius: 10px;
}

.filter-tab {
  flex: 1;
  padding: 8px 12px;
  border: none;
  background: none;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-tab.active {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  box-shadow: 0 1px 3px var(--card-shadow);
}

.sort-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sub-filter-section {
  text-align: center;
}

.sub-filter-header {
  margin-bottom: 12px;
}

.sub-filter-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin-bottom: 12px;
}

.sub-filter-btn {
  padding: 8px 16px;
  border: 1px solid var(--divider);
  border-radius: 20px;
  background-color: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sub-filter-btn.active {
  background-color: var(--accent-blue);
  color: white;
  border-color: var(--accent-blue);
}

.sub-filter-btn:hover:not(.active) {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

.sub-filter-clear {
  padding: 6px 12px;
  border: none;
  border-radius: 16px;
  background-color: var(--text-secondary);
  color: white;
  font-size: 12px;
  cursor: pointer;
  opacity: 0.8;
  transition: all 0.2s ease;
}

.sub-filter-clear:hover {
  opacity: 1;
}

.sub-filter-select {
  padding: 8px 16px;
  border: 1px solid var(--divider);
  border-radius: 10px;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 14px;
  min-width: 180px;
  transition: all 0.2s ease;
}

.sub-filter-select:focus {
  outline: none;
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 2px rgba(0, 136, 204, 0.1);
}

.sort-select {
  padding: 6px 12px;
  border: 1px solid var(--divider);
  border-radius: 8px;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 14px;
}

.leaders-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.leader-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background-color: var(--bg-secondary);
  border-radius: 12px;
  transition: all 0.2s ease;
}

.leader-item.current-user {
  background-color: rgba(0, 136, 204, 0.1);
  border: 1px solid rgba(0, 136, 204, 0.2);
}

.leader-rank {
  min-width: 32px;
  text-align: center;
}

.rank-number {
  font-weight: 700;
  font-size: 16px;
  color: var(--text-secondary);
}

.leader-item.current-user .rank-number {
  color: var(--accent-blue);
}

.leader-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--accent-blue);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 14px;
  overflow: hidden;
  flex-shrink: 0;
}

.leader-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.leader-info {
  flex: 1;
  min-width: 0;
}

.leader-name {
  font-weight: 600;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.you-badge {
  font-size: 10px;
  padding: 2px 6px;
  background-color: var(--accent-blue);
  color: white;
  border-radius: 4px;
  font-weight: 500;
}

.leader-position {
  font-size: 12px;
  color: var(--text-secondary);
}

.leader-stats {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-end;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.stat-icon svg {
  width: 14px;
  height: 14px;
}

.stat-value {
  font-size: 12px;
  font-weight: 600;
}

.current-user-card {
  margin-top: 24px;
}

.current-user-header {
  text-align: center;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.empty-icon svg {
  width: 64px;
  height: 64px;
}

.text-secondary {
  color: var(--text-secondary);
}

@media (max-width: 480px) {
  .filter-tab {
    padding: 6px 8px;
    font-size: 13px;
  }

  .leader-item {
    padding: 12px;
  }

  .leader-stats {
    gap: 2px;
  }

  .sort-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>

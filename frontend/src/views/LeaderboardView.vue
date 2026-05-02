<template>
  <div class="leaderboard-page">
    <div class="lb-header">
      <h1 class="lb-title">Лидерборд</h1>
      <div class="period-select-wrap">
        <select v-model="period" @change="loadLeaderboard" class="period-select">
          <option value="week">За неделю</option>
          <option value="month">За месяц</option>
          <option value="all">За всё время</option>
        </select>
        <span class="period-chevron">&#8964;</span>
      </div>
    </div>

    <div v-if="isLoading" class="leaderboard-skeleton">
      <SkeletonPageHeader />
      <div class="leaderboard-skeleton__podium">
        <SkeletonBlock class="leaderboard-skeleton__person leaderboard-skeleton__person--small" />
        <SkeletonBlock class="leaderboard-skeleton__person leaderboard-skeleton__person--large" />
        <SkeletonBlock class="leaderboard-skeleton__person leaderboard-skeleton__person--small" />
      </div>
      <SkeletonList :items="5" />
    </div>

    <template v-else-if="leaders.length">
      <div v-if="leaders.length >= 1" class="podium-section">
        <div v-if="leaders[1]" class="podium-item podium-second">
          <div class="podium-avatar">
            <img v-if="leaders[1].avatar" :src="leaders[1].avatar" :alt="leaders[1].name" />
            <span v-else class="podium-initials">{{ getInitials(leaders[1].name) }}</span>
          </div>
          <div class="podium-badge silver">2</div>
          <div class="podium-name">{{ getFirstName(leaders[1].name) }}</div>
          <div class="podium-points">{{ leaders[1].points }} баллов</div>
        </div>

        <div class="podium-item podium-first">
          <div class="podium-avatar podium-avatar--large">
            <img v-if="leaders[0].avatar" :src="leaders[0].avatar" :alt="leaders[0].name" />
            <span v-else class="podium-initials">{{ getInitials(leaders[0].name) }}</span>
          </div>
          <div class="podium-badge gold">1</div>
          <div class="podium-name">{{ getFirstName(leaders[0].name) }}</div>
          <div class="podium-points">{{ leaders[0].points }} баллов</div>
        </div>

        <div v-if="leaders[2]" class="podium-item podium-third">
          <div class="podium-avatar">
            <img v-if="leaders[2].avatar" :src="leaders[2].avatar" :alt="leaders[2].name" />
            <span v-else class="podium-initials">{{ getInitials(leaders[2].name) }}</span>
          </div>
          <div class="podium-badge bronze">3</div>
          <div class="podium-name">{{ getFirstName(leaders[2].name) }}</div>
          <div class="podium-points">{{ leaders[2].points }} баллов</div>
        </div>
      </div>

      <div v-if="leaders.length > 3" class="lb-list">
        <div v-for="leader in leaders.slice(3)" :key="leader.id" class="lb-row">
          <span class="lb-rank">{{ leader.rank }}</span>
          <div class="lb-avatar">
            <img v-if="leader.avatar" :src="leader.avatar" :alt="leader.name" />
            <span v-else class="lb-initials">{{ getInitials(leader.name) }}</span>
          </div>
          <span class="lb-name">
            {{ leader.name }}
            <span v-if="leader.isCurrentUser" class="you-label">(Вы)</span>
          </span>
          <span class="lb-pts">{{ leader.points }} баллов</span>
        </div>
      </div>
    </template>

    <div v-else class="empty-state">
      <div class="empty-icon">🏆</div>
      <p class="empty-text">Рейтинг пока недоступен</p>
      <p class="empty-sub">Данные появятся после первых аттестаций</p>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from "vue";
import { useUserStore } from "../stores/user";
import { useTelegramStore } from "../stores/telegram";
import { apiClient } from "../services/apiClient";
import SkeletonBlock from "../components/skeleton/SkeletonBlock.vue";
import SkeletonList from "../components/skeleton/SkeletonList.vue";
import SkeletonPageHeader from "../components/skeleton/SkeletonPageHeader.vue";

export default {
  name: "LeaderboardView",
  components: {
    SkeletonBlock,
    SkeletonList,
    SkeletonPageHeader,
  },
  setup() {
    const userStore = useUserStore();
    const telegramStore = useTelegramStore();

    const leaders = ref([]);
    const isLoading = ref(false);
    const period = ref("month");

    function getInitials(name) {
      if (!name) return "?";
      return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    }

    function getFirstName(name) {
      if (!name) return "";
      return name.split(" ")[0];
    }

    function normalizeLeader(leader, currentUserId) {
      return {
        id: leader.userId || leader.id,
        name: (leader.fullName || ((leader.firstName || "") + " " + (leader.lastName || "")).trim()) || "—",
        points: Number(leader.points || 0),
        avatar: leader.avatarUrl || null,
        rank: Number(leader.rank || 0),
        isCurrentUser: currentUserId ? (leader.userId || leader.id) === currentUserId : false,
      };
    }

    async function loadLeaderboard() {
      isLoading.value = true;
      try {
        if (!userStore.isInitialized) {
          await userStore.ensureStatus();
        }
        const params = { period: period.value };
        const response = await apiClient.getLeaderboardUsers(params);
        const currentUserId = userStore.user?.id || null;
        leaders.value = (response.leaders || [])
          .map((leader) => normalizeLeader(leader, currentUserId))
          .sort((a, b) => a.rank - b.rank);
      } catch (error) {
        console.error("Не удалось загрузить лидерборд", error);
        leaders.value = [];
      } finally {
        isLoading.value = false;
      }
    }

    onMounted(() => {
      loadLeaderboard();
    });

    return { leaders, isLoading, period, getInitials, getFirstName, loadLeaderboard };
  },
};
</script>

<style scoped>
.leaderboard-page {
  padding: 20px 16px 32px;
  min-height: 100vh;
  background-color: var(--bg-primary);
}
.lb-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32px;
}
.lb-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}
.period-select-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.period-select {
  appearance: none;
  -webkit-appearance: none;
  background-color: var(--bg-primary);
  border: 1.5px solid var(--divider, #e0e0e0);
  border-radius: 20px;
  padding: 6px 32px 6px 14px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  cursor: pointer;
  outline: none;
}
.period-chevron {
  position: absolute;
  right: 12px;
  font-size: 16px;
  color: var(--text-secondary);
  pointer-events: none;
  line-height: 1;
}
.podium-section {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 16px;
  margin-bottom: 32px;
  padding: 0 8px;
}
.podium-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex: 1;
  max-width: 110px;
}
.podium-first {
  margin-bottom: 20px;
}
.podium-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  overflow: hidden;
  background-color: #d0d0d0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.podium-avatar--large {
  width: 84px;
  height: 84px;
}
.podium-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.podium-initials {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
}
.podium-avatar--large .podium-initials {
  font-size: 26px;
}
.podium-badge {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}
.podium-badge.gold {
  background: linear-gradient(135deg, #f5a623, #e8920a);
  box-shadow: 0 2px 6px rgba(245, 166, 35, 0.5);
}
.podium-badge.silver {
  background: linear-gradient(135deg, #b0b0b0, #8f8f8f);
  box-shadow: 0 2px 6px rgba(144, 144, 144, 0.4);
}
.podium-badge.bronze {
  background: linear-gradient(135deg, #cd7f32, #b06a22);
  box-shadow: 0 2px 6px rgba(176, 106, 34, 0.4);
}
.podium-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
}
.podium-points {
  font-size: 12px;
  color: var(--text-secondary);
  text-align: center;
}
.lb-list {
  display: flex;
  flex-direction: column;
}
.lb-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid var(--divider, #f0f0f0);
}
.lb-row:last-child {
  border-bottom: none;
}
.lb-rank {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  min-width: 28px;
  text-align: left;
}
.lb-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  overflow: hidden;
  background-color: #d0d0d0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.lb-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.lb-initials {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
}
.lb-name {
  flex: 1;
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
}
.you-label {
  color: #5b5fcf;
  font-weight: 600;
  margin-left: 4px;
}
.lb-pts {
  font-size: 14px;
  color: var(--text-secondary);
  white-space: nowrap;
}
.leaderboard-skeleton {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.leaderboard-skeleton__podium {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  align-items: end;
}

.leaderboard-skeleton__person {
  border-radius: 16px;
}

.leaderboard-skeleton__person--small {
  height: 120px;
}

.leaderboard-skeleton__person--large {
  height: 152px;
}
.empty-state {
  text-align: center;
  padding: 80px 20px 40px;
}
.empty-icon {
  font-size: 56px;
  margin-bottom: 16px;
}
.empty-text {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}
.empty-sub {
  font-size: 14px;
  color: var(--text-secondary);
}
</style>

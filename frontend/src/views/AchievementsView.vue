<template>
  <div class="achievements-page">
    <div class="achievements-header">
      <h1 class="achievements-title">Мои достижения</h1>
      <p class="achievements-subtitle">Очки, бейджи и причины получения</p>
    </div>

    <div class="achievements-summary app-panel">
      <div class="summary-item">
        <p class="summary-label">Всего очков</p>
        <p class="summary-value">{{ points }}</p>
      </div>
      <div class="summary-divider"></div>
      <div class="summary-item">
        <p class="summary-label">Получено бейджей</p>
        <p class="summary-value">{{ earnedBadges.length }}</p>
      </div>
    </div>

    <div v-if="isLoading" class="achievements-skeleton">
      <SkeletonCard />
      <SkeletonList :items="4" />
    </div>

    <div v-else-if="errorMessage" class="achievements-error app-panel">
      <p class="error-title">Не удалось загрузить достижения</p>
      <p class="error-text">{{ errorMessage }}</p>
      <button class="retry-btn" type="button" @click="loadAchievements">Повторить</button>
    </div>

    <div v-else-if="earnedBadges.length" class="badge-list">
      <article v-for="badge in earnedBadges" :key="badge.id || badge.code || badge.name" class="badge-card app-panel">
        <div class="badge-card__top">
          <h2 class="badge-card__title">{{ badge.name || "Бейдж" }}</h2>
          <span v-if="formatReward(badge)" class="badge-card__reward">+{{ formatReward(badge) }} очков</span>
        </div>

        <p v-if="badge.description" class="badge-card__description">{{ badge.description }}</p>

        <div class="badge-card__meta">
          <p v-if="formatReason(badge)" class="badge-card__meta-item">
            <span class="meta-label">За что:</span>
            <span class="meta-value">{{ formatReason(badge) }}</span>
          </p>
          <p class="badge-card__meta-item">
            <span class="meta-label">Получено:</span>
            <span class="meta-value">{{ formatDate(badge.earnedAt || badge.awardedAt || badge.obtainedAt) }}</span>
          </p>
        </div>
      </article>
    </div>

    <div v-else class="achievements-empty app-panel">
      <p class="empty-title">Пока нет полученных достижений</p>
      <p class="empty-subtitle">Пройдите курсы и аттестации, чтобы открыть первые бейджи</p>
    </div>
  </div>
</template>

<script>
import { computed, onMounted, ref } from "vue";
import { useUserStore } from "../stores/user";
import { apiClient } from "../services/apiClient";
import SkeletonCard from "../components/skeleton/SkeletonCard.vue";
import SkeletonList from "../components/skeleton/SkeletonList.vue";

function toNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

export default {
  name: "AchievementsView",
  components: {
    SkeletonCard,
    SkeletonList,
  },
  setup() {
    const userStore = useUserStore();
    const isLoading = ref(false);
    const errorMessage = ref("");
    const badges = ref([]);

    const points = computed(() => {
      const overviewPoints = Number(userStore.overview?.user?.points);
      if (Number.isFinite(overviewPoints)) {
        return overviewPoints;
      }
      return toNumber(userStore.user?.points);
    });

    const earnedBadges = computed(() => badges.value.filter((badge) => badge.earned));

    function formatDate(value) {
      if (!value) {
        return "Дата неизвестна";
      }
      const parsedDate = new Date(value);
      if (Number.isNaN(parsedDate.getTime())) {
        return "Дата неизвестна";
      }
      return parsedDate.toLocaleString("ru-RU");
    }

    function formatReward(badge) {
      const reward =
        badge.pointsReward ??
        badge.rewardPoints ??
        badge.points ??
        badge.bonusPoints ??
        badge.reward?.points ??
        null;

      const value = Number(reward);
      return Number.isFinite(value) && value > 0 ? value : null;
    }

    function formatReason(badge) {
      return (
        badge.unlockReason ||
        badge.condition ||
        badge.criteria ||
        badge.ruleDescription ||
        badge.description ||
        badge.code ||
        ""
      );
    }

    async function loadAchievements() {
      isLoading.value = true;
      errorMessage.value = "";

      try {
        if (!userStore.isInitialized) {
          await userStore.ensureStatus();
        }

        let overviewBadges = [];
        try {
          const overview = await userStore.loadOverview();
          overviewBadges = Array.isArray(overview?.badges) ? overview.badges : [];
        } catch (error) {
          console.warn("Не удалось загрузить overview для достижений", error);
        }

        let allBadges = [];
        try {
          const badgesResponse = await apiClient.getGamificationBadges();
          allBadges = Array.isArray(badgesResponse?.badges) ? badgesResponse.badges : [];
        } catch (error) {
          console.warn("Не удалось загрузить каталог бейджей", error);
        }

        const source = allBadges.length ? allBadges : overviewBadges;
        badges.value = source.map((badge) => ({
          ...badge,
          earned: Boolean(badge.earned),
        }));
      } catch (error) {
        badges.value = [];
        errorMessage.value = error?.message || "Попробуйте позже";
      } finally {
        isLoading.value = false;
      }
    }

    onMounted(() => {
      loadAchievements();
    });

    return {
      isLoading,
      errorMessage,
      points,
      earnedBadges,
      formatDate,
      formatReward,
      formatReason,
      loadAchievements,
    };
  },
};
</script>

<style scoped>
.achievements-page {
  min-height: 100vh;
  background: var(--bg-primary);
  padding: 18px 16px 96px;
}

.achievements-header {
  margin-bottom: 16px;
}

.achievements-title {
  margin: 0;
  font-size: 26px;
  line-height: 1.2;
  font-weight: 700;
  color: var(--text-primary);
}

.achievements-subtitle {
  margin: 6px 0 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.achievements-summary {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 14px;
  margin-bottom: 14px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary-label {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.summary-value {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
}

.summary-divider {
  width: 1px;
  height: 34px;
  background: var(--divider);
}

.achievements-skeleton {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.badge-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.badge-card {
  padding: 14px;
}

.badge-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.badge-card__title {
  margin: 0;
  font-size: 16px;
  line-height: 1.3;
  color: var(--text-primary);
}

.badge-card__reward {
  font-size: 12px;
  color: var(--success);
  font-weight: 600;
}

.badge-card__description {
  margin: 8px 0 0;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.4;
}

.badge-card__meta {
  margin-top: 10px;
  border-top: 1px solid var(--divider);
  padding-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.badge-card__meta-item {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
}

.meta-label {
  color: var(--text-secondary);
}

.meta-value {
  color: var(--text-primary);
  margin-left: 4px;
}

.achievements-error,
.achievements-empty {
  padding: 16px;
}

.error-title,
.empty-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.error-text,
.empty-subtitle {
  margin: 8px 0 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.retry-btn {
  margin-top: 12px;
  border: none;
  background: var(--accent);
  color: #ffffff;
  border-radius: 10px;
  min-height: 40px;
  padding: 0 14px;
  font-size: 14px;
  font-weight: 600;
}
</style>

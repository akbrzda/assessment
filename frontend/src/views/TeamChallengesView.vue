<template>
  <div class="page-container">
    <div class="container">
      <div class="page-header mb-16">
        <div>
          <h1 class="title-large">Командные челленджи</h1>
          <p class="body-small text-secondary">Ежемесячное соревнование филиалов за суммарные очки сотрудников</p>
        </div>
      </div>

      <div v-if="isLoading" class="card card-ghost">
        <div class="skeleton skeleton-title mb-12"></div>
        <div class="skeleton skeleton-line mb-8"></div>
        <div class="skeleton skeleton-line w-60"></div>
      </div>

      <div v-else-if="errorMessage" class="card card-danger">
        <div class="error-state">
          <h2 class="title-small mb-8">Не удалось загрузить данные</h2>
          <p class="body-small text-secondary mb-12">{{ errorMessage }}</p>
          <button class="btn btn-primary btn-full" @click="loadChallenges">Попробовать снова</button>
        </div>
      </div>

      <div v-else-if="!activeChallenge" class="card card-soft">
        <div class="empty-state">
          <div class="empty-icon mb-12">🏁</div>
          <h3 class="title-small mb-4">Челлендж ещё не стартовал</h3>
          <p class="body-small text-secondary">Как только начнётся следующее соревнование филиалов — оно появится здесь.</p>
        </div>
      </div>

      <template v-else>
        <div class="grid-primary">
          <div class="card card-soft">
            <div class="card-header with-badge">
              <div>
                <h2 class="title-medium mb-4">{{ activeChallenge.title }}</h2>
                <p class="body-small text-secondary">{{ activeChallenge.description }}</p>
              </div>
              <span class="badge badge-primary">Активно</span>
            </div>

            <div class="meta-grid">
              <div class="meta-item">
                <span class="meta-label">Период</span>
                <span class="meta-value">{{ formattedPeriod }}</span>
              </div>
              <div v-if="activeChallenge.userBranch" class="meta-item">
                <span class="meta-label">Ваш филиал</span>
                <span class="meta-value">{{ activeChallenge.userBranch.branchName }}</span>
              </div>
              <div class="meta-item" v-if="branchScores.length">
                <span class="meta-label">Филиалов участвует</span>
                <span class="meta-value">{{ branchScores.length }}</span>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="title-small mb-4">Рейтинг филиалов</h3>
                <p class="body-small text-secondary mb-0">
                  Суммируются очки сотрудников за прохождение аттестаций в текущем месяце
                </p>
              </div>
              <span v-if="lastUpdatedAt" class="body-small text-secondary">Обновлено {{ lastUpdatedAt }}</span>
            </div>

            <div v-if="!branchScores.length" class="empty-state compact">
              <p class="body-small text-secondary">Рейтинг появится после первых начислений.</p>
            </div>

            <div v-else class="scoreboard">
              <div
                v-for="(branch, index) in branchScores"
                :key="branch.branchId"
                class="score-row"
                :class="{
                  highlighted: branch.branchId === userBranchId,
                  'is-leader': index === 0,
                }"
              >
                <div class="score-rank">
                  <span class="rank-badge" :class="{ top: index < 3 }">{{ index + 1 }}</span>
                </div>
                <div class="score-info">
                  <div class="score-name">{{ branch.branchName }}</div>
                  <div v-if="branch.updatedAt" class="score-hint body-tiny text-secondary">
                    обновлено {{ formatRelativeTime(branch.updatedAt) }}
                  </div>
                </div>
                <div class="score-points">
                  <span class="points-value">{{ formatPoints(branch.points) }}</span>
                  <span class="points-label body-tiny text-secondary">очков</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="activeChallenge.userBranch" class="card card-soft">
          <h3 class="title-small mb-8">Позиция вашего филиала</h3>
          <p class="body-small text-secondary mb-8">
            {{ activeChallenge.userBranch.branchName }} набрал {{ formatPoints(activeChallenge.userBranch.points) }} очков.
            {{ userBranchPositionText }}
          </p>
          <div class="tip-box">
            <span class="tip-label">Как улучшить позиции?</span>
            <ul class="tip-list">
              <li class="body-small">пригласите коллег пройти новые аттестации</li>
              <li class="body-small">мотивация сотрудников увеличивает суммарные очки филиала</li>
            </ul>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { apiClient } from "../services/apiClient";
import { useUserStore } from "../stores/user";

const isLoading = ref(false);
const errorMessage = ref("");
const challenges = ref([]);

const userStore = useUserStore();
const userBranchId = computed(() => userStore.user?.branchId ?? null);

const activeChallenge = computed(() => challenges.value[0] || null);
const branchScores = computed(() => activeChallenge.value?.branchScores || []);

const formattedPeriod = computed(() => {
  if (!activeChallenge.value) return "";
  return formatDateRange(activeChallenge.value.periodStart, activeChallenge.value.periodEnd);
});

const lastUpdatedAt = computed(() => {
  if (!branchScores.value.length) {
    return "";
  }
  const latest = branchScores.value.reduce((acc, item) => {
    if (!acc) return item.updatedAt;
    return new Date(item.updatedAt) > new Date(acc) ? item.updatedAt : acc;
  }, null);
  return latest ? formatRelativeTime(latest) : "";
});

const userBranchPositionText = computed(() => {
  if (!branchScores.value.length || !userBranchId.value) {
    return "";
  }
  const index = branchScores.value.findIndex((branch) => branch.branchId === userBranchId.value);
  if (index === -1) {
    return "Филиал пока не участвует в текущем челлендже.";
  }
  return `Текущее место: ${index + 1}.`;
});

const loadChallenges = async () => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const response = await apiClient.getTeamChallenges();
    challenges.value = Array.isArray(response?.challenges) ? response.challenges : [];
  } catch (error) {
    console.error("Не удалось загрузить командные соревнования", error);
    errorMessage.value = error.message || "Произошла ошибка при загрузке данных";
  } finally {
    isLoading.value = false;
  }
};

const formatDateRange = (start, end) => {
  if (!start || !end) return "—";
  const startDate = new Date(start);
  const endDate = new Date(end);
  const options = { day: "numeric", month: "long" };
  const startStr = startDate.toLocaleDateString("ru-RU", options);
  const endStr = endDate.toLocaleDateString("ru-RU", options);
  return `${startStr} — ${endStr}`;
};

const formatPoints = (value) => {
  if (value == null) return "0";
  return new Intl.NumberFormat("ru-RU").format(Number(value));
};

const formatRelativeTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин назад`;
  if (hours < 24) return `${hours} ч назад`;
  if (days < 7) return `${days} дн назад`;

  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
};

onMounted(() => {
  loadChallenges();
});
</script>

<style scoped>
.grid-primary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.card-header.with-badge {
  align-items: center;
}

.meta-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  margin-top: 16px;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.meta-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.scoreboard {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.score-row {
  display: grid;
  grid-template-columns: 48px 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 16px;
  background: var(--bg-tertiary);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.score-row.highlighted {
  background: linear-gradient(135deg, rgba(66, 153, 225, 0.18), rgba(66, 153, 225, 0.05));
  border: 1px solid rgba(66, 153, 225, 0.25);
  transform: translateY(-2px);
}

.score-row.is-leader {
  border: 1px solid rgba(255, 176, 0, 0.3);
  background: linear-gradient(135deg, rgba(255, 213, 79, 0.2), rgba(255, 238, 88, 0.1));
}

.score-rank {
  display: flex;
  justify-content: center;
}

.rank-badge {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-weight: 600;
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--divider);
}

.rank-badge.top {
  background: var(--accent-blue-soft);
  border-color: rgba(66, 153, 225, 0.4);
  color: var(--accent-blue);
}

.score-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.score-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.score-hint {
  font-size: 12px;
}

.score-points {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.points-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
}

.points-label {
  font-size: 12px;
}

.card-ghost {
  background: var(--bg-secondary);
}

.card-danger {
  border: 1px solid rgba(217, 48, 37, 0.32);
  background: rgba(217, 48, 37, 0.08);
}

.card-soft {
  background: var(--bg-secondary);
}

.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.empty-state.compact {
  padding: 24px 12px;
}

.empty-icon {
  font-size: 32px;
}

.text-error {
  color: #d93025;
}

.tip-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: var(--bg-tertiary);
}

.tip-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.tip-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-left: 16px;
  margin: 0;
}

.skeleton {
  width: 100%;
  height: 14px;
  border-radius: 8px;
  background: linear-gradient(90deg, var(--bg-tertiary) 0%, var(--bg-secondary) 50%, var(--bg-tertiary) 100%);
  background-size: 200% 100%;
  animation: shimmer 1.2s ease-in-out infinite;
}

.skeleton-title {
  height: 24px;
}

.skeleton-line {
  height: 14px;
}

.w-60 {
  width: 60%;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@media (max-width: 420px) {
  .score-row {
    grid-template-columns: 40px 1fr;
    grid-template-areas:
      "rank name"
      "rank points";
  }

  .score-rank {
    grid-area: rank;
  }

  .score-info {
    grid-area: name;
  }

  .score-points {
    grid-area: points;
    align-items: flex-start;
  }
}
</style>

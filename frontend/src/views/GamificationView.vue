<template>
  <PageContainer title="Игровой центр" subtitle="Очки, бейджи и команды">
    <LoadingState v-if="isLoading" />
    <template v-else>
      <p v-if="gamificationStore.error" class="error">{{ gamificationStore.error }}</p>
      <p v-else-if="gamificationStore.teamError" class="error">{{ gamificationStore.teamError }}</p>

      <InfoCard title="Общий прогресс" v-if="overview && participationAllowed">
        <div class="progress">
          <div class="progress__item">
            <span class="progress__label">Уровень</span>
            <span class="progress__value">{{ overview.user.level }}</span>
          </div>
          <div class="progress__item">
            <span class="progress__label">Очки</span>
            <span class="progress__value">{{ overview.user.points }}</span>
          </div>
          <div class="progress__item">
            <span class="progress__label">Серия</span>
            <span class="progress__value">{{ overview.stats.currentStreak }} / {{ overview.stats.longestStreak }}</span>
          </div>
          <div class="progress__item" v-if="overview.nextLevel">
            <span class="progress__label">Следующий уровень</span>
            <span class="progress__value">{{ overview.nextLevel.name }}</span>
          </div>
        </div>
        <div class="progress-bar">
          <div class="progress-bar__inner" :style="{ width: `${progressPercent}%` }"></div>
        </div>
        <p v-if="overview.nextLevel" class="hint">До повышения: {{ overview.nextLevel.pointsToReach }} очков</p>
        <p v-else class="hint">Вы на максимальном уровне. Продолжайте удерживать лидерство!</p>
      </InfoCard>
      <InfoCard v-else title="Геймификация">
        <p class="hint">Геймификация доступна только сотрудникам. Вы можете отслеживать результаты коллег и управлять наградами.</p>
      </InfoCard>

      <InfoCard v-if="activeChallenge" :title="activeChallenge.title">
        <p class="hint">Период: {{ formatPeriod(activeChallenge.periodStart, activeChallenge.periodEnd) }}</p>
        <div v-if="activeChallenge.branchScores.length" class="scoreboard">
          <div
            v-for="(branch, index) in activeChallenge.branchScores"
            :key="branch.branchId"
            class="scoreboard__item"
            :class="{ 'scoreboard__item--active': branch.branchId === activeChallenge.userBranch?.branchId }"
          >
            <span class="scoreboard__place">#{{ index + 1 }}</span>
            <span class="scoreboard__name">{{ branch.branchName }}</span>
            <span class="scoreboard__points">{{ branch.points }}</span>
          </div>
        </div>
        <p v-else class="hint">Пока нет данных по филиалам. Пройдите аттестации, чтобы заработать очки.</p>
      </InfoCard>

      <InfoCard title="Рейтинг сотрудников">
        <div class="leaderboard-controls">
          <BaseSelect v-model.number="selectedBranchId" class="leaderboard-controls__select">
            <option value="">Все филиалы</option>
            <option
              v-for="branch in branchOptions"
              :key="branch.id"
              :value="branch.id"
            >
              {{ branch.name }}
            </option>
          </BaseSelect>
          <BaseSelect v-model.number="selectedPositionId" class="leaderboard-controls__select">
            <option value="">Все должности</option>
            <option
              v-for="position in positionOptions"
              :key="position.id"
              :value="position.id"
            >
              {{ position.name }}
            </option>
          </BaseSelect>
          <button
            v-if="leaderboardStore.hasFilters"
            class="leaderboard-reset"
            type="button"
            :disabled="isLeaderboardBusy"
            @click="handleResetFilters"
          >
            Сбросить
          </button>
        </div>

        <p v-if="!participationAllowed" class="hint leaderboard-hint">
          Рейтинг формируется только по сотрудникам. Ваши результаты не участвуют в подсчёте.
        </p>

        <p v-if="leaderboardError" class="error">{{ leaderboardError }}</p>

        <LoadingState v-if="isLeaderboardBusy && !leaders.length" message="Обновляем рейтинг" />

        <ul v-if="leaders.length" class="leaderboard">
          <li
            v-for="leader in leaders"
            :key="leader.userId"
            class="leaderboard-row"
            :class="{
              'leaderboard-row--self': leader.userId === currentUserId,
              'leaderboard-row--top': leader.rank <= 3
            }"
          >
            <div class="leaderboard-row__rank">#{{ leader.rank }}</div>
            <div class="leaderboard-row__info">
              <span class="leaderboard-row__name">{{ leader.fullName }}</span>
              <span class="leaderboard-row__meta">
                {{ leader.branchName || '—' }} · {{ leader.positionName || '—' }}
              </span>
              <span class="leaderboard-row__meta leaderboard-row__meta--secondary">
                Попыток: {{ leader.completedAttempts }}
              </span>
            </div>
            <div class="leaderboard-row__stats">
              <span class="leaderboard-row__stat">
                <span class="leaderboard-row__stat-label">Очки</span>
                <span class="leaderboard-row__stat-value">{{ leader.points }}</span>
              </span>
              <span class="leaderboard-row__stat">
                <span class="leaderboard-row__stat-label">% верных</span>
                <span class="leaderboard-row__stat-value">{{ formatPercent(leader.avgScorePercent) }}</span>
              </span>
              <span class="leaderboard-row__stat">
                <span class="leaderboard-row__stat-label">Сред. время</span>
                <span class="leaderboard-row__stat-value">{{ formatTime(leader.avgTimeSeconds) }}</span>
              </span>
            </div>
          </li>
        </ul>
        <p v-else-if="!isLeaderboardBusy" class="hint">Пока нет данных по выбранным фильтрам.</p>

        <div v-if="currentUser && !isCurrentUserInTop" class="leaderboard-self">
          <div class="leaderboard-self__title">Ваша позиция</div>
          <div class="leaderboard-self__content">
            <span class="leaderboard-self__rank">#{{ currentUser.rank }}</span>
            <div class="leaderboard-self__info">
              <span class="leaderboard-self__name">{{ currentUser.fullName }}</span>
              <span class="leaderboard-self__meta">
                {{ currentUser.branchName || '—' }} · {{ currentUser.positionName || '—' }}
              </span>
            </div>
            <div class="leaderboard-self__stats">
              <span>
                Очки: {{ currentUser.points }}
              </span>
              <span>
                %: {{ formatPercent(currentUser.avgScorePercent) }}
              </span>
              <span>
                Время: {{ formatTime(currentUser.avgTimeSeconds) }}
              </span>
            </div>
          </div>
          <p class="leaderboard-self__hint">Всего участников: {{ currentUser.totalParticipants }}</p>
        </div>
      </InfoCard>

      <InfoCard title="Бейджи">
        <div v-if="badges.length" class="badges">
          <div
            v-for="badge in badges"
            :key="badge.code"
            class="badge"
            :class="{ 'badge--locked': !badge.earned }"
          >
            <span class="badge__icon">{{ badge.icon || (badge.earned ? '🎖' : '⬜️') }}</span>
            <div class="badge__info">
              <span class="badge__name">{{ badge.name }}</span>
              <span class="badge__desc">{{ badge.description }}</span>
              <span v-if="badge.earned && badge.awardedAt" class="badge__date">{{ formatAwardDate(badge.awardedAt) }}</span>
              <span v-else class="badge__date badge__date--muted">Не получен</span>
            </div>
          </div>
        </div>
        <p v-else class="hint">Пройдите аттестации, чтобы заработать первые награды.</p>
      </InfoCard>
    </template>
  </PageContainer>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import PageContainer from '../components/PageContainer.vue';
import InfoCard from '../components/InfoCard.vue';
import LoadingState from '../components/LoadingState.vue';
import BaseSelect from '../components/common/BaseSelect.vue';
import { useGamificationStore } from '../store/gamificationStore';
import { useLeaderboardStore } from '../store/leaderboardStore';
import { useAppStore } from '../store/appStore';

const gamificationStore = useGamificationStore();
const leaderboardStore = useLeaderboardStore();
const appStore = useAppStore();

const selectedBranchId = ref(null);
const selectedPositionId = ref(null);
const filtersReady = ref(false);

const isLoading = computed(() => {
  const waitingOverview = gamificationStore.isLoading && !gamificationStore.overview;
  const waitingTeam = gamificationStore.isTeamLoading && !gamificationStore.teamChallenges.length;
  const waitingLeaderboard = leaderboardStore.isLoading && !leaderboardStore.leaders.length;
  return waitingOverview || waitingTeam || waitingLeaderboard;
});

const overview = computed(() => gamificationStore.overview);
const badges = computed(() => gamificationStore.overview?.badges || []);
const progressPercent = computed(() => gamificationStore.progressPercent);
const activeChallenge = computed(() => gamificationStore.teamChallenges[0] || null);

const branchOptions = computed(() => leaderboardStore.branches);
const positionOptions = computed(() => leaderboardStore.positions);
const leaders = computed(() => leaderboardStore.leaders);
const isLeaderboardBusy = computed(() => leaderboardStore.isLoading);
const leaderboardError = computed(() => leaderboardStore.error);
const currentUserId = computed(() => appStore.user?.id || null);
const currentUser = computed(() => leaderboardStore.currentUser);
const participationAllowed = computed(() => gamificationStore.participationAllowed);
const isCurrentUserInTop = computed(() =>
  leaders.value.some((item) => item.userId === currentUserId.value)
);

function normalizeId(value) {
  return Number.isFinite(value) && value > 0 ? value : null;
}

function syncFiltersFromStore() {
  selectedBranchId.value = leaderboardStore.filterBranchId ?? null;
  selectedPositionId.value = leaderboardStore.filterPositionId ?? null;
}

function formatPeriod(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const options = { day: '2-digit', month: '2-digit' };
  const startText = Number.isNaN(startDate.getTime()) ? '—' : startDate.toLocaleDateString('ru-RU', options);
  const endText = Number.isNaN(endDate.getTime()) ? '—' : endDate.toLocaleDateString('ru-RU', options);
  return `${startText} — ${endText}`;
}

function formatAwardDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function formatPercent(value) {
  if (!Number.isFinite(value)) {
    return '—';
  }
  return `${Math.round(value)}%`;
}

function formatTime(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return '—';
  }
  const totalSeconds = Math.round(value);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function handleResetFilters() {
  filtersReady.value = false;
  selectedBranchId.value = null;
  selectedPositionId.value = null;
  leaderboardStore
    .resetFilters()
    .then(() => {
      syncFiltersFromStore();
    })
    .catch(() => {})
    .finally(() => {
      filtersReady.value = true;
    });
}

watch(
  [selectedBranchId, selectedPositionId],
  ([branchId, positionId]) => {
    if (!filtersReady.value) {
      return;
    }
    const normalizedBranch = normalizeId(branchId);
    const normalizedPosition = normalizeId(positionId);
    if (
      normalizedBranch === leaderboardStore.filterBranchId &&
      normalizedPosition === leaderboardStore.filterPositionId
    ) {
      return;
    }
    leaderboardStore
      .fetchLeaders({ branchId: normalizedBranch, positionId: normalizedPosition })
      .then(() => {
        syncFiltersFromStore();
      })
      .catch(() => {});
  }
);

onMounted(() => {
  gamificationStore.loadOverview().catch(() => {});
  gamificationStore.loadTeamChallenges().catch(() => {});
  leaderboardStore
    .fetchLeaders()
    .then(() => {
      syncFiltersFromStore();
    })
    .catch(() => {})
    .finally(() => {
      filtersReady.value = true;
    });
});
</script>

<style scoped>
.progress {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.progress__label {
  font-size: 12px;
  color: var(--tg-theme-hint-color, #6f7a8b);
}

.progress__value {
  font-size: 18px;
  font-weight: 700;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 999px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-bar__inner {
  height: 100%;
  background: var(--tg-theme-button-color, #0a84ff);
  transition: width 0.3s ease;
}

.hint {
  margin: 0;
  font-size: 13px;
  color: var(--tg-theme-hint-color, #6f7a8b);
}

.error {
  margin: 0 0 12px;
  color: #d62d30;
  font-size: 13px;
}

.leaderboard-hint {
  margin-top: -4px;
  margin-bottom: 12px;
}

.scoreboard {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.scoreboard__item {
  display: grid;
  grid-template-columns: 40px 1fr 60px;
  gap: 8px;
  align-items: center;
  padding: 10px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.05);
}

.scoreboard__item--active {
  background: rgba(10, 132, 255, 0.16);
  font-weight: 600;
}

.scoreboard__place {
  font-size: 14px;
  font-weight: 600;
}

.scoreboard__name {
  font-size: 14px;
}

.scoreboard__points {
  justify-self: end;
  font-size: 16px;
  font-weight: 700;
}

.leaderboard-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
  align-items: center;
}

.leaderboard-controls__select {
  flex: 1 1 160px;
  min-width: 140px;
}

.leaderboard-reset {
  border: none;
  background: rgba(10, 132, 255, 0.14);
  color: var(--tg-theme-button-color, #0a84ff);
  font-weight: 600;
  border-radius: 12px;
  padding: 10px 16px;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.leaderboard-reset:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.leaderboard {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.leaderboard-row {
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border-radius: 14px;
  background: var(--tg-theme-bg-color, #ffffff);
  border: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.leaderboard-row--top {
  border-color: rgba(10, 132, 255, 0.4);
}

.leaderboard-row--self {
  border-color: var(--tg-theme-button-color, #0a84ff);
  background: rgba(10, 132, 255, 0.12);
}

.leaderboard-row__rank {
  font-size: 18px;
  font-weight: 700;
  text-align: center;
}

.leaderboard-row__info {
  display: grid;
  gap: 2px;
}

.leaderboard-row__name {
  font-size: 16px;
  font-weight: 600;
}

.leaderboard-row__meta {
  font-size: 12px;
  color: var(--tg-theme-hint-color, #6f7a8b);
}

.leaderboard-row__meta--secondary {
  font-size: 11px;
}

.leaderboard-row__stats {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
  gap: 8px;
  margin-top: 8px;
}

.leaderboard-row__stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.leaderboard-row__stat-label {
  font-size: 11px;
  color: var(--tg-theme-hint-color, #6f7a8b);
  text-transform: uppercase;
}

.leaderboard-row__stat-value {
  font-size: 15px;
  font-weight: 600;
}

.leaderboard-self {
  margin-top: 16px;
  padding: 12px;
  border-left: 4px solid var(--tg-theme-button-color, #0a84ff);
  border-radius: 12px;
  background: rgba(10, 132, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.leaderboard-self__title {
  font-size: 14px;
  font-weight: 600;
}

.leaderboard-self__content {
  display: grid;
  grid-template-columns: 60px 1fr;
  gap: 12px;
  align-items: center;
}

.leaderboard-self__rank {
  font-size: 24px;
  font-weight: 700;
}

.leaderboard-self__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.leaderboard-self__name {
  font-size: 16px;
  font-weight: 600;
}

.leaderboard-self__meta {
  font-size: 12px;
  color: var(--tg-theme-hint-color, #6f7a8b);
}

.leaderboard-self__stats {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 13px;
}

.leaderboard-self__hint {
  margin: 0;
  font-size: 12px;
  color: var(--tg-theme-hint-color, #6f7a8b);
}

.badges {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.badge {
  display: grid;
  grid-template-columns: 56px 1fr;
  gap: 12px;
  padding: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 14px;
  background: var(--tg-theme-bg-color, #ffffff);
}

.badge--locked {
  opacity: 0.6;
}

.badge__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}

.badge__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.badge__name {
  font-size: 16px;
  font-weight: 600;
}

.badge__desc {
  font-size: 13px;
  color: var(--tg-theme-hint-color, #6f7a8b);
}

.badge__date {
  font-size: 12px;
  color: var(--tg-theme-link-color, #0a84ff);
}

.badge__date--muted {
  color: var(--tg-theme-hint-color, #6f7a8b);
}
</style>

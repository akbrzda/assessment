<template>
  <PageContainer title="Аттестации" subtitle="Ваши тесты и история">
    <LoadingState v-if="store.isLoading" />
    <template v-else>
      <p v-if="store.error" class="error">{{ store.error }}</p>
      <p v-if="!assessments.length" class="hint">Аттестации пока не назначены.</p>
      <ul v-else class="assessment-list">
        <li v-for="item in assessments" :key="item.id" class="assessment-item">
          <div class="assessment-item__header">
            <div>
              <h3 class="assessment-item__title">{{ item.title }}</h3>
              <p class="assessment-item__description">{{ item.description || "Описание отсутствует" }}</p>
            </div>
            <div class="assessment-item__header-state">
              <span class="status" :class="`status--${item.status}`">{{ statusLabel(item.status) }}</span>
              <span class="badge" :class="`badge--${passOutcome(item).type}`">{{ passOutcome(item).label }}</span>
            </div>
          </div>
          <div class="assessment-item__meta">
            <span>Открытие: {{ formatDate(item.openAt) }}</span>
            <span>Закрытие: {{ formatDate(item.closeAt) }}</span>
            <span>Порог: {{ formatPercent(item.passScorePercent) }}</span>
            <span v-if="item.bestScorePercent != null">Лучший результат: {{ formatPercent(item.bestScorePercent) }}</span>
            <span v-if="timeRemainingLabel(item)" class="countdown">{{ timeRemainingLabel(item) }}</span>
            <span v-if="item.lastAttemptNumber">Попытка: {{ item.lastAttemptNumber }} / {{ item.maxAttempts ?? "—" }}</span>
          </div>
          <div class="assessment-item__actions">
            <button
              v-if="item.lastAttemptId && item.lastAttemptStatus === 'completed'"
              class="secondary-button"
              type="button"
              @click="viewResult(item)"
            >
              Просмотреть результат
            </button>
            <button class="primary-button" type="button" :disabled="!canStart(item)" @click="startAssessment(item)">
              {{ actionLabel(item) }}
            </button>
          </div>
        </li>
      </ul>
    </template>
  </PageContainer>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import PageContainer from "../components/PageContainer.vue";
import LoadingState from "../components/LoadingState.vue";
import { useUserAssessmentsStore } from "../store/userAssessmentsStore";
import { showAlert } from "../services/telegram";

const store = useUserAssessmentsStore();
const router = useRouter();

const assessments = computed(() => store.assessments || []);
const now = ref(Date.now());
let timerId = null;

function formatDate(value) {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleString("ru-RU");
}

function formatPercent(value) {
  const number = normalizePercent(value);
  if (number == null) {
    return "—";
  }
  return `${number}%`;
}

function statusLabel(status) {
  switch (status) {
    case "pending":
      return "Ожидает запуска";
    case "active":
      return "Доступна";
    case "closed":
      return "Завершена";
    default:
      return status;
  }
}

function passOutcome(item) {
  if (item?.hasPassed) {
    return { label: "Пройдена", type: "success" };
  }
  const passScore = normalizePercent(item.passScorePercent);
  const candidateScores = [normalizePercent(item.bestScorePercent), normalizePercent(item.lastScorePercent)].filter((value) => value != null);
  if (!candidateScores.length) {
    return { label: "Не пройдена", type: "danger" };
  }
  const maxScore = Math.max(...candidateScores);
  const threshold = passScore != null ? passScore : 0;
  const passed = maxScore >= threshold;
  return passed ? { label: "Пройдена", type: "success" } : { label: "Не пройдена", type: "danger" };
}

function normalizePercent(value) {
  if (value == null) {
    return null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? Number(value) : null;
  }
  if (typeof value === "string") {
    const match = value.replace(/,/g, ".").match(/-?\d+(?:\.\d+)?/);
    if (!match) {
      return null;
    }
    const parsed = Number.parseFloat(match[0]);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function canStart(item) {
  if (item.status !== "active") {
    return false;
  }
  if (item.hasActiveAttempt) {
    return true;
  }
  const attemptsUsed = item.lastAttemptNumber ? Number(item.lastAttemptNumber) : 0;
  const maxAttempts = item.maxAttempts != null ? Number(item.maxAttempts) : Infinity;
  if (attemptsUsed >= maxAttempts) {
    return false;
  }
  const score = normalizePercent(item.lastScorePercent);
  const passScore = normalizePercent(item.passScorePercent) ?? 0;
  if (item.lastAttemptStatus === "completed") {
    if (score === null) {
      return attemptsUsed < maxAttempts;
    }
    if (score >= 100 && attemptsUsed >= maxAttempts) {
      return false;
    }
    if (attemptsUsed >= maxAttempts) {
      return false;
    }
  }
  return true;
}

function startAssessment(item) {
  if (!canStart(item)) {
    return;
  }
  router.push({ name: "assessment-start", params: { id: item.id } });
}

function actionLabel(item) {
  if (item.hasActiveAttempt) {
    return "Продолжить";
  }
  if (item.lastAttemptStatus === "completed") {
    return "Пройти ещё раз";
  }
  return "Начать";
}

function timeRemainingLabel(item) {
  if (!item.hasActiveAttempt || item.timeLimitMinutes == null) {
    return null;
  }
  const expiry = item.expectedEndAt;
  if (!expiry) {
    return null;
  }
  const diffMs = expiry - now.value;
  if (diffMs <= 0) {
    return 'Время истекло';
  }
  const totalSeconds = Math.ceil(diffMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `Осталось: ${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function viewResult(item) {
  if (!item.lastAttemptId) {
    return;
  }
  router.push({ name: "assessment-result", params: { id: item.id, attemptId: item.lastAttemptId } });
}

onMounted(async () => {
  try {
    await store.fetchAssessments();
  } catch (error) {
    showAlert(error.message || "Не удалось загрузить аттестации");
  }
  ensureTimer();
});

onUnmounted(() => {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
});

watch(
  () => store.assessments,
  () => {
    ensureTimer();
  },
  { deep: true, immediate: true }
);

function ensureTimer() {
  const hasActive = (store.assessments || []).some((item) => item.hasActiveAttempt && item.expectedEndAt);
  if (hasActive && !timerId) {
    timerId = setInterval(() => {
      now.value = Date.now();
    }, 1000);
  } else if (!hasActive && timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}
</script>

<style scoped>
.assessment-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.assessment-item {
  border-radius: 14px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: var(--tg-theme-bg-color, #ffffff);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.assessment-item__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.assessment-item__header-state {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
}

.assessment-item__header-state .status {
  margin: 0;
}

.assessment-item__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.assessment-item__description {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--tg-theme-hint-color, #6f7a8b);
}

.assessment-item__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
  color: var(--tg-theme-hint-color, #6f7a8b);
}

.countdown {
  font-weight: 600;
  color: var(--tg-theme-text-color, #0a0a0a);
}

.badge {
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  background: rgba(0, 0, 0, 0.06);
  color: var(--tg-theme-text-color, #0a0a0a);
}

.badge--success {
  background: rgba(10, 132, 255, 0.16);
  color: var(--tg-theme-button-color, #0a84ff);
}

.badge--danger {
  background: rgba(214, 45, 48, 0.18);
  color: #d62d30;
}

.assessment-item__actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.primary-button {
  border-radius: 12px;
  border: none;
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  background: var(--tg-theme-button-color, #0a84ff);
  color: var(--tg-theme-button-text-color, #ffffff);
  transition: opacity 0.2s ease;
}

.primary-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.status {
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  background: var(--tg-theme-secondary-bg-color, #f5f7fb);
  color: var(--tg-theme-hint-color, #6f7a8b);
}

.status--active {
  background: rgba(10, 132, 255, 0.12);
  color: var(--tg-theme-button-color, #0a84ff);
}

.status--pending {
  background: rgba(255, 171, 0, 0.12);
  color: #d18d0f;
}

.status--closed {
  background: rgba(110, 122, 139, 0.12);
  color: rgba(110, 122, 139, 1);
}

.error {
  color: #d62d30;
  font-size: 13px;
}

.hint {
  margin: 0;
  color: var(--tg-theme-hint-color, #6f7a8b);
}
</style>

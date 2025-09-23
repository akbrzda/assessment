<template>
  <PageContainer :title="pageTitle" :subtitle="pageSubtitle">
    <LoadingState v-if="isLoading" />
    <template v-else>
      <template v-if="error">
        <p class="error">{{ error }}</p>
        <button class="secondary-button" type="button" @click="goBack">Вернуться</button>
      </template>
      <template v-else>
        <InfoCard v-if="summaryAttemptDetails" title="Итог">
          <div class="summary__top">
            <p class="summary__score">
              {{ summaryAttemptDetails.scorePercent != null ? `${summaryAttemptDetails.scorePercent}%` : '—' }}
            </p>
            <span class="badge" :class="`badge--${summaryOutcome.type}`">{{ summaryOutcome.label }}</span>
          </div>
          <div class="summary__meta">
            <span>
              Правильных ответов:
              {{ summaryAttemptDetails.correctAnswers != null && summaryAttemptDetails.totalQuestions != null
                ? `${summaryAttemptDetails.correctAnswers} из ${summaryAttemptDetails.totalQuestions}`
                : '—' }}
            </span>
            <span v-if="summaryAttemptDetails.timeSpentSeconds != null">Время: {{ formatDuration(summaryAttemptDetails.timeSpentSeconds) }}</span>
            <span v-if="summaryAttemptDetails.attemptNumber">Попытка: {{ summaryAttemptDetails.attemptNumber }}</span>
          </div>
        </InfoCard>

        <InfoCard title="Вопросы" v-if="formattedQuestions.length">
          <ol class="question-list">
            <li
              v-for="question in formattedQuestions"
              :key="question.id"
              class="question-list__item"
              :class="`question-list__item--${question.status.type}`"
            >
              <div class="question-list__header">
                <span class="question-list__order">Вопрос {{ question.order }}</span>
                <span class="question-list__status" :class="`question-list__status--${question.status.type}`">
                  <span class="question-list__icon" aria-hidden="true">{{ question.status.icon }}</span>
                  <span>{{ question.status.label }}</span>
                </span>
              </div>
              <p class="question-list__text">{{ question.text }}</p>
            </li>
          </ol>
        </InfoCard>

        <InfoCard title="История попыток" v-if="history.length">
          <div class="history-wrapper">
            <table class="history">
              <thead>
                <tr>
                  <th>Попытка</th>
                  <th>Статус</th>
                  <th>Процент</th>
                  <th>Правильных</th>
                  <th>Время</th>
                  <th>Дата</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in history" :key="item.attemptNumber">
                  <td>{{ item.attemptNumber }}</td>
                  <td>{{ attemptStatusLabel(item.status) }}</td>
                  <td>{{ item.scorePercent != null ? `${item.scorePercent}%` : '—' }}</td>
                  <td>{{ formatCorrect(item.correctAnswers, item.totalQuestions) }}</td>
                  <td>{{ item.timeSpentSeconds != null ? formatDuration(item.timeSpentSeconds) : '—' }}</td>
                  <td>{{ formatDate(item.completedAt || item.startedAt) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </InfoCard>

        <div class="actions">
          <button class="secondary-button" type="button" @click="goBack">Вернуться</button>
          <button
            v-if="canRetake"
            class="primary-button"
            type="button"
            @click="retake"
          >
            Пройти ещё раз
          </button>
        </div>
      </template>
    </template>
  </PageContainer>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PageContainer from '../components/PageContainer.vue';
import InfoCard from '../components/InfoCard.vue';
import LoadingState from '../components/LoadingState.vue';
import { apiClient } from '../services/apiClient';
import { useUserAssessmentsStore } from '../store/userAssessmentsStore';
import { showAlert, disableVerticalSwipes } from '../services/telegram';

const route = useRoute();
const router = useRouter();
const userAssessmentsStore = useUserAssessmentsStore();

const assessmentId = computed(() => Number(route.params.id));
const attemptId = computed(() => Number(route.params.attemptId));

const isLoading = ref(true);
const error = ref(null);
const summary = ref(null);
const questions = ref([]);
const history = ref([]);
const formattedQuestions = computed(() =>
  (questions.value || []).map((question, index) => {
    const type = question.isCorrect === true ? 'correct' : question.isCorrect === false ? 'wrong' : 'neutral';
    const order = Number.isFinite(question.order) ? question.order : index + 1;
    return {
      ...question,
      order,
      status: {
        type,
        label:
          type === 'correct' ? 'Верно' : type === 'wrong' ? 'Неверно' : 'Без ответа',
        icon: type === 'correct' ? '✔' : type === 'wrong' ? '✖' : '—'
      }
    };
  })
);

const pageTitle = computed(() => 'Результаты аттестации');
const allAttempts = computed(() => {
  const attempts = [];
  if (summary.value?.attempt) {
    attempts.push(summary.value.attempt);
  }
  (history.value || []).forEach((item) => {
    if (item) {
      attempts.push(item);
    }
  });
  return attempts;
});

const bestAttempt = computed(() => {
  const attempts = allAttempts.value;
  if (!attempts.length) {
    return null;
  }
  return attempts.reduce((best, current) => {
    if (!current) {
      return best;
    }
    if (!best) {
      return current;
    }
    const bestScore = Number(best.scorePercent ?? -Infinity);
    const currentScore = Number(current.scorePercent ?? -Infinity);
    if (currentScore > bestScore) {
      return current;
    }
    if (currentScore === bestScore) {
      const bestTime = best.timeSpentSeconds ?? Infinity;
      const currentTime = current.timeSpentSeconds ?? Infinity;
      return currentTime < bestTime ? current : best;
    }
    return best;
  }, null);
});

const summaryAttemptDetails = computed(() => {
  const baseAttempt = bestAttempt.value || summary.value?.attempt;
  if (!baseAttempt) {
    return null;
  }
  const fallback = summary.value?.attempt || {};
  const passScore = summary.value?.assessment?.passScorePercent ?? 0;
  const scorePercent = baseAttempt.scorePercent ?? fallback.scorePercent ?? null;
  const correctAnswers = baseAttempt.correctAnswers ?? fallback.correctAnswers ?? null;
  const totalQuestions = baseAttempt.totalQuestions ?? fallback.totalQuestions ?? null;
  const timeSpentSeconds = baseAttempt.timeSpentSeconds ?? fallback.timeSpentSeconds ?? null;
  const attemptNumber = baseAttempt.attemptNumber ?? fallback.attemptNumber ?? null;
  const passed = typeof baseAttempt.passed === 'boolean' ? baseAttempt.passed : (scorePercent ?? 0) >= passScore;
  return {
    scorePercent,
    correctAnswers,
    totalQuestions,
    timeSpentSeconds,
    attemptNumber,
    passed
  };
});

const pageSubtitle = computed(() => {
  const title = summary.value?.assessment.title || `Аттестация #${assessmentId.value}`;
  const attempt = summaryAttemptDetails.value;
  if (!attempt || attempt.scorePercent == null) {
    return title;
  }
  return `${title} · Лучший результат: ${attempt.scorePercent}%`;
});
const summaryOutcome = computed(() => {
  const attempt = summaryAttemptDetails.value;
  if (!attempt) {
    return { label: 'Не пройдена', type: 'danger' };
  }
  return attempt.passed ? { label: 'Пройдена', type: 'success' } : { label: 'Не пройдена', type: 'danger' };
});
const canRetake = computed(() => {
  if (!summary.value) {
    return false;
  }
  const maxAttempts = summary.value.assessment.maxAttempts != null ? Number(summary.value.assessment.maxAttempts) : Infinity;
  const attemptsUsed = history.value.length;
  const hasAttemptsLeft = attemptsUsed < maxAttempts;
  const score = summary.value.attempt.scorePercent || 0;
  const passScore = summary.value.assessment.passScorePercent || 0;
  return hasAttemptsLeft && (score < 100 || score < passScore);
});

onMounted(async () => {
  disableVerticalSwipes();
  if (!assessmentId.value || !attemptId.value) {
    showAlert('Результат недоступен');
    router.replace({ name: 'assessments' });
    return;
  }
  try {
    const { result } = await apiClient.getAssessmentAttemptResult(assessmentId.value, attemptId.value);
    summary.value = result;
    questions.value = result.questions || [];
    history.value = result.history || [];
    userAssessmentsStore.applyAssessmentResult({
      assessment: result.assessment,
      attempt: result.attempt,
      history: result.history
    });
  } catch (loadError) {
    error.value = loadError.message || 'Не удалось загрузить результат';
    showAlert(error.value);
  } finally {
    isLoading.value = false;
  }
});

onUnmounted(() => {
  disableVerticalSwipes();
});

function attemptStatusLabel(status) {
  switch ((status || '').toLowerCase()) {
    case 'completed':
      return 'Завершена';
    case 'in_progress':
      return 'В процессе';
    case 'cancelled':
      return 'Отменена';
    default:
      return status || '—';
  }
}

function formatDuration(seconds) {
  if (seconds == null) {
    return '—';
  }
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function formatCorrect(correct, total) {
  if (correct == null || total == null) {
    return '—';
  }
  return `${correct} / ${total}`;
}

function formatDate(value) {
  if (!value) {
    return '—';
  }
  return new Date(value).toLocaleString('ru-RU');
}

function goBack() {
  router.replace({ name: 'assessments' });
}

async function retake() {
  try {
    await router.replace({ name: 'assessment-start', params: { id: assessmentId.value } });
  } catch (error) {
    showAlert(error.message || 'Не удалось начать аттестацию');
  }
}
</script>

<style scoped>
.error {
  margin: 0;
  font-size: 14px;
  color: #d62d30;
}

.summary__score {
  margin: 0;
  font-size: 36px;
  font-weight: 700;
}

.summary__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.summary__meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--tg-theme-hint-color, #6f7a8b);
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 13px;
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

.question-list {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.question-list__item {
  padding-left: 10px;
  border-left: 4px solid rgba(0, 0, 0, 0.08);
}

.question-list__item--correct {
  border-left-color: #0a84ff;
}

.question-list__item--wrong {
  border-left-color: #d62d30;
}

.question-list__item--neutral {
  border-left-color: rgba(0, 0, 0, 0.08);
}

.question-list__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  font-weight: 600;
}

.question-list__status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--tg-theme-hint-color, #6f7a8b);
}

.question-list__status--correct {
  color: #0a84ff;
}

.question-list__status--wrong {
  color: #d62d30;
}

.question-list__status--neutral {
  color: var(--tg-theme-hint-color, #6f7a8b);
}

.question-list__icon {
  font-size: 16px;
  line-height: 1;
}

.question-list__text {
  margin: 6px 0 0;
  font-size: 14px;
}

.history-wrapper {
  overflow-x: auto;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.history-wrapper::-webkit-scrollbar {
  display: none;
}

.history {
  width: 100%;
  min-width: 520px;
  border-collapse: collapse;
  font-size: 13px;
}

.history th,
.history td {
  border: 1px solid rgba(0, 0, 0, 0.08);
  padding: 8px;
  text-align: left;
}

.actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.primary-button,
.secondary-button {
  border-radius: 12px;
  border: none;
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.primary-button {
  background: var(--tg-theme-button-color, #0a84ff);
  color: var(--tg-theme-button-text-color, #ffffff);
}

.secondary-button {
  background: var(--tg-theme-secondary-bg-color, #f5f7fb);
  color: var(--tg-theme-text-color, #0a0a0a);
}
</style>

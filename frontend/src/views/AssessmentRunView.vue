<template>
  <PageContainer :title="pageTitle" :subtitle="pageSubtitle">
    <LoadingState v-if="isLoading" />
    <template v-else>
      <template v-if="error">
        <p class="error">{{ error }}</p>
        <button class="secondary-button" type="button" @click="goBack">Вернуться</button>
      </template>
      <template v-else-if="attemptResult">
        <InfoCard title="Итог">
          <p class="result__score">{{ attemptResult.attempt.scorePercent }}%</p>
          <p class="result__status" :class="{ 'result__status--success': attemptResult.attempt.passed }">
            {{ attemptResult.attempt.passed ? "Аттестация пройдена" : "Порог не достигнут" }}
          </p>
          <div class="result__meta">
            <span>Правильных ответов: {{ attemptResult.attempt.correctAnswers }} из {{ attemptResult.attempt.totalQuestions }}</span>
            <span v-if="attemptResult.attempt.timeSpentSeconds != null">Время: {{ formatDuration(attemptResult.attempt.timeSpentSeconds) }}</span>
            <span v-if="attemptResult.attempt.attemptNumber">Попытка: {{ attemptResult.attempt.attemptNumber }}</span>
          </div>
        </InfoCard>

        <InfoCard title="Вопросы" v-if="formattedResultQuestions.length">
          <ol class="question-list">
            <li
              v-for="question in formattedResultQuestions"
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

        <div class="result__actions">
          <button class="primary-button" type="button" @click="finish">Готово</button>
        </div>
      </template>
      <template v-else>
        <section class="progress">
          <div class="progress__meta">
            <span>Вопрос {{ currentIndex + 1 }} из {{ questions.length }}</span>
            <span v-if="timeLimit" class="timer">Осталось: {{ formattedTime }}</span>
          </div>
          <div class="progress__bar">
            <div class="progress__bar-inner" :style="progressStyle"></div>
          </div>
        </section>

        <InfoCard v-if="currentQuestion" :title="questionTitle">
          <p class="question__text">{{ currentQuestion.text }}</p>
          <ul class="options">
            <li v-for="option in currentQuestion.options" :key="option.id" class="options__item">
              <label class="options__label">
                <input type="radio" :name="`question-${currentQuestion.id}`" :value="option.id" v-model="selectedOptionId" :disabled="isSubmitting" />
                <span>{{ option.text }}</span>
              </label>
            </li>
          </ul>
          <div class="controls">
            <button class="primary-button" type="button" :disabled="!selectedOptionId || isSubmitting" @click="handleNext">
              <span v-if="isSubmitting" class="button-loader" />
              {{ isLastQuestion ? "Завершить" : "Далее" }}
            </button>
          </div>
        </InfoCard>
        <p v-else class="hint">Вопросы недоступны.</p>
      </template>
    </template>
  </PageContainer>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import PageContainer from "../components/PageContainer.vue";
import InfoCard from "../components/InfoCard.vue";
import LoadingState from "../components/LoadingState.vue";
import { apiClient } from "../services/apiClient";
import { useUserAssessmentsStore } from "../store/userAssessmentsStore";
import {
  showAlert,
  showBackButton,
  hideBackButton,
  hapticImpact,
  disableVerticalSwipes,
  enableVerticalSwipes,
  showConfirm,
  getInitData,
} from "../services/telegram";

const route = useRoute();
const router = useRouter();
const userAssessmentsStore = useUserAssessmentsStore();

const BASE_API_URL = (import.meta.env.VITE_API_BASE_URL?.trim() || (typeof window !== "undefined" && window.location ? window.location.origin : "")).replace(/\/$/, "");

const assessmentId = computed(() => Number(route.params.id));

const assessment = ref(null);
const attempt = ref(null);
const currentIndex = ref(0);
const selectedOptionId = ref(null);
const isSubmitting = ref(false);
const isLoading = ref(true);
const error = ref(null);
const attemptResult = ref(null);
const timeRemaining = ref(null);
let timerInterval = null;
let cleanupBack = () => {};
let cleanupUnload = () => {};

const pageTitle = computed(() => "Прохождение аттестации");
const pageSubtitle = computed(() => attemptResult.value?.assessment?.title || assessment.value?.title || subtitleFallback.value);
const subtitleFallback = computed(() => (assessmentId.value ? `Аттестация #${assessmentId.value}` : "—"));

const questions = computed(() => assessment.value?.questions || []);
const currentQuestion = computed(() => questions.value[currentIndex.value] || null);
const isLastQuestion = computed(() => currentIndex.value >= questions.value.length - 1);
const questionTitle = computed(() => `Вопрос ${currentIndex.value + 1} из ${questions.value.length}`);
const timeLimit = computed(() => (attempt.value?.timeLimitMinutes ? Number(attempt.value.timeLimitMinutes) : null));
const formattedTime = computed(() => (timeRemaining.value != null ? formatDuration(timeRemaining.value) : ""));
const progressStyle = computed(() => ({ width: questions.value.length ? `${((currentIndex.value + 1) / questions.value.length) * 100}%` : "0%" }));
const formattedResultQuestions = computed(() => {
  const list = attemptResult.value?.questions || [];
  return list.map((question, index) => {
    const type = question.isCorrect === true ? "correct" : question.isCorrect === false ? "wrong" : "neutral";
    const order = Number.isFinite(question.order) ? question.order : index + 1;
    return {
      ...question,
      order,
      status: {
        type,
        label: type === "correct" ? "Верно" : type === "wrong" ? "Неверно" : "Без ответа",
        icon: type === "correct" ? "✔" : type === "wrong" ? "✖" : "—",
      },
    };
  });
});

watch(currentQuestion, (question) => {
  if (!question) {
    selectedOptionId.value = null;
    return;
  }
  selectedOptionId.value = question.selectedOptionId != null ? String(question.selectedOptionId) : null;
});

onMounted(async () => {
  cleanupBack = showBackButton(goBack);
  registerUnloadHandler();
  if (!assessmentId.value) {
    showAlert("Аттестация недоступна");
    router.replace({ name: "assessments" });
    return;
  }
  try {
    await loadAssessment();
    if (!attemptResult.value && !attempt.value) {
      await startAttempt();
    }
  } catch (loadError) {
    error.value = loadError.message || "Не удалось загрузить аттестацию";
    showAlert(error.value);
  } finally {
    isLoading.value = false;
  }
});

onUnmounted(() => {
  cleanupBack();
  cleanupUnload();
  hideBackButton();
  clearTimer();
  enableVerticalSwipes();
});

watch(
  () => attemptResult.value,
  (value) => {
    if (value) {
      disableVerticalSwipes();
    } else {
      enableVerticalSwipes();
    }
  }
);

async function loadAssessment() {
  const { assessment: data } = await apiClient.getUserAssessment(assessmentId.value);
  if (!data) {
    throw new Error("Аттестация недоступна");
  }
  assessment.value = data;
  if (assessment.value.latestAttempt) {
    userAssessmentsStore.applyAssessmentResult({
      assessment: {
        id: assessment.value.id,
        passScorePercent: assessment.value.passScorePercent,
      },
      attempt: assessment.value.latestAttempt,
      history: []
    });
  }
  const attemptsUsed = assessment.value.latestAttempt?.attemptNumber ? Number(assessment.value.latestAttempt.attemptNumber) : 0;
  const maxAttempts = assessment.value.maxAttempts != null ? Number(assessment.value.maxAttempts) : Infinity;
  const firstUnanswered = assessment.value.questions.findIndex((question) => !question.selectedOptionId);
  currentIndex.value = firstUnanswered >= 0 ? firstUnanswered : 0;
  if (assessment.value.latestAttempt?.status === "in_progress") {
    const active = assessment.value.latestAttempt;
    attempt.value = {
      id: active.id,
      attemptNumber: active.attemptNumber,
      timeLimitMinutes: assessment.value.timeLimitMinutes != null ? Number(assessment.value.timeLimitMinutes) : null,
      startedAt: active.startedAt,
      remainingSeconds: active.remainingSeconds != null ? Number(active.remainingSeconds) : null,
    };
    setupTimer(active.startedAt, attempt.value.timeLimitMinutes, attempt.value.remainingSeconds);
    return;
  }
  if (assessment.value.latestAttempt?.status === "completed" && attemptsUsed >= maxAttempts) {
    const latestSummary = assessment.value.latestAttempt;
    if (latestSummary?.id) {
      try {
        await fetchAttemptResult(latestSummary.id);
        return;
      } catch (fetchError) {
        // Игнорируем, ниже покажем краткое резюме
      }
    }
    attemptResult.value = {
      assessment: {
        id: assessment.value.id,
        title: assessment.value.title,
        passScorePercent: assessment.value.passScorePercent,
      },
      attempt: {
        scorePercent: latestSummary?.scorePercent ?? 0,
        correctAnswers: latestSummary?.correctAnswers ?? null,
        totalQuestions: assessment.value.questions.length,
        timeSpentSeconds: latestSummary?.timeSpentSeconds ?? null,
        attemptNumber: attemptsUsed,
        passed: (latestSummary?.scorePercent ?? 0) >= (assessment.value.passScorePercent || 0),
      },
      questions: [],
    };
    return;
  }
}

async function startAttempt() {
  if (attemptResult.value || attempt.value) {
    return;
  }
  try {
    const response = await apiClient.startAssessmentAttempt(assessmentId.value);
    attempt.value = {
      id: response.attempt.id,
      attemptNumber: response.attempt.number,
      timeLimitMinutes: response.attempt.timeLimitMinutes != null ? Number(response.attempt.timeLimitMinutes) : null,
      startedAt: response.attempt.startedAt,
      remainingSeconds:
        response.attempt.remainingSeconds != null
          ? Number(response.attempt.remainingSeconds)
          : response.attempt.timeLimitMinutes != null
            ? Number(response.attempt.timeLimitMinutes) * 60
            : null,
    };
    if (!assessment.value.latestAttempt || assessment.value.latestAttempt.id !== attempt.value.id) {
      assessment.value.latestAttempt = {
        id: attempt.value.id,
        attemptNumber: attempt.value.attemptNumber,
        status: "in_progress",
        startedAt: attempt.value.startedAt,
        remainingSeconds: attempt.value.remainingSeconds,
      };
    }
    setupTimer(attempt.value.startedAt, attempt.value.timeLimitMinutes, attempt.value.remainingSeconds);
    userAssessmentsStore.applyAssessmentResult({
      assessment: {
        id: assessment.value.id,
        passScorePercent: assessment.value.passScorePercent,
      },
      attempt: {
        id: attempt.value.id,
        attemptNumber: attempt.value.attemptNumber,
        status: "in_progress",
        startedAt: attempt.value.startedAt,
        scorePercent: null,
        remainingSeconds: attempt.value.remainingSeconds,
      },
      history: []
    });
  } catch (startError) {
    if (startError.message) {
      error.value = startError.message;
    }
    throw startError;
  }
}

function setupTimer(startedAt, limitMinutes, initialRemainingSeconds = null) {
  clearTimer();
  if (initialRemainingSeconds != null) {
    timeRemaining.value = Math.max(0, Math.ceil(initialRemainingSeconds));
  } else {
    timeRemaining.value = limitMinutes != null ? Number(limitMinutes) * 60 : null;
  }

  let expectedEnd = null;
  const nowMs = Date.now();
  if (initialRemainingSeconds != null && Number.isFinite(Number(initialRemainingSeconds))) {
    expectedEnd = nowMs + Number(initialRemainingSeconds) * 1000 + 500;
  } else if (limitMinutes != null && startedAt) {
    const startedAtMs = new Date(startedAt).getTime();
    if (Number.isFinite(startedAtMs)) {
      expectedEnd = startedAtMs + Number(limitMinutes) * 60 * 1000 + 500;
    }
  }

  if (!expectedEnd) {
    return;
  }

  const update = () => {
    const diffMs = expectedEnd - Date.now();
    const remainingSeconds = Math.ceil(diffMs / 1000);
    timeRemaining.value = remainingSeconds > 0 ? remainingSeconds : 0;
    if (remainingSeconds <= 0) {
      clearTimer();
      autoComplete();
    }
  };

  update();
  if (timeRemaining.value === null || timeRemaining.value <= 0) {
    return;
  }

  timerInterval = setInterval(update, 1000);
}

function registerUnloadHandler() {
  if (typeof window === "undefined") {
    cleanupUnload = () => {};
    return;
  }
  const handler = () => {
    if (!attempt.value || attemptResult.value) {
      return;
    }
    sendAttemptCompletionKeepalive();
  };
  window.addEventListener("beforeunload", handler);
  cleanupUnload = () => {
    window.removeEventListener("beforeunload", handler);
  };
}

function sendAttemptCompletionKeepalive() {
  if (!attempt.value) {
    return;
  }
  const url = `${BASE_API_URL}/assessments/${assessmentId.value}/attempts/${attempt.value.id}/complete`;
  const headers = { 'Content-Type': 'application/json' };
  const initData = getInitData();
  if (initData) {
    headers['x-telegram-init-data'] = initData;
  }
  try {
    fetch(url, {
      method: 'POST',
      headers,
      keepalive: true,
    }).catch(() => {});
  } catch (error) {
    // ignore unload errors
  }
}

function clearTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

async function handleNext() {
  if (!currentQuestion.value || !selectedOptionId.value || !attempt.value) {
    return;
  }
  isSubmitting.value = true;
  try {
    await apiClient.submitAssessmentAnswer(assessmentId.value, attempt.value.id, {
      questionId: currentQuestion.value.id,
      optionId: Number(selectedOptionId.value),
    });
    hapticImpact("light");
    currentQuestion.value.selectedOptionId = Number(selectedOptionId.value);
    if (isLastQuestion.value) {
      await completeAssessment();
    } else {
      currentIndex.value += 1;
    }
  } catch (submitError) {
    showAlert(submitError.message || "Не удалось сохранить ответ");
  } finally {
    isSubmitting.value = false;
  }
}

async function completeAssessment() {
  if (!attempt.value || attemptResult.value) {
    return;
  }
  isSubmitting.value = true;
  try {
    const { assessment: assessmentSummary, attempt: attemptSummary } = await apiClient.completeAssessmentAttempt(
      assessmentId.value,
      attempt.value.id
    );
    attemptResult.value = {
      assessment: assessmentSummary,
      attempt: attemptSummary,
      questions: [],
    };
    assessment.value.latestAttempt = {
      id: attemptSummary.id,
      attemptNumber: attemptSummary.attemptNumber,
      status: "completed",
      scorePercent: attemptSummary.scorePercent,
      completedAt: new Date().toISOString(),
    };
    attempt.value = null;
    await fetchAttemptResult(attemptSummary.id).catch(() => {
      // Оставляем краткие данные, если подробный результат недоступен
    });
    hapticImpact("medium");
    userAssessmentsStore.fetchAssessments().catch(() => {});
  } catch (completeError) {
    showAlert(completeError.message || "Не удалось завершить аттестацию");
  } finally {
    clearTimer();
    isSubmitting.value = false;
  }
}

async function autoComplete() {
  if (attemptResult.value) {
    return;
  }
  showAlert("Время прохождения истекло. Аттестация будет завершена автоматически.");
  await completeAssessment();
}

async function fetchAttemptResult(attemptId) {
  if (!attemptId) {
    return null;
  }
  const { result } = await apiClient.getAssessmentAttemptResult(assessmentId.value, attemptId);
  attemptResult.value = result;
  userAssessmentsStore.applyAssessmentResult({
    assessment: result.assessment,
    attempt: result.attempt,
    history: result.history
  });
  return result;
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

async function goBack() {
  if (attempt.value) {
    const confirmed = await showConfirm("Прервать прохождение? Вы сможете вернуться и продолжить позже.");
    if (!confirmed) {
      return;
    }
    attempt.value = null;
    clearTimer();
    enableVerticalSwipes();
    await userAssessmentsStore.fetchAssessments().catch(() => {});
  }
  router.replace({ name: "assessments" });
}

function finish() {
  userAssessmentsStore.fetchAssessments().finally(() => {
    router.replace({ name: "assessments" });
  });
}
</script>

<style scoped>
.error {
  margin: 0;
  font-size: 14px;
  color: #d62d30;
}

.hint {
  margin: 0;
  font-size: 14px;
  color: var(--tg-theme-hint-color, #6f7a8b);
}

.progress {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.progress__meta {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--tg-theme-hint-color, #6f7a8b);
}

.progress__bar {
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.progress__bar-inner {
  height: 100%;
  background: var(--tg-theme-button-color, #0a84ff);
  transition: width 0.2s linear;
}

.question__text {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
}

.options {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.options__item {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  padding: 10px 12px;
  background: var(--tg-theme-secondary-bg-color, #f5f7fb);
}

.options__label {
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 14px;
}

.controls {
  margin-top: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.timer {
  font-size: 13px;
  color: var(--tg-theme-hint-color, #6f7a8b);
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

.primary-button:disabled,
.secondary-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.button-loader {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: rgba(255, 255, 255, 0.9);
  animation: spin 0.8s linear infinite;
}

.secondary-button .button-loader {
  border-color: rgba(0, 0, 0, 0.15);
  border-top-color: rgba(0, 0, 0, 0.55);
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.result__score {
  margin: 0;
  font-size: 36px;
  font-weight: 700;
}

.result__status {
  margin: 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #d62d30;
}

.result__status--success {
  color: #0a84ff;
}

.result__meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--tg-theme-hint-color, #6f7a8b);
}

.result__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
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
</style>

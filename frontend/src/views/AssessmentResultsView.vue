<template>
  <div class="page-container results-page">
    <div class="container">
      <!-- Badge + Title -->
      <div class="results-header-top">
        <span class="assessment-badge">Итоговая аттестация</span>
        <h1 class="results-main-title">Результаты теста</h1>
      </div>

      <!-- Trophy/Icon -->
      <div class="result-trophy-wrap" :class="result.passed ? 'passed' : 'failed'">
        <CheckCircle v-if="result.passed" class="trophy-icon" />
        <XCircle v-else class="trophy-icon" />
      </div>

      <!-- Status text -->
      <div class="result-status-block">
        <h2 class="result-status-title">{{ result.passed ? "Поздравляем!" : "Не пройдено" }}</h2>
        <p class="result-status-sub">{{ result.passed ? "Тест успешно пройден" : assessment?.title }}</p>
      </div>

      <!-- Circular score -->
      <div class="score-section">
        <div class="score-ring-wrap">
          <svg class="score-ring-svg" viewBox="0 0 88 88" width="88" height="88">
            <circle cx="44" cy="44" r="36" fill="none" stroke="var(--divider)" stroke-width="7" />
            <circle
              cx="44"
              cy="44"
              r="36"
              fill="none"
              :stroke="result.passed ? 'var(--success)' : 'var(--error)'"
              stroke-width="7"
              stroke-linecap="round"
              :stroke-dasharray="`${2 * Math.PI * 36}`"
              :stroke-dashoffset="`${2 * Math.PI * 36 * (1 - (result.score || 0) / 100)}`"
              transform="rotate(-90 44 44)"
            />
          </svg>
          <span class="score-ring-text" :class="result.passed ? 'text-success' : 'text-error'">{{ result.score }}%</span>
        </div>
        <div class="score-info-block">
          <div class="score-big" :class="result.passed ? 'text-success' : 'text-error'">{{ result.score }}%</div>
          <div class="score-sub">Общий результат</div>
        </div>
      </div>

      <!-- Stats card -->
      <div class="stats-card">
        <div class="stat-row">
          <span class="stat-label">Правильных ответов</span>
          <span class="stat-val">{{ result.correctAnswers }} из {{ result.totalQuestions }}</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-row">
          <span class="stat-label">Время прохождения</span>
          <span class="stat-val">{{ result.timeSpent }}</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-row">
          <span class="stat-label">Лучший результат</span>
          <span class="stat-val">{{ result.score }}%</span>
        </div>
      </div>

      <!-- Action -->
      <div class="results-actions">
        <router-link
          v-if="finalAssessmentPassedCourseId || relatedCourseId"
          :to="`/courses/${finalAssessmentPassedCourseId || relatedCourseId}`"
          class="btn btn-primary btn-full"
        >
          Вернуться к курсу
        </router-link>
        <router-link v-else to="/assessments" class="btn btn-primary btn-full"> Вернуться к аттестациям </router-link>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Check, CheckCircle, X, XCircle } from "lucide-vue-next";
import { useTelegramStore } from "../stores/telegram";
import { useUserStore } from "../stores/user";
import { apiClient } from "../services/apiClient";

const COURSE_COMPLETION_STORAGE_KEY = "courseCompletionContext";

export default {
  name: "AssessmentResultsView",
  components: {
    Check,
    CheckCircle,
    X,
    XCircle,
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const telegramStore = useTelegramStore();
    const userStore = useUserStore();

    const assessment = ref(null);
    const result = ref({});
    const isLoading = ref(false);
    const summaryItem = ref(null);
    const relatedCourseId = ref(null);
    const finalAssessmentPassedCourseId = ref(null);

    const canRetake = computed(() => {
      if (!assessment.value || !result.value) {
        return false;
      }

      // Если результат 100%, повторное прохождение не требуется
      if (result.value.score === 100) {
        return false;
      }

      // Используем данные из summaryItem для точного подсчета попыток
      const usedAttempts = summaryItem.value?.lastAttemptNumber || result.value.attemptNumber || 0;
      const maxAttempts = Number(assessment.value.maxAttempts || 0);
      if (maxAttempts === 0) {
        return assessment.value.status === "open";
      }
      const attemptsLeft = maxAttempts - usedAttempts;

      return attemptsLeft > 0 && assessment.value.status === "open";
    });

    const remainingAttempts = computed(() => {
      if (!assessment.value) {
        return 0;
      }
      const usedAttempts = summaryItem.value?.lastAttemptNumber || result.value.attemptNumber || 0;
      if (Number(assessment.value.maxAttempts || 0) === 0) {
        return Number.POSITIVE_INFINITY;
      }
      const remaining = Number(assessment.value.maxAttempts || 1) - usedAttempts;
      return remaining > 0 ? remaining : 0;
    });

    function pluralizeAttempts(count) {
      if (!Number.isFinite(count)) return "попыток";
      if (count === 1) return "попытка";
      if (count >= 2 && count <= 4) return "попытки";
      return "попыток";
    }

    function formatAttemptSummary(attemptNumber, maxAttempts) {
      if (Number(maxAttempts || 0) === 0) {
        return `${attemptNumber} из ∞`;
      }
      return `${attemptNumber} из ${maxAttempts}`;
    }

    function formatDuration(seconds) {
      if (!Number.isFinite(seconds)) {
        return "--:--";
      }
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${String(secs).padStart(2, "0")}`;
    }

    function retakeAssessment() {
      telegramStore.hapticFeedback("impact", "medium");
      router.push(`/assessment/${route.params.id}`);
    }

    function readCompletionContext(assessmentId) {
      try {
        const raw = window.sessionStorage.getItem(COURSE_COMPLETION_STORAGE_KEY);
        if (!raw) {
          return null;
        }

        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") {
          return null;
        }

        const createdAt = Number(parsed.createdAt || 0);
        if (createdAt > 0 && Date.now() - createdAt > 24 * 60 * 60 * 1000) {
          window.sessionStorage.removeItem(COURSE_COMPLETION_STORAGE_KEY);
          return null;
        }

        if ((parsed.type === "module" || parsed.type === "section" || parsed.type === "topic") && Number(parsed.assessmentId) === assessmentId) {
          return parsed;
        }

        if (parsed.type === "final" && Number(parsed.finalAssessmentId) === assessmentId) {
          return parsed;
        }

        return null;
      } catch (error) {
        console.warn("Не удалось прочитать контекст прохождения курса", error);
        return null;
      }
    }

    function clearCompletionContext() {
      try {
        window.sessionStorage.removeItem(COURSE_COMPLETION_STORAGE_KEY);
      } catch (error) {
        console.warn("Не удалось очистить контекст прохождения курса", error);
      }
    }

    async function completeCourseStepIfNeeded(assessmentId, attemptId) {
      const context = readCompletionContext(assessmentId);
      if (!context || !Number.isFinite(attemptId) || attemptId <= 0) {
        return null;
      }

      try {
        if (context.type === "module") {
          await apiClient.completeCourseModuleAttempt(Number(context.moduleId), attemptId);
          relatedCourseId.value = Number(context.courseId);
          clearCompletionContext();
          return context;
        }

        if (context.type === "section") {
          await apiClient.completeCourseSectionAttempt(Number(context.sectionId), attemptId);
          relatedCourseId.value = Number(context.courseId);
          clearCompletionContext();
          return context;
        }

        if (context.type === "topic") {
          await apiClient.completeCourseTopicAttempt(Number(context.topicId), attemptId);
          relatedCourseId.value = Number(context.courseId);
          clearCompletionContext();
          return context;
        }

        if (context.type === "final") {
          await apiClient.completeCourseFinalAssessmentAttempt(Number(context.courseId), attemptId);
          relatedCourseId.value = Number(context.courseId);
          clearCompletionContext();
          return context;
        }
      } catch (error) {
        console.warn("Не удалось синхронизировать прогресс курса", error);
      }
      return null;
    }

    async function loadResults() {
      const id = Number(route.params.id);
      if (!Number.isFinite(id)) {
        router.replace("/assessments");
        return;
      }

      try {
        if (!userStore.isInitialized) {
          await userStore.ensureStatus();
        }

        isLoading.value = true;

        const { assessments } = await apiClient.listUserAssessments();
        summaryItem.value = (assessments || []).find((item) => item.id === id) || null;

        let attemptId = Number(route.query.attemptId);
        if (!Number.isFinite(attemptId) || attemptId <= 0) {
          attemptId = summaryItem.value?.lastAttemptId ? Number(summaryItem.value.lastAttemptId) : NaN;
        }

        if (!Number.isFinite(attemptId) || attemptId <= 0) {
          telegramStore.showAlert("Результат попытки не найден");
          router.replace("/assessments");
          return;
        }

        const { result: data } = await apiClient.getAssessmentAttemptResult(id, attemptId);
        if (!data) {
          telegramStore.showAlert("Результат попытки не найден");
          router.replace("/assessments");
          return;
        }

        const completionContext = await completeCourseStepIfNeeded(id, attemptId);

        const statusMap = { active: "open", pending: "pending", closed: "closed" };
        const mappedStatus = summaryItem.value ? statusMap[summaryItem.value.status] || summaryItem.value.status : "closed";

        assessment.value = {
          id: data.assessment.id,
          title: data.assessment.title,
          threshold: Number(data.assessment.passScorePercent || 0),
          maxAttempts: summaryItem.value?.maxAttempts || data.assessment.maxAttempts || 1,
          status: mappedStatus,
        };

        const attempt = data.attempt;
        const earlyExit = route.query.earlyExit === "true";

        const questions = (data.questions || []).map((question) => ({
          id: question.id,
          text: question.text,
          isCorrect: question.isCorrect === true,
          selectedOptionText: question.selectedOptionText,
          correctOptionText: question.correctOptionText,
          correctTextAnswer: question.correctTextAnswer,
        }));

        const score = Number.isFinite(attempt.scorePercent) ? Math.round(attempt.scorePercent) : 0;
        const correctAnswers = Number.isFinite(attempt.correctAnswers) ? attempt.correctAnswers : questions.filter((q) => q.isCorrect).length;
        const totalQuestions = Number.isFinite(attempt.totalQuestions) ? attempt.totalQuestions : questions.length;

        result.value = {
          score: earlyExit ? 0 : score,
          passed: earlyExit ? false : Boolean(attempt.passed),
          correctAnswers: earlyExit ? 0 : correctAnswers,
          totalQuestions,
          timeSpent: attempt.timeSpentSeconds != null ? formatDuration(Number(attempt.timeSpentSeconds)) : "--:--",
          attemptNumber: Number(attempt.attemptNumber || 1),
          questions: earlyExit ? questions.map((question) => ({ ...question, isCorrect: false })) : questions,
          badgesEarned: [],
          isEarlyExit: earlyExit,
        };

        if (completionContext?.type === "final" && result.value.passed && relatedCourseId.value) {
          finalAssessmentPassedCourseId.value = relatedCourseId.value;
        }

        const isFirstVisit = route.query.fromAssessment === "true";
        if (isFirstVisit) {
          const preservedQuery = {};
          if (route.query.attemptId) {
            preservedQuery.attemptId = route.query.attemptId;
          }
          router.replace({ path: route.path, query: preservedQuery });

          setTimeout(() => {
            if (result.value.isEarlyExit) {
              telegramStore.hapticFeedback("notification", "error");
              telegramStore.showAlert(
                `Аттестация завершена преждевременно.\n\nРезультат: 0%\nПопытка засчитана.\n\nОсталось попыток: ${remainingAttempts.value}`,
              );
            } else if (result.value.passed) {
              telegramStore.hapticFeedback("notification", "success");
              telegramStore.showAlert(`Поздравляем! Аттестация пройдена на ${result.value.score}%`);
            } else {
              telegramStore.hapticFeedback("notification", "error");
              const message = canRetake.value
                ? `Аттестация не пройдена. Набрано ${result.value.score}%, требуется ${assessment.value.threshold}%.\n\nОсталось попыток: ${remainingAttempts.value}`
                : `Аттестация не пройдена. Набрано ${result.value.score}%, требуется ${assessment.value.threshold}%.`;
              telegramStore.showAlert(message);
            }
          }, 400);
        }
      } catch (error) {
        console.error("Не удалось загрузить результаты", error);
        telegramStore.showAlert(error.message || "Не удалось загрузить результаты аттестации");
        router.replace("/assessments");
      } finally {
        isLoading.value = false;
      }
    }

    onMounted(() => {
      loadResults();
    });

    return {
      assessment,
      result,
      canRetake,
      remainingAttempts,
      relatedCourseId,
      finalAssessmentPassedCourseId,
      pluralizeAttempts,
      formatAttemptSummary,
      retakeAssessment,
      isLoading,
    };
  },
};
</script>

<style scoped>
.results-page {
  padding-bottom: 40px;
}

/* Badge + Title */
.results-header-top {
  padding-top: 12px;
  margin-bottom: 24px;
}

.assessment-badge {
  display: inline-block;
  background-color: var(--accent-bg);
  color: var(--accent);
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 999px;
  margin-bottom: 8px;
}

.results-main-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
}

/* Trophy */
.result-trophy-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 96px;
  height: 96px;
  border-radius: 50%;
  margin: 0 auto 20px;
}

.result-trophy-wrap.passed {
  background-color: var(--accent-bg);
}

.result-trophy-wrap.failed {
  background-color: rgba(255, 59, 48, 0.1);
}

.trophy-icon {
  width: 52px;
  height: 52px;
}

.result-trophy-wrap.passed .trophy-icon {
  color: var(--accent);
}

.result-trophy-wrap.failed .trophy-icon {
  color: var(--error);
}

/* Status */
.result-status-block {
  text-align: center;
  margin-bottom: 28px;
}

.result-status-title {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 4px;
  color: var(--text-primary);
}

.result-status-sub {
  font-size: 14px;
  color: var(--text-secondary);
}

/* Score ring */
.score-section {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 24px;
}

.score-ring-wrap {
  position: relative;
  width: 88px;
  height: 88px;
  flex-shrink: 0;
}

.score-ring-svg {
  display: block;
}

.score-ring-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 15px;
  font-weight: 700;
}

.score-info-block {
  text-align: left;
}

.score-big {
  font-size: 36px;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 4px;
}

.score-sub {
  font-size: 14px;
  color: var(--text-secondary);
}

.text-success {
  color: var(--success);
}

.text-error {
  color: var(--error);
}

/* Stats */
.stats-card {
  background-color: var(--bg-secondary);
  border-radius: 16px;
  padding: 4px 16px;
  margin-bottom: 24px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 0;
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.stat-val {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.stat-divider {
  height: 1px;
  background-color: var(--divider);
}

/* Actions */
.results-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>

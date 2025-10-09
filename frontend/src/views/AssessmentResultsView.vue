<template>
  <div class="page-container">
    <div class="container">
      <!-- Results Header -->
      <div class="results-header">
        <div class="result-icon mb-16">
          {{ result.passed ? "✅" : "❌" }}
        </div>

        <h1 class="title-large mb-8">{{ result.passed ? "Успешно!" : "Не пройдено" }}</h1>
        <p class="body-medium text-secondary mb-20">{{ assessment?.title }}</p>
      </div>

      <!-- Results Summary -->
      <div class="card card-large mb-12">
        <div class="results-summary">
          <div class="score-section mb-12">
            <div class="score-circle" :class="{ passed: result.passed }">
              <span class="score-value">{{ result.score }}%</span>
            </div>
            <div class="score-info">
              <div class="score-label">Ваш результат</div>
              <div class="threshold-info">Порог прохождения: {{ assessment?.threshold }}%</div>
            </div>
          </div>

          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-label">Правильных ответов</div>
              <div class="stat-value">{{ result.correctAnswers }} из {{ result.totalQuestions }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Время прохождения</div>
              <div class="stat-value">{{ result.timeSpent }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Попытка</div>
              <div class="stat-value">{{ result.attemptNumber }} из {{ assessment?.maxAttempts }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Questions Review -->
      <div class="card mb-16">
        <h3 class="title-small mb-16">Обзор ответов</h3>

        <div class="questions-list">
          <div v-for="(question, index) in result.questions" :key="question.id" class="question-review">
            <div class="question-number">
              <span class="number">{{ index + 1 }}</span>
              <div class="result-indicator" :class="{ correct: question.isCorrect }">
                {{ question.isCorrect ? "✓" : "✗" }}
              </div>
            </div>
            <div class="question-summary">
              <div class="question-text">{{ question.text }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="results-actions">
        <button v-if="canRetake" class="btn btn-secondary btn-full mb-12" @click="retakeAssessment">
          Пройти снова ({{ remainingAttempts }} {{ pluralizeAttempts(remainingAttempts) }})
        </button>

        <router-link to="/assessments" class="btn btn-primary btn-full mb-12"> Вернуться к аттестациям </router-link>

        <router-link to="/dashboard" class="btn btn-secondary btn-full"> На главную </router-link>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useTelegramStore } from "../stores/telegram";
import { useUserStore } from "../stores/user";
import { apiClient } from "../services/apiClient";

export default {
  name: "AssessmentResultsView",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const telegramStore = useTelegramStore();
    const userStore = useUserStore();

    const assessment = ref(null);
    const result = ref({});
    const isLoading = ref(false);
    const summaryItem = ref(null);

    const canRetake = computed(() => {
      if (!assessment.value) {
        return false;
      }
      const attemptsLeft = (assessment.value.maxAttempts || 1) - (result.value.attemptNumber || 0);
      return attemptsLeft > 0 && assessment.value.status === "open";
    });

    const remainingAttempts = computed(() => {
      if (!assessment.value || result.value.attemptNumber == null) {
        return 0;
      }
      const remaining = (assessment.value.maxAttempts || 1) - result.value.attemptNumber;
      return remaining > 0 ? remaining : 0;
    });

    function pluralizeAttempts(count) {
      if (count === 1) return "попытка";
      if (count >= 2 && count <= 4) return "попытки";
      return "попыток";
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
                `Аттестация завершена преждевременно.\n\nРезультат: 0%\nПопытка засчитана.\n\nОсталось попыток: ${remainingAttempts.value}`
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
      pluralizeAttempts,
      retakeAssessment,
      isLoading,
    };
  },
};
</script>

<style scoped>
.results-header {
  text-align: center;
  padding-top: 16px;
  margin-bottom: 16px;
}

.result-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.results-summary {
  text-align: center;
}

.score-section {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

.score-circle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background-color: var(--error);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.score-circle.passed {
  background-color: var(--success);
}

.score-value {
  font-size: 14px;
  font-weight: 700;
  color: white;
}

.score-info {
  text-align: left;
}

.score-label {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.threshold-info {
  font-size: 14px;
  color: var(--text-secondary);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.stat-item {
  text-align: center;
  padding: 16px 12px;
  background-color: var(--bg-primary);
  border-radius: 12px;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--accent-blue);
}

.questions-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.question-review {
  display: flex;
  gap: 16px;
  padding: 16px;
  background-color: var(--bg-primary);
  border-radius: 12px;
}

.question-number {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-width: 40px;
}

.number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: var(--divider);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

.result-indicator {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: var(--error);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

.result-indicator.correct {
  background-color: var(--success);
}

.question-summary {
  flex: 1;
}

.question-text {
  font-weight: 600;
  margin-bottom: 8px;
  font-size: 14px;
  line-height: 1.4;
}

.text-secondary {
  color: var(--text-secondary);
}

@media (max-width: 480px) {
  .score-section {
    flex-direction: column;
    gap: 16px;
  }

  .score-info {
    text-align: center;
  }

  .stats-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .question-review {
    gap: 12px;
  }

  .question-number {
    min-width: 32px;
  }
}
</style>

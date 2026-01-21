<template>
  <div class="assessment-user-progress">
    <Preloader v-if="loading" />

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <Button @click="goBack">Вернуться к деталям</Button>
    </div>

    <div v-else-if="data" class="progress-content">
      <div class="page-header">
        <Button variant="ghost" icon="arrow-left" @click="goBack"> Назад </Button>
        <div>
          <h1 class="page-title">{{ data.user.first_name }} {{ data.user.last_name }}</h1>
          <p class="page-subtitle">{{ data.assessment.title }}</p>
        </div>
      </div>

      <div class="summary-grid">
        <Card class="summary-card">
          <div class="summary-label">Статус</div>
          <div class="summary-value">{{ getStatusLabel(data.selectedAttempt?.status) }}</div>
        </Card>
        <Card class="summary-card">
          <div class="summary-label">Результат</div>
          <div class="summary-value">{{ formatScore(data.selectedAttempt?.score_percent) }}</div>
        </Card>
        <Card class="summary-card">
          <div class="summary-label">Правильных</div>
          <div class="summary-value">{{ formatCorrect(data.selectedAttempt) }}</div>
        </Card>
        <Card class="summary-card">
          <div class="summary-label">Время теста</div>
          <div class="summary-value">{{ formatDuration(data.selectedAttempt?.time_spent_seconds) }}</div>
        </Card>
        <Card class="summary-card">
          <div class="summary-label">Время теории</div>
          <div class="summary-value">{{ formatDuration(data.theory?.time_spent_seconds) }}</div>
        </Card>
      </div>

      <Card class="attempts-card">
        <div class="attempts-header">
          <h2 class="section-title">Попытки</h2>
          <Select v-model="selectedAttemptId" :options="attemptOptions" placeholder="Выберите попытку" @update:modelValue="handleAttemptChange" />
        </div>

        <div v-if="data.attempts.length === 0" class="empty-state">
          <p>Нет попыток</p>
        </div>
        <table v-else class="data-table">
          <thead>
            <tr>
              <th>№</th>
              <th>Статус</th>
              <th>Баллы</th>
              <th>Правильных</th>
              <th>Начало</th>
              <th>Завершение</th>
              <th>Время</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="attempt in data.attempts" :key="attempt.id" :class="{ active: attempt.id === Number(selectedAttemptId) }">
              <td>{{ attempt.attempt_number }}</td>
              <td>{{ getStatusLabel(attempt.status) }}</td>
              <td>{{ formatScore(attempt.score_percent) }}</td>
              <td>{{ formatCorrect(attempt) }}</td>
              <td>{{ formatDate(attempt.started_at) }}</td>
              <td>{{ formatDate(attempt.completed_at) }}</td>
              <td>{{ formatDuration(attempt.time_spent_seconds) }}</td>
            </tr>
          </tbody>
        </table>
      </Card>

      <div class="questions-section">
        <h2 class="section-title">Ответы пользователя</h2>

        <div v-if="data.questions.length === 0" class="empty-state">
          <p>Нет ответов для выбранной попытки</p>
        </div>

        <Card v-for="(question, index) in data.questions" :key="question.id" class="question-card">
          <div class="question-header">
            <h3>Вопрос {{ index + 1 }}</h3>
            <Badge :variant="getQuestionBadgeVariant(question)" size="sm">{{ getQuestionBadgeLabel(question) }}</Badge>
          </div>

          <p class="question-text">{{ question.question_text }}</p>

          <div v-if="question.question_type === 'text'" class="text-answer">
            <div class="answer-row">
              <span class="answer-label">Ответ пользователя:</span>
              <span class="answer-value">{{ question.selectedTextAnswer || "—" }}</span>
            </div>
            <div class="answer-row">
              <span class="answer-label">Правильный ответ:</span>
              <span class="answer-value">{{ question.correct_text_answer || "—" }}</span>
            </div>
          </div>

          <div v-else-if="question.question_type === 'matching'" class="matching-answer">
            <table class="matching-table">
              <thead>
                <tr>
                  <th>Левая колонка</th>
                  <th>Ответ пользователя</th>
                  <th>Правильный ответ</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in getMatchingRows(question)" :key="row.key">
                  <td>{{ row.left }}</td>
                  <td>{{ row.selectedRight }}</td>
                  <td>{{ row.correctRight }}</td>
                  <td>
                    <span v-if="row.hasAnswer" :class="row.isCorrect ? 'success-text' : 'danger-text'">
                      {{ row.isCorrect ? "Верно" : "Неверно" }}
                    </span>
                    <span v-else class="muted">Нет ответа</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-else class="options-list">
            <div v-for="option in question.options" :key="option.id" class="option-item" :class="getOptionClass(question, option)">
              <span class="option-marker" v-if="getOptionLabelType(question, option) === 'correct'">✓</span>
              <span class="option-marker" v-else-if="getOptionLabelType(question, option) === 'wrong'">✕</span>
              <span class="option-text">{{ option.option_text }}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getAssessmentUserProgress } from "../api/assessments";
import Card from "../components/ui/Card.vue";
import Button from "../components/ui/Button.vue";
import Preloader from "../components/ui/Preloader.vue";
import Select from "../components/ui/Select.vue";
import Badge from "../components/ui/Badge.vue";

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const error = ref(null);
const data = ref(null);
const selectedAttemptId = ref("");
const fallbackApplied = ref(false);

const attemptOptions = computed(() =>
  (data.value?.attempts || []).map((attempt) => ({
    value: String(attempt.id),
    label: `Попытка ${attempt.attempt_number} • ${getStatusLabel(attempt.status)} • ${formatDate(attempt.started_at)}`,
  })),
);

const getBestAttempt = (attempts = []) => {
  const completed = attempts.filter((attempt) => attempt.status === "completed");
  return completed.reduce((best, current) => {
    if (!best) {
      return current;
    }
    const bestScore = Number(best.score_percent ?? -1);
    const currentScore = Number(current.score_percent ?? -1);
    if (currentScore > bestScore) {
      return current;
    }
    if (currentScore === bestScore) {
      const bestCompleted = best.completed_at ? new Date(best.completed_at).getTime() : 0;
      const currentCompleted = current.completed_at ? new Date(current.completed_at).getTime() : 0;
      return currentCompleted > bestCompleted ? current : best;
    }
    return best;
  }, null);
};

const loadProgress = async (attemptId = null) => {
  loading.value = true;
  error.value = null;
  try {
    const assessmentId = Number(route.params.id);
    const userId = Number(route.params.userId);
    const normalizedAttemptId = Number.isFinite(attemptId) ? attemptId : null;
    const response = await getAssessmentUserProgress(assessmentId, userId, normalizedAttemptId);
    data.value = response;
    if (response.selectedAttempt?.id) {
      selectedAttemptId.value = String(response.selectedAttempt.id);
    } else {
      selectedAttemptId.value = "";
    }
    if (!normalizedAttemptId && !fallbackApplied.value) {
      const bestAttempt = getBestAttempt(response.attempts || []);
      if (bestAttempt && response.selectedAttempt?.status !== "completed") {
        fallbackApplied.value = true;
        await loadProgress(bestAttempt.id);
        return;
      }
    }
  } catch (err) {
    console.error("Load user progress error:", err);
    error.value = err.response?.data?.error || "Ошибка загрузки прогресса пользователя";
  } finally {
    loading.value = false;
  }
};

const handleAttemptChange = (value) => {
  const attemptId = value ? Number(value) : null;
  fallbackApplied.value = true;
  if (!Number.isFinite(attemptId)) {
    return;
  }
  loadProgress(attemptId);
};

const goBack = () => {
  router.push(`/assessments/${route.params.id}`);
};

const getStatusLabel = (status) => {
  if (!status) return "—";
  const labels = {
    completed: "Завершён",
    in_progress: "В процессе",
    cancelled: "Отменён",
    not_started: "Не начат",
  };
  return labels[status] || status;
};

const formatDate = (dateString) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDuration = (seconds) => {
  if (seconds == null) return "—";
  const value = Number(seconds);
  if (Number.isNaN(value)) return "—";
  const mins = Math.floor(value / 60);
  const secs = value % 60;
  return `${mins}м ${secs}с`;
};

const formatScore = (score) => {
  if (score == null) return "—";
  const value = Number(score);
  if (Number.isNaN(value)) return "—";
  return `${value.toFixed(1)}%`;
};

const formatCorrect = (attempt) => {
  if (!attempt || attempt.correct_answers == null || attempt.total_questions == null) {
    return "—";
  }
  return `${attempt.correct_answers}/${attempt.total_questions}`;
};

const getCorrectPairs = (question) => {
  if (!question.options || question.options.length === 0) return [];
  return question.options
    .filter((option) => option.match_text)
    .map((option) => ({
      key: `${option.id}-correct`,
      left: option.option_text,
      right: option.match_text,
    }));
};

const getSelectedPairs = (question) => {
  if (question.selectedMatchPairs && typeof question.selectedMatchPairs === "object") {
    const optionMap = new Map((question.options || []).map((opt) => [opt.id, opt]));
    return Object.entries(question.selectedMatchPairs).map(([leftId, rightId]) => {
      const leftOption = optionMap.get(Number(leftId));
      const rightOption = optionMap.get(Number(rightId));
      return {
        key: `${leftId}-${rightId}`,
        left: leftOption?.option_text || "—",
        right: rightOption?.match_text || rightOption?.option_text || "—",
      };
    });
  }

  if (Array.isArray(question.selectedOptionIds) && question.selectedOptionIds.length) {
    const optionMap = new Map((question.options || []).map((opt) => [opt.id, opt.option_text]));
    return question.selectedOptionIds.map((id) => ({
      key: String(id),
      left: optionMap.get(id) || "—",
      right: "—",
    }));
  }

  return [];
};

const getOptionLabel = (question, optionId) => {
  const option = (question.options || []).find((opt) => opt.id === optionId);
  return option ? option.option_text : "—";
};

const isOptionSelected = (question, optionId) => {
  if (question.selectedOptionId === optionId) {
    return true;
  }
  if (Array.isArray(question.selectedOptionIds)) {
    return question.selectedOptionIds.includes(optionId);
  }
  return false;
};

const getOptionLabelType = (question, option) => {
  const isSelected = isOptionSelected(question, option.id);
  const isCorrect = option.is_correct;

  if (isSelected && isCorrect) {
    return "correct";
  }
  if (isSelected && !isCorrect) {
    return "wrong";
  }
  if (!isSelected && isCorrect && question.isCorrect === false) {
    return "correct";
  }
  return null;
};

const getOptionStatusText = (question, option) => {
  const type = getOptionLabelType(question, option);
  if (type === "correct") {
    return "Верно";
  }
  if (type === "wrong") {
    return "Неверно";
  }
  return "";
};

const getOptionClass = (question, option) => {
  const type = getOptionLabelType(question, option);
  if (type === "correct") {
    return "option-correct";
  }
  if (type === "wrong") {
    return "option-wrong";
  }
  return "";
};

const getMatchingRows = (question) => {
  const optionMap = new Map((question.options || []).map((opt) => [opt.id, opt]));
  return (question.options || []).map((option) => {
    const selectedRightId = question.selectedMatchPairs ? Number(question.selectedMatchPairs[option.id]) : null;
    const selectedOption = selectedRightId ? optionMap.get(selectedRightId) : null;
    const selectedRight = selectedOption?.match_text || selectedOption?.option_text || "—";
    const correctRight = option.match_text || "—";
    const hasAnswer = Number.isInteger(selectedRightId) && selectedRightId > 0;
    const isCorrect = hasAnswer ? selectedRightId === option.id : false;

    return {
      key: option.id,
      left: option.option_text,
      selectedRight,
      correctRight,
      hasAnswer,
      isCorrect,
    };
  });
};

const getQuestionBadgeLabel = (question) => {
  if (question.isCorrect === null) {
    return "Нет ответа";
  }
  return question.isCorrect ? "Верно" : "Неверно";
};

const getQuestionBadgeVariant = (question) => {
  if (question.isCorrect === null) {
    return "secondary";
  }
  return question.isCorrect ? "success" : "danger";
};

onMounted(() => {
  loadProgress();
});
</script>

<style scoped>
.assessment-user-progress {
  width: 100%;
}

.progress-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.page-subtitle {
  color: var(--text-secondary);
  margin: 4px 0 0;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

.summary-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.summary-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.attempts-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.section-title {
  margin: 0;
  font-size: 20px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  text-align: left;
  padding: 12px;
  border-bottom: 1px solid var(--divider);
}

.data-table tr.active {
  background: var(--bg-secondary);
}

.questions-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.question-text {
  font-size: 16px;
  margin: 0 0 16px;
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-item {
  padding: 10px 12px;
  border: 1px solid var(--divider);
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.option-correct {
  border-color: var(--accent-green);
  background: rgba(16, 185, 129, 0.08);
}

.option-marker {
  color: var(--accent-green);
}

.option-wrong .option-marker {
  color: #ef4444;
}

.option-text {
  flex: 1;
}

.option-wrong {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
}

.danger-text {
  color: #ef4444;
  font-weight: 600;
}

.text-answer {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.answer-row {
  display: flex;
  gap: 12px;
}

.answer-label {
  color: var(--text-secondary);
  min-width: 160px;
}

.success-text {
  color: var(--accent-green);
  font-weight: 600;
}

.matching-answer {
  display: grid;
  gap: 16px;
}

.matching-table {
  width: 100%;
  border-collapse: collapse;
}

.matching-table th,
.matching-table td {
  text-align: left;
  padding: 10px 12px;
  border-bottom: 1px solid var(--divider);
}

.matching-column h4 {
  margin: 0 0 8px;
}

.pair-row {
  padding: 6px 0;
  border-bottom: 1px solid var(--divider);
}

.muted {
  color: var(--text-secondary);
}

.empty-state {
  padding: 24px;
  text-align: center;
  color: var(--text-secondary);
}

.error-state {
  padding: 48px 24px;
  text-align: center;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .attempts-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>

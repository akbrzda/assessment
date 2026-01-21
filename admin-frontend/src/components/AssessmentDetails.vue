<template>
  <div class="assessment-details">
    <Preloader v-if="loading" />

    <div v-else-if="details" class="details-content">
      <!-- Заголовок с действиями -->
      <div class="details-header">
        <div>
          <h2 class="details-title">{{ details.assessment.title }}</h2>
          <p class="details-subtitle">{{ details.assessment.description || "Нет описания" }}</p>
        </div>
        <div class="details-actions">
          <Button v-if="canEditAssessment" icon="pencil" variant="primary" @click="goToEdit"> Редактировать </Button>
          <Button icon="book-open" variant="secondary" @click="openTheory"> Теория </Button>
          <Button icon="file-chart-column" variant="secondary" @click="handleExport"> Экспорт в Excel </Button>
        </div>
      </div>

      <!-- Информация об аттестации -->
      <Card padding="md">
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">
              <Icon name="calendar-clock" size="18" />
              Открытие
            </div>
            <div class="info-value">{{ formatDate(details.assessment.open_at) }}</div>
          </div>

          <div class="info-item">
            <div class="info-label">
              <Icon name="calendar-x" size="18" />
              Закрытие
            </div>
            <div class="info-value">{{ formatDate(details.assessment.close_at) }}</div>
          </div>

          <div class="info-item">
            <div class="info-label">
              <Icon name="clock" size="18" />
              Время на прохождение
            </div>
            <div class="info-value">{{ details.assessment.time_limit_minutes }} мин</div>
          </div>

          <div class="info-item">
            <div class="info-label">
              <Icon name="target" size="18" />
              Порог прохождения
            </div>
            <div class="info-value">{{ details.assessment.pass_score_percent }}%</div>
          </div>

          <div class="info-item">
            <div class="info-label">
              <Icon name="rotate-cw" size="18" />
              Максимум попыток
            </div>
            <div class="info-value">{{ details.assessment.max_attempts }}</div>
          </div>

          <div class="info-item">
            <div class="info-label">
              <Icon name="layers" size="18" />
              Всего вопросов
            </div>
            <div class="info-value">{{ details.questions.length }}</div>
          </div>
        </div>

        <!-- Доступно для -->
        <div v-if="details.accessibility" class="accessibility-section">
          <h3 class="accessibility-title">
            <Icon name="users" size="20" />
            Доступно для:
          </h3>

          <div class="accessibility-content">
            <div v-if="details.accessibility.branches?.length" class="accessibility-group">
              <div class="accessibility-label">
                <Icon name="building" size="16" />
                Филиалы ({{ details.accessibility.branches.length }}):
              </div>
              <div class="accessibility-tags">
                <Badge v-for="branch in details.accessibility.branches" :key="branch.id" variant="primary" size="md">
                  {{ formatBranchLabel(branch) }}
                </Badge>
              </div>
            </div>

            <div v-if="details.accessibility.positions?.length" class="accessibility-group">
              <div class="accessibility-label">
                <Icon name="briefcase" size="16" />
                Должности ({{ details.accessibility.positions.length }}):
              </div>
              <div class="accessibility-tags">
                <Badge v-for="position in details.accessibility.positions" :key="position.id" variant="info" size="md">
                  {{ position.name }}
                </Badge>
              </div>
            </div>

            <div v-if="details.accessibility.users?.length" class="accessibility-group">
              <div class="accessibility-label">
                <Icon name="user" size="16" />
                Сотрудники ({{ details.accessibility.users.length }}):
              </div>
              <div class="accessibility-tags">
                <Badge v-for="user in details.accessibility.users" :key="user.id" variant="success" size="md">
                  {{ user.first_name }} {{ user.last_name }}
                </Badge>
              </div>
            </div>

            <div
              v-if="!details.accessibility.branches?.length && !details.accessibility.positions?.length && !details.accessibility.users?.length"
              class="accessibility-empty"
            >
              Нет назначений
            </div>
          </div>
        </div>
      </Card>

      <!-- Статистика -->
      <div class="stats-grid">
        <Card class="stat-card">
          <div class="stat-icon">
            <Icon name="users" size="40" />
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.total_assigned }}</div>
            <div class="stat-label">Назначено</div>
          </div>
        </Card>

        <Card class="stat-card">
          <div class="stat-icon"><Icon name="square-check" size="40" /></div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.completed_count }}</div>
            <div class="stat-label">Завершено</div>
          </div>
        </Card>

        <Card class="stat-card">
          <div class="stat-icon">
            <Icon name="chart-line" size="40" />
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatAvgScore(stats.avg_score) }}</div>
            <div class="stat-label">Средний балл</div>
          </div>
        </Card>

        <Card class="stat-card">
          <div class="stat-icon">
            <Icon name="user-check" size="40" />
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.passed_count }}</div>
            <div class="stat-label">Прошли</div>
          </div>
        </Card>

        <Card class="stat-card">
          <div class="stat-icon">
            <Icon name="book-open-check" size="40" />
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.theory_completed_count }}</div>
            <div class="stat-label">Прошли теорию</div>
          </div>
        </Card>

        <Card class="stat-card">
          <div class="stat-icon">
            <Icon name="clock" size="40" />
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatTheoryTime(stats.avg_theory_time_seconds) }}</div>
            <div class="stat-label">Среднее время теории</div>
          </div>
        </Card>
      </div>

      <!-- Вкладки -->
      <div class="tabs-container">
        <div class="tabs">
          <button :class="{ active: activeTab === 'participants' }" @click="activeTab = 'participants'" class="tab-button">
            Участники ({{ details.participants.length }})
          </button>
          <button :class="{ active: activeTab === 'questions' }" @click="activeTab = 'questions'" class="tab-button">
            Вопросы ({{ details.questions.length }})
          </button>
        </div>
      </div>

      <!-- Участники -->
      <Card v-if="activeTab === 'participants'" padding="none">
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Участник</th>
                <th>Филиал</th>
                <th>Должность</th>
                <th>Статус</th>
                <th>Результат</th>
                <th>Правильных</th>
                <th>Время теста</th>
                <th>Время теории</th>
                <th>Дата</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="participant in details.participants" :key="participant.id">
                <td class="participant-name">{{ participant.first_name }} {{ participant.last_name }}</td>
                <td>{{ participant.branch_name || "—" }}</td>
                <td>{{ participant.position_name || "—" }}</td>
                <td>
                  <Badge :variant="getStatusVariant(participant.attempt_status)" size="sm">
                    {{ getStatusLabel(participant.attempt_status) }}
                  </Badge>
                </td>
                <td>
                  <span
                    v-if="hasParticipantScore(participant.score_percent)"
                    class="score-value"
                    :class="getParticipantScoreClass(participant.score_percent, details.assessment.pass_score_percent)"
                  >
                    {{ formatParticipantScore(participant.score_percent) }}
                  </span>
                  <span v-else class="score-empty">—</span>
                </td>
                <td>
                  {{ participant.correct_answers !== null ? `${participant.correct_answers}/${participant.total_questions}` : "—" }}
                </td>
                <td>
                  {{ formatDuration(participant.time_spent_seconds) }}
                </td>
                <td>
                  <span v-if="participant.theory_time_seconds" class="theory-time">
                    {{ formatDuration(participant.theory_time_seconds) }}
                  </span>
                  <span v-else class="score-empty">—</span>
                </td>
                <td class="date-cell">
                  {{ formatDate(participant.completed_at || participant.started_at) }}
                </td>
                <td class="actions-cell">
                  <Button size="sm" variant="ghost" icon="user" @click="openUserProgress(participant.id)">Прогресс</Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="details.participants.length === 0" class="empty-state">
          <p>Нет назначенных участников</p>
        </div>
      </Card>

      <!-- Вопросы со статистикой -->
      <div v-if="activeTab === 'questions'" class="questions-section">
        <div v-if="details.questions.length === 0" class="empty-state">
          <p>Нет вопросов</p>
        </div>

        <Card v-for="(question, index) in details.questions" :key="question.id" class="question-card" padding="md">
          <div class="question-header">
            <h3 class="question-number">Вопрос {{ index + 1 }}</h3>
          </div>

          <p class="question-text">{{ question.question_text }}</p>

          <div v-if="question.question_type === 'text'" class="correct-answer">
            <strong>Эталонный ответ:</strong> {{ question.correct_text_answer || "—" }}
          </div>

          <div v-else-if="question.question_type === 'matching'" class="matching-answers">
            <h4>Правильные пары</h4>
            <div v-if="getCorrectPairs(question).length === 0" class="score-empty">—</div>
            <div v-for="pair in getCorrectPairs(question)" :key="pair.key" class="pair-row">
              {{ pair.left }} — {{ pair.right }}
            </div>
          </div>

          <div v-else class="options-list">
            <div v-for="option in question.options" :key="option.id" class="option-item" :class="{ 'option-correct': option.is_correct }">
              <div class="option-text">
                <span v-if="option.is_correct" class="correct-marker">✓</span>
                {{ option.option_text }}
              </div>
              <div class="option-stats">
                <span class="selection-count"> {{ getSelectionCount(question.answerStats, option.id) }} выборов </span>
                <div class="option-bar">
                  <div class="option-bar-fill" :style="{ width: getSelectionPercentage(question.answerStats, option.id) + '%' }"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="user-answers">
            <h4>Ответы пользователей</h4>
            <div v-if="!question.userAnswers || question.userAnswers.length === 0" class="score-empty">Нет ответов</div>
            <table v-else class="answers-table">
              <thead>
                <tr>
                  <th>Пользователь</th>
                  <th>Ответ</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(answer, aIndex) in question.userAnswers" :key="`${answer.user.id}-${aIndex}`">
                  <td>{{ answer.user.first_name }} {{ answer.user.last_name }}</td>
                  <td>{{ formatUserAnswer(question, answer) }}</td>
                  <td>
                    <Badge :variant="getAnswerStatusVariant(answer)" size="sm">{{ getAnswerStatusLabel(answer) }}</Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>

    <div v-else class="empty-state">
      <p>Не удалось загрузить детали аттестации</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { getAssessmentDetails, exportAssessmentToExcel } from "../api/assessments";
import Card from "./ui/Card.vue";
import Button from "./ui/Button.vue";
import Badge from "./ui/Badge.vue";
import Preloader from "./ui/Preloader.vue";
import Icon from "./ui/Icon.vue";
import { useToast } from "../composables/useToast";
import { formatBranchLabel } from "../utils/branch";

const props = defineProps({
  assessmentId: {
    type: Number,
    required: true,
  },
});

const loading = ref(false);
const details = ref(null);
const activeTab = ref("participants");
const { showToast } = useToast();
const router = useRouter();

const stats = computed(() => {
  const statsData = details.value?.stats || {};
  return {
    total_assigned: statsData.total_assigned || 0,
    completed_count: statsData.completed_count || 0,
    in_progress_count: statsData.in_progress_count || 0,
    not_started_count: statsData.not_started_count || 0,
    avg_score: statsData.avg_score,
    min_score: statsData.min_score,
    max_score: statsData.max_score,
    passed_count: statsData.passed_count || 0,
    avg_theory_time_seconds: statsData.avg_theory_time_seconds || 0,
    theory_completed_count: statsData.theory_completed_count || 0,
  };
});

const canEditAssessment = computed(() => Boolean(details.value?.assessment));

const loadDetails = async () => {
  loading.value = true;
  try {
    const data = await getAssessmentDetails(props.assessmentId);
    details.value = data;
  } catch (error) {
    console.error("Load assessment details error:", error);
    showToast("Ошибка загрузки детализации", "error");
  } finally {
    loading.value = false;
  }
};

const handleExport = async () => {
  try {
    await exportAssessmentToExcel(props.assessmentId);
  } catch (error) {
    console.error("Export error:", error);
    showToast("Ошибка экспорта", "error");
  }
};

const openTheory = () => {
  router.push({ name: "AssessmentTheory", params: { id: props.assessmentId } });
};

const openUserProgress = (userId) => {
  router.push({ name: "AssessmentUserProgress", params: { id: props.assessmentId, userId } });
};

const goToEdit = () => {
  router.push({ name: "EditAssessment", params: { id: props.assessmentId } });
};

const getStatusLabel = (status) => {
  if (!status) return "Не начат";
  const labels = {
    completed: "Завершён",
    in_progress: "В процессе",
    not_started: "Не начат",
  };
  return labels[status] || status;
};

const getStatusVariant = (status) => {
  if (!status) return "default";
  const variants = {
    completed: "success",
    in_progress: "warning",
    not_started: "default",
  };
  return variants[status] || "default";
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
  if (!seconds) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}м ${secs}с`;
};

const formatTheoryTime = (seconds) => {
  if (!seconds || seconds === 0) return "—";
  const mins = Math.floor(seconds / 60);
  if (mins < 1) {
    return `${Math.round(seconds)}с`;
  }
  return `${mins}м`;
};

const toNumber = (value) => {
  const numeric = Number(value);
  return Number.isNaN(numeric) ? null : numeric;
};

const formatAvgScore = (score) => {
  const numeric = toNumber(score);
  if (numeric === null) {
    return "—";
  }
  return `${numeric.toFixed(1)}%`;
};

const hasParticipantScore = (score) => toNumber(score) !== null;

const formatParticipantScore = (score) => {
  const numeric = toNumber(score);
  if (numeric === null) {
    return "—";
  }
  return `${numeric.toFixed(1)}%`;
};

const getParticipantScoreClass = (score, passScore) => {
  const numeric = toNumber(score);
  const threshold = toNumber(passScore);
  if (numeric === null || threshold === null) {
    return {};
  }
  return {
    "score-success": numeric >= threshold,
    "score-fail": numeric < threshold,
  };
};

const getSelectionCount = (stats, optionId) => {
  if (!Array.isArray(stats)) return 0;
  const stat = stats.find((item) => item.option_id === optionId);
  return stat ? stat.selection_count : 0;
};

const getSelectionPercentage = (stats, optionId) => {
  if (!stats || !Array.isArray(stats)) return 0;
  const total = stats.reduce((sum, s) => sum + s.selection_count, 0);
  if (total === 0) return 0;
  const count = getSelectionCount(stats, optionId);
  return ((count / total) * 100).toFixed(1);
};

const getCorrectPairs = (question) => {
  if (!question?.options) return [];
  return question.options
    .filter((option) => option.match_text)
    .map((option) => ({
      key: `${option.id}-correct`,
      left: option.option_text,
      right: option.match_text,
    }));
};

const getOptionText = (question, optionId, useMatchText = false) => {
  const option = (question.options || []).find((item) => item.id === optionId);
  if (!option) {
    return "—";
  }
  if (useMatchText && option.match_text) {
    return option.match_text;
  }
  return option.option_text;
};

const formatMatchingPairs = (question, pairs) => {
  if (!pairs || typeof pairs !== "object") {
    return "—";
  }
  const entries = Object.entries(pairs);
  if (!entries.length) {
    return "—";
  }
  return entries
    .map(
      ([leftId, rightId]) =>
        `${getOptionText(question, Number(leftId))} — ${getOptionText(question, Number(rightId), true)}`
    )
    .join("; ");
};

const formatUserAnswer = (question, answer) => {
  if (!answer) return "—";
  if (question.question_type === "text") {
    return answer.selectedTextAnswer || "—";
  }
  if (question.question_type === "matching") {
    return formatMatchingPairs(question, answer.selectedMatchPairs);
  }
  if (Array.isArray(answer.selectedOptionIds) && answer.selectedOptionIds.length > 0) {
    return answer.selectedOptionIds.map((id) => getOptionText(question, id)).join(", ");
  }
  if (answer.selectedOptionId) {
    return getOptionText(question, answer.selectedOptionId);
  }
  return "—";
};

const getAnswerStatusLabel = (answer) => {
  if (answer.isCorrect === null || answer.isCorrect === undefined) {
    return "Нет ответа";
  }
  return answer.isCorrect ? "Верно" : "Неверно";
};

const getAnswerStatusVariant = (answer) => {
  if (answer.isCorrect === null || answer.isCorrect === undefined) {
    return "secondary";
  }
  return answer.isCorrect ? "success" : "danger";
};

onMounted(() => {
  loadDetails();
});
</script>

<style scoped>
.assessment-details {
  width: 100%;
}

.details-content {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* Header */
.details-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 32px;
}

.details-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.details-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.details-subtitle {
  font-size: 15px;
  color: var(--text-secondary);
  margin: 0;
}

/* Info Grid */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.info-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

/* Accessibility Section */
.accessibility-section {
  margin-top: 32px;
  padding-top: 32px;
  border-top: 1px solid var(--divider);
}

.accessibility-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 24px 0;
}

.accessibility-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.accessibility-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.accessibility-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
}

.accessibility-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.accessibility-empty {
  padding: 24px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  transition: transform 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-icon {
  font-size: 40px;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
}

/* Tabs */
.tabs-container {
  border-bottom: 2px solid var(--divider);
}

.tabs {
  display: flex;
  gap: 16px;
}

.tab-button {
  padding: 12px 24px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 500;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.tab-button:hover {
  color: var(--text-primary);
}

.tab-button.active {
  color: var(--accent-blue);
  border-bottom-color: var(--accent-blue);
}

/* Table */
.table-wrapper {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table thead {
  border-bottom: 1px solid var(--divider);
}

.data-table th {
  padding: 16px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.data-table tbody tr {
  border-bottom: 1px solid var(--divider);
  transition: background 0.2s;
}

.data-table td {
  padding: 16px;
  font-size: 15px;
  color: var(--text-primary);
}

.participant-name {
  font-weight: 600;
}

.score-value {
  font-weight: 700;
}

.score-success {
  color: var(--accent-green);
}

.score-fail {
  color: var(--accent-red);
}

.score-empty {
  color: var(--text-secondary);
}

.date-cell {
  color: var(--text-secondary);
  font-size: 14px;
}

/* Questions */
.questions-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.correct-answer {
  margin: 12px 0;
  color: var(--text-primary);
}

.matching-answers {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 12px 0;
}

.pair-row {
  color: var(--text-primary);
}

.user-answers {
  margin-top: 16px;
}

.answers-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 8px;
}

.answers-table th,
.answers-table td {
  text-align: left;
  padding: 10px 12px;
  border-bottom: 1px solid var(--divider);
}

.question-header {
  margin-bottom: 16px;
}

.question-number {
  font-size: 16px;
  font-weight: 600;
  color: var(--accent-blue);
  margin: 0;
}

.question-text {
  font-size: 17px;
  font-weight: 500;
  color: var(--text-primary);
  margin: 0 0 24px 0;
  line-height: 1.6;
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-item {
  padding: 12px;
  border: 1px solid var(--divider);
  border-radius: 8px;
  background: var(--bg-secondary);
  transition: all 0.2s;
}

.option-item.option-correct {
  border-color: var(--accent-green);
  background: #34c75914;
}

.option-text {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.correct-marker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--accent-green);
  color: white;
  font-size: 12px;
  font-weight: 700;
}

.option-stats {
  display: flex;
  align-items: center;
  gap: 16px;
}

.selection-count {
  font-size: 14px;
  color: var(--text-secondary);
  min-width: 100px;
}

.option-bar {
  flex: 1;
  height: 8px;
  background: var(--divider);
  border-radius: 4px;
  overflow: hidden;
}

.option-bar-fill {
  height: 100%;
  background: var(--accent-blue);
  transition: width 0.3s ease;
}

.option-item.option-correct .option-bar-fill {
  background: var(--accent-green);
}

.empty-state {
  padding: 64px 32px;
  text-align: center;
  color: var(--text-secondary);
}

.empty-state p {
  margin: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .details-header {
    flex-direction: column;
    align-items: stretch;
  }

  .info-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .accessibility-section {
    margin-top: 24px;
    padding-top: 24px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .tabs {
    flex-direction: column;
    gap: 8px;
  }

  .tab-button {
    border-bottom: none;
    border-left: 2px solid transparent;
    margin-bottom: 0;
    margin-left: -2px;
    text-align: left;
  }

  .tab-button.active {
    border-bottom-color: transparent;
    border-left-color: var(--accent-blue);
  }

  .table-wrapper {
    overflow-x: scroll;
  }
}
</style>

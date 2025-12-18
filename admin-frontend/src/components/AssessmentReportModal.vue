<template>
  <Modal v-model="isOpen" title="Отчёт по аттестации" size="xl" @close="handleClose">
    <Preloader v-if="loading" />
    <div v-else-if="report" class="report-content">
      <!-- Основная информация -->
      <div class="card-wrapper mb-4">
        <h3 class="card-title">{{ report.assessment.title }}</h3>
        <div class="stats-grid-4">
          <div class="stat-item">
            <div class="stat-label">Всего участников</div>
            <div class="stat-value">{{ report.summary.total_participants }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Завершили</div>
            <div class="stat-value">{{ report.summary.completed_count }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Средний балл</div>
            <div class="stat-value score-blue">{{ report.summary.avg_score ? report.summary.avg_score.toFixed(2) : 0 }}%</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Процент успеха</div>
            <div class="stat-value score-green">{{ report.summary.pass_percent }}%</div>
          </div>
        </div>
      </div>

      <!-- Участники -->
      <div class="card-wrapper mb-4">
        <h4 class="card-section-title">Участники</h4>
        <div class="table-wrapper">
          <table class="report-table">
            <thead>
              <tr>
                <th>№</th>
                <th>Сотрудник</th>
                <th>Филиал</th>
                <th>Должность</th>
                <th>Балл</th>
                <th>Статус</th>
                <th>Время</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(participant, index) in report.participants" :key="participant.id">
                <td>{{ index + 1 }}</td>
                <td class="text-bold">{{ participant.first_name }} {{ participant.last_name }}</td>
                <td>{{ participant.branch_name || "—" }}</td>
                <td>{{ participant.position_name || "—" }}</td>
                <td>
                  <span :class="getScoreClass(participant.score, report.assessment.pass_score_percent)">
                    {{ participant.score !== null ? participant.score.toFixed(2) : "—" }}%
                  </span>
                </td>
                <td>
                  <span :class="getStatusClass(participant.status)">
                    {{ getStatusText(participant.status) }}
                  </span>
                </td>
                <td>{{ formatDuration(participant.duration_seconds) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Статистика по вопросам -->
      <div class="card-wrapper">
        <h4 class="card-section-title">Статистика по вопросам</h4>
        <div class="table-wrapper">
          <table class="report-table">
            <thead>
              <tr>
                <th style="width: 60px">№</th>
                <th>Вопрос</th>
                <th style="width: 120px">Всего ответов</th>
                <th style="width: 140px">Правильных</th>
                <th style="width: 100px">% правильных</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(question, index) in report.questionStats" :key="question.id">
                <td>{{ index + 1 }}</td>
                <td class="text-left">{{ question.question_text }}</td>
                <td>{{ question.total_answers }}</td>
                <td>{{ question.correct_answers }}</td>
                <td>
                  <span :class="getCorrectPercentClass(question.correct_percent)"> {{ question.correct_percent }}% </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <template #footer>
      <button @click="handleExport" class="btn-primary">Экспорт в PDF</button>
      <button @click="handleClose" class="btn-secondary">Закрыть</button>
    </template>
  </Modal>
</template>

<script setup>
import { ref, watch } from "vue";
import { getAssessmentReport } from "../api/analytics";
import Modal from "./ui/Modal.vue";
import Preloader from "./ui/Preloader.vue";
import { useToast } from "../composables/useToast";

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  assessmentId: {
    type: [Number, String],
    default: null,
  },
});

const emit = defineEmits(["update:modelValue", "close"]);

const isOpen = ref(props.modelValue);
const loading = ref(false);
const report = ref(null);
const { showToast } = useToast();

watch(
  () => props.modelValue,
  (newVal) => {
    isOpen.value = newVal;
    if (newVal && props.assessmentId) {
      loadReport();
    }
  }
);

watch(isOpen, (newVal) => {
  emit("update:modelValue", newVal);
});

const loadReport = async () => {
  if (!props.assessmentId) return;

  loading.value = true;
  try {
    report.value = await getAssessmentReport(props.assessmentId);
  } catch (error) {
    console.error("Load assessment report error:", error);
    showToast("Ошибка загрузки отчёта", "error");
  } finally {
    loading.value = false;
  }
};

const handleClose = () => {
  isOpen.value = false;
  emit("close");
};

const handleExport = () => {
  if (!report.value) return;

  const rows = report.value.participants
    .map(
      (participant, index) =>
        `${index + 1}. ${participant.first_name} ${participant.last_name} — ${participant.branch_name || "—"} — ${participant.position_name || "—"} — ${
          participant.score !== null ? `${participant.score.toFixed(2)}%` : "—"
        } (${getStatusText(participant.status)})`
    )
    .join("\n");

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Отчёт по аттестации</title>
      </head>
      <body>
        <h1>${report.value.assessment.title}</h1>
        <p>Участников: ${report.value.summary.total_participants}</p>
        <p>Завершили: ${report.value.summary.completed_count}</p>
        <p>Средний балл: ${report.value.summary.avg_score?.toFixed(2) ?? 0}%</p>
        <p>Процент успеха: ${report.value.summary.pass_percent}%</p>
        <pre style="white-space: pre-wrap; font-family: 'Inter', Arial, sans-serif; margin-top: 16px;">${rows}</pre>
      </body>
    </html>
  `;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `assessment_report_${report.value.assessment.id || "export"}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const getScoreClass = (score, passScore) => {
  if (score === null) return "";
  if (score >= passScore) return "score-green";
  return "score-red";
};

const getStatusClass = (status) => {
  if (status === "completed") return "badge badge-success";
  if (status === "in_progress") return "badge badge-warning";
  return "badge badge-secondary";
};

const getStatusText = (status) => {
  const statusMap = {
    completed: "Завершён",
    in_progress: "В процессе",
    not_started: "Не начат",
  };
  return statusMap[status] || status;
};

const getCorrectPercentClass = (percent) => {
  if (percent >= 80) return "score-green";
  if (percent >= 50) return "score-yellow";
  return "score-red";
};

const formatDuration = (seconds) => {
  if (!seconds) return "—";
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}м ${secs}с`;
};
</script>

<style scoped>
.report-content {
  max-height: 70vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card-wrapper {
  padding: 24px;
  background-color: var(--surface-card);
  border: 1px solid var(--divider);
  border-radius: 12px;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 16px 0;
}

.card-section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 16px 0;
}

.stats-grid-4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.stat-item {
  text-align: center;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--divider);
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  text-transform: uppercase;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
}

.score-blue {
  color: var(--accent-blue);
  font-weight: 700;
}

.score-green {
  color: var(--accent-green);
  font-weight: 600;
}

.score-yellow {
  color: var(--accent-orange);
  font-weight: 600;
}

.score-red {
  color: #d4183d;
  font-weight: 600;
}

.table-wrapper {
  overflow-x: auto;
}

.report-table {
  width: 100%;
  border-collapse: collapse;
}

.report-table thead tr {
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--divider);
}

.report-table th {
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  font-size: 12px;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.report-table td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--divider);
  font-size: 14px;
  color: var(--text-primary);
  text-align: center;
}

.report-table tbody tr:last-child td {
  border-bottom: none;
}

.text-bold {
  font-weight: 600;
}

.text-left {
  text-align: left;
}

.badge {
  display: inline-block;
  padding: 5.6px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.badge-success {
  background: var(--accent-green-soft);
  color: var(--accent-green);
}

.badge-warning {
  background: var(--accent-orange-soft);
  color: var(--accent-orange);
}

.badge-secondary {
  background: var(--bg-secondary);
  color: var(--text-secondary);
}

.btn-primary,
.btn-secondary {
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  border: none;
  transition: all 0.15s ease;
}

.btn-primary {
  background-color: var(--accent-blue);
  color: white;
}

.btn-primary:hover {
  background-color: var(--accent-blue-hover);
}

.btn-secondary {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--divider);
}

.btn-secondary:hover {
  background-color: var(--divider);
}

@media (max-width: 1024px) {
  .stats-grid-4 {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .stats-grid-4 {
    grid-template-columns: 1fr;
  }

  .report-table th,
  .report-table td {
    padding: 8px 12px;
    font-size: 12px;
  }
}
</style>

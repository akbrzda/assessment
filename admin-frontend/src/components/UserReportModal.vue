<template>
  <Modal v-model="isOpen" title="Отчёт по сотруднику" size="xl" @close="handleClose">
    <Preloader v-if="loading" />
    <div v-else-if="report" class="report-content">
      <div class="card-wrapper mb-4">
        <div class="user-header">
          <img v-if="report.user.avatar_url" :src="report.user.avatar_url" alt="Avatar" class="avatar" />
          <div class="avatar-placeholder" v-else>{{ getInitials(report.user.first_name, report.user.last_name) }}</div>
          <div class="user-info">
            <h3 class="user-name">{{ report.user.first_name }} {{ report.user.last_name }}</h3>
            <div class="user-meta">{{ report.user.position_name }} • {{ report.user.branch_name }}</div>
          </div>
        </div>

        <div class="stats-grid-4">
          <div class="stat-item">
            <div class="stat-label">Всего попыток</div>
            <div class="stat-value">{{ report.stats.total_attempts || 0 }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Средний балл</div>
            <div class="stat-value score-blue">{{ formatPercent(report.stats.avg_score, 2) }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Максимальный балл</div>
            <div class="stat-value score-green">{{ formatPercent(report.stats.max_score, 2) }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Пройдено</div>
            <div class="stat-value score-green">{{ report.stats.passed_count || 0 }}</div>
          </div>
        </div>
      </div>

      <!-- Сравнение с коллегами -->
      <div class="card-wrapper mb-4">
        <h4 class="card-section-title">Сравнение с коллегами</h4>
        <div class="comparison-content">
          <div class="comparison-item">
            <div class="comparison-label">Средний балл сотрудника</div>
            <div class="comparison-bar">
              <div class="comparison-bar-fill user" :style="{ width: `${getPercentWidth(report.stats.avg_score)}%` }"></div>
              <span class="comparison-value">{{ formatPercent(report.stats.avg_score, 2) }}</span>
            </div>
          </div>
          <div class="comparison-item">
            <div class="comparison-label">Средний балл коллег ({{ report.user.position_name }})</div>
            <div class="comparison-bar">
              <div class="comparison-bar-fill peers" :style="{ width: `${getPercentWidth(report.comparison.avg_score_peers)}%` }"></div>
              <span class="comparison-value">{{ formatPercent(report.comparison.avg_score_peers, 2) }}</span>
            </div>
          </div>
          <div class="comparison-peers-count">Всего коллег с той же должностью: {{ report.comparison.total_peers || 0 }}</div>
        </div>
      </div>

      <!-- Динамика результатов -->
      <div class="card-wrapper mb-4">
        <h4 class="card-section-title">Динамика результатов</h4>
        <div class="chart-container" style="height: 250px">
          <LineChart v-if="report.trends && report.trends.length > 0" :data="report.trends" labelKey="date" valueKey="avg_score" color="#3b82f6cc" />
          <div v-else class="empty-state">Нет данных о динамике</div>
        </div>
      </div>

      <!-- История аттестаций -->
      <div class="card-wrapper">
        <h4 class="card-section-title">История аттестаций</h4>
        <div class="table-wrapper">
          <table class="report-table">
            <thead>
              <tr>
                <th>№</th>
                <th>Аттестация</th>
                <th>Балл</th>
                <th>Статус</th>
                <th>Дата</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="report.attempts.length === 0">
                <td colspan="5" class="text-center">Нет данных</td>
              </tr>
              <tr v-for="(attempt, index) in report.attempts" :key="attempt.assessment_id">
                <td>{{ index + 1 }}</td>
                <td class="text-left">{{ attempt.assessment_title }}</td>
                <td>
                  <span :class="getScoreClass(attempt.score_percent)">{{ formatPercent(attempt.score_percent, 2) }}</span>
                </td>
                <td>
                  <span :class="attempt.status === 'Пройдено' ? 'badge badge-success' : 'badge badge-danger'">
                    {{ attempt.status }}
                  </span>
                </td>
                <td>{{ formatDate(attempt.completed_at) }}</td>
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
import { getUserReport } from "../api/analytics";
import Modal from "./ui/Modal.vue";
import Preloader from "./ui/Preloader.vue";
import LineChart from "./charts/LineChart.vue";
import { useToast } from "../composables/useToast";

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  userId: {
    type: [Number, String],
    default: null,
  },
  filters: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(["update:modelValue", "close"]);

const isOpen = ref(props.modelValue);
const loading = ref(false);
const report = ref(null);
const { showToast } = useToast();

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const numeric = Number(value);
  return Number.isNaN(numeric) ? null : numeric;
};

const formatPercent = (value, decimals = 1) => {
  const numeric = toNumber(value);
  if (numeric === null) {
    return "0%";
  }
  return `${numeric.toFixed(decimals)}%`;
};

const getPercentWidth = (value) => {
  const numeric = toNumber(value);
  if (numeric === null) {
    return 0;
  }
  if (numeric < 0) return 0;
  if (numeric > 100) return 100;
  return numeric;
};

watch(
  () => props.modelValue,
  (newVal) => {
    isOpen.value = newVal;
    if (newVal && props.userId) {
      loadReport();
    }
  }
);

watch(isOpen, (newVal) => {
  emit("update:modelValue", newVal);
});

const loadReport = async () => {
  if (!props.userId) return;

  loading.value = true;
  try {
    const data = await getUserReport(props.userId, props.filters);
    report.value = normalizeReport(data);
  } catch (error) {
    console.error("Load user report error:", error);
    showToast("Ошибка загрузки отчёта", "error");
  } finally {
    loading.value = false;
  }
};

const handleClose = () => {
  isOpen.value = false;
  emit("close");
};

const normalizeReport = (data) => {
  if (!data) return null;
  const normalizedStats = {
    total_attempts: data.stats?.total_attempts ?? 0,
    avg_score: toNumber(data.stats?.avg_score),
    max_score: toNumber(data.stats?.max_score),
    min_score: toNumber(data.stats?.min_score),
    passed_count: data.stats?.passed_count ?? 0,
  };

  const normalizedComparison = {
    avg_score_peers: toNumber(data.comparison?.avg_score_peers),
    total_peers: data.comparison?.total_peers ?? 0,
  };

  const normalizedAttempts = (data.attempts || []).map((attempt) => ({
    ...attempt,
    score_percent: toNumber(attempt.score_percent),
  }));

  const normalizedTrends = (data.trends || []).map((trend) => ({
    ...trend,
    avg_score: toNumber(trend.avg_score),
  }));

  return {
    ...data,
    stats: normalizedStats,
    comparison: normalizedComparison,
    attempts: normalizedAttempts,
    trends: normalizedTrends,
  };
};

const handleExport = () => {
  if (!report.value) return;

  const content = [
    `Имя: ${report.value.user.first_name} ${report.value.user.last_name}`,
    `Должность: ${report.value.user.position_name || "—"}`,
    `Филиал: ${report.value.user.branch_name || "—"}`,
    `Всего попыток: ${report.value.stats.total_attempts}`,
    `Средний балл: ${formatPercent(report.value.stats.avg_score, 2)}`,
    "",
    "История аттестаций:",
    ...report.value.attempts.map(
      (attempt, index) =>
        `${index + 1}. ${attempt.assessment_title} — ${formatPercent(attempt.score_percent, 2)} (${attempt.status}) ${formatDate(attempt.completed_at)}`
    ),
  ].join("\n");

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Отчёт по сотруднику</title>
      </head>
      <body>
        <pre style="font-family: 'Inter', Arial, sans-serif; white-space: pre-wrap;">${content}</pre>
      </body>
    </html>
  `;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `user_report_${report.value.user.id || "export"}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const getInitials = (firstName, lastName) => {
  return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
};

const getScoreClass = (score) => {
  const numeric = toNumber(score);
  if (numeric === null) return "score-red";
  if (numeric >= 80) return "score-green";
  if (numeric >= 50) return "score-yellow";
  return "score-red";
};

const formatDate = (dateString) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return date.toLocaleDateString("ru-RU");
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

.card-section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 16px 0;
}

.user-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.avatar-placeholder {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-purple) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
}

.user-info {
  flex: 1;
}

.user-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 4px 0;
}

.user-meta {
  font-size: 14px;
  color: var(--text-secondary);
}

.stats-grid-4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-top: 16px;
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
}

.score-green {
  color: var(--accent-green);
}

.score-yellow {
  color: var(--accent-orange);
}

.score-red {
  color: #d4183d;
}

.comparison-content {
  padding: 16px 0;
}

.comparison-item {
  margin-bottom: 24px;
}

.comparison-item:last-child {
  margin-bottom: 0;
}

.comparison-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.comparison-bar {
  position: relative;
  height: 40px;
  background: var(--bg-secondary);
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--divider);
}

.comparison-bar-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.comparison-bar-fill.user {
  background: linear-gradient(90deg, var(--accent-blue) 0%, var(--accent-blue-soft) 100%);
}

.comparison-bar-fill.peers {
  background: linear-gradient(90deg, var(--accent-green) 0%, var(--accent-green-soft) 100%);
}

.comparison-value {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-weight: 600;
  color: var(--text-primary);
}

.comparison-peers-count {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 8px;
}

.chart-container {
  padding: 16px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
  font-size: 14px;
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
.text-center {
  text-align: center;
}

.text-left {
  text-align: left;
}

.mb-4 {
  margin-bottom: 16px;
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

.badge-danger {
  background: #fee2e2;
  color: #991b1b;
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

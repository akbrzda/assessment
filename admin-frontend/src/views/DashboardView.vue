<template>
  <div class="dashboard">
    <Preloader v-if="loading" />

    <div v-else class="dashboard-content">
      <div class="filters-section">
        <Card class="filters-card">
          <div class="filters-grid">
            <Select v-model="filters.period" :options="periodOptions" label="Период" @change="handlePeriodChange" />
            <Input v-if="isCustomPeriod" v-model="filters.dateFrom" type="date" label="Дата от" />
            <Input v-if="isCustomPeriod" v-model="filters.dateTo" type="date" label="Дата до" />
            <Select v-model="filters.branchId" :options="branchOptions" label="Филиал" @change="handleBranchChange" />
            <Select v-model="filters.positionId" :options="positionOptions" label="Должность" @change="handlePositionChange" />
          </div>
          <div class="filters-actions">
            <Button variant="secondary" icon="refresh-ccw" @click="handleResetFilters">Сбросить</Button>
            <Button variant="primary" icon="filter" @click="handleApplyFilters">Применить</Button>
            <Button variant="ghost" icon="refresh-cw" :disabled="loading || autoRefreshing" @click="manualRefresh">
              {{ autoRefreshing ? "Автообновление…" : "Обновить" }}
            </Button>
          </div>
        </Card>
        <div v-if="isOffline" class="offline-banner">
          <Icon name="wifi-off" size="18" />
          <span>Нет подключения к сети. Показаны последние загруженные данные.</span>
        </div>
      </div>

      <!-- Карточки основных метрик -->
      <div class="metrics-grid">
        <Card class="metric-card" @click="navigateToAssessments">
          <div class="metric-content">
            <div class="metric-icon admin-metric-icon admin-metric-icon--blue"><Icon name="ClipboardList" size="32" aria-hidden="true" /></div>
            <div class="metric-info">
              <p class="metric-label">Активные аттестации</p>
              <p class="metric-value">{{ metrics.activeAssessments }}</p>
            </div>
          </div>
        </Card>

        <Card class="metric-card">
          <div class="metric-content">
            <div class="metric-icon admin-metric-icon admin-metric-icon--green"><Icon name="Users" size="32" aria-hidden="true" /></div>
            <div class="metric-info">
              <p class="metric-label">Всего сотрудников</p>
              <p class="metric-value">{{ metrics.totalUsers }}</p>
            </div>
          </div>
        </Card>

        <Card class="metric-card">
          <div class="metric-content">
            <div class="metric-icon admin-metric-icon admin-metric-icon--purple"><Icon name="Building2" size="32" aria-hidden="true" /></div>
            <div class="metric-info">
              <p class="metric-label">Филиалы</p>
              <p class="metric-value">{{ metrics.totalBranches }}</p>
            </div>
          </div>
        </Card>

        <Card class="metric-card">
          <div class="metric-content">
            <div class="metric-icon admin-metric-icon admin-metric-icon--orange"><Icon name="briefcase-business" size="32" aria-hidden="true" /></div>
            <div class="metric-info">
              <p class="metric-label">Должности</p>
              <p class="metric-value">{{ metrics.totalPositions }}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Дельта KPI к предыдущему периоду" icon="TrendingUp" class="kpi-delta-card">
        <div class="kpi-delta-grid admin-card-grid admin-card-grid--min-180">
          <div v-for="item in kpiDeltas" :key="item.key" class="kpi-delta-item admin-data-card">
            <p class="kpi-delta-label">{{ item.label }}</p>
            <p class="kpi-delta-value">{{ item.value }}</p>
            <p class="kpi-delta-change" :class="getDeltaClass(item.percent)">
              {{ formatDeltaPercent(item.percent) }}
            </p>
          </div>
        </div>
      </Card>

      <Card title="Причины провалов" icon="AlertTriangle" class="failure-reasons-card">
        <div class="failure-reasons-grid admin-card-grid">
          <div class="failure-reason-item admin-data-card">
            <div class="failure-reason-head">
              <p class="failure-reason-label">Таймаут</p>
              <p class="failure-reason-value">{{ failureReasons.timeout.count }} ({{ failureReasons.timeout.percent.toFixed(1) }}%)</p>
            </div>
            <div class="failure-reason-bar">
              <div class="failure-reason-fill timeout" :style="{ width: `${failureReasons.timeout.percent}%` }"></div>
            </div>
          </div>
          <div class="failure-reason-item admin-data-card">
            <div class="failure-reason-head">
              <p class="failure-reason-label">Неверные ответы</p>
              <p class="failure-reason-value">{{ failureReasons.wrongAnswers.count }} ({{ failureReasons.wrongAnswers.percent.toFixed(1) }}%)</p>
            </div>
            <div class="failure-reason-bar">
              <div class="failure-reason-fill wrong" :style="{ width: `${failureReasons.wrongAnswers.percent}%` }"></div>
            </div>
          </div>
        </div>
        <p class="failure-reason-total">Всего провалов: {{ failureReasons.totalFailed }}</p>
      </Card>
      <!-- Топ-3 сотрудников -->
      <Card title="Топ-3 сотрудников по очкам" icon="Trophy" class="top-users-card">
        <div v-if="metrics.topUsers && metrics.topUsers.length > 0" class="top-users-list">
          <div v-for="(user, index) in metrics.topUsers" :key="user.id" class="top-user-item">
            <div class="top-user-info">
              <span class="medal">{{ getMedalEmoji(index) }}</span>
              <div class="user-details">
                <p class="user-name">{{ user.first_name }} {{ user.last_name }}</p>
                <p class="user-meta">{{ user.position_name }} • {{ user.branch_name }}</p>
              </div>
            </div>
            <div class="user-stats">
              <Badge variant="primary" size="lg">{{ user.points }} очков</Badge>
              <span class="user-level">Уровень {{ user.level }}</span>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">
          <p>Нет данных о сотрудниках</p>
        </div>
      </Card>
      <!-- Первая строка: Успешность, Топ сотрудников, График активности -->
      <div class="dashboard-row-three">
        <!-- Средняя успешность -->
        <Card title="Средний процент успешности" icon="ChartPie" class="success-rate-card">
          <div class="success-rate-content">
            <div class="success-rate-value">{{ formatScore(metrics.avgSuccessRate) }}%</div>
            <p class="success-rate-label">Взвешенная средняя по всем филиалам</p>
          </div>
        </Card>
        <!-- Динамика активности -->
        <Card title="Динамика активности" icon="ChartLine" class="activity-chart-card">
          <div v-if="activityData && activityData.length > 0" class="chart-container">
            <LineChart :data="activityData" :datasets="activityDatasets" labelKey="date" :height="250" />
          </div>
          <div v-else class="chart-empty">
            <p>Нет данных</p>
          </div>
        </Card>
      </div>

      <!-- Вторая строка: Статистика аттестаций -->
      <Card title="Статистика аттестаций" icon="ChartBar" class="stats-card">
        <div class="stats-grid">
          <div class="stat-item">
            <p class="stat-label">Всего попыток</p>
            <p class="stat-value">{{ metrics.assessmentStats?.total_attempts || 0 }}</p>
          </div>
          <div class="stat-item">
            <p class="stat-label">Завершено</p>
            <p class="stat-value">{{ metrics.assessmentStats?.completed_attempts || 0 }}</p>
          </div>
          <div class="stat-item">
            <p class="stat-label">Средний балл</p>
            <p class="stat-value">{{ formatScore(metrics.assessmentStats?.avg_score) }}%</p>
          </div>
          <div class="stat-item">
            <p class="stat-label">Уникальных пользователей</p>
            <p class="stat-value">{{ metrics.assessmentStats?.unique_users || 0 }}</p>
          </div>
        </div>
      </Card>

      <!-- Третья строка: KPI филиалов -->
      <div class="dashboard-row-full">
        <!-- KPI филиалов -->
        <Card title="KPI филиалов" icon="Building2" class="branch-kpi-card">
          <div v-if="branchKPI && branchKPI.length > 0" class="branch-kpi-list">
            <div v-for="branch in sortedBranchKPI" :key="branch.id" class="branch-kpi-item">
              <div class="branch-header">
                <div class="branch-info">
                  <h4 class="branch-name">{{ branch.branch_name }}</h4>
                  <p class="branch-city">{{ branch.city }}</p>
                </div>
                <div :class="['branch-score', getScoreClass(branch.success_rate)]">{{ formatScore(branch.success_rate) }}%</div>
              </div>

              <div class="branch-stats">
                <div class="branch-stat">
                  <span class="stat-label">Попыток:</span>
                  <span class="stat-value">{{ branch.completed_attempts || 0 }}</span>
                </div>
                <div class="branch-stat">
                  <span class="stat-label">Отлично:</span>
                  <span class="stat-value success">{{ branch.excellent_count || 0 }}</span>
                </div>
                <div class="branch-stat">
                  <span class="stat-label">Удовл.:</span>
                  <span class="stat-value warning">{{ branch.good_count || 0 }}</span>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <p>Нет данных по филиалам</p>
          </div>
        </Card>
      </div>

      <!-- Четвертая строка: Активность по аттестациям -->
      <div class="dashboard-row-full">
        <!-- Активность по аттестациям -->
        <Card title="Активность по аттестациям" icon="Activity" class="activities-card">
          <div v-if="latestActivities && latestActivities.length > 0" class="activities-list">
            <div v-for="activity in latestActivities" :key="activity.id" class="activity-item">
              <div class="activity-content">
                <p class="activity-text">
                  <strong>{{ activity.user_name }}</strong>
                  {{ activity.activity_type }}
                </p>
                <p class="activity-meta">{{ activity.assessment_name }}</p>
              </div>
              <p class="activity-time">{{ formatTime(activity.created_at) }}</p>
            </div>
          </div>
          <div v-else class="empty-state">
            <p>Нет активности</p>
          </div>
        </Card>
      </div>

      <div class="dashboard-row-full">
        <Card title="Наблюдаемость API" icon="Radar" class="observability-card">
          <div class="observability-grid admin-card-grid admin-card-grid--min-180">
            <div class="observability-item admin-data-card">
              <p class="observability-label">API p95</p>
              <p class="observability-value">{{ Number(observability.api.p95LatencyMs || 0).toFixed(2) }} ms</p>
            </div>
            <div class="observability-item admin-data-card">
              <p class="observability-label">Очередь геймификации</p>
              <p class="observability-value">{{ formatQueueDepth(observability.queue.depth) }}</p>
            </div>
            <div class="observability-item admin-data-card">
              <p class="observability-label">Ошибки scoring</p>
              <p class="observability-value">{{ observability.scoring.errorsTotal || 0 }}</p>
            </div>
            <div class="observability-item admin-data-card">
              <p class="observability-label">Redis</p>
              <p class="observability-value">{{ observability.redis.status || "unknown" }}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import dashboardApi from "../api/dashboard";
import { getReferences } from "../api/users";
import { useToast } from "../composables/useToast";
import Preloader from "../components/ui/Preloader.vue";
import Card from "../components/ui/Card.vue";
import Badge from "../components/ui/Badge.vue";
import LineChart from "../components/charts/LineChart.vue";
import Icon from "../components/ui/Icon.vue";
import Button from "../components/ui/Button.vue";
import Select from "../components/ui/Select.vue";
import Input from "../components/ui/Input.vue";
import { formatBranchLabel } from "../utils/branch";

const router = useRouter();
const authStore = useAuthStore();
const { showToast } = useToast();

const loading = ref(true);
const autoRefreshing = ref(false);
const isOffline = ref(typeof navigator !== "undefined" ? !navigator.onLine : false);

const filters = ref({
  period: "week",
  dateFrom: "",
  dateTo: "",
  branchId: "",
  positionId: "",
});

const references = ref({
  branches: [],
  positions: [],
});

const metrics = ref({
  activeAssessments: 0,
  totalUsers: 0,
  totalBranches: 0,
  totalPositions: 0,
  avgSuccessRate: 0,
  topUsers: [],
  assessmentStats: {},
});

const activityData = ref([]);
const branchKPI = ref([]);
const latestActivities = ref([]);
const observability = ref({
  api: { p95LatencyMs: 0 },
  queue: { depth: null },
  scoring: { errorsTotal: 0 },
  redis: { status: "unknown" },
});
const failureReasons = ref({
  totalFailed: 0,
  timeout: { count: 0, percent: 0 },
  wrongAnswers: { count: 0, percent: 0 },
});

const REFRESH_INTERVAL = 300000; // 5 минут
let refreshTimer = null;

const sortedBranchKPI = computed(() => [...branchKPI.value].sort((a, b) => (b.success_rate || 0) - (a.success_rate || 0)));
const kpiDeltas = computed(() => [
  {
    key: "activeAssessments",
    label: "Активные аттестации",
    value: String(metrics.value.activeAssessments || 0),
    percent: toNumber(metrics.value.activeAssessmentsTrend?.percent),
  },
  {
    key: "totalUsers",
    label: "Всего сотрудников",
    value: String(metrics.value.totalUsers || 0),
    percent: toNumber(metrics.value.totalUsersTrend?.percent),
  },
  {
    key: "attempts",
    label: "Всего попыток",
    value: String(metrics.value.assessmentStats?.total_attempts || 0),
    percent: toNumber(metrics.value.assessmentStats?.trends?.attempts?.percent),
  },
  {
    key: "completed",
    label: "Завершено попыток",
    value: String(metrics.value.assessmentStats?.completed_attempts || 0),
    percent: toNumber(metrics.value.assessmentStats?.trends?.completed?.percent),
  },
  {
    key: "avgScore",
    label: "Средний балл",
    value: `${formatScore(metrics.value.assessmentStats?.avg_score)}%`,
    percent: toNumber(metrics.value.assessmentStats?.trends?.avgScore?.percent),
  },
]);

const toNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const activityDatasets = computed(() => {
  if (!activityData.value.length) return [];

  return [
    {
      label: "Начато",
      data: activityData.value.map((d) => d.started_count || 0),
      borderColor: "#36a2ebcc",
      backgroundColor: "#36a2eb1a",
      tension: 0.3,
    },
    {
      label: "Завершено",
      data: activityData.value.map((d) => d.completed_count || 0),
      borderColor: "#4bc0c0cc",
      backgroundColor: "#4bc0c01a",
      tension: 0.3,
    },
    {
      label: "Всего попыток",
      data: activityData.value.map((d) => d.total_attempts || 0),
      borderColor: "#ff9f40cc",
      backgroundColor: "#ff9f401a",
      tension: 0.3,
    },
  ];
});

const branchOptions = computed(() => [
  { value: "", label: "Все филиалы" },
  ...references.value.branches.map((branch) => ({ value: String(branch.id), label: formatBranchLabel(branch) })),
]);

const positionOptions = computed(() => [
  { value: "", label: "Все должности" },
  ...references.value.positions.map((position) => ({ value: String(position.id), label: position.name })),
]);

const periodOptions = [
  { value: "week", label: "Неделя" },
  { value: "month", label: "Месяц" },
  { value: "quarter", label: "Квартал" },
  { value: "custom", label: "Произвольный период" },
];

const isCustomPeriod = computed(() => filters.value.period === "custom");

const buildParams = () => {
  const params = {
    period: filters.value.period,
  };

  if (isCustomPeriod.value) {
    if (filters.value.dateFrom) {
      params.date_from = filters.value.dateFrom;
    }
    if (filters.value.dateTo) {
      params.date_to = filters.value.dateTo;
    }
  }

  if (filters.value.branchId) {
    params.branch_id = filters.value.branchId;
  }

  if (filters.value.positionId) {
    params.position_id = filters.value.positionId;
  }

  return params;
};

const loadReferences = async () => {
  try {
    const data = await getReferences();
    references.value = {
      branches: data.branches || [],
      positions: data.positions || [],
    };
  } catch (error) {
    console.error("Load references error:", error);
  }
};

const fetchMetrics = async (params) => {
  const { data } = await dashboardApi.getMetrics(params);
  metrics.value = data;
};

const fetchBranchKPI = async (params) => {
  const { data } = await dashboardApi.getBranchKPI(params);
  branchKPI.value = data.branchKPI || [];
};

const fetchActivityTrends = async (params) => {
  const { data } = await dashboardApi.getActivityTrends(params);
  activityData.value = (data.dailyActivity || []).map((d) => ({
    ...d,
    date: formatDateLabel(d.date),
  }));
};

const fetchLatestAssessmentActivities = async (params) => {
  const { data } = await dashboardApi.getLatestAssessmentActivities({ ...params, limit: 5 });
  latestActivities.value = data.latestActivities || [];
};

const fetchObservability = async () => {
  const { data } = await dashboardApi.getObservability();
  observability.value = {
    api: data.api || { p95LatencyMs: 0 },
    queue: data.queue || { depth: null },
    scoring: data.scoring || { errorsTotal: 0 },
    redis: data.redis || { status: "unknown" },
  };
};

const resolveDateRange = (params) => {
  const now = new Date();
  const result = {
    dateFrom: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    dateTo: now,
  };

  if (params.period === "month") {
    result.dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return result;
  }

  if (params.period === "quarter") {
    result.dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    return result;
  }

  if (params.period === "custom" && params.date_from && params.date_to) {
    result.dateFrom = new Date(`${params.date_from}T00:00:00.000Z`);
    result.dateTo = new Date(`${params.date_to}T23:59:59.999Z`);
  }

  return result;
};

const fetchFailureReasons = async (params) => {
  const { dateFrom, dateTo } = resolveDateRange(params);
  const requestParams = {
    dateFrom: dateFrom.toISOString(),
    dateTo: dateTo.toISOString(),
  };

  if (params.branch_id) {
    requestParams.branchId = params.branch_id;
  }

  const { data } = await dashboardApi.getFailureReasons(requestParams);
  failureReasons.value = {
    totalFailed: Number(data?.totalFailed || 0),
    timeout: {
      count: Number(data?.timeout?.count || 0),
      percent: toNumber(data?.timeout?.percent),
    },
    wrongAnswers: {
      count: Number(data?.wrongAnswers?.count || 0),
      percent: toNumber(data?.wrongAnswers?.percent),
    },
  };
};

const loadAllData = async ({ silent = false } = {}) => {
  const params = buildParams();

  if (params.period === "custom" && (!params.date_from || !params.date_to)) {
    if (!silent) {
      showToast("Укажите начало и конец периода", "warning");
    }
    return;
  }

  if (!silent) {
    loading.value = true;
  }

  try {
    await Promise.all([
      fetchMetrics(params),
      fetchActivityTrends(params),
      fetchBranchKPI(params),
      fetchLatestAssessmentActivities(params),
      fetchObservability(),
      fetchFailureReasons(params),
    ]);
  } catch (error) {
    console.error("Dashboard load error:", error);
    showToast("Не удалось загрузить данные дашборда", "error");
  } finally {
    if (!silent) {
      loading.value = false;
    }
  }
};

const startAutoRefresh = () => {
  stopAutoRefresh();
  refreshTimer = setInterval(async () => {
    if (isOffline.value) return;
    autoRefreshing.value = true;
    await loadAllData({ silent: true });
    autoRefreshing.value = false;
  }, REFRESH_INTERVAL);
};

const stopAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
};

const handleApplyFilters = async () => {
  await loadAllData();
};

const handleResetFilters = async () => {
  filters.value = {
    period: "week",
    dateFrom: "",
    dateTo: "",
    branchId: "",
    positionId: "",
  };
  await loadAllData();
};

const handlePeriodChange = async () => {
  if (!isCustomPeriod.value) {
    filters.value.dateFrom = "";
    filters.value.dateTo = "";
    await loadAllData();
  }
};

const handleBranchChange = async () => {
  if (isCustomPeriod.value && (!filters.value.dateFrom || !filters.value.dateTo)) {
    return;
  }
  await loadAllData();
};

const handlePositionChange = async () => {
  if (isCustomPeriod.value && (!filters.value.dateFrom || !filters.value.dateTo)) {
    return;
  }
  await loadAllData();
};

const manualRefresh = async () => {
  if (loading.value) return;
  await loadAllData();
};

const getScoreClass = (score) => {
  if (score >= 90) return "score-excellent";
  if (score >= 70) return "score-good";
  if (score >= 50) return "score-warning";
  return "score-poor";
};

const formatScore = (score) => {
  if (score == null) return 0;
  return Math.round(score);
};

const formatDateLabel = (dateStr) => {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return dateStr;
  }
  return date.toLocaleDateString("ru-RU", { month: "short", day: "numeric" });
};

const formatTime = (dateStr) => {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (Number.isNaN(diff)) {
    return date.toLocaleString("ru-RU");
  }

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин назад`;
  if (hours < 24) return `${hours} ч назад`;
  if (days < 7) return `${days} дн назад`;

  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatQueueDepth = (value) => {
  if (value == null) {
    return "fallback";
  }
  return String(value);
};

const formatDeltaPercent = (value) => {
  const numeric = toNumber(value);
  if (numeric > 0) return `+${numeric.toFixed(1)}%`;
  if (numeric < 0) return `${numeric.toFixed(1)}%`;
  return "0.0%";
};

const getDeltaClass = (value) => {
  const numeric = toNumber(value);
  if (numeric > 0) return "delta-positive";
  if (numeric < 0) return "delta-negative";
  return "delta-neutral";
};

const navigateToAssessments = () => {
  router.push("/assessments");
};

const getMedalEmoji = (index) => {
  const medals = ["", "", ""];
  return medals[index] || "";
};

const handleOnline = async () => {
  isOffline.value = false;
  showToast("Соединение восстановлено", "success");
  await loadAllData({ silent: true });
};

const handleOffline = () => {
  isOffline.value = true;
  showToast("Нет соединения. Показаны сохранённые данные", "warning");
};

onMounted(async () => {
  await loadReferences();
  await loadAllData();
  startAutoRefresh();

  if (typeof window !== "undefined") {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
  }
});

onBeforeUnmount(() => {
  stopAutoRefresh();
  if (typeof window !== "undefined") {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  }
});
</script>

<style scoped>
.dashboard {
  width: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
  gap: 16px;
  flex-wrap: wrap;
}

.page-heading {
  font-size: 30px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px 0;
}

.page-subtitle {
  font-size: 15px;
  color: var(--text-secondary);
  margin: 0;
}

/* Фильтры */
.quick-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.btn-icon {
  margin-right: 8px;
}

.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.filters-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filters-card {
  padding: 20px;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.filters-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.offline-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(255, 189, 58, 0.12);
  color: #b45309;
  font-size: 14px;
}
.offline-banner :deep(svg) {
  color: inherit;
}

.kpi-delta-grid {
  gap: 12px;
}

.kpi-delta-item {
}

.kpi-delta-label {
  margin: 0 0 6px;
  color: var(--text-secondary);
  font-size: 13px;
}

.kpi-delta-value {
  margin: 0 0 4px;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
}

.kpi-delta-change {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.delta-positive {
  color: #047857;
}

.delta-negative {
  color: #b91c1c;
}

.delta-neutral {
  color: var(--text-secondary);
}

.failure-reasons-grid {
  gap: 12px;
}

.failure-reason-item {
}

.failure-reason-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.failure-reason-label {
  margin: 0;
  font-size: 14px;
  color: var(--text-primary);
}

.failure-reason-value {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
}

.failure-reason-bar {
  width: 100%;
  height: 10px;
  border-radius: 999px;
  background: var(--bg-tertiary, #e5e7eb);
  overflow: hidden;
}

.failure-reason-fill {
  height: 100%;
  border-radius: inherit;
}

.failure-reason-fill.timeout {
  background: #f59e0b;
}

.failure-reason-fill.wrong {
  background: #ef4444;
}

.failure-reason-total {
  margin: 12px 0 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.observability-grid {
  gap: 12px;
}

.observability-item {
}

.observability-label {
  margin: 0 0 6px;
  color: var(--text-secondary);
  font-size: 13px;
}

.observability-value {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

/* Metrics Grid */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 24px;
}

.metric-card {
  display: flex;
  height: 115px;
  align-items: center;
}
.metric-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.metric-icon {
  font-size: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.metric-info {
  flex: 1;
  min-width: 0;
}

.metric-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  margin: 0 0 8px 0;
}

.metric-value {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 4px 0;
  line-height: 1;
}

.metric-value-blue {
  color: var(--accent-blue);
}

.metric-value-green {
  color: var(--accent-green);
}

.metric-value-purple {
  color: var(--accent-purple);
}

.metric-value-orange {
  color: var(--accent-orange);
}

/* Success Rate */

.success-rate-content {
  padding: 32px 0;
  text-align: center;
}

.success-rate-value {
  font-size: 48px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.success-rate-label {
  font-size: 16px;
  color: var(--text-primary);
  margin: 0;
}

/* Dashboard Row Three (Успешность, Топ пользователей, График) */
.dashboard-row-three {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
}

/* Dashboard Row Two (KPI и Активность) */
.dashboard-row-two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
}

/* Dashboard Row Full (Full Width) */
.dashboard-row-full {
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;
}
.branch-kpi-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.branch-kpi-item {
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 12px;
  transition: all 0.2s ease;
}

.branch-kpi-item:hover {
  box-shadow: 0 2px 8px #0000001a;
}

.branch-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.branch-info {
  flex: 1;
}

.branch-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 4px 0;
}

.branch-city {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

.branch-score {
  font-size: 24px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 8px;
}

.score-excellent {
  color: var(--accent-green);
  background: var(--accent-green-soft);
}

.score-good {
  color: var(--accent-blue);
  background: var(--accent-blue-soft);
}

.score-warning {
  color: var(--accent-orange);
  background: var(--accent-orange-soft);
}

.score-poor {
  color: #ef4444;
  background: #ef44441a;
}

.branch-sparkline {
  margin: 12px 0;
}

.branch-stats {
  display: flex;
  justify-content: space-around;
  gap: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.branch-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.branch-stat .stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
}

.branch-stat .stat-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.branch-stat .stat-value.success {
  color: var(--accent-green);
}

.branch-stat .stat-value.warning {
  color: var(--accent-orange);
}

/* Top Users */
.top-users-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.top-user-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background-color: var(--bg-secondary);
  border-radius: 12px;
  transition: all 0.2s ease;
  gap: 16px;
}

.top-user-item:hover {
  background-color: var(--accent-blue-soft);
}

.top-user-info {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  min-width: 0;
}

.medal {
  font-size: 32px;
  flex-shrink: 0;
}

.user-details {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 4px 0;
  font-size: 15px;
}

.user-meta {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-stats {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.user-level {
  font-size: 12px;
  color: var(--text-secondary);
}

/* Stats */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.stat-item {
  text-align: center;
  padding: 24px 16px;
  background-color: var(--bg-secondary);
  border-radius: 12px;
  display: flex;
  justify-content: center;
  flex-direction: column;
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0 0 12px 0;
  font-weight: 500;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  margin: 0;
  line-height: 1;
}

.stat-value-gray {
  color: var(--text-primary);
}

.stat-value-green {
  color: var(--accent-green);
}

.stat-value-blue {
  color: var(--accent-blue);
}

.stat-value-purple {
  color: var(--accent-purple);
}

/* Charts */
.activity-chart-card {
  min-height: auto;
}

.chart-container {
  padding: 16px 0;
}

.chart-empty {
  padding: 48px 16px;
  text-align: center;
}

.chart-empty p {
  color: var(--text-secondary);
  margin: 0;
}

/* Dashboard Grid Three */
.dashboard-grid-three {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
}

/* Latest Activities */
.activities-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 500px;
  overflow-y: auto;
}

.activity-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
  transition: all 0.2s ease;
  gap: 8px;
}

.activity-item:hover {
  background: var(--accent-blue-soft);
}

.activity-content {
  flex: 1;
  min-width: 0;
}

.activity-text {
  font-size: 14px;
  color: var(--text-primary);
  margin: 0 0 4px 0;
  line-height: 1.4;
}

.activity-text strong {
  font-weight: 600;
  color: var(--accent-blue);
}

.activity-meta {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
}

.activity-time {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
  white-space: nowrap;
}

/* Empty State */
.empty-state {
  padding: 32px 16px;
  text-align: center;
}

.empty-state p {
  color: var(--text-secondary);
  margin: 0;
}

/* Responsive */
@media (max-width: 1024px) {
  .dashboard-row-three {
    grid-template-columns: 1fr;
  }

  .dashboard-row-two {
    grid-template-columns: 1fr;
  }

  .combined-activities-content {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .page-heading {
    font-size: 24px;
  }

  .metrics-grid {
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 16px;
  }

  .metric-icon {
    font-size: 32px;
    width: 48px;
    height: 48px;
  }

  .metric-value {
    font-size: 24px;
  }

  .metric-label {
    font-size: 13px;
  }

  .success-rate-value {
    font-size: 32px;
  }

  .dashboard-row-three {
    grid-template-columns: 1fr;
  }

  .dashboard-row-two {
    grid-template-columns: 1fr;
  }

  .top-user-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .user-stats {
    flex-direction: row;
    width: 100%;
    justify-content: space-between;
    align-items: center;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .combined-activities-content {
    grid-template-columns: 1fr;
  }
  .branch-kpi-list {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .metrics-grid {
    grid-template-columns: 1fr;
  }

  .branch-score {
    font-size: 20px;
  }
}
</style>

<template>
  <div class="dashboard">
    <Preloader v-if="loading" />

    <div v-else class="dashboard-content">
      <!-- Карточки основных метрик -->
      <div class="metrics-grid">
        <Card class="metric-card" @click="navigateToAssessments">
          <div class="metric-content">
            <div class="metric-icon metric-icon-blue"><Icon name="ClipboardList" size="32" aria-hidden="true" /></div>
            <div class="metric-info">
              <h3 class="metric-label">Активные аттестации</h3>
              <p class="metric-value">{{ metrics.activeAssessments }}</p>
            </div>
          </div>
        </Card>

        <Card class="metric-card">
          <div class="metric-content">
            <div class="metric-icon metric-icon-green"><Icon name="Users" size="32" aria-hidden="true" /></div>
            <div class="metric-info">
              <h3 class="metric-label">Всего сотрудников</h3>
              <p class="metric-value">{{ metrics.totalUsers }}</p>
            </div>
          </div>
        </Card>

        <Card class="metric-card">
          <div class="metric-content">
            <div class="metric-icon metric-icon-purple"><Icon name="Building2" size="32" aria-hidden="true" /></div>
            <div class="metric-info">
              <h3 class="metric-label">Филиалы</h3>
              <p class="metric-value">{{ metrics.totalBranches }}</p>
            </div>
          </div>
        </Card>

        <Card class="metric-card">
          <div class="metric-content">
            <div class="metric-icon metric-icon-orange"><Icon name="briefcase-business" size="32" aria-hidden="true" /></div>
            <div class="metric-info">
              <h3 class="metric-label">Должности</h3>
              <p class="metric-value">{{ metrics.totalPositions }}</p>
            </div>
          </div>
        </Card>
      </div>
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
    </div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import apiClient from "../utils/axios";
import Preloader from "../components/ui/Preloader.vue";
import Card from "../components/ui/Card.vue";
import Badge from "../components/ui/Badge.vue";
import LineChart from "../components/charts/LineChart.vue";
import Icon from "../components/ui/Icon.vue";

const router = useRouter();
const authStore = useAuthStore();
const loading = ref(true);
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

const sortedBranchKPI = computed(() => {
  return [...branchKPI.value].sort((a, b) => (b.success_rate || 0) - (a.success_rate || 0));
});

const activityDatasets = computed(() => {
  if (!activityData.value || activityData.value.length === 0) return [];

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

// Methods
const fetchMetrics = async () => {
  try {
    loading.value = true;
    const { data } = await apiClient.get("/admin/dashboard/metrics");
    metrics.value = data;
  } catch (error) {
    console.error("Fetch metrics error:", error);
  } finally {
    loading.value = false;
  }
};

const fetchBranchKPI = async () => {
  try {
    const { data } = await apiClient.get("/admin/dashboard/branch-kpi");
    branchKPI.value = data.branchKPI;
  } catch (error) {
    console.error("Fetch branch KPI error:", error);
  }
};

const fetchActivityTrends = async () => {
  try {
    const { data } = await apiClient.get("/admin/dashboard/activity-trends");
    activityData.value = data.dailyActivity.map((d) => ({
      ...d,
      date: formatDateLabel(d.date),
    }));
  } catch (error) {
    console.error("Fetch activity trends error:", error);
  }
};

const fetchLatestActivities = async () => {
  try {
    const { data } = await apiClient.get("/admin/dashboard/latest-assessment-activities", {
      params: { limit: 5 },
    });
    latestActivities.value = data.latestActivities;
  } catch (error) {
    console.error("Fetch latest activities error:", error);
  }
};

const loadAllData = async () => {
  const promises = [fetchMetrics(), fetchActivityTrends(), fetchBranchKPI(), fetchLatestActivities()];

  await Promise.all(promises);
};

const getScoreClass = (score) => {
  if (score >= 90) return "score-excellent";
  if (score >= 70) return "score-good";
  if (score >= 50) return "score-warning";
  return "score-poor";
};

const formatScore = (score) => {
  return score ? Math.round(score) : 0;
};

const formatDateLabel = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ru-RU", { month: "short", day: "numeric" });
};

const formatTime = (dateStr) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

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

const navigateToAssessments = () => {
  router.push("/assessments");
};

const getMedalEmoji = (index) => {
  const medals = ["🥇", "🥈", "🥉"];
  return medals[index] || "🏅";
};

onMounted(async () => {
  await loadAllData();
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
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  flex-shrink: 0;
}

.metric-icon-blue {
  background-color: var(--accent-blue-soft);
}

.metric-icon-green {
  background-color: var(--accent-green-soft);
}

.metric-icon-purple {
  background-color: var(--accent-purple-soft);
}

.metric-icon-orange {
  background-color: var(--accent-orange-soft);
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

<template>
  <div class="dashboard">
    <!-- Заголовок и быстрые действия -->
    <div class="page-header">
      <div>
        <h2 class="page-heading">Dashboard</h2>
        <p class="page-subtitle">Обзор системы аттестаций</p>
      </div>
    </div>

    <Preloader v-if="loading" />

    <div v-else class="dashboard-content">
      <!-- Карточки основных метрик -->
      <div class="metrics-grid">
        <Card class="metric-card" @click="navigateToAssessments">
          <div class="metric-content">
            <div class="metric-icon metric-icon-blue"><Icon name="ClipboardList" size="32" aria-hidden="true" /></div>
            <div class="metric-info">
              <h3 class="metric-label">Активные аттестации</h3>
              <p class="metric-value metric-value-blue">{{ metrics.activeAssessments }}</p>
            </div>
          </div>
        </Card>

        <Card class="metric-card">
          <div class="metric-content">
            <div class="metric-icon metric-icon-green"><Icon name="Users" size="32" aria-hidden="true" /></div>
            <div class="metric-info">
              <h3 class="metric-label">Всего сотрудников</h3>
              <p class="metric-value metric-value-green">{{ metrics.totalUsers }}</p>
            </div>
          </div>
        </Card>

        <Card class="metric-card">
          <div class="metric-content">
            <div class="metric-icon metric-icon-purple"><Icon name="Building2" size="32" aria-hidden="true" /></div>
            <div class="metric-info">
              <h3 class="metric-label">Филиалы</h3>
              <p class="metric-value metric-value-purple">{{ metrics.totalBranches }}</p>
            </div>
          </div>
        </Card>

        <Card class="metric-card">
          <div class="metric-content">
            <div class="metric-icon metric-icon-orange"><Icon name="briefcase-business" size="32" aria-hidden="true" /></div>
            <div class="metric-info">
              <h3 class="metric-label">Должности</h3>
              <p class="metric-value metric-value-orange">{{ metrics.totalPositions }}</p>
            </div>
          </div>
        </Card>
      </div>

      <!-- Первая строка: Успешность, Топ сотрудников, График активности -->
      <div class="dashboard-row-three">
        <!-- Средняя успешность -->
        <Card title="🎯 Средний процент успешности" class="success-rate-card">
          <div class="success-rate-content">
            <div class="success-rate-value">{{ formatScore(metrics.avgSuccessRate) }}%</div>
            <p class="success-rate-label">Взвешенная средняя по всем филиалам</p>
          </div>
        </Card>

        <!-- Топ-3 сотрудников -->
        <Card title="🏆 Топ-3 сотрудников по очкам" class="top-users-card">
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

        <!-- Динамика активности -->
        <Card title="📈 Динамика активности" class="activity-chart-card">
          <div v-if="activityData && activityData.length > 0" class="chart-container">
            <LineChart :data="activityData" :datasets="activityDatasets" labelKey="date" height="250" />
          </div>
          <div v-else class="chart-empty">
            <p>Нет данных</p>
          </div>
        </Card>
      </div>

      <!-- Вторая строка: Статистика аттестаций -->
      <Card title="📊 Статистика аттестаций" class="stats-card">
        <div class="stats-grid">
          <div class="stat-item">
            <p class="stat-label">Всего попыток</p>
            <p class="stat-value stat-value-gray">{{ metrics.assessmentStats?.total_attempts || 0 }}</p>
          </div>
          <div class="stat-item">
            <p class="stat-label">Завершено</p>
            <p class="stat-value stat-value-green">{{ metrics.assessmentStats?.completed_attempts || 0 }}</p>
          </div>
          <div class="stat-item">
            <p class="stat-label">Средний балл</p>
            <p class="stat-value stat-value-blue">{{ formatScore(metrics.assessmentStats?.avg_score) }}%</p>
          </div>
          <div class="stat-item">
            <p class="stat-label">Уникальных пользователей</p>
            <p class="stat-value stat-value-purple">{{ metrics.assessmentStats?.unique_users || 0 }}</p>
          </div>
        </div>
      </Card>

      <!-- Третья строка: KPI филиалов -->
      <div class="dashboard-row-full">
        <!-- KPI филиалов -->
        <Card title="🏢 KPI филиалов" class="branch-kpi-card">
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
        <Card title="⚡ Активность по аттестациям" class="activities-card">
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
      borderColor: "rgba(54, 162, 235, 0.8)",
      backgroundColor: "rgba(54, 162, 235, 0.1)",
      tension: 0.3,
    },
    {
      label: "Завершено",
      data: activityData.value.map((d) => d.completed_count || 0),
      borderColor: "rgba(75, 192, 192, 0.8)",
      backgroundColor: "rgba(75, 192, 192, 0.1)",
      tension: 0.3,
    },
    {
      label: "Всего попыток",
      data: activityData.value.map((d) => d.total_attempts || 0),
      borderColor: "rgba(255, 159, 64, 0.8)",
      backgroundColor: "rgba(255, 159, 64, 0.1)",
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
  margin-bottom: 2rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.page-heading {
  font-size: 1.875rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.25rem 0;
}

.page-subtitle {
  font-size: 0.9375rem;
  color: var(--text-secondary);
  margin: 0;
}

/* Фильтры */
.quick-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.btn-icon {
  margin-right: 0.5rem;
}

.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Metrics Grid */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
}

.metric-card {
  transition: all 0.2s ease;
  cursor: pointer;
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.metric-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.metric-icon {
  font-size: 2.5rem;
  width: 4rem;
  height: 4rem;
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
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin: 0 0 0.5rem 0;
}

.metric-value {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 0.25rem 0;
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
.success-rate-card {
  text-align: center;
}

.success-rate-content {
  padding: 2rem 0;
}

.success-rate-value {
  font-size: 3rem;
  font-weight: 700;
  color: var(--accent-blue);
  margin-bottom: 0.5rem;
}

.success-rate-label {
  font-size: 1rem;
  color: var(--text-primary);
  margin: 0;
}

/* Dashboard Row Three (Успешность, Топ пользователей, График) */
.dashboard-row-three {
  display: grid;
  grid-template-columns: 1fr 1fr 1.2fr;
  gap: 2rem;
}

/* Dashboard Row Two (KPI и Активность) */
.dashboard-row-two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

/* Dashboard Row Full (Full Width) */
.dashboard-row-full {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
}
.branch-kpi-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.branch-kpi-item {
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 12px;
  transition: all 0.2s ease;
}

.branch-kpi-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.branch-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.branch-info {
  flex: 1;
}

.branch-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.25rem 0;
}

.branch-city {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
}

.branch-score {
  font-size: 1.5rem;
  font-weight: 700;
  padding: 0.25rem 0.75rem;
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
  background: rgba(239, 68, 68, 0.1);
}

.branch-sparkline {
  margin: 0.75rem 0;
}

.branch-stats {
  display: flex;
  justify-content: space-around;
  gap: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color);
}

.branch-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.branch-stat .stat-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin: 0;
}

.branch-stat .stat-value {
  font-size: 1rem;
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
  gap: 1rem;
}

.top-user-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background-color: var(--bg-secondary);
  border-radius: 12px;
  transition: all 0.2s ease;
  gap: 1rem;
}

.top-user-item:hover {
  background-color: var(--accent-blue-soft);
}

.top-user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  min-width: 0;
}

.medal {
  font-size: 2rem;
  flex-shrink: 0;
}

.user-details {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.25rem 0;
  font-size: 0.9375rem;
}

.user-meta {
  font-size: 0.875rem;
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
  gap: 0.5rem;
}

.user-level {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* Stats */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.stat-item {
  text-align: center;
  padding: 1.5rem 1rem;
  background-color: var(--bg-secondary);
  border-radius: 12px;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0 0 0.75rem 0;
  font-weight: 500;
}

.stat-value {
  font-size: 2rem;
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
  padding: 1rem 0;
}

.chart-empty {
  padding: 3rem 1rem;
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
  gap: 2rem;
}

/* Latest Activities */
.activities-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 500px;
  overflow-y: auto;
}

.activity-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 0.75rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  transition: all 0.2s ease;
  gap: 0.5rem;
}

.activity-item:hover {
  background: var(--accent-blue-soft);
}

.activity-content {
  flex: 1;
  min-width: 0;
}

.activity-text {
  font-size: 0.875rem;
  color: var(--text-primary);
  margin: 0 0 0.25rem 0;
  line-height: 1.4;
}

.activity-text strong {
  font-weight: 600;
  color: var(--accent-blue);
}

.activity-meta {
  font-size: 0.8125rem;
  color: var(--text-secondary);
  margin: 0;
}

.activity-time {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin: 0;
  white-space: nowrap;
}

/* Empty State */
.empty-state {
  padding: 2rem 1rem;
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
    font-size: 1.5rem;
  }

  .metrics-grid {
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 1rem;
  }

  .metric-icon {
    font-size: 2rem;
    width: 3rem;
    height: 3rem;
  }

  .metric-value {
    font-size: 1.5rem;
  }

  .metric-label {
    font-size: 0.8125rem;
  }

  .success-rate-value {
    font-size: 2rem;
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
    gap: 1rem;
  }

  .combined-activities-content {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .metrics-grid {
    grid-template-columns: 1fr;
  }

  .branch-score {
    font-size: 1.25rem;
  }
}
</style>

<template>
  <div class="statistics-view">
    <div class="statistics-header">
      <h1>Аналитика и статистика</h1>
      <div class="header-actions">
        <select v-model="selectedPeriod" class="period-select">
          <option value="7">Последние 7 дней</option>
          <option value="30">Последние 30 дней</option>
          <option value="90">Последние 3 месяца</option>
          <option value="365">Последний год</option>
        </select>
        <button class="btn btn-secondary" @click="exportData">
          <DownloadIcon class="btn-icon" />
          Экспорт
        </button>
      </div>
    </div>

    <!-- Общая статистика -->
    <div class="overview-stats">
      <div class="stat-card stat-card-large">
        <div class="stat-icon">
          <UsersIcon />
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ overviewStats.totalUsers }}</div>
          <div class="stat-label">Всего пользователей</div>
          <div class="stat-change positive">+{{ overviewStats.newUsers }} за период</div>
        </div>
      </div>

      <div class="stat-card stat-card-large">
        <div class="stat-icon">
          <QuestionsIcon />
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ overviewStats.totalAssessments }}</div>
          <div class="stat-label">Тестирований проведено</div>
          <div class="stat-change positive">+{{ overviewStats.newAssessments }} за период</div>
        </div>
      </div>

      <div class="stat-card stat-card-large">
        <div class="stat-icon">
          <StatisticsIcon />
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ overviewStats.averageScore }}%</div>
          <div class="stat-label">Средний балл</div>
          <div class="stat-change" :class="overviewStats.scoreChange >= 0 ? 'positive' : 'negative'">
            {{ overviewStats.scoreChange >= 0 ? "+" : "" }}{{ overviewStats.scoreChange }}% к прошлому периоду
          </div>
        </div>
      </div>
    </div>

    <!-- Графики и диаграммы -->
    <div class="charts-section">
      <div class="chart-card">
        <h3>Активность пользователей</h3>
        <div class="chart-placeholder">
          <div class="chart-bars">
            <div v-for="(value, index) in userActivityData" :key="index" class="bar">
              <div class="bar-fill" :style="{ height: `${value}%` }"></div>
              <div class="bar-label">{{ getDateLabel(index) }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="chart-card">
        <h3>Результаты тестирований</h3>
        <div class="results-distribution">
          <div class="distribution-item">
            <div class="distribution-color excellent"></div>
            <span>Отлично (90-100%): {{ resultDistribution.excellent }}</span>
          </div>
          <div class="distribution-item">
            <div class="distribution-color good"></div>
            <span>Хорошо (70-89%): {{ resultDistribution.good }}</span>
          </div>
          <div class="distribution-item">
            <div class="distribution-color satisfactory"></div>
            <span>Удовлетворительно (50-69%): {{ resultDistribution.satisfactory }}</span>
          </div>
          <div class="distribution-item">
            <div class="distribution-color poor"></div>
            <span>Неудовлетворительно (<50%): {{ resultDistribution.poor }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Детальная статистика -->
    <div class="detailed-stats">
      <!-- Статистика по направлениям -->
      <div class="stats-section">
        <h3>Статистика по направлениям</h3>
        <div class="branches-stats">
          <div v-for="branch in branchesStats" :key="branch.id" class="branch-stat-card">
            <div class="branch-stat-header">
              <h4>{{ branch.name }}</h4>
              <div class="branch-completion-rate">{{ branch.completionRate }}%</div>
            </div>
            <div class="branch-stat-details">
              <div class="detail-item">
                <span class="detail-label">Участников:</span>
                <span class="detail-value">{{ branch.participants }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Тестирований:</span>
                <span class="detail-value">{{ branch.assessments }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Средний балл:</span>
                <span class="detail-value">{{ branch.averageScore }}%</span>
              </div>
            </div>
            <div class="branch-progress">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: `${branch.completionRate}%` }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Топ пользователей -->
      <div class="stats-section">
        <h3>Топ пользователей</h3>
        <div class="top-users">
          <div v-for="(user, index) in topUsers" :key="user.id" class="top-user-item">
            <div class="user-rank">{{ index + 1 }}</div>
            <div class="user-info">
              <div class="user-name">{{ user.name }}</div>
              <div class="user-details">{{ user.completedTests }} тестов, {{ user.averageScore }}% средний балл</div>
            </div>
            <div class="user-score">{{ user.totalScore }} баллов</div>
          </div>
        </div>
      </div>

      <!-- Недавняя активность -->
      <div class="stats-section">
        <h3>Недавняя активность</h3>
        <div class="recent-activity">
          <div v-for="activity in recentActivity" :key="activity.id" class="activity-item">
            <div class="activity-icon" :class="`activity-${activity.type}`">
              <component :is="getActivityIcon(activity.type)" />
            </div>
            <div class="activity-content">
              <div class="activity-text">{{ activity.text }}</div>
              <div class="activity-time">{{ formatRelativeTime(activity.timestamp) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useUserStore } from "../../stores/user";
import { apiClient } from "../../services/apiClient";
import UsersIcon from "../../components/icons/UsersIcon.vue";
import QuestionsIcon from "../../components/icons/QuestionsIcon.vue";
import StatisticsIcon from "../../components/icons/StarIcon.vue";
import DownloadIcon from "../../components/icons/DownloadIcon.vue";

const userStore = useUserStore();

// Реактивные данные
const selectedPeriod = ref("30");
const overviewStats = ref({});
const userActivityData = ref([]);
const resultDistribution = ref({});
const branchesStats = ref([]);
const topUsers = ref([]);
const recentActivity = ref([]);

// Вычисляемые свойства
const getDateLabel = (index) => {
  const date = new Date();
  date.setDate(date.getDate() - (6 - index));
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
};

// Методы
const loadStatistics = async () => {
  try {
    const periodDays = Number(selectedPeriod.value) || 30;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - periodDays);

    const filters = {
      from: fromDate.toISOString().slice(0, 10),
    };

    const [{ summary }, { branches }, { employees }] = await Promise.all([
      apiClient.getAnalyticsSummary(filters),
      apiClient.getAnalyticsBranches(filters),
      apiClient.getAnalyticsEmployees({ ...filters, limit: 20 }),
    ]);

    overviewStats.value = {
      totalUsers: summary.assignedUsers || 0,
      newUsers: summary.totalAssignments || 0,
      totalAssessments: summary.totalAssessments || 0,
      newAssessments: summary.distinctAssessments || 0,
      averageScore: summary.averageScore != null ? Math.round(summary.averageScore) : 0,
      scoreChange: summary.passRate != null ? Math.round(summary.passRate) : 0,
    };

    const baseActivity = Math.min(100, (summary.completedAttempts || 0) % 100);
    userActivityData.value = Array.from({ length: 7 }, (_, index) => Math.max(10, Math.min(100, baseActivity + index * 4)));

    const distribution = { excellent: 0, good: 0, satisfactory: 0, poor: 0 };
    (employees || []).forEach((employee) => {
      const score = Number(employee.averageScorePercent || employee.lastScorePercent || 0);
      if (score >= 90) distribution.excellent += 1;
      else if (score >= 70) distribution.good += 1;
      else if (score >= 50) distribution.satisfactory += 1;
      else distribution.poor += 1;
    });
    resultDistribution.value = distribution;

    branchesStats.value = (branches || []).map((branch) => ({
      id: branch.branchId || branch.id,
      name: branch.branchName || branch.name,
      participants: branch.participants || 0,
      assessments: branch.assessments || 0,
      averageScore: branch.averageScore != null ? Math.round(branch.averageScore) : 0,
      completionRate: branch.passRate || 0,
    }));

    topUsers.value = (employees || [])
      .slice(0, 5)
      .map((employee) => ({
        id: employee.userId,
        name: `${employee.firstName || ""} ${employee.lastName || ""}`.trim(),
        completedTests: employee.completedAttempts || employee.attempts || 0,
        averageScore: employee.averageScorePercent != null ? Math.round(employee.averageScorePercent) : 0,
        totalScore: employee.totalPoints || employee.score || 0,
      }));

    recentActivity.value = (employees || [])
      .filter((employee) => employee.lastCompletedAt)
      .slice(0, 5)
      .map((employee, index) => ({
        id: `${employee.userId || index}-${index}`,
        type: "assessment_completed",
        user: `${employee.firstName || ""} ${employee.lastName || ""}`.trim() || "Сотрудник",
        assessment: employee.lastAssessmentTitle || "Аттестация",
        score: employee.lastScorePercent != null ? Math.round(employee.lastScorePercent) : "—",
        timestamp: new Date(employee.lastCompletedAt),
      }));
  } catch (error) {
    console.error("Не удалось загрузить аналитику", error);
    overviewStats.value = {
      totalUsers: 0,
      newUsers: 0,
      totalAssessments: 0,
      newAssessments: 0,
      averageScore: 0,
      scoreChange: 0,
    };
    userActivityData.value = [];
    resultDistribution.value = { excellent: 0, good: 0, satisfactory: 0, poor: 0 };
    branchesStats.value = [];
    topUsers.value = [];
    recentActivity.value = [];
  }
};

const getActivityIcon = (type) => {
  const iconMap = {
    assessment_completed: QuestionsIcon,
    assessment_created: QuestionsIcon,
    user_registered: UsersIcon,
  };
  return iconMap[type] || QuestionsIcon;
};

const formatRelativeTime = (timestamp) => {
  const base = timestamp instanceof Date ? timestamp : new Date(timestamp);
  const diff = Date.now() - base.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}д назад`;
  if (hours > 0) return `${hours}ч назад`;
  if (minutes > 0) return `${minutes}мин назад`;
  return "только что";
};

const exportData = async () => {
  try {
    const periodDays = Number(selectedPeriod.value) || 30;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - periodDays);
    const filters = {
      from: fromDate.toISOString().slice(0, 10),
    };
    const blob = await apiClient.exportAnalyticsReport(filters, "excel");
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "analytics.xlsx";
    link.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Не удалось экспортировать отчет", error);
  }
};

// Инициализация
onMounted(() => {
  loadStatistics();
});

watch(selectedPeriod, () => {
  loadStatistics();
});
</script>

<style scoped>
.statistics-view {
  padding: 20px;
}

.statistics-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.statistics-header h1 {
  margin: 0;
  color: var(--tg-theme-text-color);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.period-select {
  padding: 8px 12px;
  border: 1px solid var(--tg-theme-hint-color);
  border-radius: 6px;
  background: var(--tg-theme-secondary-bg-color);
  color: var(--tg-theme-text-color);
  font-size: 14px;
}

.overview-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card-large {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background: var(--tg-theme-bg-color);
  border: 1px solid var(--tg-theme-hint-color);
  border-radius: 12px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--tg-theme-button-color);
  color: var(--tg-theme-button-text-color);
  border-radius: 12px;
}

.stat-icon svg {
  width: 24px;
  height: 24px;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: var(--tg-theme-text-color);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: var(--tg-theme-hint-color);
  margin-bottom: 6px;
}

.stat-change {
  font-size: 12px;
  font-weight: 500;
}

.stat-change.positive {
  color: #4caf50;
}

.stat-change.negative {
  color: #f44336;
}

.charts-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.chart-card {
  background: var(--tg-theme-bg-color);
  border: 1px solid var(--tg-theme-hint-color);
  border-radius: 12px;
  padding: 20px;
}

.chart-card h3 {
  margin: 0 0 20px 0;
  color: var(--tg-theme-text-color);
}

.chart-placeholder {
  height: 200px;
  display: flex;
  align-items: end;
  justify-content: center;
}

.chart-bars {
  display: flex;
  align-items: end;
  gap: 8px;
  height: 100%;
  width: 100%;
  padding: 20px 0;
}

.bar {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}

.bar-fill {
  width: 100%;
  background: var(--tg-theme-button-color);
  border-radius: 4px 4px 0 0;
  min-height: 4px;
  transition: height 0.3s ease;
}

.bar-label {
  font-size: 12px;
  color: var(--tg-theme-hint-color);
  margin-top: 8px;
}

.results-distribution {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.distribution-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: var(--tg-theme-text-color);
}

.distribution-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
}

.distribution-color.excellent {
  background: #4caf50;
}
.distribution-color.good {
  background: #2196f3;
}
.distribution-color.satisfactory {
  background: #ff9800;
}
.distribution-color.poor {
  background: #f44336;
}

.detailed-stats {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.stats-section h3 {
  margin: 0 0 20px 0;
  color: var(--tg-theme-text-color);
  border-bottom: 2px solid var(--tg-theme-hint-color);
  padding-bottom: 8px;
}

.branches-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}

.branch-stat-card {
  background: var(--tg-theme-bg-color);
  border: 1px solid var(--tg-theme-hint-color);
  border-radius: 8px;
  padding: 16px;
}

.branch-stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.branch-stat-header h4 {
  margin: 0;
  color: var(--tg-theme-text-color);
  font-size: 16px;
}

.branch-completion-rate {
  font-size: 18px;
  font-weight: bold;
  color: var(--tg-theme-button-color);
}

.branch-stat-details {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.detail-label {
  color: var(--tg-theme-hint-color);
}

.detail-value {
  color: var(--tg-theme-text-color);
  font-weight: 500;
}

.branch-progress {
  margin-top: 8px;
}

.progress-bar {
  height: 6px;
  background: var(--tg-theme-secondary-bg-color);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--tg-theme-button-color);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.top-users {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.top-user-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--tg-theme-bg-color);
  border: 1px solid var(--tg-theme-hint-color);
  border-radius: 8px;
}

.user-rank {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--tg-theme-button-color);
  color: var(--tg-theme-button-text-color);
  border-radius: 50%;
  font-weight: bold;
  font-size: 14px;
}

.user-info {
  flex: 1;
}

.user-name {
  font-weight: 600;
  color: var(--tg-theme-text-color);
  margin-bottom: 2px;
}

.user-details {
  font-size: 12px;
  color: var(--tg-theme-hint-color);
}

.user-score {
  font-weight: bold;
  color: var(--tg-theme-button-color);
}

.recent-activity {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--tg-theme-bg-color);
  border: 1px solid var(--tg-theme-hint-color);
  border-radius: 8px;
}

.activity-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.activity-icon svg {
  width: 16px;
  height: 16px;
}

.activity-assessment_completed,
.activity-assessment_created {
  background: #e3f2fd;
  color: #1976d2;
}

.activity-user_registered {
  background: #e8f5e8;
  color: #2e7d32;
}

.activity-content {
  flex: 1;
}

.activity-text {
  color: var(--tg-theme-text-color);
  font-size: 14px;
  margin-bottom: 2px;
}

.activity-time {
  font-size: 12px;
  color: var(--tg-theme-hint-color);
}

@media (max-width: 768px) {
  .statistics-header {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }

  .header-actions {
    justify-content: center;
  }

  .overview-stats {
    grid-template-columns: 1fr;
  }

  .charts-section {
    grid-template-columns: 1fr;
  }

  .chart-placeholder {
    height: 150px;
  }

  .branches-stats {
    grid-template-columns: 1fr;
  }

  .stat-card-large {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }

  .top-user-item {
    flex-direction: column;
    text-align: center;
    gap: 8px;
  }

  .user-info {
    order: -1;
  }
}

@media (max-width: 480px) {
  .statistics-view {
    padding: 15px;
  }

  .chart-placeholder {
    height: 120px;
  }

  .activity-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>

<template>
  <div class="container admin-dashboard">
    <!-- Header -->
    <div class="page-header mb-16">
      <h1 class="title-large">Панель администратора</h1>
      <div class="admin-actions">
        <button class="btn">
          <RefreshIcon class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Overview Cards -->
    <div class="overview-section">
      <div class="wrapper">
        <div class="overview-grid">
          <div class="overview-card">
            <div class="card-icon users">
              <UsersIcon class="w-6 h-6" />
            </div>
            <div class="card-content">
              <h3 class="card-title">{{ adminStore.statistics.overview.totalUsers }}</h3>
              <p class="card-subtitle">Всего пользователей</p>
              <div class="card-meta">
                <span class="active-count">{{ adminStore.statistics.overview.activeUsers }} активных</span>
              </div>
            </div>
          </div>

          <div class="overview-card">
            <div class="card-icon assessments">
              <ClipboardIcon class="w-6 h-6" />
            </div>
            <div class="card-content">
              <h3 class="card-title">{{ adminStore.statistics.overview.totalAssessments }}</h3>
              <p class="card-subtitle">Аттестаций</p>
              <div class="card-meta">
                <span class="completed-count">{{ adminStore.statistics.overview.completedAssessments }} пройдено</span>
              </div>
            </div>
          </div>

          <div class="overview-card">
            <div class="card-icon score">
              <StarIcon class="w-6 h-6" />
            </div>
            <div class="card-content">
              <h3 class="card-title">{{ adminStore.statistics.overview.averageScore }}%</h3>
              <p class="card-subtitle">Средний балл</p>
              <div class="card-meta">
                <span class="trend up">+2.1% к прошлому месяцу</span>
              </div>
            </div>
          </div>

          <div class="overview-card">
            <div class="card-icon branches">
              <BuildingIcon class="w-6 h-6" />
            </div>
            <div class="card-content">
              <h3 class="card-title">{{ adminStore.statistics.overview.totalBranches }}</h3>
              <p class="card-subtitle">Филиалов</p>
              <div class="card-meta">
                <span class="all-active">Все активны</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Charts Section -->
    <div class="charts-section">
      <div class="wrapper">
        <div class="charts-grid">
          <!-- Assessment Performance -->
          <div class="chart-card">
            <div class="chart-header">
              <h2 class="chart-title">Результаты аттестаций</h2>
              <select class="chart-filter">
                <option>За последний месяц</option>
                <option>За последний квартал</option>
                <option>За год</option>
              </select>
            </div>
            <div class="chart-content">
              <div class="assessment-stats-list">
                <div v-for="assessment in adminStore.statistics.assessmentStats" :key="assessment.id" class="assessment-stat-item">
                  <div class="stat-info">
                    <h4 class="stat-title">{{ assessment.title }}</h4>
                    <div class="stat-metrics">
                      <span class="metric">
                        <span class="metric-value">{{ assessment.completions }}</span>
                        <span class="metric-label">прохождений</span>
                      </span>
                      <span class="metric">
                        <span class="metric-value">{{ assessment.averageScore }}%</span>
                        <span class="metric-label">средний балл</span>
                      </span>
                      <span class="metric">
                        <span class="metric-value">{{ assessment.passRate }}%</span>
                        <span class="metric-label">успешность</span>
                      </span>
                    </div>
                  </div>
                  <div class="stat-trend" :class="assessment.trend">
                    <TrendUpIcon v-if="assessment.trend === 'up'" class="w-4 h-4" />
                    <TrendDownIcon v-else class="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Branch Performance -->
          <div class="chart-card">
            <div class="chart-header">
              <h2 class="chart-title">Статистика по филиалам</h2>
            </div>
            <div class="chart-content">
              <div class="branch-stats-list">
                <div v-for="branch in adminStore.statistics.branchStats" :key="branch.id" class="branch-stat-item">
                  <div class="stat-info">
                    <h4 class="stat-title">{{ branch.name }}</h4>
                    <div class="stat-metrics">
                      <span class="metric">
                        <span class="metric-value">{{ branch.employees }}</span>
                        <span class="metric-label">сотрудников</span>
                      </span>
                      <span class="metric">
                        <span class="metric-value">{{ branch.completed }}</span>
                        <span class="metric-label">завершено</span>
                      </span>
                      <span class="metric">
                        <span class="metric-value">{{ branch.averageScore }}%</span>
                        <span class="metric-label">средний балл</span>
                      </span>
                    </div>
                  </div>
                  <div class="compliance-indicator" :class="getComplianceClass(branch.compliance)">{{ branch.compliance }}%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="activity-section">
      <div class="wrapper">
        <div class="activity-card">
          <div class="activity-header">
            <h2 class="activity-title">Последняя активность</h2>
            <router-link to="/admin/statistics" class="activity-link">
              Подробная статистика
              <ChevronRightIcon class="w-4 h-4" />
            </router-link>
          </div>
          <div class="activity-list">
            <div v-for="activity in adminStore.statistics.recentActivity" :key="activity.id" class="activity-item">
              <div class="activity-icon" :class="getActivityIconClass(activity.type)">
                <component :is="getActivityIcon(activity.type)" class="w-4 h-4" />
              </div>
              <div class="activity-content">
                <div class="activity-text">
                  <template v-if="activity.type === 'assessment_completed'">
                    <strong>{{ activity.user }}</strong> завершил аттестацию "<strong>{{ activity.assessment }}</strong
                    >" с результатом {{ activity.score }}%
                  </template>
                  <template v-else-if="activity.type === 'user_registered'">
                    Новый пользователь <strong>{{ activity.user }}</strong> зарегистрирован в филиале {{ activity.branch }}
                  </template>
                  <template v-else-if="activity.type === 'assessment_failed'">
                    <strong>{{ activity.user }}</strong> не прошел аттестацию "<strong>{{ activity.assessment }}</strong
                    >" ({{ activity.score }}%)
                  </template>
                  <template v-else-if="activity.type === 'new_assessment'">
                    Создана новая аттестация "<strong>{{ activity.assessment }}</strong
                    >" автором {{ activity.author }}
                  </template>
                </div>
                <div class="activity-time">{{ activity.timestamp }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="quick-actions-section">
      <div class="wrapper">
        <div class="quick-actions-grid">
          <!-- Управление пользователями - только для суперадмина -->
          <router-link v-if="userStore.isSuperAdmin" to="/admin/users" class="quick-action-card">
            <div class="action-icon users">
              <UsersIcon class="w-6 h-6" />
            </div>
            <div class="action-content">
              <h3 class="action-title">Управление пользователями</h3>
              <p class="action-description">Добавление, редактирование и деактивация пользователей</p>
            </div>
          </router-link>

          <!-- Создать аттестацию - доступно всем админам -->
          <router-link to="/admin/assessments" class="quick-action-card">
            <div class="action-icon assessments">
              <ClipboardIcon class="w-6 h-6" />
            </div>
            <div class="action-content">
              <h3 class="action-title">Создать аттестацию</h3>
              <p class="action-description">Настройка новых тестов и экзаменов</p>
            </div>
          </router-link>

          <!-- Пригласить сотрудников - только для суперадмина -->
          <router-link v-if="userStore.isSuperAdmin" to="/admin/invitations" class="quick-action-card">
            <div class="action-icon invitations">
              <MailIcon class="w-6 h-6" />
            </div>
            <div class="action-content">
              <h3 class="action-title">Пригласить сотрудников</h3>
              <p class="action-description">Отправка приглашений новым пользователям</p>
              <div class="action-badge">{{ adminStore.pendingInvitations }}</div>
            </div>
          </router-link>

          <!-- Управление филиалами - только для суперадмина -->
          <router-link v-if="userStore.isSuperAdmin" to="/admin/branches" class="quick-action-card">
            <div class="action-icon branches">
              <BuildingIcon class="w-6 h-6" />
            </div>
            <div class="action-content">
              <h3 class="action-title">Управление филиалами</h3>
              <p class="action-description">Настройка структуры организации</p>
            </div>
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, onMounted } from "vue";
import { useAdminStore } from "../stores/admin";
import { useUserStore } from "../stores/user";
import UsersIcon from "../components/icons/UsersIcon.vue";
import ClipboardIcon from "../components/icons/ClipboardIcon.vue";
import StarIcon from "../components/icons/StarIcon.vue";
import BuildingIcon from "../components/icons/BuildingIcon.vue";
import RefreshIcon from "../components/icons/RefreshIcon.vue";
import TrendUpIcon from "../components/icons/TrendUpIcon.vue";
import TrendDownIcon from "../components/icons/TrendDownIcon.vue";
import ChevronRightIcon from "../components/icons/ChevronRightIcon.vue";
import CheckCircleIcon from "../components/icons/CheckCircleIcon.vue";
import UserPlusIcon from "../components/icons/UserPlusIcon.vue";
import XCircleIcon from "../components/icons/XCircleIcon.vue";
import PlusIcon from "../components/icons/PlusIcon.vue";
import MailIcon from "../components/icons/MailIcon.vue";

export default {
  name: "AdminDashboard",
  components: {
    UsersIcon,
    ClipboardIcon,
    StarIcon,
    BuildingIcon,
    RefreshIcon,
    TrendUpIcon,
    TrendDownIcon,
    ChevronRightIcon,
    CheckCircleIcon,
    UserPlusIcon,
    XCircleIcon,
    PlusIcon,
    MailIcon,
  },
  setup() {
    const adminStore = useAdminStore();
    const userStore = useUserStore();

    const getComplianceClass = (compliance) => {
      if (compliance >= 95) return "excellent";
      if (compliance >= 90) return "good";
      if (compliance >= 80) return "warning";
      return "danger";
    };

    const getActivityIconClass = (type) => {
      switch (type) {
        case "assessment_completed":
          return "success";
        case "user_registered":
          return "info";
        case "assessment_failed":
          return "warning";
        case "new_assessment":
          return "primary";
        default:
          return "neutral";
      }
    };

    const getActivityIcon = (type) => {
      switch (type) {
        case "assessment_completed":
          return CheckCircleIcon;
        case "user_registered":
          return UserPlusIcon;
        case "assessment_failed":
          return XCircleIcon;
        case "new_assessment":
          return PlusIcon;
        default:
          return CheckCircleIcon;
      }
    };

    onMounted(() => {
      adminStore.initialize().catch((error) => {
        console.error("Не удалось загрузить данные панели администратора", error);
      });
    });

    return {
      adminStore,
      userStore,
      getComplianceClass,
      getActivityIconClass,
      getActivityIcon,
    };
  },
};
</script>

<style scoped>
.admin-dashboard {
  background-color: var(--bg-primary);
  min-height: 100vh;
}

.platform-mobile .admin-dashboard {
  padding-top: 90px;
}

.admin-header {
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--divider);
  padding: 20px 0;
}

.admin-header .container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
}

.admin-actions {
  display: flex;
  gap: 12px;
}
.page-header {
  padding-top: 20px;
  display: flex;
}
.admin-actions .btn {
  background-color: transparent;
  padding: 0;
  margin-left: 12px;
}
.admin-actions .btn svg {
  width: 26px;
  height: 26px;
}
.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
}

.overview-card {
  background-color: var(--bg-secondary);
  border-radius: 16px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid var(--divider);
  transition: all 0.2s ease;
}

.overview-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.card-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}
.card-icon.users {
  background: linear-gradient(135deg, #3b82f6, #1e40af);
}
.card-icon.assessments {
  background: linear-gradient(135deg, #10b981, #047857);
}
.card-icon.score {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}
.card-icon.branches {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
}

.card-content {
  flex: 1;
}

.chart-content svg {
  width: 16px;
  height: 16px;
}
.stat-trend.up svg {
  color: var(--success);
}

.stat-trend.down svg {
  color: var(--error);
}

.card-title {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 4px 0;
  color: var(--text-primary);
}

.card-subtitle {
  font-size: 16px;
  color: var(--text-secondary);
  margin: 0 0 8px 0;
}

.card-meta {
  font-size: 14px;
}

.active-count,
.completed-count,
.all-active {
  color: var(--success);
}
.trend.up {
  color: var(--success);
}
.trend.down {
  color: var(--error);
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
}

.chart-card {
  background-color: var(--bg-secondary);
  border-radius: 16px;
  padding: 12px;
  border: 1px solid var(--divider);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.chart-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.chart-filter {
  padding: 8px 12px;
  border: 1px solid var(--divider);
  border-radius: 8px;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
}

.assessment-stats-list,
.branch-stats-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.assessment-stat-item,
.branch-stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background-color: var(--bg-primary);
  border-radius: 12px;
  border: 1px solid var(--divider);
}

.stat-info {
  flex: 1;
}

.stat-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: var(--text-primary);
}

.stat-metrics {
  display: flex;
  gap: 20px;
}

.metric {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.metric-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.stat-trend {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-trend.up {
  background-color: rgba(16, 185, 129, 0.1);
  color: var(--success);
}

.stat-trend.down {
  background-color: rgba(239, 68, 68, 0.1);
  color: var(--error);
}

.compliance-indicator {
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
}

.compliance-indicator.excellent {
  background-color: rgba(16, 185, 129, 0.1);
  color: var(--success);
}

.compliance-indicator.good {
  background-color: rgba(59, 130, 246, 0.1);
  color: var(--accent-blue);
}

.compliance-indicator.warning {
  background-color: rgba(245, 158, 11, 0.1);
  color: var(--warning);
}

.compliance-indicator.danger {
  background-color: rgba(239, 68, 68, 0.1);
  color: var(--error);
}

.activity-card {
  background-color: var(--bg-secondary);
  border-radius: 16px;
  padding: 12px;
  border: 1px solid var(--divider);
}

.activity-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.activity-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.activity-link {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--accent-blue);
  text-decoration: none;
  font-size: 12px;
  font-weight: 500;
}

.activity-link svg {
  color: var(--accent-blue);
  width: 16px;
  height: 16px;
}

.activity-link:hover {
  text-decoration: underline;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.activity-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.activity-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.activity-icon svg {
  width: 20px;
  height: 20px;
}

.activity-icon.success {
  background-color: rgba(16, 185, 129, 0.1);
  color: var(--success);
}
.activity-icon.info {
  background-color: rgba(59, 130, 246, 0.1);
  color: var(--accent-blue);
}
.activity-icon.warning {
  background-color: rgba(245, 158, 11, 0.1);
  color: var(--warning);
}
.activity-icon.primary {
  background-color: rgba(139, 92, 246, 0.1);
  color: var(--accent-purple);
}

.activity-icon.primary svg {
  color: var(--accent-purple);
}
.activity-icon.success svg {
  color: var(--success);
}
.activity-icon.info svg {
  color: var(--accent-blue);
}
.activity-icon.warning svg {
  color: var(--warning);
}

.activity-content {
  flex: 1;
}

.activity-text {
  font-size: 14px;
  line-height: 1.4;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.activity-time {
  font-size: 12px;
  color: var(--text-secondary);
}

.quick-actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 12px;
}

.quick-action-card {
  background-color: var(--bg-secondary);
  border-radius: 16px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 16px;
  text-decoration: none;
  color: inherit;
  border: 1px solid var(--divider);
  transition: all 0.2s ease;
  position: relative;
}

.quick-action-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  border-color: var(--accent-blue);
}

.action-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.action-icon.users {
  background: linear-gradient(135deg, #3b82f6, #1e40af);
}
.action-icon.assessments {
  background: linear-gradient(135deg, #10b981, #047857);
}
.action-icon.invitations {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}
.action-icon.branches {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
}

.action-content {
  flex: 1;
}

.action-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: var(--text-primary);
}

.action-description {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.4;
}

.action-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background-color: var(--accent-orange);
  color: white;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 12px;
  min-width: 20px;
  text-align: center;
}

@media (max-width: 768px) {
  .overview-grid {
    grid-template-columns: 1fr;
  }

  .charts-grid {
    grid-template-columns: 1fr;
  }

  .quick-actions-grid {
    grid-template-columns: 1fr;
  }

  .stat-metrics {
    flex-direction: column;
    gap: 8px;
  }

  .chart-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
}
</style>

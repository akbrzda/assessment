<template>
  <div class="page-container">
    <div class="container">
      <!-- Page Header -->
      <div class="page-header mb-24">
        <h1 class="title-large">Админ-панель</h1>
        <p class="body-medium text-secondary">Управление системой аттестаций</p>
      </div>

      <!-- Admin Menu -->
      <div class="admin-menu">
        <router-link v-for="item in menuItems" :key="item.route" :to="item.route" class="menu-item">
          <div class="menu-icon">
            <component :is="item.icon" />
          </div>
          <div class="menu-content">
            <h3 class="menu-title">{{ item.title }}</h3>
            <p class="menu-description">{{ item.description }}</p>
          </div>
          <div class="menu-arrow">
            <ArrowRightIcon />
          </div>
        </router-link>
      </div>

      <!-- Quick Stats -->
      <div class="quick-stats mt-24">
        <h2 class="title-small mb-16">Быстрая статистика</h2>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">👥</div>
            <div class="stat-value">{{ stats.totalUsers }}</div>
            <div class="stat-label">Всего пользователей</div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">📝</div>
            <div class="stat-value">{{ stats.totalAssessments }}</div>
            <div class="stat-label">Всего аттестаций</div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">✅</div>
            <div class="stat-value">{{ stats.completedAssessments }}</div>
            <div class="stat-label">Завершено</div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">📊</div>
            <div class="stat-value">{{ stats.averageScore }}%</div>
            <div class="stat-label">Средний балл</div>
          </div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="recent-activity mt-24">
        <h2 class="title-small mb-16">Последние события</h2>

        <div class="card">
          <div v-if="recentActivity.length" class="activity-list">
            <div v-for="activity in recentActivity" :key="activity.id" class="activity-item">
              <div class="activity-icon">{{ activity.icon }}</div>
              <div class="activity-content">
                <div class="activity-text">{{ activity.text }}</div>
                <div class="activity-time">{{ formatTime(activity.time) }}</div>
              </div>
            </div>
          </div>

          <div v-else class="empty-state">
            <p class="body-small text-secondary">Нет последних событий</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAdminStore } from "../stores/admin";
import { useUserStore } from "../stores/user";
import UsersIcon from "../components/icons/UsersIcon.vue";
import InvitationsIcon from "../components/icons/InvitationsIcon.vue";
import AssessmentIcon from "../components/icons/AssessmentIcon.vue";
import QuestionsIcon from "../components/icons/QuestionsIcon.vue";
import BranchesIcon from "../components/icons/BranchesIcon.vue";
import ArrowRightIcon from "../components/icons/ArrowRightIcon.vue";

export default {
  name: "AdminView",
  components: {
    UsersIcon,
    InvitationsIcon,
    AssessmentIcon,
    QuestionsIcon,
    BranchesIcon,
    ArrowRightIcon,
  },
  setup() {
    const router = useRouter();
    const userStore = useUserStore();
    const adminStore = useAdminStore();

    const stats = computed(() => ({
      totalUsers: adminStore.statistics.overview.totalUsers || 0,
      totalAssessments: adminStore.statistics.overview.totalAssessments || 0,
      completedAssessments: adminStore.statistics.overview.completedAssessments || 0,
      averageScore: adminStore.statistics.overview.averageScore || 0,
    }));

    const recentActivity = computed(() => {
      const items = adminStore.statistics.recentActivity || [];
      return items.map((item) => ({
        id: item.id,
        icon: item.type === "assessment_completed" ? "✅" : item.type === "user_registered" ? "👤" : "📝",
        text:
          item.type === "assessment_completed"
            ? `${item.user} завершил аттестацию "${item.assessment}" с результатом ${item.score}%`
            : item.type === "user_registered"
            ? `Новый пользователь: ${item.user}`
            : item.assessment || "Событие",
        time: item.timestamp,
      }));
    });

    const menuItems = [
      {
        route: "/admin/users",
        title: "Пользователи",
        description: "Управление сотрудниками и их правами",
        icon: UsersIcon,
      },
      {
        route: "/admin/invitations",
        title: "Приглашения",
        description: "Создание ссылок для новых сотрудников",
        icon: InvitationsIcon,
      },
      {
        route: "/admin/assessments",
        title: "Аттестации",
        description: "Создание и управление тестами",
        icon: AssessmentIcon,
      },
      {
        route: "/admin/questions",
        title: "Банк вопросов",
        description: "Добавление и редактирование вопросов",
        icon: QuestionsIcon,
      },
      {
        route: "/admin/branches",
        title: "Филиалы",
        description: "Управление структурными подразделениями",
        icon: BranchesIcon,
      },
    ];

    function formatTime(dateString) {
      const date = new Date(dateString);
      const now = new Date();
      const diff = now - date;

      if (diff < 60000) return "Только что";
      if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч назад`;

      return date.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    onMounted(() => {
      // Check admin access
      if (!userStore.isAdmin) {
        router.push("/dashboard");
        return;
      }

      adminStore.initialize().catch((error) => {
        console.error("Не удалось загрузить данные администратора", error);
      });
    });

    return {
      menuItems,
      stats,
      recentActivity,
      formatTime,
    };
  },
};
</script>

<style scoped>
.page-header {
  padding-top: 20px;
  text-align: center;
}

.admin-menu {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background-color: var(--bg-secondary);
  border-radius: 16px;
  text-decoration: none;
  color: var(--text-primary);
  transition: all 0.2s ease;
  cursor: pointer;
}

.menu-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--card-shadow);
}

.menu-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--accent-blue);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.menu-icon :deep(svg) {
  width: 20px;
  height: 20px;
  fill: currentColor;
}

.menu-content {
  flex: 1;
}

.menu-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.menu-description {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.3;
}

.menu-arrow {
  width: 24px;
  height: 24px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.menu-arrow :deep(svg) {
  width: 16px;
  height: 16px;
  fill: currentColor;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.stat-card {
  padding: 20px 16px;
  background-color: var(--bg-secondary);
  border-radius: 16px;
  text-align: center;
  transition: all 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-icon {
  font-size: 32px;
  margin-bottom: 12px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--accent-blue);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px solid var(--divider);
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}

.activity-content {
  flex: 1;
}

.activity-text {
  font-size: 14px;
  margin-bottom: 4px;
  line-height: 1.4;
}

.activity-time {
  font-size: 12px;
  color: var(--text-secondary);
}

.empty-state {
  padding: 32px 20px;
  text-align: center;
}

.text-secondary {
  color: var(--text-secondary);
}

@media (max-width: 480px) {
  .menu-item {
    padding: 16px;
    gap: 12px;
  }

  .menu-icon {
    width: 36px;
    height: 36px;
  }

  .menu-title {
    font-size: 15px;
  }

  .menu-description {
    font-size: 13px;
  }

  .stats-grid {
    gap: 12px;
  }

  .stat-card {
    padding: 16px 12px;
  }

  .stat-value {
    font-size: 20px;
  }
}

@media (min-width: 600px) {
  .stats-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>

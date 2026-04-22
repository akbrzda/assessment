<template>
  <div class="page-container">
    <div class="container">
      <!-- Welcome Section -->
      <div class="welcome-section mb-24">
        <div class="welcome-header">
          <h1 class="title-large">Привет, {{ userStore.user?.firstName }} 👋</h1>
          <button v-if="debugConsoleReady" class="btn-icon debug-btn" @click="toggleDebugConsole" title="Консоль отладки">🔧</button>
        </div>
      </div>

      <div v-if="showOnboarding" class="onboarding-card mb-12">
        <p class="onboarding-title">{{ onboardingSlides[onboardingStep].title }}</p>
        <p class="onboarding-text">{{ onboardingSlides[onboardingStep].description }}</p>
        <div class="onboarding-actions">
          <button v-if="onboardingStep > 0" class="btn btn-secondary" @click="prevOnboardingStep">Назад</button>
          <button class="btn btn-primary" @click="nextOnboardingStep">
            {{ onboardingStep === onboardingSlides.length - 1 ? "Понятно" : "Далее" }}
          </button>
        </div>
      </div>

      <!-- Next Assessment Card -->
      <div v-if="openAssessmentsCount > 1" class="open-assessments-banner mb-12">
        <span class="open-assessments-icon">📋</span>
        <span
          >У вас <strong>{{ openAssessmentsCount }}</strong> открытых аттестаций</span
        >
      </div>
      <div class="card card-large mb-12">
        <div v-if="nextAssessment" class="assessment-card">
          <h3 class="title-medium mb-8">{{ nextAssessment.title }}</h3>
          <p class="body-small mb-12">{{ formatDateRange(nextAssessment.startDate, nextAssessment.endDate) }}</p>

          <div class="assessment-status mb-16">
            <span class="badge" :class="getStatusClass(nextAssessment.status)">
              {{ getStatusText(nextAssessment.status) }}
            </span>
          </div>

          <p v-if="nextAssessment.requiresTheory" class="theory-hint" :class="{ done: nextAssessment.theoryCompleted }">
            {{ nextAssessment.theoryCompleted ? "Теория пройдена" : "Сначала изучите теорию" }}
          </p>
          <button
            v-if="nextAssessment.requiresTheory && !nextAssessment.theoryCompleted"
            class="btn btn-primary btn-full"
            @click="openTheory(nextAssessment.id)"
          >
            Пройти теорию
          </button>
          <button v-else-if="nextAssessment.status === 'open'" class="btn btn-primary btn-full" @click="startAssessment(nextAssessment)">
            {{ nextAssessment.attemptsUsed > 0 ? "Пройти ещё раз" : "Начать" }}
          </button>
          <button v-else class="btn btn-primary btn-full" disabled>
            {{ nextAssessment.status === "pending" ? "Ожидает открытия" : "Завершена" }}
          </button>
        </div>

        <div v-else class="no-assessment">
          <div class="empty-icon mb-16">
            <FileText />
          </div>
          <h3 class="title-small mb-8">Нет активных аттестаций</h3>
          <p class="body-small text-secondary">Новые аттестации появятся здесь</p>
        </div>
      </div>

      <!-- Progress Section -->
      <div class="card card-large mb-12">
        <h3 class="title-small mb-16">Ваш прогресс</h3>

        <div class="level-info mb-16">
          <div class="flex flex-between mb-8">
            <span class="body-medium">Текущий уровень: {{ userStore.user?.level }}</span>
          </div>

          <div class="progress-bar mb-8">
            <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
          </div>

          <div class="progress-text">
            <span class="body-small">{{ userStore.user?.points }} / {{ userStore.user?.nextLevelPoints }} очков до следующего уровня</span>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">{{ userStats.completed }}</div>
            <div class="stat-label">Пройдено</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ userStats.average }}%</div>
            <div class="stat-label">Средний балл</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ userStats.badges }}</div>
            <div class="stat-label">Бейджей</div>
          </div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="card">
        <h3 class="title-small mb-16">Последняя активность</h3>

        <div v-if="recentActivity.length" class="activity-list">
          <div v-for="activity in recentActivity" :key="activity.id" class="activity-item">
            <div class="activity-icon" :class="activity.result.success ? 'success' : 'error'">
              <component :is="activity.icon" />
            </div>
            <div class="activity-content">
              <div class="activity-title">{{ activity.title }}</div>
              <div class="activity-date">{{ formatDate(activity.date) }}</div>
            </div>
            <div class="activity-result" v-if="activity.result">
              <span class="badge" :class="activity.result.success ? 'badge-success' : 'badge-error'"> {{ activity.result.score }}% </span>
            </div>
          </div>
        </div>

        <div v-else class="empty-state">
          <p class="body-small text-secondary">Активность отсутствует</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { CheckCircle, FileText, XCircle } from "lucide-vue-next";
import { useUserStore } from "../stores/user";
import { useTelegramStore } from "../stores/telegram";
import { useDebugConsole } from "../composables/useDebugConsole";
import { apiClient } from "../services/apiClient";

export default {
  name: "DashboardView",
  components: {
    CheckCircle,
    FileText,
    XCircle,
  },
  setup() {
    const router = useRouter();
    const userStore = useUserStore();
    const telegramStore = useTelegramStore();
    const { initializeEruda, toggle, isErudaLoaded } = useDebugConsole();

    const nextAssessment = ref(null);
    const openAssessmentsCount = ref(0);
    const userStats = ref({
      completed: 0,
      average: 0,
      badges: 0,
    });
    const recentActivity = ref([]);
    const isDataLoading = ref(false);
    const showOnboarding = ref(false);
    const onboardingStep = ref(0);
    const onboardingSlides = [
      {
        title: "Добро пожаловать",
        description: "Здесь вы видите ближайшую аттестацию и текущий статус прохождения.",
      },
      {
        title: "Ваш прогресс",
        description: "В блоке прогресса доступны очки, уровень и общая статистика по результатам.",
      },
      {
        title: "История активности",
        description: "Ниже отображаются последние попытки и результаты для быстрого контроля.",
      },
    ];

    const debugConsoleReady = computed(() => isErudaLoaded.value);

    const progressPercentage = computed(() => {
      const user = userStore.user;
      if (!user) return 0;
      return Math.min((user.points / user.nextLevelPoints) * 100, 100);
    });

    function getStatusClass(status) {
      switch (status) {
        case "open":
          return "badge-primary";
        case "pending":
          return "badge-neutral";
        case "closed":
          return "badge-neutral";
        default:
          return "badge-neutral";
      }
    }

    function getStatusText(status) {
      switch (status) {
        case "open":
          return "Открыта";
        case "pending":
          return "Ожидает";
        case "closed":
          return "Закрыта";
        default:
          return "Неизвестно";
      }
    }

    function formatDate(date) {
      return new Intl.DateTimeFormat("ru-RU", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(date));
    }

    function formatDateRange(startDate, endDate) {
      const start = new Intl.DateTimeFormat("ru-RU", {
        day: "numeric",
        month: "short",
      }).format(new Date(startDate));

      const end = new Intl.DateTimeFormat("ru-RU", {
        day: "numeric",
        month: "short",
      }).format(new Date(endDate));

      return `${start} - ${end}`;
    }

    async function startAssessment(assessment) {
      if (!assessment) {
        return;
      }
      // Всегда сначала открываем теорию, если она есть
      if (assessment.requiresTheory) {
        openTheory(assessment.id);
        return;
      }
      telegramStore.hapticFeedback("impact", "light");
      router.push(`/assessment/${assessment.id}`);
    }

    function openTheory(id) {
      telegramStore.hapticFeedback("impact", "light");
      router.push(`/assessment/${id}/theory`);
    }

    function normalizeAssessment(item) {
      if (!item) {
        return null;
      }

      const threshold = Number.isFinite(item.passScorePercent) ? Math.round(item.passScorePercent) : null;
      const bestScore = Number.isFinite(item.bestScorePercent) ? Math.round(item.bestScorePercent) : null;
      const lastScore = Number.isFinite(item.lastScorePercent) ? Math.round(item.lastScorePercent) : null;
      const hasPassed = bestScore != null && threshold != null ? bestScore >= threshold : false;
      const attemptsUsed = Number.isFinite(item.lastAttemptNumber) ? Number(item.lastAttemptNumber) : 0;
      const maxAttempts = Number.isFinite(item.maxAttempts) ? Number(item.maxAttempts) : 1;

      let status = "pending";
      if (item.status === "active") {
        status = "open";
      } else if (item.status === "closed") {
        status = "closed";
      } else if (item.status === "pending") {
        status = "pending";
      }

      // Статус "completed" только если нет возможности пройти снова
      if (hasPassed || item.lastAttemptStatus === "completed") {
        const hasAttemptsLeft = maxAttempts === 0 ? true : attemptsUsed < maxAttempts;
        const isPerfectScore = bestScore === 100;

        // Если аттестация открыта (active) и есть попытки и результат не 100%, оставляем статус open
        if (item.status === "active" && hasAttemptsLeft && !isPerfectScore) {
          status = "open";
        } else {
          status = "completed";
        }
      }

      const requiresTheory = Boolean(item.theory?.completionRequired);
      const theoryCompleted = requiresTheory ? Boolean(item.theory?.completedAt) : false;

      return {
        id: item.id,
        title: item.title,
        description: item.description,
        status,
        startDate: item.openAt,
        endDate: item.closeAt,
        threshold: threshold ?? 0,
        maxAttempts,
        attemptsUsed,
        lastAttemptStatus: item.lastAttemptStatus,
        lastCompletedAt: item.lastCompletedAt,
        lastStartedAt: item.lastStartedAt,
        bestResult:
          bestScore != null
            ? {
                score: bestScore,
                passed: hasPassed,
              }
            : lastScore != null
              ? {
                  score: lastScore,
                  passed: threshold != null ? lastScore >= threshold : false,
                }
              : null,
        requiresTheory,
        theoryCompleted,
      };
    }

    async function loadDashboardData() {
      if (!userStore.isInitialized) {
        await userStore.ensureStatus();
      }

      // Инициализируем debug console после загрузки пользователя
      if (userStore.user?.telegramId) {
        await initializeEruda(userStore.user.telegramId);
      }

      isDataLoading.value = true;
      try {
        const [, assessmentsResponse] = await Promise.all([userStore.loadOverview(), apiClient.listUserAssessments()]);

        const normalized = (assessmentsResponse?.assessments || []).map((item) => normalizeAssessment(item)).filter(Boolean);

        // Вычисляем ближайшую аттестацию
        const upcoming = normalized
          .filter((assessment) => assessment.status === "open" || assessment.status === "pending")
          .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

        nextAssessment.value = upcoming.length ? upcoming[0] : null;
        openAssessmentsCount.value = upcoming.length;

        const completedAssessments = normalized.filter((assessment) => assessment.bestResult != null);
        const averageScore = completedAssessments.length
          ? Math.round(completedAssessments.reduce((acc, assessment) => acc + (assessment.bestResult?.score || 0), 0) / completedAssessments.length)
          : 0;

        const earnedBadges = Array.isArray(userStore.overview?.badges) ? userStore.overview.badges.filter((badge) => badge.earned).length : 0;

        userStats.value = {
          completed: completedAssessments.length,
          average: averageScore,
          badges: earnedBadges,
        };

        recentActivity.value = normalized
          .filter((assessment) => assessment.lastCompletedAt || assessment.lastStartedAt)
          .sort((a, b) => {
            const left = a.lastCompletedAt || a.lastStartedAt;
            const right = b.lastCompletedAt || b.lastStartedAt;
            return new Date(right).getTime() - new Date(left).getTime();
          })
          .slice(0, 5)
          .map((assessment) => {
            const timestamp = assessment.lastCompletedAt || assessment.lastStartedAt;
            return {
              id: `${assessment.id}-${timestamp}`,
              icon: assessment.bestResult?.passed ? CheckCircle : assessment.bestResult ? XCircle : FileText,
              title: assessment.title,
              date: timestamp,
              result: assessment.bestResult
                ? {
                    success: assessment.bestResult.passed,
                    score: assessment.bestResult.score,
                  }
                : null,
            };
          });
      } catch (error) {
        console.error("Не удалось загрузить данные дашборда", error);
        recentActivity.value = [];
      } finally {
        isDataLoading.value = false;
      }
    }

    async function maybeShowOnboarding() {
      showOnboarding.value = Boolean(userStore.user?.isFirstLogin);
      onboardingStep.value = 0;
    }

    async function nextOnboardingStep() {
      if (onboardingStep.value < onboardingSlides.length - 1) {
        onboardingStep.value += 1;
        return;
      }

      showOnboarding.value = false;
      try {
        const response = await apiClient.completeOnboarding();
        if (userStore.user) {
          userStore.user.onboardingCompletedAt = response?.onboardingCompletedAt || new Date().toISOString();
          userStore.user.isFirstLogin = false;
        }
      } catch (error) {
        console.error("Не удалось завершить онбординг", error);
      }
    }

    function prevOnboardingStep() {
      if (onboardingStep.value > 0) {
        onboardingStep.value -= 1;
      }
    }

    onMounted(async () => {
      await loadDashboardData();
      await maybeShowOnboarding();
    });

    function toggleDebugConsole() {
      toggle();
    }

    return {
      userStore,
      nextAssessment,
      openAssessmentsCount,
      userStats,
      recentActivity,
      progressPercentage,
      isDataLoading,
      debugConsoleReady,
      showOnboarding,
      onboardingStep,
      onboardingSlides,
      getStatusClass,
      getStatusText,
      formatDate,
      formatDateRange,
      startAssessment,
      openTheory,
      toggleDebugConsole,
      nextOnboardingStep,
      prevOnboardingStep,
    };
  },
};
</script>

<style scoped>
.welcome-section {
  padding-top: 20px;
}

.welcome-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.debug-btn {
  font-size: 18px;
  padding: 8px;
  flex-shrink: 0;
}

.welcome-icon {
  width: 20px;
  height: 20px;
  vertical-align: middle;
}

.assessment-card {
  text-align: center;
}

.theory-hint {
  font-size: 13px;
  color: var(--warning, #ff9500);
  margin: 0 0 12px 0;
}

.theory-hint.done {
  color: var(--success);
}

.no-assessment {
  text-align: center;
  padding: 20px 0;
}

.empty-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.empty-icon svg {
  width: 48px;
  height: 48px;
}

.level-info {
  background-color: var(--bg-primary);
  padding: 16px;
  border-radius: 12px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.stat-item {
  text-align: center;
  padding: 12px 8px;
  background-color: var(--bg-primary);
  border-radius: 8px;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--accent-blue);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
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
}

.activity-icon svg {
  width: 16px;
  height: 16px;
}
.activity-icon.error {
  background-color: rgba(255, 59, 48, 0.1);
}

.activity-icon.error svg {
  color: var(--error);
}

.activity-icon.success {
  background-color: rgba(52, 199, 89, 0.1);
  color: var(--success);
}

.activity-icon.success svg {
  color: var(--success);
}
.activity-content {
  flex: 1;
}

.activity-title {
  font-weight: 600;
  margin-bottom: 4px;
}

.activity-date {
  font-size: 12px;
  color: var(--text-secondary);
}

.empty-state {
  padding: 20px 0;
  text-align: center;
}

.text-secondary {
  color: var(--text-secondary);
}

@media (max-width: 480px) {
  .stats-grid {
    gap: 12px;
  }

  .stat-item {
    padding: 10px 6px;
  }

  .stat-value {
    font-size: 18px;
  }
}

.open-assessments-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--color-primary-light, #eff6ff);
  border: 1px solid var(--color-primary-border, #bfdbfe);
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 14px;
  color: var(--color-primary, #2563eb);
}

.open-assessments-icon {
  font-size: 18px;
}

.onboarding-card {
  background: linear-gradient(135deg, #eff6ff 0%, #ecfeff 100%);
  border: 1px solid #bfdbfe;
  border-radius: 14px;
  padding: 14px;
}

.onboarding-title {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 700;
  color: #1e3a8a;
}

.onboarding-text {
  margin: 0;
  color: #1e40af;
  font-size: 13px;
  line-height: 1.45;
}

.onboarding-actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
}
</style>

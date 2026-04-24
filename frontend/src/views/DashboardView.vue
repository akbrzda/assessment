<template>
  <div class="page-container dashboard-page">
    <div class="container dashboard-container">
      <section class="welcome-section">
        <div class="welcome-header">
          <div>
            <h1 class="welcome-title">{{ greetingText }}, {{ userStore.user?.firstName || "коллега" }}! 👋</h1>
            <p class="welcome-subtitle">Продолжайте обучение и достигайте новых целей</p>
          </div>
          <button class="notification-btn" type="button" aria-label="Уведомления">
            <Bell :size="26" />
          </button>
        </div>
      </section>

      <!-- Скелетон при загрузке -->
      <template v-if="isDataLoading">
        <section class="dashboard-section">
          <div class="sk-label"></div>
          <div class="sk-continue-card">
            <div class="sk-continue-content">
              <div class="sk-line sk-line--title"></div>
              <div class="sk-line sk-line--meta"></div>
              <div class="sk-btn"></div>
            </div>
            <div class="sk-continue-image"></div>
          </div>
        </section>

        <section class="dashboard-section">
          <div class="sk-label"></div>
          <div class="stats-grid">
            <div class="sk-stat-card" v-for="n in 3" :key="n">
              <div class="sk-line sk-line--small"></div>
              <div class="sk-line sk-line--value"></div>
            </div>
          </div>
        </section>

        <section class="dashboard-section">
          <div class="sk-label"></div>
          <div class="task-list">
            <div class="sk-task-item" v-for="n in 3" :key="n">
              <div class="sk-task-icon"></div>
              <div class="sk-task-content">
                <div class="sk-line sk-line--title"></div>
                <div class="sk-line sk-line--meta"></div>
              </div>
            </div>
          </div>
        </section>
      </template>

      <!-- Реальный контент -->
      <template v-else>
        <section class="dashboard-section">
          <h2 class="section-title">Продолжить обучение</h2>
          <article class="continue-card app-panel">
            <div class="continue-content">
              <h3 class="continue-title">{{ continueCourseTitle }}</h3>
              <p class="continue-meta">{{ continueCourseMeta }}</p>
              <button class="continue-btn" type="button" :disabled="isContinueDisabled" @click="handleContinueAction">Продолжить</button>
            </div>
            <div class="continue-image" :class="{ 'continue-image--placeholder': !continueCourseImageUrl }" aria-hidden="true">
              <img
                v-if="continueCourseImageUrl"
                class="continue-image-photo"
                :src="continueCourseImageUrl"
                alt=""
                loading="lazy"
                @error="handleContinueImageError"
              />
              <BookOpen v-else :size="28" class="continue-image-icon" />
            </div>
          </article>
        </section>

        <section class="dashboard-section">
          <div class="section-heading-row">
            <h2 class="section-title">Мой прогресс</h2>
            <router-link class="section-link" to="/assessments">Смотреть все</router-link>
          </div>
          <div class="stats-grid app-grid-3">
            <article class="stat-card app-panel">
              <p class="stat-label">Курсы</p>
              <p class="stat-value">{{ dashboardStats.courses }}</p>
            </article>
            <article class="stat-card app-panel">
              <p class="stat-label">Завершено тем</p>
              <p class="stat-value">{{ dashboardStats.completedTopics }}</p>
            </article>
            <article class="stat-card app-panel">
              <p class="stat-label">Сертификаты</p>
              <p class="stat-value">{{ dashboardStats.certificates }}</p>
            </article>
          </div>
        </section>

        <section class="dashboard-section">
          <h2 class="section-title">Ближайшие задачи</h2>
          <div class="task-list app-list-stack">
            <button v-for="task in displayTasks" :key="task.id" class="task-item app-panel" type="button" @click="router.push('/assessments')">
              <div
                class="task-icon app-round-icon"
                :class="task.icon === 'time' ? 'app-round-icon--success' : task.icon === 'message' ? 'app-round-icon--violet' : 'app-round-icon--warning'"
              >
                <Clock3 v-if="task.icon === 'time'" :size="24" />
                <MessageSquareText v-else-if="task.icon === 'message'" :size="24" />
                <ShieldCheck v-else :size="24" />
              </div>
              <div class="task-content">
                <p class="task-title">{{ task.title }}</p>
                <p class="task-subtitle">{{ task.subtitle }}</p>
              </div>
              <ChevronRight class="task-arrow" :size="28" />
            </button>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { Bell, BookOpen, ChevronRight, Clock3, MessageSquareText, ShieldCheck } from "lucide-vue-next";
import { useUserStore } from "../stores/user";
import { useTelegramStore } from "../stores/telegram";
import { apiClient } from "../services/apiClient";

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

  if (hasPassed || item.lastAttemptStatus === "completed") {
    const hasAttemptsLeft = maxAttempts === 0 ? true : attemptsUsed < maxAttempts;
    const isPerfectScore = bestScore === 100;

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

function normalizeCourse(item) {
  if (!item) {
    return null;
  }

  return {
    id: Number(item.id),
    title: item.title || "Курс",
    coverUrl: item.coverUrl || item.cover_url || item.imageUrl || item.image || null,
    sectionsCount: Number(item.sectionsCount || 0),
    progress: {
      status: item.progress?.status || "not_started",
      progressPercent: Number(item.progress?.progressPercent || 0),
      completedSectionsCount: Number(item.progress?.completedSectionsCount || 0),
      totalSectionsCount: Number(item.progress?.totalSectionsCount || 0),
    },
  };
}

export default {
  name: "DashboardView",
  components: {
    Bell,
    BookOpen,
    ChevronRight,
    Clock3,
    MessageSquareText,
    ShieldCheck,
  },
  setup() {
    const router = useRouter();
    const userStore = useUserStore();
    const telegramStore = useTelegramStore();

    const nextAssessment = ref(null);
    const recentActivity = ref([]);
    const courses = ref([]);
    const isDataLoading = ref(false);
    const isContinueImageBroken = ref(false);
    const dashboardStats = ref({
      courses: 0,
      completedTopics: 0,
      certificates: 0,
    });

    const fallbackTasks = [
      {
        id: "fallback-1",
        icon: "time",
        title: "Тайм-менеджмент",
        subtitle: "Продолжить тему 1.2",
      },
      {
        id: "fallback-2",
        icon: "message",
        title: "Пройти тест",
        subtitle: "Эффективная коммуникация",
      },
      {
        id: "fallback-3",
        icon: "shield",
        title: "Лидерство и мотивация",
        subtitle: "Доступна новая тема",
      },
    ];

    const greetingText = computed(() => {
      const currentHour = new Date().getHours();
      if (currentHour >= 5 && currentHour < 12) {
        return "Доброе утро";
      }
      if (currentHour >= 12 && currentHour < 17) {
        return "Добрый день";
      }
      if (currentHour >= 17 && currentHour < 23) {
        return "Добрый вечер";
      }
      return "Доброй ночи";
    });

    const continueCourse = computed(() => {
      const activeCourse = courses.value.find((course) => {
        const percent = Number(course?.progress?.progressPercent || 0);
        return percent > 0 && percent < 100;
      });

      if (activeCourse) {
        return activeCourse;
      }

      return courses.value.find((course) => Number(course?.progress?.progressPercent || 0) < 100) || null;
    });

    const continueCourseTitle = computed(() => continueCourse.value?.title || nextAssessment.value?.title || "Эффективная коммуникация");

    const continueCourseMeta = computed(() => {
      if (continueCourse.value) {
        const totalTopics = continueCourse.value.progress.totalSectionsCount || continueCourse.value.sectionsCount;
        const completedTopics = continueCourse.value.progress.completedSectionsCount || 0;
        const currentTopic = totalTopics > 0 ? Math.min(totalTopics, Math.max(1, completedTopics + 1)) : 1;
        const score = Math.round(Math.min(Math.max(continueCourse.value.progress.progressPercent || 0, 0), 100));
        return `Тема ${currentTopic} из ${totalTopics || 1} • ${score}%`;
      }

      const score = nextAssessment.value?.bestResult?.score || 75;
      return `Тема 2 из 4 • ${score}%`;
    });

    const isContinueDisabled = computed(() => {
      if (continueCourse.value) {
        return false;
      }

      return !nextAssessment.value || nextAssessment.value.status === "pending" || nextAssessment.value.status === "closed";
    });

    const continueCourseImageUrl = computed(() => {
      if (!continueCourse.value?.coverUrl || isContinueImageBroken.value) {
        return "";
      }

      return continueCourse.value.coverUrl;
    });

    watch(
      () => continueCourse.value?.coverUrl,
      () => {
        isContinueImageBroken.value = false;
      },
    );

    const displayTasks = computed(() => {
      if (!recentActivity.value.length) {
        return fallbackTasks;
      }

      const iconTypes = ["time", "message", "shield"];
      return recentActivity.value.slice(0, 3).map((activity, index) => ({
        id: activity.id,
        icon: iconTypes[index % iconTypes.length],
        title: activity.title,
        subtitle: activity.result ? `Результат: ${activity.result.score}%` : "Продолжить обучение",
      }));
    });

    function openTheory(id) {
      telegramStore.hapticFeedback("impact", "light");
      router.push(`/assessment/${id}/theory`);
    }

    function startAssessment(assessment) {
      if (!assessment) {
        return;
      }

      if (assessment.requiresTheory) {
        openTheory(assessment.id);
        return;
      }

      telegramStore.hapticFeedback("impact", "light");
      router.push(`/assessment/${assessment.id}`);
    }

    function openCourse(courseId) {
      if (!courseId) {
        return;
      }
      telegramStore.hapticFeedback("impact", "light");
      router.push(`/courses/${courseId}`);
    }

    function handleContinueAction() {
      if (continueCourse.value?.id) {
        openCourse(continueCourse.value.id);
        return;
      }

      if (!nextAssessment.value || nextAssessment.value.status === "pending" || nextAssessment.value.status === "closed") {
        return;
      }

      startAssessment(nextAssessment.value);
    }

    function handleContinueImageError() {
      isContinueImageBroken.value = true;
    }

    async function loadDashboardData() {
      if (!userStore.isInitialized) {
        await userStore.ensureStatus();
      }

      isDataLoading.value = true;
      try {
        const [, assessmentsResponse, coursesResponse] = await Promise.all([
          userStore.loadOverview(),
          apiClient.listUserAssessments(),
          apiClient.listCourses(),
        ]);

        const normalizedAssessments = (assessmentsResponse?.assessments || []).map((item) => normalizeAssessment(item)).filter(Boolean);

        const upcoming = normalizedAssessments
          .filter((assessment) => assessment.status === "open" || assessment.status === "pending")
          .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

        nextAssessment.value = upcoming.length ? upcoming[0] : null;

        courses.value = (coursesResponse?.courses || []).map((item) => normalizeCourse(item)).filter(Boolean);

        const certificatesCount = Array.isArray(userStore.overview?.badges) ? userStore.overview.badges.filter((badge) => badge.earned).length : 0;
        const completedTopics = courses.value.reduce((acc, course) => acc + Number(course.progress.completedSectionsCount || 0), 0);

        dashboardStats.value = {
          courses: courses.value.length,
          completedTopics,
          certificates: certificatesCount,
        };

        recentActivity.value = normalizedAssessments
          .filter((assessment) => assessment.lastCompletedAt || assessment.lastStartedAt)
          .sort((a, b) => {
            const left = a.lastCompletedAt || a.lastStartedAt;
            const right = b.lastCompletedAt || b.lastStartedAt;
            return new Date(right).getTime() - new Date(left).getTime();
          })
          .slice(0, 5)
          .map((assessment) => ({
            id: `${assessment.id}-${assessment.lastCompletedAt || assessment.lastStartedAt}`,
            title: assessment.title,
            result: assessment.bestResult
              ? {
                  success: assessment.bestResult.passed,
                  score: assessment.bestResult.score,
                }
              : null,
          }));
      } catch (error) {
        console.error("Не удалось загрузить данные дашборда", error);
        courses.value = [];
        recentActivity.value = [];
        dashboardStats.value = {
          courses: 0,
          completedTopics: 0,
          certificates: 0,
        };
      } finally {
        isDataLoading.value = false;
      }
    }

    onMounted(async () => {
      await loadDashboardData();
    });

    return {
      userStore,
      isDataLoading,
      dashboardStats,
      greetingText,
      continueCourseTitle,
      continueCourseMeta,
      continueCourseImageUrl,
      isContinueDisabled,
      displayTasks,
      handleContinueAction,
      handleContinueImageError,
      router,
    };
  },
};
</script>

<style scoped>
.dashboard-page {
  background: #ffffff;
}

.dashboard-container {
  padding: 14px 16px 24px;
}

@media (max-width: 768px) {
  .dashboard-container {
    padding-top: 18px;
  }
}

.platform-mobile .dashboard-container {
  padding-top: calc(12px + env(safe-area-inset-top));
}

/* ── Welcome ─────────────────────────────────────── */

.welcome-section {
  margin-bottom: 20px;
}

.welcome-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.welcome-title {
  margin: 0;
  color: #111827;
  font-size: 26px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.welcome-subtitle {
  margin-top: 6px;
  color: #6b7280;
  font-size: 14px;
  line-height: 1.4;
}

.notification-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: #9ca3af;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}

/* ── Dashboard sections ──────────────────────────── */

.dashboard-section {
  margin-bottom: 24px;
}

.section-heading-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.section-title {
  margin: 0 0 12px;
  color: #111827;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.25;
}

.section-link {
  color: #6355f5;
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
}

/* ── Continue card ───────────────────────────────── */

.continue-card {
  padding: 14px;
  display: flex;
  gap: 12px;
  align-items: stretch;
  overflow: hidden;
}

.continue-content {
  flex: 1;
  min-width: 0;
}

.continue-title {
  margin: 0;
  color: #111827;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.3;
}

.continue-meta {
  margin: 6px 0 12px;
  color: #6b7280;
  font-size: 13px;
  font-weight: 400;
}

.continue-btn {
  border: none;
  background: #6355f5;
  color: #ffffff;
  border-radius: 12px;
  min-height: 44px;
  min-width: 140px;
  padding: 0 18px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.continue-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.continue-image {
  width: 36%;
  min-width: 100px;
  border-radius: 12px;
  background: linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%);
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}

.continue-image-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.continue-image--placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.continue-image-icon {
  color: #6b7280;
}

/* ── Stats grid ──────────────────────────────────── */

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.stat-card {
  min-height: 90px;
  padding: 12px;
}

.stat-label {
  color: #9ca3af;
  font-size: 12px;
  font-weight: 500;
  margin: 0;
}

.stat-value {
  margin: 8px 0 0;
  color: #111827;
  font-size: 26px;
  line-height: 1;
  font-weight: 700;
}

/* ── Task list ───────────────────────────────────── */

.task-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-item {
  width: 100%;
  min-height: 72px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
  cursor: pointer;
}

.task-icon {
  flex-shrink: 0;
}

.task-content {
  flex: 1;
  min-width: 0;
}

.task-title {
  margin: 0;
  color: #111827;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.25;
}

.task-subtitle {
  margin: 3px 0 0;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.3;
}

.task-arrow {
  color: #d1d5db;
  flex-shrink: 0;
}

/* ── Skeleton ───────────────────────────────────── */

@keyframes sk-shimmer {
  0% {
    background-position: -300px 0;
  }
  100% {
    background-position: 300px 0;
  }
}

.sk-label,
.sk-line,
.sk-btn,
.sk-continue-image,
.sk-task-icon,
.sk-stat-card {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 600px 100%;
  animation: sk-shimmer 1.4s infinite linear;
  border-radius: 8px;
}

.sk-label {
  width: 120px;
  height: 18px;
  margin-bottom: 12px;
  border-radius: 6px;
}

.sk-continue-card {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 14px;
  display: flex;
  gap: 12px;
  align-items: stretch;
  min-height: 148px;
}

.sk-continue-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sk-continue-image {
  width: 36%;
  min-width: 100px;
  border-radius: 12px;
  flex-shrink: 0;
}

.sk-line {
  border-radius: 6px;
}

.sk-line--title {
  width: 75%;
  height: 18px;
}

.sk-line--meta {
  width: 55%;
  height: 13px;
}

.sk-line--small {
  width: 60%;
  height: 12px;
  margin-bottom: 8px;
}

.sk-line--value {
  width: 40%;
  height: 26px;
}

.sk-btn {
  width: 120px;
  height: 44px;
  border-radius: 12px;
  margin-top: 4px;
}

.sk-stat-card {
  border-radius: 14px;
  min-height: 90px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 12px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 600px 100%;
}

.sk-task-item {
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  min-height: 72px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.sk-task-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  flex-shrink: 0;
}

.sk-task-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ── Mobile ──────────────────────────────────────── */

@media (max-width: 520px) {
  .welcome-title {
    font-size: 22px;
  }

  .welcome-subtitle {
    font-size: 13px;
    margin-top: 4px;
  }

  .section-title {
    font-size: 17px;
  }

  .continue-card {
    padding: 12px;
    gap: 10px;
  }

  .continue-title {
    font-size: 15px;
  }

  .continue-meta {
    font-size: 12px;
    margin-bottom: 10px;
  }

  .continue-btn {
    min-width: 0;
    width: 100%;
    min-height: 40px;
    font-size: 14px;
    border-radius: 10px;
  }

  .continue-image {
    width: 38%;
    min-width: 90px;
  }

  .stat-card {
    min-height: 82px;
    padding: 10px;
  }

  .stat-label {
    font-size: 11px;
  }

  .stat-value {
    font-size: 22px;
    margin-top: 6px;
  }

  .task-item {
    min-height: 68px;
    padding: 10px 12px;
  }

  .task-icon {
    width: 44px;
    height: 44px;
  }

  .task-title {
    font-size: 14px;
  }

  .task-subtitle {
    font-size: 12px;
  }
}
</style>

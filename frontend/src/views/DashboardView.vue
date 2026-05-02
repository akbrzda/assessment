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

      <div v-if="isDataLoading" class="dashboard-loading app-panel">
        <SkeletonPageHeader />
        <SkeletonCard />
        <div class="dashboard-loading__stats">
          <SkeletonBlock class="dashboard-loading__stat" />
          <SkeletonBlock class="dashboard-loading__stat" />
          <SkeletonBlock class="dashboard-loading__stat" />
        </div>
        <SkeletonList :items="3" />
      </div>

      <div v-else-if="dashboardError" class="dashboard-error app-panel">
        <h2 class="section-title">Не удалось загрузить дашборд</h2>
        <p class="dashboard-error__text">{{ dashboardError }}</p>
        <button class="continue-btn" type="button" @click="loadDashboardData">Повторить</button>
      </div>

      <template v-else>
        <section class="dashboard-section">
          <h2 class="section-title">Продолжить обучение</h2>
          <article v-if="continueCourse" class="continue-card app-panel">
            <div class="continue-content">
              <h3 class="continue-title">{{ continueCourseTitle }}</h3>
              <p class="continue-meta">{{ continueCourseMeta }}</p>
              <button class="continue-btn" type="button" @click="handleContinueAction">Продолжить</button>
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
              <component v-else :is="continueCourseFallbackIcon" class="continue-image-icon" :size="30" stroke-width="2" />
            </div>
          </article>
          <article v-else-if="dashboardStats.courses === 0" class="continue-empty app-panel">
            <BookOpen :size="32" class="continue-empty-icon" />
            <div class="continue-empty-text">
              <p class="continue-empty-title">Курсы пока не назначены</p>
              <p class="continue-empty-sub">Обратитесь к руководителю</p>
            </div>
          </article>
          <article v-else class="continue-empty app-panel">
            <ShieldCheck :size="32" class="continue-empty-icon continue-empty-icon--success" />
            <div class="continue-empty-text">
              <p class="continue-empty-title">Все курсы завершены!</p>
              <p class="continue-empty-sub">Отличная работа 🎉</p>
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
          <div v-if="displayTasks.length" class="task-list app-list-stack">
            <button
              v-for="task in displayTasks"
              :key="task.id"
              class="task-item app-panel"
              type="button"
              @click="router.push({ name: 'assessments' })"
            >
              <div
                class="task-icon app-round-icon"
                :class="
                  task.icon === 'time' ? 'app-round-icon--success' : task.icon === 'message' ? 'app-round-icon--violet' : 'app-round-icon--warning'
                "
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
          <div v-else class="tasks-empty app-panel">
            <ShieldCheck :size="32" class="tasks-empty-icon" />
            <p class="tasks-empty-text">Все курсы завершены или ещё не начаты</p>
            <button class="tasks-empty-link" type="button" @click="router.push({ name: 'assessments' })">Перейти к курсам</button>
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
import { getCourseFallbackVisual } from "../utils/courseVisuals";
import SkeletonBlock from "../components/skeleton/SkeletonBlock.vue";
import SkeletonCard from "../components/skeleton/SkeletonCard.vue";
import SkeletonList from "../components/skeleton/SkeletonList.vue";
import SkeletonPageHeader from "../components/skeleton/SkeletonPageHeader.vue";

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
    SkeletonBlock,
    SkeletonCard,
    SkeletonList,
    SkeletonPageHeader,
  },
  setup() {
    const router = useRouter();
    const userStore = useUserStore();
    const telegramStore = useTelegramStore();

    const recentActivity = ref([]);
    const courses = ref([]);
    const isDataLoading = ref(false);
    const dashboardError = ref("");
    const isContinueImageBroken = ref(false);
    const dashboardStats = ref({
      courses: 0,
      completedTopics: 0,
      certificates: 0,
    });

    const fallbackTasks = [];

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
        return course?.progress?.status !== "completed" && percent > 0;
      });

      if (activeCourse) {
        return activeCourse;
      }

      return courses.value.find((course) => course?.progress?.status !== "completed") || null;
    });

    const continueCourseTitle = computed(() => continueCourse.value?.title || "Обучение");

    const continueCourseMeta = computed(() => {
      if (continueCourse.value) {
        const totalTopics = continueCourse.value.progress.totalSectionsCount || continueCourse.value.sectionsCount;
        const completedTopics = continueCourse.value.progress.completedSectionsCount || 0;
        const currentTopic = totalTopics > 0 ? Math.min(totalTopics, Math.max(1, completedTopics + 1)) : 1;
        const score = Math.round(Math.min(Math.max(continueCourse.value.progress.progressPercent || 0, 0), 100));
        return `Тема ${currentTopic} из ${totalTopics || 1} • ${score}%`;
      }

      return "Вам доступны курсы для изучения";
    });

    const isContinueDisabled = computed(() => !continueCourse.value);

    const continueCourseImageUrl = computed(() => {
      if (!continueCourse.value?.coverUrl || isContinueImageBroken.value) {
        return "";
      }

      return continueCourse.value.coverUrl;
    });

    const continueCourseFallbackIcon = computed(() => {
      if (!continueCourse.value?.id) {
        return getCourseFallbackVisual(0).icon;
      }
      return getCourseFallbackVisual(continueCourse.value.id).icon;
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
        subtitle: activity.result ? `Прогресс: ${activity.result.score}%` : "Продолжить обучение",
      }));
    });

    function openCourse(courseId) {
      if (!courseId) {
        return;
      }
      telegramStore.hapticFeedback("impact", "light");
      router.push({
        name: "course-details",
        params: { id: courseId },
      });
    }

    function handleContinueAction() {
      if (continueCourse.value?.id) {
        openCourse(continueCourse.value.id);
        return;
      }

      router.push({ name: "assessments" });
    }

    function handleContinueImageError() {
      isContinueImageBroken.value = true;
    }

    async function loadDashboardData() {
      if (!userStore.isInitialized) {
        await userStore.ensureStatus();
      }

      isDataLoading.value = true;
      dashboardError.value = "";
      try {
        const [, coursesResponse] = await Promise.all([userStore.loadOverview(), apiClient.listCourses()]);

        courses.value = (coursesResponse?.courses || []).map((item) => normalizeCourse(item)).filter(Boolean);

        const certificatesCount = Array.isArray(userStore.overview?.badges) ? userStore.overview.badges.filter((badge) => badge.earned).length : 0;
        const completedTopics = courses.value.reduce((acc, course) => acc + Number(course.progress.completedSectionsCount || 0), 0);

        dashboardStats.value = {
          courses: courses.value.length,
          completedTopics,
          certificates: certificatesCount,
        };

        recentActivity.value = courses.value
          .filter((course) => Number(course.progress?.progressPercent || 0) > 0 && course.progress?.status !== "completed")
          .sort((a, b) => {
            return Number(b.progress?.progressPercent || 0) - Number(a.progress?.progressPercent || 0);
          })
          .slice(0, 5)
          .map((course) => ({
            id: `${course.id}-${course.progress?.progressPercent || 0}`,
            title: course.title,
            result:
              Number(course.progress?.progressPercent || 0) > 0
                ? {
                    score: Math.round(Number(course.progress?.progressPercent || 0)),
                  }
                : null,
          }));
      } catch (error) {
        console.error("Не удалось загрузить данные дашборда", error);
        dashboardError.value = error?.message || "Попробуйте повторить позже";
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
      if (typeof document !== "undefined" && document.body) {
        document.body.style.overflow = "";
      }
      await loadDashboardData();
    });

    return {
      userStore,
      isDataLoading,
      dashboardError,
      dashboardStats,
      greetingText,
      continueCourse,
      continueCourseTitle,
      continueCourseMeta,
      continueCourseImageUrl,
      continueCourseFallbackIcon,
      displayTasks,
      loadDashboardData,
      handleContinueAction,
      handleContinueImageError,
      router,
    };
  },
};
</script>

<style scoped>
.dashboard-page {
  background: var(--bg-primary);
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
  color: var(--text-primary);
  font-size: 26px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.welcome-subtitle {
  margin-top: 6px;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.4;
}

.notification-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--text-secondary);
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

.dashboard-loading,
.dashboard-error {
  padding: 14px;
  margin-bottom: 16px;
}

.dashboard-loading__text,
.dashboard-error__text {
  margin: 0 0 12px;
  color: var(--text-secondary);
  font-size: 14px;
}

.dashboard-loading {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dashboard-loading__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.dashboard-loading__stat {
  height: 90px;
  border-radius: 12px;
}

.section-heading-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.section-title {
  margin: 0 0 12px;
  color: var(--text-primary);
  font-size: 18px;
  font-weight: 700;
  line-height: 1.25;
}

.section-link {
  color: var(--accent);
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
  color: var(--text-primary);
  font-size: 17px;
  font-weight: 700;
  line-height: 1.3;
}

.continue-meta {
  margin: 6px 0 12px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 400;
}

.continue-meta--warning {
  color: #cc7a00;
  font-weight: 600;
}

.continue-btn {
  border: none;
  background: var(--accent);
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
  background: var(--bg-secondary);
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
  color: rgba(15, 23, 42, 0.62);
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
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  margin: 0;
}

.stat-value {
  margin: 8px 0 0;
  color: var(--text-primary);
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
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 700;
  line-height: 1.25;
}

.task-subtitle {
  margin: 3px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.3;
}

.task-arrow {
  color: var(--divider);
  flex-shrink: 0;
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

/* ── Continue empty state ────────────────────────── */
.continue-empty {
  padding: 20px 16px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.continue-empty-icon {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.continue-empty-icon--success {
  color: var(--success);
}

.continue-empty-text {
  flex: 1;
}

.continue-empty-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 2px;
}

.continue-empty-sub {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
}

/* ── Tasks empty state ───────────────────────────── */
.tasks-empty {
  padding: 20px 16px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.tasks-empty-icon {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.tasks-empty-text {
  flex: 1;
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

.tasks-empty-link {
  background: none;
  border: none;
  color: var(--accent);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
}
</style>

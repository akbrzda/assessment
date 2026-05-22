<template>
  <div class="page-container">
    <div class="container">
      <div class="page-header">
        <h1 class="courses-page-title">Курсы</h1>
        <button class="header-search-btn" type="button" @click="focusSearch" aria-label="Поиск">
          <Search :size="22" />
        </button>
      </div>

      <div class="search-row mb-12">
        <div class="search-wrapper">
          <Search class="search-icon-inner" :size="15" />
          <input ref="searchInputRef" v-model="courseSearch" type="text" class="search-input" placeholder="Поиск курсов" />
        </div>
      </div>

      <div class="filter-tabs mb-16">
        <button
          v-for="tab in courseTabs"
          :key="tab.key"
          class="filter-tab"
          :class="{ active: courseFilter === tab.key }"
          type="button"
          @click="courseFilter = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <div v-if="isCoursesLoading" class="courses-skeleton">
        <SkeletonPageHeader />
        <SkeletonCard v-for="index in 4" :key="index" />
      </div>

      <div v-else-if="coursesError" class="error-state">
        <h3 class="title-small mb-8">Не удалось загрузить курсы</h3>
        <p class="body-small text-secondary mb-12">{{ coursesError }}</p>
        <BaseButton full-width type="button" @click="retryCourses">Повторить</BaseButton>
      </div>

      <div v-else-if="filteredCourses.length" class="courses-list">
        <button v-for="course in filteredCourses" :key="course.id" class="course-card" type="button" @click="openCourse(course.id)">
          <div class="course-icon" :style="getCourseVisualStyle(course)">
            <img v-if="course.coverUrl" :src="course.coverUrl" :alt="course.title" class="course-cover" loading="lazy" />
            <component v-else :is="getCourseFallbackVisual(course.id).icon" class="course-icon-svg" :size="24" stroke-width="2" />
          </div>
          <div class="course-body">
            <h3 class="course-title">{{ course.title }}</h3>
            <p class="course-meta">{{ course.sectionsCount }} {{ getSectionsLabel(course.sectionsCount) }}</p>
            <div v-if="course.progress.status === 'completed'" class="course-completed-badge">
              <span class="course-completed-text">Курс завершён</span>
            </div>
            <div v-else class="course-progress">
              <ProgressBar :value="course.progress.progressPercent || 0" />
              <span class="course-percent">{{ Math.round(course.progress.progressPercent || 0) }}%</span>
            </div>
          </div>
        </button>
      </div>

      <div v-else class="empty-state">
        <BookOpen :size="48" color="var(--text-secondary)" />
        <p class="body-small text-secondary mt-12">Курсы пока недоступны</p>
      </div>

      <!-- Аттестации -->
      <template v-if="showAssessments">
        <h2 class="assessments-section-title">Аттестации</h2>

        <div v-if="isAssessmentsLoading" class="courses-skeleton">
          <SkeletonCard v-for="index in 2" :key="index" />
        </div>

        <div v-else-if="userAssessments.length" class="courses-list">
          <button v-for="item in userAssessments" :key="item.id" class="course-card" type="button" @click="openAssessment(item)">
            <div class="course-icon assessment-icon">
              <ClipboardCheck :size="24" class="course-icon-svg" stroke-width="2" />
            </div>
            <div class="course-body">
              <h3 class="course-title">{{ item.title }}</h3>
              <div v-if="item.lastAttemptStatus === 'completed'" class="course-completed-badge">
                <span class="course-completed-text">
                  {{ item.bestScorePercent != null ? `Результат: ${Math.round(item.bestScorePercent)}%` : "Аттестация пройдена" }}
                </span>
              </div>
              <p v-else class="course-meta">{{ getAssessmentLabel(item) }}</p>
            </div>
          </button>
        </div>

        <div v-else class="empty-state">
          <ClipboardCheck :size="48" color="var(--text-secondary)" />
          <p class="body-small text-secondary mt-12">Аттестации пока не назначены</p>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { BookOpen, ClipboardCheck, Search } from "lucide-vue-next";
import { useTelegramStore } from "../stores/telegram";
import { useUserStore } from "../stores/user";
import { apiClient } from "../services/apiClient";
import BaseButton from "../components/ui/BaseButton.vue";
import ProgressBar from "../components/ui/ProgressBar.vue";
import { getCourseFallbackVisual } from "../utils/courseVisuals";
import SkeletonCard from "../components/skeleton/SkeletonCard.vue";
import SkeletonPageHeader from "../components/skeleton/SkeletonPageHeader.vue";

export default {
  name: "AssessmentsView",
  components: {
    BookOpen,
    ClipboardCheck,
    Search,
    BaseButton,
    ProgressBar,
    SkeletonCard,
    SkeletonPageHeader,
  },
  setup() {
    const router = useRouter();
    const telegramStore = useTelegramStore();
    const userStore = useUserStore();

    const courses = ref([]);
    const courseSearch = ref("");
    const courseFilter = ref("all");
    const isCoursesLoading = ref(false);
    const coursesError = ref("");
    const userAssessments = ref([]);
    const isAssessmentsLoading = ref(false);
    const showAssessments = computed(() => userStore.hasModuleAccess("assessments"));
    const searchInputRef = ref(null);

    const courseTabs = [
      { key: "all", label: "Все курсы" },
      { key: "my", label: "Мои курсы" },
      { key: "completed", label: "Завершенные" },
    ];

    const filteredCourses = computed(() => {
      const query = courseSearch.value.trim().toLowerCase();

      return courses.value
        .filter((course) => {
          if (courseFilter.value === "completed") {
            return course.progress.status === "completed";
          }
          if (courseFilter.value === "my") {
            return course.progress.status !== "completed";
          }
          return true;
        })
        .filter((course) => {
          if (!query) return true;
          return `${course.title} ${course.description}`.toLowerCase().includes(query);
        });
    });

    function focusSearch() {
      searchInputRef.value?.focus();
    }

    function getCourseVisualStyle(course) {
      if (course?.coverUrl) {
        return {};
      }
      return { background: getCourseFallbackVisual(course?.id).background };
    }

    function getSectionsLabel(count) {
      const n = Number(count) || 0;
      if (n === 1) return "тема";
      if (n >= 2 && n <= 4) return "темы";
      return "тем";
    }

    function openCourse(id) {
      telegramStore.hapticFeedback("impact", "light");
      router.push({
        name: "course-details",
        params: { id },
      });
    }

    function getAssessmentLabel(item) {
      if (item.status === "pending") return "Ещё не открыта";
      if (item.status === "closed") return "Период истёк";
      if (item.lastAttemptStatus === "in_progress") return "Начата, продолжить";
      return "Доступна для прохождения";
    }

    function openAssessment(item) {
      telegramStore.hapticFeedback("impact", "light");
      if (item.lastAttemptStatus === "completed" && item.lastAttemptId) {
        router.push({ name: "assessment-results", params: { id: item.id }, query: { attemptId: item.lastAttemptId } });
        return;
      }
      router.push({ name: "assessment-process", params: { id: item.id } });
    }

    function normalizeCourse(item) {
      if (!item) return null;
      return {
        id: Number(item.id),
        title: item.title || "Курс",
        description: item.description || "",
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

    async function loadCourses() {
      isCoursesLoading.value = true;
      coursesError.value = "";
      try {
        const { courses: response } = await apiClient.listCourses();
        courses.value = (response || []).map((item) => normalizeCourse(item)).filter(Boolean);
      } catch (error) {
        console.error("Не удалось загрузить список курсов", error);
        courses.value = [];
        coursesError.value = error.message || "Попробуйте повторить позже";
      } finally {
        isCoursesLoading.value = false;
      }
    }

    async function loadAssessments() {
      if (!userStore.hasModuleAccess("assessments")) return;
      isAssessmentsLoading.value = true;
      try {
        const { assessments } = await apiClient.listUserAssessments();
        userAssessments.value = Array.isArray(assessments) ? assessments : [];
      } catch (error) {
        console.error("Не удалось загрузить аттестации", error);
        userAssessments.value = [];
      } finally {
        isAssessmentsLoading.value = false;
      }
    }

    function retryCourses() {
      loadCourses();
    }

    onMounted(() => {
      loadCourses();
      loadAssessments();
    });

    return {
      courses,
      courseSearch,
      courseFilter,
      courseTabs,
      filteredCourses,
      isCoursesLoading,
      coursesError,
      userAssessments,
      isAssessmentsLoading,
      showAssessments,
      searchInputRef,
      focusSearch,
      getCourseVisualStyle,
      getSectionsLabel,
      getCourseFallbackVisual,
      openCourse,
      openAssessment,
      getAssessmentLabel,
      retryCourses,
    };
  },
};
</script>

<style scoped>
/* Шапка страницы */
.page-container .container {
  padding-top: 16px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.courses-page-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
}

.header-search-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
}

/* Поиск */
.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon-inner {
  position: absolute;
  left: 12px;
  color: var(--text-secondary);
  pointer-events: none;
  flex-shrink: 0;
}

.search-input {
  width: 100%;
  padding: 11px 14px 11px 36px;
  background: var(--bg-secondary);
  border: none;
  border-radius: 12px;
  font-size: 15px;
  color: var(--text-primary);
  outline: none;
}

.search-input::placeholder {
  color: var(--text-secondary);
}

/* Фильтры */
.filter-tabs {
  display: flex;
  gap: 6px;
  background: var(--bg-secondary);
  border: 1px solid var(--divider);
  border-radius: 12px;
  padding: 4px;
}

.filter-tab {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid transparent;
  background: none;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  border-radius: 9px;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s,
    box-shadow 0.15s;
  white-space: nowrap;
}

.filter-tab.active {
  background: var(--bg-primary);
  border-color: var(--divider);
  color: var(--text-primary);
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(12, 18, 32, 0.1);
}

/* Список курсов */
.courses-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.course-card {
  width: 100%;
  border: 1px solid var(--divider);
  border-radius: 16px;
  background: var(--bg-secondary);
  padding: 14px 14px;
  display: grid;
  grid-template-columns: 54px 1fr;
  gap: 12px;
  align-items: center;
  text-align: left;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.course-card:active {
  transform: scale(0.98);
}

.course-icon {
  width: 54px;
  height: 54px;
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.course-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.course-icon-svg {
  color: rgba(15, 23, 42, 0.72);
}

.course-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.course-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.course-meta {
  margin: 0 0 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

.course-status {
  margin: -2px 0 8px;
  font-size: 12px;
  font-weight: 600;
}

.course-status--warning {
  color: #cc7a00;
}

.course-progress {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: center;
}

.course-percent {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  min-width: 28px;
  text-align: right;
}

/* Состояния */
.loading-state {
  text-align: center;
  padding: 40px 0;
}

.error-state {
  text-align: center;
  padding: 40px 0;
}

.courses-skeleton {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.empty-state {
  text-align: center;
  padding: 60px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.assessments-section-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 24px 0 12px;
}

.assessment-icon {
  background: #e8f0fe;
  color: #4a6ee0;
}

.mt-12 {
  margin-top: 12px;
}

.mb-12 {
  margin-bottom: 12px;
}

.mb-16 {
  margin-bottom: 16px;
}

.text-secondary {
  color: var(--text-secondary);
}

/* ── Статус завершения ── */
.course-completed-badge {
  display: flex;
  align-items: center;
  gap: 4px;
}

.course-completed-text {
  font-size: 12px;
  font-weight: 600;
  color: var(--success);
}
</style>

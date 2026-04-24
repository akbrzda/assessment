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

      <div v-if="isCoursesLoading" class="courses-list">
        <div v-for="n in 4" :key="n" class="sk-course-card">
          <div class="sk-course-icon"></div>
          <div class="sk-course-body">
            <div class="sk-line sk-line--title"></div>
            <div class="sk-line sk-line--meta"></div>
            <div class="sk-line sk-line--progress"></div>
          </div>
        </div>
      </div>

      <div v-else-if="coursesError" class="error-state">
        <h3 class="title-small mb-8">Не удалось загрузить курсы</h3>
        <p class="body-small text-secondary mb-12">{{ coursesError }}</p>
        <button class="btn btn-primary btn-full" type="button" @click="retryCourses">Повторить</button>
      </div>

      <div v-else-if="filteredCourses.length" class="courses-list">
        <button v-for="(course, index) in filteredCourses" :key="course.id" class="course-card" type="button" @click="openCourse(course.id)">
          <div class="course-icon" :style="getCourseIconStyle(index)">
            <component :is="getCourseIcon(course)" :size="24" class="course-icon-symbol" />
          </div>
          <div class="course-body">
            <h3 class="course-title">{{ course.title }}</h3>
            <p class="course-meta">{{ course.sectionsCount }} {{ getSectionsLabel(course.sectionsCount) }}</p>
            <div v-if="course.progress.status === 'completed'" class="course-completed-badge">
              <span class="course-completed-text">Курс завершён</span>
            </div>
            <div v-else class="course-progress">
              <div class="progress-track">
                <div
                  class="progress-fill"
                  :class="{ 'progress-fill--active': course.progress.progressPercent > 0 }"
                  :style="{ width: `${Math.min(Math.max(course.progress.progressPercent || 0, 0), 100)}%` }"
                ></div>
              </div>
              <span class="course-percent">{{ Math.round(course.progress.progressPercent || 0) }}%</span>
            </div>
          </div>
        </button>
      </div>

      <div v-else class="empty-state">
        <BookOpen :size="48" color="var(--text-secondary)" />
        <p class="body-small text-secondary mt-12">Курсы пока недоступны</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { BookOpen, Clock3, Search, Trophy } from "lucide-vue-next";
import { useTelegramStore } from "../stores/telegram";
import { apiClient } from "../services/apiClient";

export default {
  name: "AssessmentsView",
  components: {
    BookOpen,
    Clock3,
    Search,
    Trophy,
  },
  setup() {
    const router = useRouter();
    const telegramStore = useTelegramStore();

    const courses = ref([]);
    const courseSearch = ref("");
    const courseFilter = ref("all");
    const isCoursesLoading = ref(false);
    const coursesError = ref("");
    const searchInputRef = ref(null);

    const courseTabs = [
      { key: "all", label: "Все курсы" },
      { key: "my", label: "Мои курсы" },
      { key: "completed", label: "Завершенные" },
    ];

    const iconSchemes = [
      { background: "#EDE9FD" },
      { background: "#DDFBE7" },
      { background: "#FFF3E0" },
      { background: "#E3F0FC" },
      { background: "#FEE8ED" },
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

    function getCourseIconStyle(index) {
      return iconSchemes[index % iconSchemes.length];
    }

    function getSectionsLabel(count) {
      const n = Number(count) || 0;
      if (n === 1) return "тема";
      if (n >= 2 && n <= 4) return "темы";
      return "тем";
    }

    function getCourseIcon(course) {
      if (course?.progress?.status === "completed") return Trophy;
      const percent = Number(course?.progress?.progressPercent || 0);
      if (percent >= 50) return Clock3;
      return BookOpen;
    }

    function openCourse(id) {
      telegramStore.hapticFeedback("impact", "light");
      router.push(`/courses/${id}`);
    }

    function normalizeCourse(item) {
      if (!item) return null;
      return {
        id: Number(item.id),
        title: item.title || "Курс",
        description: item.description || "",
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

    function retryCourses() {
      loadCourses();
    }

    onMounted(() => {
      loadCourses();
    });

    return {
      courses,
      courseSearch,
      courseFilter,
      courseTabs,
      filteredCourses,
      isCoursesLoading,
      coursesError,
      searchInputRef,
      focusSearch,
      getCourseIconStyle,
      getSectionsLabel,
      getCourseIcon,
      openCourse,
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
  gap: 4px;
  background: var(--bg-secondary);
  border-radius: 10px;
  padding: 3px;
}

.filter-tab {
  flex: 1;
  padding: 7px 10px;
  border: none;
  background: none;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.18s ease;
  white-space: nowrap;
}

.filter-tab.active {
  background-color: var(--accent);
  color: #ffffff;
  font-weight: 600;
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
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.course-icon-symbol {
  color: var(--accent);
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

.progress-track {
  height: 4px;
  background: var(--divider);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  background: var(--divider);
  transition: width 0.3s ease;
}

.progress-fill--active {
  background: #34c759;
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

.empty-state {
  text-align: center;
  padding: 60px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
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

/* ── Skeleton ── */
@keyframes sk-shimmer {
  0% {
    background-position: -300px 0;
  }
  100% {
    background-position: 300px 0;
  }
}

.sk-course-card {
  border: 1px solid var(--divider);
  border-radius: 16px;
  background: var(--bg-secondary);
  padding: 14px;
  display: grid;
  grid-template-columns: 54px 1fr;
  gap: 12px;
  align-items: center;
}

.sk-course-icon,
.sk-line {
  background: linear-gradient(90deg, var(--bg-secondary) 25%, var(--divider) 50%, var(--bg-secondary) 75%);
  background-size: 600px 100%;
  animation: sk-shimmer 1.4s infinite linear;
  border-radius: 8px;
}

.sk-course-icon {
  width: 54px;
  height: 54px;
  border-radius: 14px;
  flex-shrink: 0;
}

.sk-course-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sk-line--title {
  width: 70%;
  height: 15px;
}

.sk-line--meta {
  width: 40%;
  height: 12px;
}

.sk-line--progress {
  width: 100%;
  height: 4px;
  border-radius: 4px;
}
</style>

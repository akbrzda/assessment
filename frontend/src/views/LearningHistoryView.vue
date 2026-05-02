<template>
  <div class="history-page">
    <div class="history-header">
      <h1 class="history-title">История обучения</h1>
      <p class="history-subtitle">Все события: аттестации и курсы</p>
    </div>

    <div class="history-filters app-panel">
      <button
        v-for="option in filterOptions"
        :key="option.value"
        type="button"
        class="filter-btn"
        :class="{ 'filter-btn--active': activeFilter === option.value }"
        @click="activeFilter = option.value"
      >
        {{ option.label }}
      </button>
    </div>

    <div v-if="isLoading" class="history-skeleton">
      <SkeletonPageHeader />
      <SkeletonList :items="6" />
    </div>

    <div v-else-if="errorMessage" class="history-error app-panel">
      <p class="error-title">Не удалось загрузить историю</p>
      <p class="error-text">{{ errorMessage }}</p>
      <button class="retry-btn" type="button" @click="loadHistory">Повторить</button>
    </div>

    <div v-else-if="visibleItems.length" class="history-list">
      <article v-for="item in visibleItems" :key="item.id" class="history-card app-panel">
        <div class="history-card__top">
          <div class="history-card__headline">
            <span class="history-kind" :class="`history-kind--${item.kind}`">{{ item.kindLabel }}</span>
            <h2 class="history-card__title">{{ item.title }}</h2>
          </div>
          <span class="history-status" :class="`history-status--${item.statusType}`">{{ item.statusLabel }}</span>
        </div>

        <p class="history-card__meta">{{ item.meta }}</p>
        <p class="history-card__date">{{ formatDate(item.eventDate) }}</p>
      </article>

      <button v-if="canLoadMore" class="more-btn" type="button" :disabled="isPaginating" @click="handleLoadMore">
        {{ isPaginating ? "Загрузка..." : "Показать ещё" }}
      </button>
    </div>

    <div v-else class="history-empty app-panel">
      <p class="empty-title">История пока пуста</p>
      <p class="empty-subtitle">После старта обучения здесь появится лог событий</p>
    </div>
  </div>
</template>

<script>
import { computed, onMounted, ref, watch } from "vue";
import { apiClient } from "../services/apiClient";
import { useUserStore } from "../stores/user";
import SkeletonList from "../components/skeleton/SkeletonList.vue";
import SkeletonPageHeader from "../components/skeleton/SkeletonPageHeader.vue";

const PAGE_SIZE = 10;
const ATTEMPTS_LIMIT = 50;

function parseDate(value) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export default {
  name: "LearningHistoryView",
  components: {
    SkeletonList,
    SkeletonPageHeader,
  },
  setup() {
    const userStore = useUserStore();
    const isLoading = ref(false);
    const isPaginating = ref(false);
    const errorMessage = ref("");

    const attemptItems = ref([]);
    const courseItems = ref([]);

    const activeFilter = ref("all");
    const currentPage = ref(1);

    const filterOptions = [
      { value: "all", label: "Все" },
      { value: "assessment", label: "Аттестации" },
      { value: "course", label: "Курсы" },
    ];

    function formatDate(value) {
      const parsed = parseDate(value);
      if (!parsed) {
        return "Дата неизвестна";
      }
      return parsed.toLocaleString("ru-RU");
    }

    function mapAttemptStatus(status) {
      if (status === "completed") {
        return { statusType: "completed", statusLabel: "Завершено" };
      }
      if (status === "in_progress") {
        return { statusType: "in-progress", statusLabel: "В процессе" };
      }
      if (status === "cancelled") {
        return { statusType: "cancelled", statusLabel: "Отменено" };
      }
      return { statusType: "draft", statusLabel: "Черновик" };
    }

    function mapCourseStatus(status) {
      if (status === "completed") {
        return { statusType: "completed", statusLabel: "Курс завершен" };
      }
      if (status === "in_progress") {
        return { statusType: "in-progress", statusLabel: "Курс в процессе" };
      }
      return { statusType: "draft", statusLabel: "Курс не начат" };
    }

    function mapAttemptItem(item) {
      const statusData = mapAttemptStatus(item.status);
      return {
        id: `attempt-${item.attemptId || item.id || Math.random()}`,
        kind: "assessment",
        kindLabel: "Аттестация",
        title: item.assessmentTitle || "Аттестация",
        statusType: statusData.statusType,
        statusLabel: statusData.statusLabel,
        meta: `Попытка №${item.attemptNumber || 1} • ${item.scorePercent != null ? `${item.scorePercent}%` : "Без оценки"}`,
        eventDate: item.completedAt || item.startedAt || null,
      };
    }

    function mapCourseItem(course) {
      const progress = course.progress || {};
      const statusData = mapCourseStatus(progress.status);
      const completedSections = Number(progress.completedSectionsCount || 0);
      const totalSections = Number(progress.totalSectionsCount || course.sectionsCount || 0);
      const progressPercent = Number(progress.progressPercent || 0);
      return {
        id: `course-${course.id}`,
        kind: "course",
        kindLabel: "Курс",
        title: course.title || "Курс",
        statusType: statusData.statusType,
        statusLabel: statusData.statusLabel,
        meta: `Темы ${completedSections}/${totalSections || 0} • Прогресс ${Math.max(0, Math.min(100, Math.round(progressPercent)))}%`,
        eventDate: progress.completedAt || progress.updatedAt || progress.startedAt || course.updatedAt || course.createdAt || null,
      };
    }

    const mergedItems = computed(() => {
      const allItems = [...attemptItems.value, ...courseItems.value];
      return allItems.sort((a, b) => {
        const first = parseDate(a.eventDate)?.getTime() || 0;
        const second = parseDate(b.eventDate)?.getTime() || 0;
        return second - first;
      });
    });

    const filteredItems = computed(() => {
      if (activeFilter.value === "all") {
        return mergedItems.value;
      }
      return mergedItems.value.filter((item) => item.kind === activeFilter.value);
    });

    const visibleItems = computed(() => filteredItems.value.slice(0, currentPage.value * PAGE_SIZE));

    const canLoadMore = computed(() => visibleItems.value.length < filteredItems.value.length);

    watch(activeFilter, () => {
      currentPage.value = 1;
    });

    function handleLoadMore() {
      if (!canLoadMore.value || isPaginating.value) {
        return;
      }
      isPaginating.value = true;
      currentPage.value += 1;
      isPaginating.value = false;
    }

    async function loadAllAttempts() {
      const items = [];
      let offset = 0;
      while (true) {
        const response = await apiClient.getUserAttemptHistory({ limit: ATTEMPTS_LIMIT, offset });
        const chunk = Array.isArray(response?.attempts) ? response.attempts : [];
        items.push(...chunk);
        if (chunk.length < ATTEMPTS_LIMIT) {
          break;
        }
        offset += ATTEMPTS_LIMIT;
      }
      return items;
    }

    async function loadHistory() {
      isLoading.value = true;
      errorMessage.value = "";
      currentPage.value = 1;

      try {
        if (!userStore.isInitialized) {
          await userStore.ensureStatus();
        }

        const [attempts, coursesResponse] = await Promise.all([loadAllAttempts(), apiClient.listCourses()]);

        attemptItems.value = attempts.map(mapAttemptItem);
        const courses = Array.isArray(coursesResponse?.courses) ? coursesResponse.courses : [];
        courseItems.value = courses.map(mapCourseItem);
      } catch (error) {
        attemptItems.value = [];
        courseItems.value = [];
        errorMessage.value = error?.message || "Попробуйте позже";
      } finally {
        isLoading.value = false;
      }
    }

    onMounted(() => {
      loadHistory();
    });

    return {
      isLoading,
      isPaginating,
      errorMessage,
      activeFilter,
      filterOptions,
      visibleItems,
      canLoadMore,
      formatDate,
      handleLoadMore,
      loadHistory,
    };
  },
};
</script>

<style scoped>
.history-page {
  min-height: 100vh;
  background: var(--bg-primary);
  padding: 18px 16px 96px;
}

.history-header {
  margin-bottom: 14px;
}

.history-title {
  margin: 0;
  font-size: 26px;
  line-height: 1.2;
  font-weight: 700;
  color: var(--text-primary);
}

.history-subtitle {
  margin: 6px 0 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.history-filters {
  display: flex;
  gap: 8px;
  padding: 8px;
  margin-bottom: 12px;
}

.filter-btn {
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
  border-radius: 10px;
  padding: 8px 12px;
}

.filter-btn--active {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.history-skeleton {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.history-card {
  padding: 14px;
}

.history-card__top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.history-card__headline {
  min-width: 0;
}

.history-kind {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  border-radius: 8px;
  padding: 3px 8px;
  margin-bottom: 6px;
}

.history-kind--assessment {
  background: rgba(90, 95, 207, 0.14);
  color: #4f53bf;
}

.history-kind--course {
  background: rgba(52, 199, 89, 0.14);
  color: #228a45;
}

.history-card__title {
  margin: 0;
  font-size: 15px;
  line-height: 1.35;
  color: var(--text-primary);
}

.history-status {
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.history-status--completed {
  background: rgba(52, 199, 89, 0.15);
  color: #228a45;
}

.history-status--in-progress {
  background: rgba(90, 95, 207, 0.15);
  color: #4f53bf;
}

.history-status--cancelled {
  background: rgba(255, 59, 48, 0.15);
  color: #b8312a;
}

.history-status--draft {
  background: rgba(128, 128, 128, 0.16);
  color: #666666;
}

.history-card__meta,
.history-card__date {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.more-btn {
  margin-top: 2px;
  border: none;
  border-radius: 10px;
  min-height: 42px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
}

.history-error,
.history-empty {
  padding: 16px;
}

.error-title,
.empty-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.error-text,
.empty-subtitle {
  margin: 8px 0 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.retry-btn {
  margin-top: 12px;
  border: none;
  background: var(--accent);
  color: #ffffff;
  border-radius: 10px;
  min-height: 40px;
  padding: 0 14px;
  font-size: 14px;
  font-weight: 600;
}
</style>

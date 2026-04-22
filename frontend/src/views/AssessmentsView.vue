<template>
  <div class="page-container">
    <div class="container">
      <div class="page-header mb-16">
        <h1 class="title-large">Обучение</h1>
      </div>

      <div class="mode-switch mb-12">
        <button class="mode-tab" :class="{ active: activeMode === 'courses' }" @click="setMode('courses')">Курсы</button>
        <button class="mode-tab" :class="{ active: activeMode === 'assessments' }" @click="setMode('assessments')">Аттестации</button>
      </div>

      <template v-if="activeMode === 'assessments'">
        <div class="filter-tabs mb-12">
          <button
            v-for="filter in filters"
            :key="filter.key"
            class="filter-tab"
            :class="{ active: activeFilter === filter.key }"
            @click="setFilter(filter.key)"
          >
            {{ filter.label }}
          </button>
        </div>

        <div v-if="isLoading" class="loading-state card">
          <p class="body-small text-secondary">Загрузка материалов...</p>
        </div>

        <div v-else-if="filteredAssessments.length" class="assessments-list">
          <div v-for="assessment in filteredAssessments" :key="assessment.id" class="card assessment-card" @click="handleAssessmentClick(assessment)">
            <div class="assessment-header">
              <div>
                <h3 class="title-small mb-8">{{ assessment.title }}</h3>
                <p v-if="assessment.requiresTheory" class="theory-hint" :class="{ done: assessment.theoryCompleted }">
                  {{ assessment.theoryCompleted ? "Теория пройдена" : "Нужно пройти теорию" }}
                </p>
              </div>
              <span class="badge" :class="getStatusClass(assessment.status)">
                {{ getStatusText(assessment.status) }}
              </span>
            </div>

            <div class="assessment-info mb-12">
              <div class="info-item">
                <span class="label">Срок:</span>
                <span class="value">{{ formatDateRange(assessment.startDate, assessment.endDate) }}</span>
              </div>
              <div class="info-item">
                <span class="label">Порог:</span>
                <span class="value">{{ assessment.threshold }}%</span>
              </div>
              <div class="info-item">
                <span class="label">Попытки:</span>
                <span class="value">{{ formatAttemptsLabel(assessment.attemptsUsed, assessment.maxAttempts) }}</span>
              </div>
            </div>

            <div v-if="assessment.bestResult" class="best-result mb-12">
              <div class="info-item">
                <span class="label">Лучший результат:</span>
                <span class="value" :class="assessment.bestResult.passed ? 'success' : 'error'"> {{ assessment.bestResult.score }}% </span>
              </div>
            </div>

            <div class="assessment-actions">
              <button
                v-if="
                  assessment.status === 'open' &&
                  hasAttemptsLeft(assessment.attemptsUsed, assessment.maxAttempts) &&
                  (!assessment.bestResult || assessment.bestResult.score < 100)
                "
                class="btn btn-primary btn-full"
                @click.stop="startAssessment(assessment)"
              >
                {{ getStartButtonText(assessment) }}
              </button>

              <button
                v-else-if="
                  assessment.status === 'completed' ||
                  !hasAttemptsLeft(assessment.attemptsUsed, assessment.maxAttempts) ||
                  (assessment.bestResult && assessment.bestResult.score === 100)
                "
                class="btn btn-secondary btn-full"
                @click.stop="viewResults(assessment.id)"
              >
                Посмотреть результаты
              </button>

              <button v-else class="btn btn-primary btn-full" disabled>
                {{ getActionButtonText(assessment.status) }}
              </button>
            </div>
          </div>
        </div>

        <div v-else class="empty-state">
          <div class="empty-icon">
            <FileText />
          </div>
          <h3 class="title-small mb-8">{{ getEmptyStateTitle() }}</h3>
          <p class="body-small text-secondary">{{ getEmptyStateDescription() }}</p>
        </div>
      </template>

      <template v-else>
        <div v-if="isCoursesLoading" class="loading-state card">
          <p class="body-small text-secondary">Загрузка курсов...</p>
        </div>

        <div v-else-if="courses.length" class="assessments-list">
          <CourseCard v-for="course in courses" :key="course.id" :course="course" @open="openCourse" />
        </div>

        <div v-else class="empty-state">
          <div class="empty-icon">
            <BookOpen />
          </div>
          <h3 class="title-small mb-8">Курсы пока недоступны</h3>
          <p class="body-small text-secondary">Когда курсы будут назначены, они появятся здесь.</p>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { BookOpen, FileText } from "lucide-vue-next";
import { useTelegramStore } from "../stores/telegram";
import { useUserStore } from "../stores/user";
import { apiClient } from "../services/apiClient";
import CourseCard from "../components/courses/CourseCard.vue";

export default {
  name: "AssessmentsView",
  components: {
    BookOpen,
    FileText,
    CourseCard,
  },
  setup() {
    const router = useRouter();
    const telegramStore = useTelegramStore();
    const userStore = useUserStore();

    const assessments = ref([]);
    const courses = ref([]);
    const activeFilter = ref("all");
    const activeMode = ref("courses");
    const isLoading = ref(false);
    const isCoursesLoading = ref(false);

    const filters = [
      { key: "all", label: "Все" },
      { key: "open", label: "Открытые" },
      { key: "completed", label: "Пройденные" },
      { key: "closed", label: "Закрытые" },
    ];

    const filteredAssessments = computed(() => {
      if (activeFilter.value === "all") return assessments.value;

      return assessments.value.filter((assessment) => {
        switch (activeFilter.value) {
          case "open":
            return assessment.status === "open";
          case "completed":
            return assessment.status === "completed" || assessment.bestResult;
          case "closed":
            return assessment.status === "closed";
          default:
            return true;
        }
      });
    });

    function setMode(mode) {
      activeMode.value = mode;
      telegramStore.hapticFeedback("selection");
    }

    function setFilter(filter) {
      activeFilter.value = filter;
      telegramStore.hapticFeedback("selection");
    }

    function getStatusClass(status) {
      switch (status) {
        case "open":
          return "badge-primary";
        case "completed":
          return "badge-success";
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
        case "completed":
          return "Завершена";
        case "pending":
          return "Ожидает";
        case "closed":
          return "Закрыта";
        default:
          return "Неизвестно";
      }
    }

    function isUnlimitedAttempts(maxAttempts) {
      return Number(maxAttempts) === 0;
    }

    function hasAttemptsLeft(attemptsUsed, maxAttempts) {
      if (isUnlimitedAttempts(maxAttempts)) {
        return true;
      }
      return Number(attemptsUsed || 0) < Number(maxAttempts || 0);
    }

    function formatAttemptsLabel(attemptsUsed, maxAttempts) {
      if (isUnlimitedAttempts(maxAttempts)) {
        return `${Number(attemptsUsed || 0)} из `;
      }
      return `${Number(attemptsUsed || 0)} из ${Number(maxAttempts || 0)}`;
    }

    function getActionButtonText(status) {
      switch (status) {
        case "pending":
          return "Ожидает открытия";
        case "closed":
          return "Завершена";
        default:
          return "Недоступна";
      }
    }

    function getEmptyStateTitle() {
      switch (activeFilter.value) {
        case "open":
          return "Нет открытых аттестаций";
        case "completed":
          return "Нет пройденных аттестаций";
        case "closed":
          return "Нет закрытых аттестаций";
        default:
          return "Нет аттестаций";
      }
    }

    function getEmptyStateDescription() {
      switch (activeFilter.value) {
        case "open":
          return "Активные аттестации появятся здесь";
        case "completed":
          return "Пройденные аттестации появятся здесь";
        case "closed":
          return "Завершенные аттестации появятся здесь";
        default:
          return "Аттестации появятся здесь";
      }
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

    function handleAssessmentClick() {
      telegramStore.hapticFeedback("impact", "light");
    }

    function openCourse(id) {
      telegramStore.hapticFeedback("impact", "light");
      router.push(`/courses/${id}`);
    }

    function startAssessment(assessment) {
      if (!assessment) {
        return;
      }
      if (assessment.requiresTheory) {
        openTheory(assessment.id);
        return;
      }
      telegramStore.hapticFeedback("impact", "medium");
      router.push(`/assessment/${assessment.id}`);
    }

    function viewResults(id) {
      telegramStore.hapticFeedback("impact", "light");
      router.push(`/assessment-results/${id}`);
    }

    function openTheory(id) {
      telegramStore.hapticFeedback("impact", "light");
      router.push(`/assessment/${id}/theory`);
    }

    function getStartButtonText(assessment) {
      if (!assessment) return "Начать";
      if (assessment.requiresTheory && !assessment.theoryCompleted) {
        return "Пройти теорию";
      }
      return assessment.attemptsUsed > 0 ? "Пройти ещё раз" : "Начать";
    }

    function normalizeAssessment(item) {
      if (!item) {
        return null;
      }

      const threshold = Number.isFinite(item.passScorePercent) ? Math.round(item.passScorePercent) : 0;
      const bestScore = Number.isFinite(item.bestScorePercent) ? Math.round(item.bestScorePercent) : null;
      const attemptsUsed = Number.isFinite(item.lastAttemptNumber) ? Number(item.lastAttemptNumber) : 0;
      const maxAttempts = Number.isFinite(item.maxAttempts) ? Number(item.maxAttempts) : 1;
      const requiresTheory = Boolean(item.theory?.completionRequired);
      const theoryCompleted = requiresTheory ? Boolean(item.theory?.completedAt) : false;

      const statusMap = {
        active: "open",
        pending: "pending",
        closed: "closed",
      };
      let status = statusMap[item.status] || "pending";

      if (bestScore != null || item.lastAttemptStatus === "completed") {
        const hasAttemptsLeft = maxAttempts === 0 ? true : attemptsUsed < maxAttempts;
        const isPerfectScore = bestScore === 100;
        if (item.status === "active" && hasAttemptsLeft && !isPerfectScore) {
          status = "open";
        } else {
          status = "completed";
        }
      }

      return {
        id: item.id,
        title: item.title,
        description: item.description,
        status,
        startDate: item.openAt,
        endDate: item.closeAt,
        threshold,
        maxAttempts,
        attemptsUsed,
        requiresTheory,
        theoryCompleted,
        bestResult:
          bestScore != null
            ? {
                score: bestScore,
                passed: threshold ? bestScore >= threshold : true,
              }
            : null,
      };
    }

    function normalizeCourse(item) {
      if (!item) {
        return null;
      }

      return {
        id: Number(item.id),
        title: item.title || "Курс",
        description: item.description || "",
        sectionsCount: Number(item.sectionsCount || 0),
        requiredSectionsCount: Number(item.requiredSectionsCount || 0),
        testsCount: Number(item.testsCount || 0),
        availabilityMode: item.availabilityMode || "unlimited",
        availabilityDays: Number(item.availabilityDays || 0),
        availabilityFrom: item.availabilityFrom || null,
        availabilityTo: item.availabilityTo || null,
        progress: {
          status: item.progress?.status || "not_started",
          progressPercent: Number(item.progress?.progressPercent || 0),
          completedSectionsCount: Number(item.progress?.completedSectionsCount || 0),
          totalSectionsCount: Number(item.progress?.totalSectionsCount || 0),
          assignedAt: item.progress?.assignedAt || null,
          deadlineAt: item.progress?.deadlineAt || null,
        },
      };
    }

    async function loadAssessments() {
      if (!userStore.isInitialized) {
        await userStore.ensureStatus();
      }

      isLoading.value = true;
      try {
        const { assessments: response } = await apiClient.listUserAssessments();
        assessments.value = (response || []).map((item) => normalizeAssessment(item)).filter(Boolean);
      } catch (error) {
        console.error("Не удалось загрузить список аттестаций", error);
        assessments.value = [];
      } finally {
        isLoading.value = false;
      }
    }

    async function loadCourses() {
      isCoursesLoading.value = true;
      try {
        const { courses: response } = await apiClient.listCourses();
        courses.value = (response || []).map((item) => normalizeCourse(item)).filter(Boolean);
      } catch (error) {
        console.error("Не удалось загрузить список курсов", error);
        courses.value = [];
      } finally {
        isCoursesLoading.value = false;
      }
    }

    onMounted(() => {
      loadAssessments();
      loadCourses();
    });

    return {
      activeMode,
      assessments,
      courses,
      activeFilter,
      filters,
      isLoading,
      isCoursesLoading,
      filteredAssessments,
      setMode,
      setFilter,
      getStatusClass,
      getStatusText,
      hasAttemptsLeft,
      formatAttemptsLabel,
      getActionButtonText,
      getStartButtonText,
      getEmptyStateTitle,
      getEmptyStateDescription,
      formatDateRange,
      handleAssessmentClick,
      startAssessment,
      viewResults,
      openTheory,
      openCourse,
    };
  },
};
</script>

<style scoped>
.page-header {
  padding-top: 20px;
}

.mode-switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 4px;
  background-color: var(--bg-secondary);
  border-radius: 10px;
}

.mode-tab {
  border: none;
  background: none;
  padding: 10px 12px;
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 600;
}

.mode-tab.active {
  color: var(--text-primary);
  background: var(--bg-primary);
  box-shadow: 0 1px 3px var(--card-shadow);
}

.filter-tabs {
  display: flex;
  gap: 8px;
  padding: 4px;
  background-color: var(--bg-secondary);
  border-radius: 10px;
}

.filter-tab {
  flex: 1;
  padding: 8px 12px;
  border: none;
  background: none;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-tab.active {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  box-shadow: 0 1px 3px var(--card-shadow);
}

.loading-state {
  text-align: center;
}

.assessments-list {
  display: flex;
  flex-direction: column;
}

.assessment-card {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.assessment-card:hover {
  transform: translateY(-2px);
}

.assessment-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.theory-hint {
  font-size: 12px;
  color: var(--warning, #ff9500);
  margin: 0;
}

.theory-hint.done {
  color: var(--success);
}

.assessment-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label {
  font-size: 14px;
  color: var(--text-secondary);
}

.value {
  font-size: 14px;
  font-weight: 500;
}

.value.success {
  color: var(--success);
}

.value.error {
  color: var(--error);
}

.best-result {
  padding: 8px 12px;
  background-color: var(--bg-primary);
  border-radius: 8px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.empty-icon svg {
  width: 64px;
  height: 64px;
}

.text-secondary {
  color: var(--text-secondary);
}

@media (max-width: 480px) {
  .filter-tab {
    padding: 6px 8px;
    font-size: 13px;
  }

  .assessment-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>

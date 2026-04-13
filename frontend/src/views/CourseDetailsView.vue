<template>
  <div class="page-container">
    <div class="container">
      <div v-if="isLoading" class="card loading-state">
        <p class="body-small text-secondary">Загрузка курса...</p>
      </div>

      <template v-else-if="course">
        <div class="page-header mb-12">
          <h1 class="title-large">{{ course.title }}</h1>
          <p class="body-small text-secondary">{{ course.description || "Описание курса пока не добавлено" }}</p>
        </div>

        <div class="card card-large mb-12">
          <div class="summary-row mb-8">
            <span class="body-small text-secondary">Прогресс</span>
            <span class="body-small">{{ Math.round(course.progress.progressPercent || 0) }}%</span>
          </div>
          <div class="progress-bar mb-12">
            <div class="progress-fill" :style="{ width: `${Math.min(Math.max(course.progress.progressPercent || 0, 0), 100)}%` }"></div>
          </div>
          <div class="summary-row mb-16">
            <span class="body-small text-secondary">Пройдено модулей</span>
            <span class="body-small">{{ course.progress.completedModulesCount || 0 }} / {{ course.progress.totalModulesCount || 0 }}</span>
          </div>

          <button v-if="course.progress.status === 'not_started'" class="btn btn-primary btn-full" :disabled="isStarting" @click="startCourseFlow">
            {{ isStarting ? "Запускаем..." : "Начать прохождение" }}
          </button>
          <button v-else class="btn btn-secondary btn-full" @click="scrollToModules">Продолжить по модулям</button>
        </div>

        <div id="modules-list" class="card mb-12">
          <h3 class="title-small mb-12">Модули курса</h3>

          <div v-if="!course.modules.length" class="empty-state">
            <p class="body-small text-secondary">В курсе пока нет модулей.</p>
          </div>

          <div v-else class="modules-list">
            <div v-for="(moduleItem, index) in course.modules" :key="moduleItem.id" class="module-card">
              <div class="module-head">
                <div class="module-order">Шаг {{ index + 1 }}</div>
                <span class="badge" :class="getModuleStatusClass(moduleItem.progress.status)">
                  {{ getModuleStatusText(moduleItem.progress.status) }}
                </span>
              </div>

              <h4 class="title-small mb-8">{{ moduleItem.title }}</h4>
              <p v-if="moduleItem.description" class="body-small text-secondary mb-12">{{ moduleItem.description }}</p>

              <div class="module-meta mb-12">
                <div class="info-item">
                  <span class="label">Оценка времени:</span>
                  <span class="value">{{ moduleItem.estimatedMinutes ? `${moduleItem.estimatedMinutes} мин` : "—" }}</span>
                </div>
                <div class="info-item">
                  <span class="label">Попыток:</span>
                  <span class="value">{{ moduleItem.progress.attemptCount || 0 }}</span>
                </div>
              </div>

              <p v-if="isModuleLocked(index)" class="body-small lock-text mb-8">Сначала завершите предыдущие обязательные модули</p>

              <button class="btn btn-primary btn-full" :disabled="isModuleLocked(index) || !moduleItem.assessmentId" @click="openModuleAssessment(moduleItem)">
                {{ getModuleActionText(moduleItem, index) }}
              </button>
            </div>
          </div>
        </div>

        <div class="card">
          <h3 class="title-small mb-12">Итоговая аттестация</h3>
          <p class="body-small text-secondary mb-12">
            Доступ откроется после прохождения обязательных модулей: {{ course.finalAssessment.passedRequiredModules || 0 }} /
            {{ course.finalAssessment.totalRequiredModules || 0 }}
          </p>

          <p v-if="!course.finalAssessment.available" class="body-small lock-text mb-12">
            {{ getFinalReasonText(course.finalAssessment.reason) }}
          </p>

          <button class="btn btn-primary btn-full" :disabled="!course.finalAssessment.available || !course.finalAssessment.id" @click="openFinalAssessment">
            {{ getFinalActionText() }}
          </button>
        </div>
      </template>

      <div v-else class="card empty-state">
        <h3 class="title-small mb-8">Курс не найден</h3>
        <p class="body-small text-secondary mb-12">Возможно, курс был скрыт или недоступен для вашей роли.</p>
        <router-link to="/assessments" class="btn btn-primary btn-full">Вернуться к обучению</router-link>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { apiClient } from "../services/apiClient";
import { useTelegramStore } from "../stores/telegram";
import { useUserStore } from "../stores/user";

const COURSE_COMPLETION_STORAGE_KEY = "courseCompletionContext";

export default {
  name: "CourseDetailsView",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const telegramStore = useTelegramStore();
    const userStore = useUserStore();

    const isLoading = ref(false);
    const isStarting = ref(false);
    const course = ref(null);
    const assessmentsMap = ref(new Map());

    const courseId = computed(() => Number(route.params.id));

    function normalizeAssessmentSummary(item) {
      return {
        id: Number(item.id),
        status: item.status,
        requiresTheory: Boolean(item.theory?.completionRequired),
        theoryCompleted: Boolean(item.theory?.completedAt),
      };
    }

    function getAssessmentSummary(assessmentId) {
      return assessmentsMap.value.get(Number(assessmentId)) || null;
    }

    function getModuleStatusClass(status) {
      switch (status) {
        case "completed":
          return "badge-success";
        case "in_progress":
          return "badge-primary";
        case "failed":
          return "badge-error";
        default:
          return "badge-neutral";
      }
    }

    function getModuleStatusText(status) {
      switch (status) {
        case "completed":
          return "Пройден";
        case "in_progress":
          return "В процессе";
        case "failed":
          return "Не пройден";
        default:
          return "Не начат";
      }
    }

    function isModuleLocked(index) {
      if (!course.value?.modules?.length) {
        return true;
      }

      return course.value.modules.slice(0, index).some((moduleItem) => moduleItem.isRequired && moduleItem.progress?.status !== "completed");
    }

    function getModuleActionText(moduleItem, index) {
      if (!moduleItem.assessmentId) {
        return "Аттестация не назначена";
      }

      if (isModuleLocked(index)) {
        return "Недоступно";
      }

      const summary = getAssessmentSummary(moduleItem.assessmentId);
      if (summary?.requiresTheory && !summary.theoryCompleted) {
        return "К теории модуля";
      }

      if (moduleItem.progress?.status === "completed") {
        return "Пройти модуль снова";
      }

      return "К аттестации модуля";
    }

    function getFinalReasonText(reason) {
      switch (reason) {
        case "REQUIRED_MODULES_NOT_PASSED":
          return "Сначала завершите все обязательные модули курса.";
        case "COURSE_NOT_PUBLISHED":
          return "Итоговая аттестация пока недоступна.";
        case "FINAL_ASSESSMENT_NOT_ASSIGNED":
          return "Итоговая аттестация еще не назначена.";
        default:
          return "Итоговая аттестация пока недоступна.";
      }
    }

    function getFinalActionText() {
      if (!course.value?.finalAssessment?.id) {
        return "Итоговая аттестация не назначена";
      }
      if (!course.value.finalAssessment.available) {
        return "Итоговая аттестация недоступна";
      }

      const summary = getAssessmentSummary(course.value.finalAssessment.id);
      if (summary?.requiresTheory && !summary.theoryCompleted) {
        return "К теории итоговой аттестации";
      }

      return "Перейти к итоговой аттестации";
    }

    async function ensureCourseStarted() {
      if (!course.value || course.value.progress?.status !== "not_started") {
        return;
      }

      isStarting.value = true;
      try {
        const response = await apiClient.startCourse(courseId.value);
        course.value = response?.course || course.value;
      } finally {
        isStarting.value = false;
      }
    }

    async function loadCourse() {
      const id = courseId.value;
      if (!Number.isFinite(id) || id <= 0) {
        course.value = null;
        return;
      }

      isLoading.value = true;
      try {
        if (!userStore.isInitialized) {
          await userStore.ensureStatus();
        }

        const [courseResponse, assessmentsResponse] = await Promise.all([apiClient.getCourseById(id), apiClient.listUserAssessments()]);
        course.value = courseResponse?.course || null;

        const nextMap = new Map();
        for (const item of assessmentsResponse?.assessments || []) {
          nextMap.set(Number(item.id), normalizeAssessmentSummary(item));
        }
        assessmentsMap.value = nextMap;
      } catch (error) {
        console.error("Не удалось загрузить курс", error);
        telegramStore.showAlert(error.message || "Не удалось загрузить курс");
        course.value = null;
      } finally {
        isLoading.value = false;
      }
    }

    function persistCompletionContext(payload) {
      try {
        window.sessionStorage.setItem(COURSE_COMPLETION_STORAGE_KEY, JSON.stringify(payload));
      } catch (error) {
        console.warn("Не удалось сохранить контекст курса", error);
      }
    }

    async function openAssessmentFlow(assessmentId, completionContext) {
      if (!assessmentId) {
        telegramStore.showAlert("Аттестация для этого шага не назначена");
        return;
      }

      try {
        await ensureCourseStarted();
      } catch (error) {
        telegramStore.showAlert(error.message || "Не удалось запустить курс");
        return;
      }

      persistCompletionContext(completionContext);

      const summary = getAssessmentSummary(assessmentId);
      if (summary?.requiresTheory && !summary.theoryCompleted) {
        router.push(`/assessment/${assessmentId}/theory`);
        return;
      }

      router.push(`/assessment/${assessmentId}`);
    }

    function openModuleAssessment(moduleItem) {
      if (!moduleItem || !moduleItem.assessmentId) {
        return;
      }

      openAssessmentFlow(moduleItem.assessmentId, {
        type: "module",
        courseId: courseId.value,
        moduleId: moduleItem.id,
        assessmentId: moduleItem.assessmentId,
        createdAt: Date.now(),
      });
    }

    function openFinalAssessment() {
      const finalAssessmentId = course.value?.finalAssessment?.id;
      if (!course.value?.finalAssessment?.available || !finalAssessmentId) {
        return;
      }

      openAssessmentFlow(finalAssessmentId, {
        type: "final",
        courseId: courseId.value,
        finalAssessmentId,
        createdAt: Date.now(),
      });
    }

    async function startCourseFlow() {
      try {
        await ensureCourseStarted();
        telegramStore.hapticFeedback("notification", "success");
        await loadCourse();
      } catch (error) {
        telegramStore.showAlert(error.message || "Не удалось начать курс");
      }
    }

    function scrollToModules() {
      const target = document.getElementById("modules-list");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    onMounted(() => {
      loadCourse();
    });

    return {
      isLoading,
      isStarting,
      course,
      getModuleStatusClass,
      getModuleStatusText,
      getModuleActionText,
      isModuleLocked,
      getFinalReasonText,
      getFinalActionText,
      openModuleAssessment,
      openFinalAssessment,
      startCourseFlow,
      scrollToModules,
    };
  },
};
</script>

<style scoped>
.page-header {
  padding-top: 20px;
}

.loading-state,
.empty-state {
  text-align: center;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modules-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.module-card {
  border: 1px solid var(--divider);
  border-radius: 12px;
  padding: 12px;
}

.module-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.module-order {
  font-size: 12px;
  color: var(--text-secondary);
}

.module-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.label {
  font-size: 13px;
  color: var(--text-secondary);
}

.value {
  font-size: 13px;
  color: var(--text-primary);
}

.lock-text {
  color: var(--warning, #ff9500);
}

.text-secondary {
  color: var(--text-secondary);
}
</style>

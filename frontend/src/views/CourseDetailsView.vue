<template>
  <div class="page-container">
    <div class="container">
      <div v-if="isLoading" class="card loading-state">
        <p class="body-small text-secondary">Загрузка курса...</p>
      </div>

      <template v-else-if="course">
        <section class="course-hero mb-12">
          <div class="hero-cover" :style="heroStyle">
            <div class="hero-top-actions">
              <router-link to="/assessments" class="hero-circle-btn" aria-label="Назад">←</router-link>
              <div class="hero-right-actions">
                <button class="hero-circle-btn" type="button" @click="showCourseDownload">⇩</button>
                <button class="hero-circle-btn" type="button" @click="showCourseDiscussion">💬</button>
              </div>
            </div>
          </div>

          <div class="hero-summary card card-large">
            <p class="hero-kicker">Программа обучения</p>
            <h1 class="title-large mb-8">{{ course.title }}</h1>
            <p class="body-medium text-secondary mb-12">{{ course.description || "Описание курса пока не добавлено" }}</p>
            <button class="btn btn-secondary btn-full" type="button" @click="openCourseInfo">
              Подробнее о программе
            </button>
          </div>
        </section>

        <section class="course-progress card card-large mb-12">
          <div class="course-progress__main">
            <p class="course-progress__value">{{ Math.round(course.progress.progressPercent || 0) }}%</p>
            <div class="progress-bar mb-8">
              <div class="progress-fill" :style="{ width: `${Math.min(Math.max(course.progress.progressPercent || 0, 0), 100)}%` }"></div>
            </div>
            <p class="body-small text-secondary">
              Пройдено тем курса: {{ course.progress.completedSectionsCount || 0 }} / {{ course.progress.totalSectionsCount || 0 }}
            </p>
          </div>

          <div class="course-progress__side">
            <button class="progress-action" type="button" @click="showCourseDownload">
              <span class="progress-action__icon">⇩</span>
              <span class="progress-action__label">Скачать</span>
            </button>
            <button class="progress-action" type="button" @click="showCourseDiscussion">
              <span class="progress-action__icon">💬</span>
              <span class="progress-action__label">Обсудить</span>
            </button>
          </div>
        </section>

        <section id="sections-list" class="mb-12">
          <div class="sections-header mb-8">
            <p class="body-medium">Путь прохождения</p>
            <span class="body-small text-secondary">{{ getCourseValidityLabel(course) }}</span>
          </div>

          <div v-if="!course.sections.length" class="card empty-state">
            <p class="body-small text-secondary">В курсе пока нет тем.</p>
          </div>

          <div v-else class="sections-timeline">
            <article
              v-for="(section, sectionIndex) in course.sections"
              :key="section.id"
              class="timeline-row"
              :class="{
                'is-locked': section.progress.locked,
                'is-passed': section.progress.status === 'passed',
              }"
            >
              <div class="timeline-marker">
                <span class="marker-dot">{{ getSectionMarker(section) }}</span>
                <span class="marker-line" aria-hidden="true"></span>
              </div>

              <button class="timeline-card" type="button" @click="openSectionEntry(section)">
                <div class="timeline-thumb">{{ sectionIndex + 1 }}</div>
                <div class="timeline-content">
                  <h3 class="timeline-title">{{ section.title }}</h3>
                  <p class="timeline-subtitle">{{ getSectionSubtitle(section, sectionIndex) }}</p>
                </div>
                <span class="timeline-status">{{ getSectionStatusText(section.progress.status, section.progress.locked) }}</span>
              </button>
            </article>
          </div>
        </section>

        <div class="card card-large">
          <h3 class="title-small mb-8">Итоговая аттестация</h3>
          <p class="body-small text-secondary mb-12">
            Доступ откроется после прохождения обязательных тем курса: {{ course.finalAssessment.passedRequiredSections || 0 }} /
            {{ course.finalAssessment.totalRequiredSections || 0 }}
          </p>

          <p v-if="!course.finalAssessment.available" class="body-small lock-text mb-12">
            {{ getFinalReasonText(course.finalAssessment.reason) }}
          </p>

          <button
            class="btn btn-primary btn-full"
            :disabled="!course.finalAssessment.available || !course.finalAssessment.id"
            @click="openFinalAssessment"
          >
            {{ getFinalActionText() }}
          </button>
        </div>
      </template>

      <div v-else class="card empty-state">
        <h3 class="title-small mb-8">Курс не найден</h3>
        <p class="body-small text-secondary mb-12">Возможно, курс был скрыт или недоступен для вашей роли.</p>
        <router-link to="/assessments" class="btn btn-primary btn-full">Вернуться к обучению</router-link>
      </div>

      <div v-if="attemptResultModal.visible" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-body text-center">
            <h2 class="title-medium mb-16">{{ attemptResultModal.passed ? "Тест пройден" : "Тест не пройден" }}</h2>
            <p class="body-medium mb-8">{{ attemptResultModal.title }}</p>
            <p class="body-small text-secondary mb-20">
              Результат: <strong>{{ attemptResultModal.score }}%</strong>, попытка №{{ attemptResultModal.attemptNumber }}
            </p>
            <button class="btn btn-primary btn-full" @click="closeAttemptResultModal">Продолжить курс</button>
          </div>
        </div>
      </div>

      <BottomSheet v-model="lockSheet.visible" :title="lockSheet.title" :description="lockSheet.description" />

      <StickyFooterCTA
        :hidden="!course"
        :label="stickyActionLabel"
        :disabled="stickyActionDisabled"
        @action="handleStickyAction"
      />
    </div>
  </div>
</template>

<script>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { apiClient } from "../services/apiClient";
import { useTelegramStore } from "../stores/telegram";
import { useUserStore } from "../stores/user";
import BottomSheet from "../components/courses/BottomSheet.vue";
import StickyFooterCTA from "../components/courses/StickyFooterCTA.vue";

const COURSE_COMPLETION_STORAGE_KEY = "courseCompletionContext";

function mapLockReasonToStatus(lockReasonType) {
  if (!lockReasonType) {
    return "sequence_blocked";
  }
  if (lockReasonType === "course_closed") {
    return "course_closed";
  }
  if (lockReasonType === "expired") {
    return "course_expired";
  }
  if (lockReasonType === "attempts_exhausted") {
    return "attempts_exhausted";
  }
  return "sequence_blocked";
}

export default {
  name: "CourseDetailsView",
  components: {
    BottomSheet,
    StickyFooterCTA,
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const telegramStore = useTelegramStore();
    const userStore = useUserStore();

    const isLoading = ref(false);
    const isStarting = ref(false);
    const course = ref(null);
    const assessmentsMap = ref(new Map());

    const lockSheet = ref({
      visible: false,
      title: "Тема недоступна",
      description: "Сначала завершите предыдущую обязательную тему курса. После этого доступ откроется автоматически.",
    });

    const attemptResultModal = ref({
      visible: false,
      title: "",
      score: 0,
      passed: false,
      attemptNumber: 1,
    });

    const courseId = computed(() => Number(route.params.id));

    const heroStyle = computed(() => {
      const hue = ((course.value?.id || 1) * 53) % 360;
      return {
        background: `linear-gradient(140deg, hsl(${hue} 52% 36%), hsl(${(hue + 40) % 360} 44% 22%))`,
      };
    });

    const stickyActionLabel = computed(() => {
      if (!course.value) return "Продолжить";
      if (isStarting.value) return "Запускаем...";
      if (course.value.progress?.status === "closed") return "Курс закрыт";
      if (course.value.progress?.status === "completed") return "Курс завершен";
      if (course.value.progress?.status === "not_started") return "Начать обучение";
      return "Продолжить обучение";
    });

    const stickyActionDisabled = computed(() => {
      if (!course.value) return true;
      if (isStarting.value) return true;
      return false;
    });

    function openCourseInfo() {
      const infoText = [
        `Статус: ${getCourseStatusText(course.value?.progress?.status)}`,
        `Срок действия: ${getCourseValidityLabel(course.value)}`,
        `Тем курса: ${course.value?.sections?.length || 0}`,
      ].join("\n");

      telegramStore.showAlert(infoText);
    }

    function showCourseDownload() {
      telegramStore.showAlert("Скачивание материалов будет добавлено отдельным этапом. Сейчас доступно онлайн-прохождение курса.");
    }

    function showCourseDiscussion() {
      telegramStore.showAlert("Обсуждение курса будет доступно после подключения чата. Пока используйте комментарии в рабочем чате.");
    }

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

    function getCourseStatusText(status) {
      if (status === "completed") return "Завершен";
      if (status === "in_progress") return "В процессе";
      if (status === "closed") return "Закрыт";
      return "Не начат";
    }

    function getCourseValidityLabel(currentCourse) {
      if (!currentCourse) return "—";
      if (currentCourse.progress?.deadlineAt) {
        const deadline = new Date(currentCourse.progress.deadlineAt);
        if (!Number.isNaN(deadline.getTime())) {
          return `до ${deadline.toLocaleDateString("ru-RU")}`;
        }
      }
      if (currentCourse.availabilityMode === "fixed_dates" && currentCourse.availabilityFrom && currentCourse.availabilityTo) {
        return `${new Date(currentCourse.availabilityFrom).toLocaleDateString("ru-RU")} - ${new Date(currentCourse.availabilityTo).toLocaleDateString("ru-RU")}`;
      }
      if (currentCourse.availabilityMode === "relative_days" && Number(currentCourse.availabilityDays || 0) > 0) {
        return `${currentCourse.availabilityDays} дн. от назначения`;
      }
      return "Бессрочно";
    }

    function getSectionStatusText(status, locked) {
      if (locked) return "Закрыто";
      if (status === "passed") return "Пройдена";
      if (status === "in_progress") return "В процессе";
      if (status === "failed") return "Не пройдена";
      return "Не начата";
    }

    function getSectionSubtitle(section, index) {
      const topicsCount = section?.topics?.length || 0;
      const suffix = section?.isRequired ? "обязательная" : "необязательная";
      return `Тема ${index + 1} · ${topicsCount} подтем · ${suffix}`;
    }

    function getSectionMarker(section) {
      if (section.progress.locked) return "🔒";
      if (section.progress.status === "passed") return "✓";
      if (section.progress.status === "in_progress") return "▶";
      return "•";
    }

    function openSectionLockReason(section = null) {
      lockSheet.value = {
        visible: true,
        title: "Тема недоступна",
        description: section?.progress?.lockReasonText || "Сначала завершите предыдущую обязательную тему курса. После этого доступ откроется автоматически.",
      };
    }

    function openSectionPage(section) {
      if (!section?.id) return;
      router.push(`/courses/${courseId.value}/topics/${section.id}`);
    }

    function openSectionEntry(section) {
      if (!section) {
        return;
      }

      if (section.progress?.locked) {
        const statusType = mapLockReasonToStatus(section.progress.lockReasonType);
        router.push(`/courses/${courseId.value}/status/${statusType}`);
        return;
      }

      openSectionPage(section);
    }

    function getFinalReasonText(reason) {
      switch (reason) {
        case "COURSE_CLOSED_BY_ADMIN":
          return "Курс закрыт администратором.";
        case "REQUIRED_MODULES_NOT_PASSED":
          return "Сначала завершите все обязательные темы курса.";
        case "COURSE_NOT_PUBLISHED":
          return "Итоговая аттестация пока недоступна.";
        case "FINAL_ASSESSMENT_NOT_ASSIGNED":
          return "Итоговая аттестация еще не назначена.";
        default:
          return "Итоговая аттестация пока недоступна.";
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

    function openSectionAssessment(section) {
      if (!section?.assessmentId) return;
      openAssessmentFlow(section.assessmentId, {
        type: "section",
        courseId: courseId.value,
        sectionId: section.id,
        assessmentId: section.assessmentId,
        createdAt: Date.now(),
      });
    }

    function getFinalActionText() {
      if (!course.value?.finalAssessment?.id) return "Итоговая аттестация не назначена";
      if (!course.value.finalAssessment.available) return "Итоговая аттестация недоступна";
      const summary = getAssessmentSummary(course.value.finalAssessment.id);
      if (summary?.requiresTheory && !summary.theoryCompleted) return "К теории итоговой аттестации";
      return "Перейти к итоговой аттестации";
    }

    function openFinalAssessment() {
      const finalAssessmentId = course.value?.finalAssessment?.id;
      if (!course.value?.finalAssessment?.available || !finalAssessmentId) return;
      openAssessmentFlow(finalAssessmentId, {
        type: "final",
        courseId: courseId.value,
        finalAssessmentId,
        createdAt: Date.now(),
      });
    }

    async function ensureCourseStarted() {
      if (!course.value || course.value.progress?.status !== "not_started") return;
      isStarting.value = true;
      try {
        const response = await apiClient.startCourse(courseId.value);
        course.value = response?.course || course.value;
      } finally {
        isStarting.value = false;
      }
    }

    function resolveNextStep() {
      if (!course.value) {
        return null;
      }

      for (const section of course.value.sections || []) {
        if (section.progress?.locked) {
          continue;
        }

        const nextTopic = (section.topics || []).find((topic) => !topic.progress?.locked && topic.progress?.status !== "completed");
        if (nextTopic) {
          return {
            type: "topic",
            sectionId: section.id,
            topicId: nextTopic.id,
          };
        }

        if (section.progress?.sectionTestAvailable && section.assessmentId) {
          return {
            type: "section_assessment",
            section,
          };
        }

        if (section.progress?.status !== "passed") {
          return {
            type: "section",
            sectionId: section.id,
          };
        }
      }

      if (course.value.finalAssessment?.available && course.value.finalAssessment?.id) {
        return { type: "final_assessment" };
      }

      return null;
    }

    async function navigateToNextStep() {
      const nextStep = resolveNextStep();
      if (!nextStep) {
        return false;
      }

      if (nextStep.type === "topic") {
        router.push(`/courses/${courseId.value}/topics/${nextStep.sectionId}/subtopics/${nextStep.topicId}`);
        return true;
      }

      if (nextStep.type === "section") {
        router.push(`/courses/${courseId.value}/topics/${nextStep.sectionId}`);
        return true;
      }

      if (nextStep.type === "section_assessment") {
        openSectionAssessment(nextStep.section);
        return true;
      }

      if (nextStep.type === "final_assessment") {
        openFinalAssessment();
        return true;
      }

      return false;
    }

    function scrollToSections() {
      const target = document.getElementById("sections-list");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    async function handleStickyAction() {
      if (!course.value || stickyActionDisabled.value) return;
      if (course.value.progress?.status === "completed") {
        router.push(`/courses/${courseId.value}/status/course_completed`);
        return;
      }
      if (course.value.progress?.status === "closed") {
        router.push(`/courses/${courseId.value}/status/course_closed`);
        return;
      }

      if (course.value.progress?.status === "not_started") {
        try {
          await ensureCourseStarted();
        } catch (error) {
          telegramStore.showAlert(error.message || "Не удалось начать курс");
          return;
        }
      }

      const moved = await navigateToNextStep();
      if (!moved) {
        scrollToSections();
      }
    }

    function closeAttemptResultModal() {
      attemptResultModal.value.visible = false;
    }

    function consumeAttemptResultQuery() {
      const resultType = String(route.query.resultType || "");
      if (!["topic", "section", "module"].includes(resultType)) {
        return;
      }

      const score = Number(route.query.score || 0);
      const passed = String(route.query.passed || "0") === "1";
      const attemptNumber = Number(route.query.attemptNumber || 1);
      const titleByType = {
        topic: "Результат теста подтемы",
        section: "Результат теста темы курса",
        module: "Результат теста темы курса",
      };

      attemptResultModal.value = {
        visible: true,
        title: titleByType[resultType] || "Результат теста",
        score: Number.isFinite(score) ? score : 0,
        passed,
        attemptNumber: Number.isFinite(attemptNumber) && attemptNumber > 0 ? attemptNumber : 1,
      };

      const nextQuery = { ...route.query };
      delete nextQuery.resultType;
      delete nextQuery.score;
      delete nextQuery.passed;
      delete nextQuery.attemptNumber;
      router.replace({ path: route.path, query: nextQuery });
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

        consumeAttemptResultQuery();
      } catch (error) {
        console.error("Не удалось загрузить курс", error);
        telegramStore.showAlert(error.message || "Не удалось загрузить курс");
        course.value = null;
      } finally {
        isLoading.value = false;
      }
    }

    onMounted(() => {
      loadCourse();
    });

    watch(
      () => [route.query.resultType, route.query.score, route.query.passed, route.query.attemptNumber],
      () => {
        consumeAttemptResultQuery();
      },
    );

    return {
      isLoading,
      isStarting,
      course,
      lockSheet,
      heroStyle,
      stickyActionLabel,
      stickyActionDisabled,
      handleStickyAction,
      getCourseValidityLabel,
      getSectionStatusText,
      getSectionSubtitle,
      getSectionMarker,
      openSectionEntry,
      getFinalReasonText,
      getFinalActionText,
      openFinalAssessment,
      openCourseInfo,
      showCourseDownload,
      showCourseDiscussion,
      attemptResultModal,
      closeAttemptResultModal,
    };
  },
};
</script>

<style scoped>
.loading-state,
.empty-state {
  text-align: center;
}

.course-hero {
  border-radius: 22px;
  overflow: hidden;
  background: var(--bg-secondary);
  border: 1px solid var(--divider);
}

.hero-cover {
  min-height: 220px;
  padding: 12px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.hero-top-actions {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.hero-right-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hero-circle-btn {
  width: 42px;
  height: 42px;
  border: none;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.88);
  color: #0f172a;
  text-decoration: none;
  font-size: 20px;
  cursor: pointer;
}

.hero-summary {
  border-radius: 20px 20px 0 0;
  margin-bottom: 0;
  border-bottom: none;
}

.hero-kicker {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.course-progress {
  display: grid;
  grid-template-columns: 1fr 180px;
  gap: 12px;
  align-items: stretch;
}

.course-progress__value {
  font-size: 34px;
  line-height: 1;
  font-weight: 700;
  margin-bottom: 8px;
}

.course-progress__side {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.progress-action {
  border: 1px solid var(--divider);
  border-radius: 12px;
  background: var(--bg-primary);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  padding: 10px;
  cursor: pointer;
}

.progress-action__icon {
  font-size: 16px;
}

.progress-action__label {
  font-size: 14px;
}

.sections-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sections-timeline {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.timeline-row {
  display: grid;
  grid-template-columns: 24px 1fr;
  gap: 10px;
}

.timeline-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.marker-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #dbe2f8;
  color: #1e3a8a;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.marker-line {
  width: 2px;
  flex: 1;
  margin-top: 6px;
  background: repeating-linear-gradient(
    to bottom,
    #d1d5db 0,
    #d1d5db 5px,
    transparent 5px,
    transparent 10px
  );
}

.timeline-row:last-child .marker-line {
  display: none;
}

.timeline-card {
  width: 100%;
  border: 1px solid var(--divider);
  border-radius: 14px;
  background: var(--bg-primary);
  color: var(--text-primary);
  padding: 10px;
  display: grid;
  grid-template-columns: 52px 1fr auto;
  align-items: center;
  gap: 10px;
  text-align: left;
  cursor: pointer;
}

.timeline-thumb {
  width: 52px;
  height: 52px;
  border-radius: 10px;
  background: linear-gradient(145deg, #dbeafe, #bfdbfe);
  color: #1e40af;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.timeline-title {
  margin: 0;
  font-size: 17px;
  line-height: 1.3;
}

.timeline-subtitle {
  margin: 3px 0 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.timeline-status {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.timeline-row.is-locked .marker-dot,
.timeline-row.is-locked .timeline-thumb {
  background: #e5e7eb;
  color: #6b7280;
}

.timeline-row.is-passed .marker-dot,
.timeline-row.is-passed .timeline-thumb {
  background: #d1fae5;
  color: #047857;
}

.lock-text {
  color: var(--warning, #ff9500);
}

.modal-content {
  background: var(--bg-primary);
  border-radius: 12px;
  width: min(92vw, 420px);
  padding: 20px;
}

@media (max-width: 640px) {
  .course-progress {
    grid-template-columns: 1fr;
  }

  .course-progress__side {
    grid-template-columns: 1fr 1fr;
  }

  .timeline-card {
    grid-template-columns: 46px 1fr;
  }

  .timeline-status {
    grid-column: 2 / 3;
  }
}
</style>

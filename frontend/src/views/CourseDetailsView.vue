<template>
  <div class="page-container">
    <div class="container">
      <!-- Скелетон при загрузке -->
      <template v-if="isLoading">
        <div class="sk-title"></div>
        <div class="sk-subtitle"></div>
        <div class="sk-subtitle sk-subtitle--short"></div>

        <div class="sk-progress-block">
          <div class="sk-progress-row">
            <div class="sk-line sk-line--label"></div>
            <div class="sk-line sk-line--percent"></div>
          </div>
          <div class="sk-bar"></div>
          <div class="sk-line sk-line--meta"></div>
        </div>

        <div class="sk-line sk-line--section-title"></div>

        <div class="sections-list">
          <div v-for="n in 4" :key="n" class="sk-section-card">
            <div class="sk-circle"></div>
            <div class="sk-line sk-line--section-name"></div>
            <div class="sk-line sk-line--count"></div>
          </div>
        </div>
      </template>

      <template v-else-if="course">
        <section class="course-header">
          <h1 class="course-title">{{ course.title }}</h1>
          <p v-if="course.description" class="course-description">{{ course.description }}</p>
        </section>

        <section class="course-progress">
          <div class="course-progress__row">
            <span class="progress-label">Прогресс курса</span>
            <span class="progress-percent">{{ Math.round(course.progress.progressPercent || 0) }}%</span>
          </div>
          <div class="progress-bar-wrap">
            <div class="progress-bar-fill" :style="{ width: `${Math.min(Math.max(course.progress.progressPercent || 0, 0), 100)}%` }"></div>
          </div>
          <p class="progress-hint">{{ course.progress.completedSectionsCount || 0 }} из {{ course.progress.totalSectionsCount || 0 }} тем</p>
        </section>

        <section id="sections-list">
          <h2 class="sections-list-title">Темы курса</h2>

          <div v-if="!course.sections.length" class="card empty-state">
            <p class="body-small text-secondary">В курсе пока нет тем.</p>
          </div>

          <div v-else class="sections-list">
            <button
              v-for="(section, sectionIndex) in course.sections"
              :key="section.id"
              class="section-card"
              :class="{
                'is-locked': section.progress.locked,
                'is-passed': section.progress.status === 'passed',
                'is-active': !section.progress.locked && section.progress.status !== 'passed',
              }"
              type="button"
              @click="openSectionEntry(section)"
            >
              <div class="section-number">
                <Check v-if="section.progress.status === 'passed'" :size="16" :stroke-width="2.5" />
                <span v-else>{{ sectionIndex + 1 }}</span>
              </div>
              <span class="section-title">{{ section.title }}</span>
              <span class="section-right">
                <Lock v-if="section.progress.locked" class="section-lock-icon" :size="18" />
                <span v-else class="section-count">{{ getSectionTopicsProgress(section) }}</span>
              </span>
            </button>
          </div>
        </section>

        <div class="final-assessment-card" :class="{ 'is-available': course.finalAssessment.available }">
          <div class="final-icon-wrap">
            <GraduationCap class="final-icon" :size="26" />
          </div>
          <div class="final-text">
            <span class="final-title">Итоговая аттестация</span>
            <span class="final-hint">Доступна после прохождения всех тем курса</span>
          </div>
          <button class="btn-final" :disabled="!course.finalAssessment.available || !course.finalAssessment.id" @click="openFinalAssessment">
            Перейти
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
    </div>
  </div>
</template>

<script>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Check, GraduationCap, Lock } from "lucide-vue-next";
import { apiClient } from "../services/apiClient";
import { useTelegramStore } from "../stores/telegram";
import { useUserStore } from "../stores/user";
import BottomSheet from "../components/courses/BottomSheet.vue";

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
    Check,
    GraduationCap,
    Lock,
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

    function getSectionTopicsProgress(section) {
      const topics = section?.topics || [];
      const total = topics.length;
      if (!total) return null;
      const completed = topics.filter((t) => t.progress?.status === "completed").length;
      return `${completed}/${total}`;
    }

    function openSectionLockReason(section = null) {
      lockSheet.value = {
        visible: true,
        title: "Тема недоступна",
        description:
          section?.progress?.lockReasonText || "Сначала завершите предыдущую обязательную тему курса. После этого доступ откроется автоматически.",
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
      router,
      isLoading,
      isStarting,
      course,
      lockSheet,
      stickyActionLabel,
      stickyActionDisabled,
      handleStickyAction,
      getCourseValidityLabel,
      getSectionStatusText,
      getSectionSubtitle,
      getSectionTopicsProgress,
      openSectionEntry,
      getFinalReasonText,
      getFinalActionText,
      openFinalAssessment,
      attemptResultModal,
      closeAttemptResultModal,
    };
  },
};
</script>

<style scoped>
/* ——— Заголовок курса ——— */
.course-header {
  margin-bottom: 20px;
  padding-top: 16px;
}

.course-title {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.25;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.course-description {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.45;
}

/* ——— Прогресс ——— */
.course-progress {
  margin-bottom: 24px;
}

.course-progress__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.progress-label {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
}

.progress-percent {
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary);
}

.progress-bar-wrap {
  width: 100%;
  height: 8px;
  background-color: var(--divider);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-bar-fill {
  height: 100%;
  background-color: #6355f5;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-hint {
  font-size: 14px;
  color: var(--text-secondary);
}

/* ——— Список тем ——— */
.sections-list-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px;
}

.sections-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.section-card {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1.5px solid var(--divider);
  background: var(--bg-primary);
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s;
}

.section-card.is-active {
  background: #f0eeff;
  border-color: #6355f5;
}

.section-card.is-locked {
  background: var(--bg-primary);
  border-color: var(--divider);
}

.section-number {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #ede9fe;
  color: #6355f5;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
}

.section-number :deep(svg) {
  display: block;
}

.section-card.is-passed .section-number {
  background: #d1fae5;
  color: #059669;
}

.section-card.is-locked .section-number {
  background: #f3f4f6;
  color: #9ca3af;
}

.section-title {
  flex: 1;
  font-size: 16px;
  font-weight: 500;
  line-height: 1.3;
  color: var(--text-primary);
}

.section-card.is-locked .section-title {
  color: var(--text-secondary);
}

.section-right {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.section-count {
  font-size: 14px;
  color: var(--text-secondary);
}

.section-lock-icon {
  color: #9ca3af;
}

/* ——— Итоговая аттестация ——— */
.final-assessment-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #ede9fe;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
}

.final-icon-wrap {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: #d8d0fb;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.final-icon {
  color: #6355f5;
}

.final-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.final-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.3;
}

.final-hint {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.35;
}

.btn-final {
  flex-shrink: 0;
  padding: 10px 18px;
  border-radius: 12px;
  border: none;
  background: #6355f5;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
  white-space: nowrap;
}

.btn-final:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* ——— Модалка ——— */
.empty-state {
  text-align: center;
}

.modal-content {
  background: var(--bg-primary);
  border-radius: 12px;
  width: min(92vw, 420px);
  padding: 20px;
}

/* ——— Скелетон ——— */
@keyframes sk-shimmer {
  0% {
    background-position: -300px 0;
  }
  100% {
    background-position: 300px 0;
  }
}

.sk-title,
.sk-subtitle,
.sk-bar,
.sk-circle,
.sk-line,
.sk-section-card {
  background: linear-gradient(90deg, #e8e8e8 25%, #f5f5f5 50%, #e8e8e8 75%);
  background-size: 600px 100%;
  animation: sk-shimmer 1.4s infinite linear;
  border-radius: 8px;
}

.sk-title {
  height: 28px;
  width: 75%;
  margin: 12px 0 10px;
}

.sk-subtitle {
  height: 14px;
  width: 90%;
  margin-bottom: 8px;
}

.sk-subtitle--short {
  width: 60%;
  margin-bottom: 24px;
}

.sk-progress-block {
  margin-bottom: 24px;
}

.sk-progress-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.sk-bar {
  height: 8px;
  width: 100%;
  border-radius: 4px;
  margin-bottom: 8px;
}

.sk-line {
  border-radius: 6px;
}

.sk-line--label {
  height: 16px;
  width: 110px;
}

.sk-line--percent {
  height: 16px;
  width: 40px;
}

.sk-line--meta {
  height: 14px;
  width: 80px;
}

.sk-line--section-title {
  height: 18px;
  width: 100px;
  margin-bottom: 14px;
}

.sk-section-card {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 62px;
  padding: 14px 16px;
  border-radius: 16px;
  background: #eeeeee;
}

.sk-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #d8d8d8;
  flex-shrink: 0;
  animation: sk-shimmer 1.4s infinite linear;
  background-size: 600px 100%;
}

.sk-line--section-name {
  flex: 1;
  height: 16px;
}

.sk-line--count {
  width: 30px;
  height: 14px;
}
</style>

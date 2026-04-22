<template>
  <div class="page-container">
    <div class="container material-container">
      <div v-if="isLoading" class="card loading-state">
        <p class="body-small text-secondary">Загрузка подтемы...</p>
      </div>

      <div v-else-if="errorText" class="card error-state">
        <h3 class="title-small mb-8">Не удалось загрузить подтему</h3>
        <p class="body-small text-secondary mb-12">{{ errorText }}</p>
        <button class="btn btn-primary btn-full" type="button" @click="loadSubtopic">Повторить</button>
      </div>

      <template v-else-if="topic">
        <section class="material-hero mb-12" :style="heroStyle">
          <div class="material-hero__top">
            <router-link class="hero-circle-btn" :to="`/courses/${courseId}/topics/${sectionId}`" aria-label="Назад">←</router-link>
            <div class="hero-right-actions">
              <button class="hero-circle-btn" type="button" @click="showDownloadInfo">⇩</button>
              <button class="hero-circle-btn" type="button" @click="showDiscussionInfo">💬</button>
            </div>
          </div>

          <div class="material-hero__content">
            <p class="material-brand">ПИЦЦАФАБРИКА</p>
            <h1 class="material-title">{{ topic.title }}</h1>
            <p class="material-subtitle">{{ section?.title || "Изучение материала" }}</p>
            <button class="hero-scroll" type="button" @click="scrollToMaterial">⌄</button>
          </div>
        </section>

        <section id="material-content" class="card card-large mb-12">
          <div class="summary-row mb-8">
            <span class="body-small text-secondary">Статус</span>
            <StatusBadge :status="topic.progress.status" :text="topicStatusText" />
          </div>

          <div class="summary-row mb-8">
            <span class="body-small text-secondary">Формат</span>
            <span class="body-small">{{ topicFormatText }}</span>
          </div>

          <div class="summary-row mb-12">
            <span class="body-small text-secondary">Порядок</span>
            <span class="body-small">Подтема {{ topic.orderIndex }}</span>
          </div>

          <div v-if="topic.hasMaterial" class="topic-content body-small mb-12" v-html="sanitizeContent(topic.content)"></div>

          <ReadingTimerNotice
            v-if="topic.hasMaterial"
            :remaining-seconds="remainingReadingSeconds"
            :required-seconds="requiredReadingSeconds"
            :completed="topic.progress.materialViewed"
          />

          <p v-if="actionHint" class="body-small text-secondary mt-12">{{ actionHint }}</p>
        </section>

        <section class="card card-large mb-12">
          <h3 class="title-small mb-12">Действия</h3>

          <button
            v-if="showCompleteMaterialButton"
            class="btn btn-primary btn-full mb-8"
            type="button"
            :disabled="isMaterialActionDisabled"
            @click="completeMaterial"
          >
            {{ completeMaterialLabel }}
          </button>

          <button
            v-if="showAssessmentButton"
            class="btn btn-primary btn-full mb-8"
            type="button"
            :disabled="isAssessmentDisabled"
            @click="openTopicAssessment"
          >
            {{ assessmentButtonLabel }}
          </button>

          <button class="btn btn-secondary btn-full" type="button" @click="goBackToTopic">К списку подтем</button>
        </section>
      </template>

      <div v-if="attemptResultModal.visible" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-body text-center">
            <h2 class="title-medium mb-16">{{ attemptResultModal.passed ? "Тест пройден" : "Тест не пройден" }}</h2>
            <p class="body-medium mb-8">Результат теста подтемы</p>
            <p class="body-small text-secondary mb-20">
              Результат: <strong>{{ attemptResultModal.score }}%</strong>, попытка №{{ attemptResultModal.attemptNumber }}
            </p>
            <button class="btn btn-primary btn-full" @click="closeAttemptResultModal">Продолжить</button>
          </div>
        </div>
      </div>

      <StickyFooterCTA
        :hidden="!topic"
        :label="primaryActionLabel"
        :disabled="isPrimaryActionDisabled"
        @action="handlePrimaryAction"
      />
    </div>
  </div>
</template>

<script>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import ReadingTimerNotice from "../components/courses/ReadingTimerNotice.vue";
import StatusBadge from "../components/courses/StatusBadge.vue";
import StickyFooterCTA from "../components/courses/StickyFooterCTA.vue";
import { apiClient } from "../services/apiClient";
import { useTelegramStore } from "../stores/telegram";
import { calculateReadingSeconds } from "../utils/readingTime";

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
  name: "SubtopicView",
  components: {
    ReadingTimerNotice,
    StatusBadge,
    StickyFooterCTA,
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const telegramStore = useTelegramStore();

    const isLoading = ref(false);
    const errorText = ref("");
    const section = ref(null);
    const topic = ref(null);
    const courseProgress = ref(null);
    const assessmentsMap = ref(new Map());

    const isCompletingMaterial = ref(false);
    const readingTimer = ref(null);
    const requiredReadingSeconds = ref(0);
    const remainingReadingSeconds = ref(0);

    const attemptResultModal = ref({
      visible: false,
      score: 0,
      passed: false,
      attemptNumber: 1,
    });

    const courseId = computed(() => Number(route.params.courseId || 0));
    const sectionId = computed(() => Number(route.params.sectionId || 0));
    const topicId = computed(() => Number(route.params.topicId || 0));

    const heroStyle = computed(() => {
      const hue = ((topic.value?.id || 1) * 47) % 360;
      return {
        background: `linear-gradient(145deg, hsl(${hue} 35% 30%), hsl(${(hue + 30) % 360} 30% 18%))`,
      };
    });

    const topicStatusText = computed(() => {
      if (!topic.value) return "Не начата";
      if (topic.value.progress.locked) return "Заблокирована";
      if (topic.value.progress.status === "completed") return "Завершена";
      if (topic.value.progress.status === "in_progress") return "В процессе";
      return "Не начата";
    });

    const topicFormatText = computed(() => {
      if (!topic.value) return "—";
      if (topic.value.hasMaterial && topic.value.assessmentId) return "Материал + тест";
      if (topic.value.hasMaterial) return "Материал";
      if (topic.value.assessmentId) return "Тест";
      return "Информационный шаг";
    });

    const showAssessmentButton = computed(() => Boolean(topic.value?.assessmentId));
    const showCompleteMaterialButton = computed(() => Boolean(topic.value?.hasMaterial) && !topic.value?.assessmentId);

    const isMaterialActionDisabled = computed(() => {
      if (!topic.value || !topic.value.hasMaterial) return true;
      if (isCompletingMaterial.value || topic.value.progress.materialViewed) return true;
      return remainingReadingSeconds.value > 0;
    });

    const isAssessmentDisabled = computed(() => {
      if (!topic.value?.assessmentId) return true;
      if (topic.value.hasMaterial && !topic.value.progress.materialViewed) return true;
      return false;
    });

    const completeMaterialLabel = computed(() => {
      if (isCompletingMaterial.value) {
        return "Фиксируем прогресс...";
      }
      if (topic.value?.progress?.materialViewed) {
        return "Материал завершен";
      }
      if (remainingReadingSeconds.value > 0) {
        return "Ожидайте завершения таймера";
      }
      return "Завершить подтему";
    });

    const assessmentButtonLabel = computed(() => {
      if (!topic.value?.assessmentId) return "Тест недоступен";
      if (topic.value.progress.status === "completed") return "Пройти снова";
      if (topic.value.progress.status === "failed") return "Повторить тест";
      return "Перейти к тесту";
    });

    const actionHint = computed(() => {
      if (!topic.value) return "";
      if (topic.value.progress.locked) {
        return topic.value.progress.lockReasonText || "Шаг временно недоступен";
      }
      if (topic.value.assessmentId && topic.value.hasMaterial && !topic.value.progress.materialViewed) {
        return "Сначала изучите материал и дождитесь завершения таймера чтения.";
      }
      if (topic.value.assessmentId) {
        return "После прохождения теста система обновит прогресс темы автоматически.";
      }
      if (topic.value.hasMaterial && !topic.value.progress.materialViewed) {
        return "После завершения таймера станет доступно завершение подтемы.";
      }
      return "";
    });

    const nextTopicId = computed(() => {
      if (!section.value || !topic.value) {
        return null;
      }

      const index = (section.value.topics || []).findIndex((item) => Number(item.id) === Number(topic.value.id));
      if (index < 0) {
        return null;
      }

      const nextTopic = (section.value.topics || [])[index + 1];
      if (!nextTopic || nextTopic.progress?.locked) {
        return null;
      }

      return nextTopic.id;
    });

    const primaryActionLabel = computed(() => {
      if (!topic.value) return "Продолжить";
      if (showAssessmentButton.value) return assessmentButtonLabel.value;
      if (showCompleteMaterialButton.value && !topic.value.progress.materialViewed) return completeMaterialLabel.value;
      if (nextTopicId.value) return "К следующему материалу";
      return "К списку подтем";
    });

    const isPrimaryActionDisabled = computed(() => {
      if (!topic.value) return true;
      if (showAssessmentButton.value) return isAssessmentDisabled.value;
      if (showCompleteMaterialButton.value && !topic.value.progress.materialViewed) return isMaterialActionDisabled.value;
      return false;
    });

    function sanitizeContent(content) {
      return content || "";
    }

    function showDownloadInfo() {
      telegramStore.showAlert("Скачивание этого материала будет добавлено отдельным этапом.");
    }

    function showDiscussionInfo() {
      telegramStore.showAlert("Обсуждение материала пока недоступно в этом экране.");
    }

    function scrollToMaterial() {
      const target = document.getElementById("material-content");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    function getAssessmentSummary(assessmentId) {
      return assessmentsMap.value.get(Number(assessmentId)) || null;
    }

    function stopReadingTimer() {
      if (readingTimer.value) {
        window.clearInterval(readingTimer.value);
        readingTimer.value = null;
      }
    }

    function syncReadingTimer(startedAtIso, requiredSeconds) {
      stopReadingTimer();

      const normalizedRequired = Math.max(0, Number(requiredSeconds || 0));
      requiredReadingSeconds.value = normalizedRequired;
      if (!normalizedRequired || !startedAtIso) {
        remainingReadingSeconds.value = 0;
        return;
      }

      const startedAtMs = new Date(startedAtIso).getTime();
      if (!Number.isFinite(startedAtMs)) {
        remainingReadingSeconds.value = normalizedRequired;
        return;
      }

      const update = () => {
        const elapsed = Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000));
        remainingReadingSeconds.value = Math.max(0, normalizedRequired - elapsed);
        if (remainingReadingSeconds.value === 0) {
          stopReadingTimer();
        }
      };

      update();
      readingTimer.value = window.setInterval(update, 1000);
    }

    async function ensureTopicStarted(activeTopic) {
      if (!activeTopic?.hasMaterial || activeTopic.progress.materialViewed) {
        requiredReadingSeconds.value = 0;
        remainingReadingSeconds.value = 0;
        stopReadingTimer();
        return;
      }

      const response = await apiClient.startCourseTopic(courseId.value, activeTopic.id);
      const startedAt = response?.topic?.startedAt || activeTopic.progress.startedAt || null;
      const requiredSeconds = Number(response?.topic?.requiredReadingSeconds || calculateReadingSeconds(activeTopic.content || ""));
      syncReadingTimer(startedAt, requiredSeconds);
    }

    function persistCompletionContext(completionContext) {
      try {
        window.sessionStorage.setItem(COURSE_COMPLETION_STORAGE_KEY, JSON.stringify(completionContext));
      } catch (error) {
        console.warn("Не удалось сохранить контекст прохождения курса", error);
      }
    }

    async function openTopicAssessment() {
      if (!topic.value?.assessmentId || isAssessmentDisabled.value) {
        return;
      }

      const completionContext = {
        type: "topic",
        courseId: courseId.value,
        sectionId: sectionId.value,
        topicId: topicId.value,
        assessmentId: Number(topic.value.assessmentId),
        returnPath: `/courses/${courseId.value}/topics/${sectionId.value}/subtopics/${topicId.value}`,
        createdAt: Date.now(),
      };
      persistCompletionContext(completionContext);

      const summary = getAssessmentSummary(topic.value.assessmentId);
      if (summary?.requiresTheory && !summary.theoryCompleted) {
        router.push(`/assessment/${topic.value.assessmentId}/theory`);
        return;
      }

      router.push(`/assessment/${topic.value.assessmentId}`);
    }

    async function completeMaterial() {
      if (!topic.value || isMaterialActionDisabled.value) {
        return;
      }

      isCompletingMaterial.value = true;
      errorText.value = "";
      try {
        if (topic.value.assessmentId) {
          await apiClient.viewCourseTopicMaterial(topic.value.id);
          topic.value.progress.status = "in_progress";
        } else {
          await apiClient.completeCourseTopic(courseId.value, topic.value.id);
          topic.value.progress.status = "completed";
        }
        topic.value.progress.materialViewed = true;
        remainingReadingSeconds.value = 0;
      } catch (error) {
        errorText.value = error.message || "Не удалось завершить материал";
      } finally {
        isCompletingMaterial.value = false;
      }
    }

    function consumeAttemptResultQuery() {
      const resultType = String(route.query.resultType || "");
      if (resultType !== "topic") {
        return;
      }

      const score = Number(route.query.score || 0);
      const passed = String(route.query.passed || "0") === "1";
      const attemptNumber = Number(route.query.attemptNumber || 1);

      attemptResultModal.value = {
        visible: true,
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

    function closeAttemptResultModal() {
      attemptResultModal.value.visible = false;
    }

    function goBackToTopic() {
      router.push(`/courses/${courseId.value}/topics/${sectionId.value}`);
    }

    function goToNextTopic() {
      if (nextTopicId.value) {
        router.push(`/courses/${courseId.value}/topics/${sectionId.value}/subtopics/${nextTopicId.value}`);
        return;
      }

      goBackToTopic();
    }

    async function handlePrimaryAction() {
      if (!topic.value || isPrimaryActionDisabled.value) {
        return;
      }

      if (showAssessmentButton.value) {
        await openTopicAssessment();
        return;
      }

      if (showCompleteMaterialButton.value && !topic.value.progress.materialViewed) {
        await completeMaterial();
        return;
      }

      goToNextTopic();
    }

    async function loadSubtopic() {
      if (!courseId.value || !sectionId.value || !topicId.value) {
        errorText.value = "Некорректный путь к подтеме";
        section.value = null;
        topic.value = null;
        return;
      }

      isLoading.value = true;
      errorText.value = "";

      try {
        const [sectionResponse, assessmentsResponse] = await Promise.all([apiClient.getCourseSection(courseId.value, sectionId.value), apiClient.listUserAssessments()]);
        section.value = sectionResponse?.section || null;
        courseProgress.value = sectionResponse?.course?.progress || null;

        const nextMap = new Map();
        for (const item of assessmentsResponse?.assessments || []) {
          nextMap.set(Number(item.id), {
            id: Number(item.id),
            status: item.status,
            requiresTheory: Boolean(item.theory?.completionRequired),
            theoryCompleted: Boolean(item.theory?.completedAt),
          });
        }
        assessmentsMap.value = nextMap;

        const foundTopic = (section.value?.topics || []).find((item) => Number(item.id) === topicId.value) || null;
        if (!foundTopic) {
          throw new Error("Подтема не найдена");
        }

        if (foundTopic.progress?.locked) {
          const statusType = mapLockReasonToStatus(foundTopic.progress.lockReasonType);
          await router.replace(`/courses/${courseId.value}/status/${statusType}`);
          return;
        }

        topic.value = foundTopic;

        if (courseProgress.value?.status === "closed") {
          await router.replace(`/courses/${courseId.value}/status/course_closed`);
          return;
        }

        await ensureTopicStarted(foundTopic);
        consumeAttemptResultQuery();
      } catch (error) {
        section.value = null;
        topic.value = null;
        errorText.value = error.message || "Попробуйте обновить страницу позже";
      } finally {
        isLoading.value = false;
      }
    }

    onMounted(() => {
      loadSubtopic();
    });

    onBeforeUnmount(() => {
      stopReadingTimer();
    });

    return {
      courseId,
      sectionId,
      section,
      topic,
      isLoading,
      errorText,
      heroStyle,
      topicStatusText,
      topicFormatText,
      showAssessmentButton,
      showCompleteMaterialButton,
      isMaterialActionDisabled,
      isAssessmentDisabled,
      completeMaterialLabel,
      assessmentButtonLabel,
      actionHint,
      requiredReadingSeconds,
      remainingReadingSeconds,
      sanitizeContent,
      showDownloadInfo,
      showDiscussionInfo,
      scrollToMaterial,
      openTopicAssessment,
      completeMaterial,
      loadSubtopic,
      goBackToTopic,
      attemptResultModal,
      closeAttemptResultModal,
      primaryActionLabel,
      isPrimaryActionDisabled,
      handlePrimaryAction,
    };
  },
};
</script>

<style scoped>
.material-container {
  padding-bottom: 96px;
}

.loading-state,
.error-state {
  text-align: center;
}

.material-hero {
  border-radius: 22px;
  padding: 12px;
  min-height: 380px;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.material-hero__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.material-hero__content {
  text-align: center;
  padding: 16px 10px;
}

.material-brand {
  font-size: 12px;
  letter-spacing: 0.26em;
  margin-bottom: 16px;
  opacity: 0.92;
}

.material-title {
  margin: 0;
  font-size: 34px;
  line-height: 1.15;
  font-weight: 700;
}

.material-subtitle {
  margin-top: 10px;
  font-size: 15px;
  opacity: 0.92;
}

.hero-scroll {
  margin-top: 20px;
  border: none;
  background: transparent;
  color: #ffffff;
  font-size: 36px;
  cursor: pointer;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.topic-content {
  background: var(--bg-primary);
  border: 1px solid var(--divider);
  border-radius: 12px;
  padding: 12px;
  white-space: pre-wrap;
  word-break: break-word;
}

.modal-content {
  background: var(--bg-primary);
  border-radius: 12px;
  width: min(92vw, 420px);
  padding: 20px;
}

@media (max-width: 640px) {
  .material-hero {
    min-height: 320px;
  }

  .material-title {
    font-size: 30px;
  }
}
</style>

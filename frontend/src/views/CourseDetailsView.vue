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
            <span class="body-small text-secondary">Статус</span>
            <span class="body-small">{{ getCourseStatusText(course.progress.status) }}</span>
          </div>
          <div class="summary-row mb-8">
            <span class="body-small text-secondary">Срок действия</span>
            <span class="body-small">{{ getCourseValidityLabel(course) }}</span>
          </div>
          <div class="summary-row mb-8">
            <span class="body-small text-secondary">Тестов в курсе</span>
            <span class="body-small">{{ course.testsCount || 0 }}</span>
          </div>
          <div class="summary-row mb-8">
            <span class="body-small text-secondary">Прогресс</span>
            <span class="body-small">{{ Math.round(course.progress.progressPercent || 0) }}%</span>
          </div>
          <div class="progress-bar mb-12">
            <div class="progress-fill" :style="{ width: `${Math.min(Math.max(course.progress.progressPercent || 0, 0), 100)}%` }"></div>
          </div>
          <div class="summary-row mb-16">
            <span class="body-small text-secondary">Пройдено тем курса</span>
            <span class="body-small">{{ course.progress.completedSectionsCount || 0 }} / {{ course.progress.totalSectionsCount || 0 }}</span>
          </div>

          <button v-if="course.progress.status === 'not_started'" class="btn btn-primary btn-full" :disabled="isStarting || course.progress.status === 'closed'" @click="startCourseFlow">
            {{ isStarting ? "Запускаем..." : "Начать прохождение" }}
          </button>
          <button v-else class="btn btn-secondary btn-full" :disabled="course.progress.status === 'closed'" @click="scrollToSections">
            Продолжить курс
          </button>
        </div>

        <div id="sections-list" class="mb-12">
          <div v-if="!course.sections.length" class="card empty-state">
            <p class="body-small text-secondary">В курсе пока нет тем.</p>
          </div>

          <div v-else class="sections-list">
            <div v-for="(section, sectionIndex) in course.sections" :key="section.id" class="section-card card mb-8">
              <div class="section-head mb-8">
                <div class="section-order">Тема {{ sectionIndex + 1 }}{{ section.isRequired ? "" : " (необязательная)" }}</div>
                <span class="badge" :class="getSectionStatusClass(section.progress.status, section.progress.locked)">
                  {{ getSectionStatusText(section.progress.status, section.progress.locked) }}
                </span>
              </div>

              <h4 class="title-small mb-4">{{ section.title }}</h4>
              <p v-if="section.description" class="body-small text-secondary mb-8">{{ section.description }}</p>

              <p v-if="section.progress.locked" class="body-small lock-text mb-12">🔒 Сначала завершите предыдущие обязательные темы курса</p>

              <div v-else class="topics-list mb-12">
                <div v-if="!section.topics.length" class="body-small text-secondary">В теме пока нет подтем.</div>

                <template v-else>
                  <div class="subtopic-progress mb-12">
                    <button
                      v-for="(topic, topicIndex) in section.topics"
                      :key="topic.id"
                      class="subtopic-pill"
                      :class="{
                        active: activeTopicIdBySection[section.id] === topic.id,
                        done: topic.progress.status === 'completed',
                        locked: topic.progress.locked,
                      }"
                      :disabled="topic.progress.locked"
                      @click="selectTopic(section.id, topic.id)"
                    >
                      {{ topicIndex + 1 }}
                    </button>
                  </div>

                  <div v-if="getActiveTopic(section)" class="topic-reader">
                    <div class="topic-reader-header mb-8">
                      <div>
                        <div class="topic-reader-kicker">Подтема {{ getActiveTopicIndex(section) }}</div>
                        <h4 class="title-small">{{ getActiveTopic(section).title }}</h4>
                      </div>
                      <span class="topic-status-icon">{{
                        getTopicStatusIcon(getActiveTopic(section).progress.status, getActiveTopic(section).progress.locked)
                      }}</span>
                    </div>

                    <div v-if="getActiveTopic(section).hasMaterial" class="topic-material-section">
                      <p class="body-small text-secondary mb-8">Время на чтение: {{ getReadingLabel(getActiveTopic(section)) }}</p>
                      <div class="topic-content body-small mb-8" v-html="sanitizeContent(getActiveTopic(section).content)"></div>

                      <div v-if="!getActiveTopic(section).progress.materialViewed" class="reading-status mb-8">
                        <div class="summary-row mb-8">
                          <span class="body-small text-secondary">До автозавершения</span>
                          <span class="body-small">{{ formatReadingLabel(getRemainingReadingSeconds(getActiveTopic(section))) }}</span>
                        </div>
                        <div class="progress-bar mb-8">
                          <div class="progress-fill" :style="{ width: `${getReadingProgressPercent(getActiveTopic(section))}%` }"></div>
                        </div>
                        <p class="body-small text-secondary">
                          Оставайтесь на этой подтеме до завершения чтения. После этого система автоматически отметит шаг как пройденный.
                        </p>
                      </div>
                    </div>

                    <div class="topic-reader-actions">
                      <button
                        v-if="getActiveTopic(section).assessmentId"
                        class="btn btn-primary btn-full"
                        :disabled="getActiveTopic(section).hasMaterial && !getActiveTopic(section).progress.materialViewed"
                        @click="openTopicAssessment(getActiveTopic(section), section)"
                      >
                        {{ getTopicTestButtonText(getActiveTopic(section)) }}
                      </button>

                      <button v-else-if="canMoveToNextSubtopic(section)" class="btn btn-secondary btn-full" @click="goToNextTopic(section)">
                        К следующей подтеме
                      </button>
                    </div>
                  </div>
                </template>
              </div>

              <div v-if="!section.progress.locked && section.progress.sectionTestAvailable" class="section-test-divider">
                <p class="body-small text-secondary mb-8">Все подтемы пройдены — теперь пройдите тест темы</p>
                <button class="btn btn-primary btn-full" @click="openSectionAssessment(section)">
                  {{ getSectionTestButtonText(section) }}
                </button>
              </div>

              <div v-if="section.progress.status === 'passed'" class="section-done-note body-small text-success mt-8">
                ✓ Тема курса пройдена{{ section.progress.bestScorePercent != null ? ` (${Math.round(section.progress.bestScorePercent)}%)` : "" }}
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <h3 class="title-small mb-12">Итоговая аттестация</h3>
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
    </div>
  </div>
</template>

<script>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { apiClient } from "../services/apiClient";
import { useTelegramStore } from "../stores/telegram";
import { useUserStore } from "../stores/user";
import { calculateReadingSeconds, formatReadingTime } from "../utils/readingTime";

const COURSE_COMPLETION_STORAGE_KEY = "courseCompletionContext";
const COURSE_AUTO_FINAL_OPENED_KEY = "courseAutoFinalOpened";

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
    const activeTopicIdBySection = ref({});
    const readingSecondsLeft = ref({});
    const viewingMaterialId = ref(null);
    const attemptResultModal = ref({
      visible: false,
      title: "",
      score: 0,
      passed: false,
      attemptNumber: 1,
    });
    let readingTimer = null;

    const courseId = computed(() => Number(route.params.id));

    function sanitizeContent(content) {
      return content || "";
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

    function getSectionStatusClass(status, locked) {
      if (locked) return "badge-neutral";
      switch (status) {
        case "passed":
          return "badge-success";
        case "in_progress":
          return "badge-primary";
        case "failed":
          return "badge-error";
        default:
          return "badge-neutral";
      }
    }

    function getSectionStatusText(status, locked) {
      if (locked) return "🔒 Закрыт";
      switch (status) {
        case "passed":
          return "✓ Пройден";
        case "in_progress":
          return "В процессе";
        case "failed":
          return "Не пройден";
        default:
          return "Не начат";
      }
    }

    function getTopicStatusIcon(status, locked) {
      if (locked) return "🔒";
      switch (status) {
        case "completed":
          return "✓";
        case "in_progress":
          return "⏳";
        case "failed":
          return "✗";
        default:
          return "○";
      }
    }

    function getActiveTopic(section) {
      const selectedId = activeTopicIdBySection.value[section.id];
      return section.topics.find((item) => item.id === selectedId) || section.topics[0] || null;
    }

    function getActiveTopicIndex(section) {
      const activeTopic = getActiveTopic(section);
      if (!activeTopic) return "—";
      const index = section.topics.findIndex((item) => item.id === activeTopic.id);
      return index >= 0 ? index + 1 : "—";
    }

    function getReadingLabel(topic) {
      return formatReadingTime(calculateReadingSeconds(topic?.content || ""));
    }

    function formatReadingLabel(seconds) {
      return formatReadingTime(Number(seconds || 0));
    }

    function getRemainingReadingSeconds(topic) {
      if (!topic?.hasMaterial || topic.progress.materialViewed) {
        return 0;
      }
      const requiredSeconds = calculateReadingSeconds(topic.content || "");
      return readingSecondsLeft.value[topic.id] ?? requiredSeconds;
    }

    function getReadingProgressPercent(topic) {
      const requiredSeconds = calculateReadingSeconds(topic?.content || "");
      if (!requiredSeconds) return 100;
      if (topic.progress.materialViewed) return 100;
      const remainingSeconds = getRemainingReadingSeconds(topic);
      return Math.max(0, Math.min(100, Math.round(((requiredSeconds - remainingSeconds) / requiredSeconds) * 100)));
    }

    function stopReadingTimer() {
      if (readingTimer) {
        clearInterval(readingTimer);
        readingTimer = null;
      }
    }

    async function completeMaterialReading(topic) {
      if (!topic || topic.progress.materialViewed) {
        return;
      }

      viewingMaterialId.value = topic.id;
      try {
        await apiClient.viewCourseTopicMaterial(topic.id);
        topic.progress.materialViewed = true;
        if (!topic.assessmentId) {
          topic.progress.status = "completed";
        } else {
          topic.progress.status = "in_progress";
        }
        await loadCourse({ sectionId: topic.sectionId, topicId: topic.id });
      } catch (error) {
        console.error("Не удалось зафиксировать просмотр материала", error);
      } finally {
        viewingMaterialId.value = null;
      }
    }

    function startReadingTimerForTopic(topic) {
      stopReadingTimer();
      if (!topic?.hasMaterial || topic.progress.materialViewed) {
        return;
      }

      const requiredSeconds = calculateReadingSeconds(topic.content || "");
      readingSecondsLeft.value = {
        ...readingSecondsLeft.value,
        [topic.id]: readingSecondsLeft.value[topic.id] ?? requiredSeconds,
      };

      readingTimer = window.setInterval(async () => {
        const currentSeconds = Number(readingSecondsLeft.value[topic.id] || 0);
        if (currentSeconds <= 1) {
          readingSecondsLeft.value = {
            ...readingSecondsLeft.value,
            [topic.id]: 0,
          };
          stopReadingTimer();
          await completeMaterialReading(topic);
          return;
        }

        readingSecondsLeft.value = {
          ...readingSecondsLeft.value,
          [topic.id]: currentSeconds - 1,
        };
      }, 1000);
    }

    function selectTopic(sectionId, topicId) {
      activeTopicIdBySection.value = {
        ...activeTopicIdBySection.value,
        [sectionId]: topicId,
      };

      const section = course.value?.sections?.find((item) => item.id === sectionId);
      const topic = section?.topics?.find((item) => item.id === topicId);
      if (topic) {
        startReadingTimerForTopic(topic);
      }
    }

    function canMoveToNextSubtopic(section) {
      const activeTopic = getActiveTopic(section);
      if (!activeTopic) return false;
      const currentIndex = section.topics.findIndex((item) => item.id === activeTopic.id);
      const nextTopic = section.topics[currentIndex + 1];
      return Boolean(nextTopic && !nextTopic.progress.locked && activeTopic.progress.status === "completed");
    }

    function goToNextTopic(section) {
      const activeTopic = getActiveTopic(section);
      if (!activeTopic) return;
      const currentIndex = section.topics.findIndex((item) => item.id === activeTopic.id);
      const nextTopic = section.topics[currentIndex + 1];
      if (nextTopic && !nextTopic.progress.locked) {
        selectTopic(section.id, nextTopic.id);
      }
    }

    function getTopicTestButtonText(topic) {
      if (topic.hasMaterial && !topic.progress.materialViewed) return "Сначала изучите материал";
      if (topic.progress.status === "completed") return "Пройти снова";
      if (topic.progress.status === "failed") return "Повторить тест";
      return "Пройти тест";
    }

    function getSectionTestButtonText(section) {
      if (section.progress.status === "failed") return "Повторить тест темы";
      return "Пройти тест темы";
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

    function getFinalActionText() {
      if (!course.value?.finalAssessment?.id) return "Итоговая аттестация не назначена";
      if (!course.value.finalAssessment.available) return "Итоговая аттестация недоступна";
      const summary = getAssessmentSummary(course.value.finalAssessment.id);
      if (summary?.requiresTheory && !summary.theoryCompleted) return "К теории итоговой аттестации";
      return "Перейти к итоговой аттестации";
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

    function openTopicAssessment(topic, section) {
      if (!topic?.assessmentId) return;
      openAssessmentFlow(topic.assessmentId, {
        type: "topic",
        courseId: courseId.value,
        sectionId: section.id,
        topicId: topic.id,
        assessmentId: topic.assessmentId,
        createdAt: Date.now(),
      });
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

    async function loadCourse(preferredTopic = null) {
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

        const nextActiveTopics = {};
        for (const section of course.value?.sections || []) {
          const preferredId = preferredTopic?.sectionId === section.id ? preferredTopic.topicId : null;
          const preferred = section.topics.find((item) => item.id === preferredId && !item.progress.locked);
          const firstAvailable = section.topics.find((item) => !item.progress.locked) || section.topics[0] || null;
          nextActiveTopics[section.id] = (preferred || firstAvailable)?.id || null;
        }
        activeTopicIdBySection.value = nextActiveTopics;

        const firstSection = course.value?.sections?.find((item) => item.topics?.length);
        if (firstSection) {
          const activeTopic = getActiveTopic(firstSection);
          if (activeTopic) {
            startReadingTimerForTopic(activeTopic);
          }
        }
        consumeAttemptResultQuery();
      } catch (error) {
        console.error("Не удалось загрузить курс", error);
        telegramStore.showAlert(error.message || "Не удалось загрузить курс");
        course.value = null;
      } finally {
        isLoading.value = false;
      }
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

    function scrollToSections() {
      const target = document.getElementById("sections-list");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
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

    onMounted(() => {
      loadCourse();
    });

    watch(
      () => ({
        id: course.value?.id,
        status: course.value?.progress?.status,
        finalAvailable: course.value?.finalAssessment?.available,
      }),
      (value) => {
        if (!value?.id || value.status === "closed" || !value.finalAvailable) return;
        const key = `${COURSE_AUTO_FINAL_OPENED_KEY}:${value.id}`;
        if (window.sessionStorage.getItem(key)) return;
        window.sessionStorage.setItem(key, "1");
        openFinalAssessment();
      },
      { deep: true },
    );

    onBeforeUnmount(() => {
      stopReadingTimer();
    });

    return {
      isLoading,
      isStarting,
      course,
      activeTopicIdBySection,
      viewingMaterialId,
      sanitizeContent,
      getSectionStatusClass,
      getSectionStatusText,
      getCourseStatusText,
      getCourseValidityLabel,
      getTopicStatusIcon,
      getTopicTestButtonText,
      getSectionTestButtonText,
      getFinalReasonText,
      getFinalActionText,
      getActiveTopic,
      getActiveTopicIndex,
      getReadingLabel,
      formatReadingLabel,
      getRemainingReadingSeconds,
      getReadingProgressPercent,
      selectTopic,
      canMoveToNextSubtopic,
      goToNextTopic,
      openTopicAssessment,
      openSectionAssessment,
      openFinalAssessment,
      startCourseFlow,
      scrollToSections,
      attemptResultModal,
      closeAttemptResultModal,
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

.sections-list {
  display: flex;
  flex-direction: column;
}

.section-card {
  border-radius: 12px;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-order {
  font-size: 12px;
  color: var(--text-secondary);
}

.topics-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-top: 1px solid var(--divider);
  padding-top: 12px;
}

.subtopic-progress {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.subtopic-pill {
  min-width: 36px;
  height: 36px;
  border: 1px solid var(--divider);
  border-radius: 999px;
  background: var(--surface, #fff);
  color: var(--text-primary, #111827);
  cursor: pointer;
}

.subtopic-pill.active {
  border-color: var(--primary, #3b82f6);
  background: rgba(59, 130, 246, 0.12);
}

.subtopic-pill.done {
  border-color: var(--success, #34c759);
  color: var(--success, #34c759);
}

.subtopic-pill.locked {
  opacity: 0.5;
  cursor: not-allowed;
}

.topic-reader {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 10px;
  background: var(--surface-secondary, rgba(0, 0, 0, 0.03));
}

.topic-reader-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.topic-reader-kicker {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.reading-status {
  padding: 10px;
  border-radius: 8px;
  background: rgba(59, 130, 246, 0.08);
}

.topic-reader-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.topic-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.topic-order-icon {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.topic-index {
  font-size: 12px;
  color: var(--text-secondary);
}

.topic-status-icon {
  font-size: 14px;
}

.topic-title {
  flex: 1;
  font-weight: 500;
}

.topic-lock-text {
  font-size: 12px;
  padding-left: 28px;
}

.topic-material-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.topic-content {
  background: var(--surface, #fff);
  border-radius: 6px;
  padding: 8px;
  border: 1px solid var(--divider);
  white-space: pre-wrap;
  word-break: break-word;
}

.section-test-divider {
  border-top: 1px solid var(--divider);
  padding-top: 12px;
}

.section-done-note {
  padding-top: 8px;
  border-top: 1px solid var(--divider);
}

.lock-text {
  color: var(--warning, #ff9500);
}

.text-success {
  color: var(--success, #34c759);
}

.text-secondary {
  color: var(--text-secondary);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--bg-primary);
  border-radius: 12px;
  width: min(92vw, 420px);
  padding: 20px;
}
</style>

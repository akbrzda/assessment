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
            <span class="body-small text-secondary">Пройдено разделов</span>
            <span class="body-small">{{ course.progress.completedSectionsCount || 0 }} / {{ course.progress.totalSectionsCount || 0 }}</span>
          </div>

          <button v-if="course.progress.status === 'not_started'" class="btn btn-primary btn-full" :disabled="isStarting" @click="startCourseFlow">
            {{ isStarting ? "Запускаем..." : "Начать прохождение" }}
          </button>
          <button v-else class="btn btn-secondary btn-full" @click="scrollToSections">Продолжить по разделам</button>
        </div>

        <div id="sections-list" class="mb-12">
          <div v-if="!course.sections.length" class="card empty-state">
            <p class="body-small text-secondary">В курсе пока нет разделов.</p>
          </div>

          <div v-else class="sections-list">
            <div v-for="(section, sectionIndex) in course.sections" :key="section.id" class="section-card card mb-8">
              <div class="section-head mb-8">
                <div class="section-order">Раздел {{ sectionIndex + 1 }}{{ section.isRequired ? "" : " (необязательный)" }}</div>
                <span class="badge" :class="getSectionStatusClass(section.progress.status, section.progress.locked)">
                  {{ getSectionStatusText(section.progress.status, section.progress.locked) }}
                </span>
              </div>

              <h4 class="title-small mb-4">{{ section.title }}</h4>
              <p v-if="section.description" class="body-small text-secondary mb-8">{{ section.description }}</p>

              <p v-if="section.progress.locked" class="body-small lock-text mb-12">🔒 Сначала завершите предыдущие обязательные разделы</p>

              <div v-else class="topics-list mb-12">
                <div v-if="!section.topics.length" class="body-small text-secondary">В разделе нет тем.</div>

                <div v-for="(topic, topicIndex) in section.topics" :key="topic.id" class="topic-row">
                  <div class="topic-head">
                    <div class="topic-order-icon">
                      <span class="topic-index">{{ topicIndex + 1 }}.</span>
                      <span class="topic-status-icon">{{ getTopicStatusIcon(topic.progress.status, topic.progress.locked) }}</span>
                    </div>
                    <span class="topic-title body-small">{{ topic.title }}</span>
                  </div>

                  <div v-if="topic.progress.locked" class="body-small text-secondary topic-lock-text">недоступна</div>

                  <template v-else>
                    <div v-if="topic.hasMaterial" class="topic-material-section">
                      <div v-if="expandedMaterials.has(topic.id)" class="topic-content body-small mb-8" v-html="sanitizeContent(topic.content)"></div>
                      <button class="btn btn-secondary btn-full mb-4" :disabled="viewingMaterialId === topic.id" @click="toggleMaterial(topic)">
                        {{ getMaterialButtonText(topic) }}
                      </button>
                    </div>

                    <button
                      v-if="topic.assessmentId"
                      class="btn btn-primary btn-full"
                      :disabled="topic.hasMaterial && !topic.progress.materialViewed"
                      @click="openTopicAssessment(topic, section)"
                    >
                      {{ getTopicTestButtonText(topic) }}
                    </button>
                  </template>
                </div>
              </div>

              <div v-if="!section.progress.locked && section.progress.sectionTestAvailable" class="section-test-divider">
                <p class="body-small text-secondary mb-8">Все темы пройдены — теперь пройдите тест раздела</p>
                <button class="btn btn-primary btn-full" @click="openSectionAssessment(section)">
                  {{ getSectionTestButtonText(section) }}
                </button>
              </div>

              <div v-if="section.progress.status === 'passed'" class="section-done-note body-small text-success mt-8">
                ✓ Раздел пройден{{ section.progress.bestScorePercent != null ? ` (${Math.round(section.progress.bestScorePercent)}%)` : "" }}
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <h3 class="title-small mb-12">Итоговая аттестация</h3>
          <p class="body-small text-secondary mb-12">
            Доступ откроется после прохождения обязательных разделов: {{ course.finalAssessment.passedRequiredSections || 0 }} /
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
    </div>
  </div>
</template>

<script>
import { computed, onMounted, reactive, ref } from "vue";
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
    const expandedMaterials = reactive(new Set());
    const viewingMaterialId = ref(null);

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

    function getMaterialButtonText(topic) {
      if (viewingMaterialId.value === topic.id) return "Загружаем...";
      if (expandedMaterials.has(topic.id)) return "Скрыть материал";
      if (topic.progress.materialViewed) return "Материал изучен — открыть снова";
      return "Изучить материал";
    }

    function getTopicTestButtonText(topic) {
      if (topic.hasMaterial && !topic.progress.materialViewed) return "Сначала изучите материал";
      if (topic.progress.status === "completed") return "Пройти снова";
      if (topic.progress.status === "failed") return "Повторить тест";
      return "Пройти тест";
    }

    function getSectionTestButtonText(section) {
      if (section.progress.status === "failed") return "Повторить тест раздела";
      return "Пройти тест раздела";
    }

    function getFinalReasonText(reason) {
      switch (reason) {
        case "REQUIRED_MODULES_NOT_PASSED":
          return "Сначала завершите все обязательные разделы курса.";
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

    async function toggleMaterial(topic) {
      if (expandedMaterials.has(topic.id)) {
        expandedMaterials.delete(topic.id);
        return;
      }

      expandedMaterials.add(topic.id);

      if (!topic.progress.materialViewed) {
        viewingMaterialId.value = topic.id;
        try {
          await apiClient.viewCourseTopicMaterial(topic.id);
          topic.progress.materialViewed = true;
          if (!topic.assessmentId) {
            topic.progress.status = "completed";
          }
        } catch (error) {
          console.error("Не удалось зафиксировать просмотр материала", error);
        } finally {
          viewingMaterialId.value = null;
        }
      }
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

    onMounted(() => {
      loadCourse();
    });

    return {
      isLoading,
      isStarting,
      course,
      expandedMaterials,
      viewingMaterialId,
      sanitizeContent,
      getSectionStatusClass,
      getSectionStatusText,
      getTopicStatusIcon,
      getMaterialButtonText,
      getTopicTestButtonText,
      getSectionTestButtonText,
      getFinalReasonText,
      getFinalActionText,
      toggleMaterial,
      openTopicAssessment,
      openSectionAssessment,
      openFinalAssessment,
      startCourseFlow,
      scrollToSections,
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

.topic-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border-radius: 8px;
  background: var(--surface-secondary, rgba(0, 0, 0, 0.03));
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
</style>

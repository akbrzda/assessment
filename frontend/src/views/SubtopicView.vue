<template>
  <div class="page-container">
    <!-- Скелетон загрузки -->
    <div v-if="isLoading" class="container sk-wrapper">
      <div class="sk-back"></div>
      <div class="sk-badge"></div>
      <div class="sk-heading"></div>
      <div class="sk-heading sk-heading--short"></div>
      <div class="sk-video"></div>
      <div class="sk-line" v-for="n in 5" :key="n"></div>
    </div>

    <!-- Ошибка -->
    <div v-else-if="errorText" class="container">
      <div class="card error-card mt-16">
        <h3 class="title-small mb-8">Не удалось загрузить подтему</h3>
        <p class="body-medium text-secondary mb-12">{{ errorText }}</p>
        <button class="btn btn-primary btn-full" type="button" @click="init">Повторить</button>
      </div>
    </div>

    <!-- Контент -->
    <template v-else-if="topic">
      <!-- Шапка с навигацией -->
      <div class="subtopic-nav">
        <button class="back-btn" type="button" @click="goBack" aria-label="Назад">
          <ChevronLeft :size="22" :stroke-width="2" />
        </button>
        <span class="breadcrumb-badge">{{ breadcrumbLabel }}</span>
      </div>

      <div class="container">
        <!-- Заголовок -->
        <h1 class="title-large topic-title mb-16">{{ topicTitle }}</h1>

        <!-- Блок с контентом подтемы -->
        <div v-if="topic.content" class="topic-content mb-16" v-html="sanitizedContent"></div>

        <div v-else class="card empty-content mb-16">
          <p class="body-medium text-secondary">Материал отсутствует.</p>
        </div>

        <!-- Таймер чтения -->
        <ReadingTimerNotice
          v-if="requiredReadingSeconds > 0 || timerCompleted"
          :remainingSeconds="remainingSeconds"
          :requiredSeconds="requiredReadingSeconds"
          :completed="timerCompleted"
          class="mb-16"
        />

        <!-- Подсказка: следующая подтема -->
        <div v-if="nextTopic" class="next-hint mb-4">
          <span class="body-small text-secondary">Следующая подтема</span>
          <p class="body-medium next-hint__title">{{ nextTopic.title }}</p>
        </div>
      </div>

      <!-- Фиксированная кнопка -->
      <StickyFooterCTA :label="ctaLabel" :disabled="!canProceed || isCompleting" @action="handleProceed" />
    </template>
  </div>
</template>

<script>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ChevronLeft } from "lucide-vue-next";
import { apiClient } from "../services/apiClient";
import { calculateReadingSeconds } from "../utils/readingTime";
import ReadingTimerNotice from "../components/courses/ReadingTimerNotice.vue";
import StickyFooterCTA from "../components/courses/StickyFooterCTA.vue";

function sanitizeContent(html) {
  if (!html) return "";
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/javascript:/gi, "");
}

export default {
  name: "SubtopicView",
  components: {
    ChevronLeft,
    ReadingTimerNotice,
    StickyFooterCTA,
  },
  setup() {
    const route = useRoute();
    const router = useRouter();

    const isLoading = ref(false);
    const errorText = ref("");
    const section = ref(null);
    const topic = ref(null);
    const isCompleting = ref(false);

    const requiredReadingSeconds = ref(0);
    const remainingSeconds = ref(0);
    let timerId = null;

    const courseId = computed(() => Number(route.params.courseId));
    const sectionId = computed(() => Number(route.params.sectionId));
    const topicId = computed(() => Number(route.params.topicId));

    const topics = computed(() => section.value?.topics || []);
    const currentTopicIndex = computed(() => topics.value.findIndex((t) => t.id === topicId.value));
    const nextTopic = computed(() => {
      const idx = currentTopicIndex.value;
      if (idx < 0 || idx >= topics.value.length - 1) return null;
      const candidate = topics.value[idx + 1];
      if (candidate?.progress?.locked) return null;
      return candidate;
    });

    const breadcrumbLabel = computed(() => {
      if (!section.value || !topic.value) return "";
      const sectionNum = section.value.orderIndex ?? "";
      const topicNum = topic.value.orderIndex ?? "";
      const num = sectionNum && topicNum ? `${sectionNum}.${topicNum}` : topicNum || sectionNum;
      return num ? `${num} ${section.value.title}` : section.value.title;
    });

    const topicTitle = computed(() => {
      if (!topic.value) return "";
      const num = topic.value.orderIndex;
      return num ? `${num}. ${topic.value.title}` : topic.value.title;
    });

    const sanitizedContent = computed(() => sanitizeContent(topic.value?.content || ""));

    const timerCompleted = computed(() => remainingSeconds.value <= 0);
    const hasAssessment = computed(() => Boolean(topic.value?.assessmentId));
    const isCompleted = computed(() => topic.value?.progress?.status === "completed");

    const canProceed = computed(() => {
      if (isCompleted.value) return true;
      if (hasAssessment.value) return true;
      return timerCompleted.value;
    });

    const ctaLabel = computed(() => {
      if (hasAssessment.value) return "Пройти тест";
      return "Далее";
    });

    function startTimer(seconds) {
      if (timerId) clearInterval(timerId);
      if (seconds <= 0) return;
      remainingSeconds.value = seconds;
      timerId = setInterval(() => {
        if (remainingSeconds.value > 0) {
          remainingSeconds.value -= 1;
        } else {
          clearInterval(timerId);
          timerId = null;
        }
      }, 1000);
    }

    async function init() {
      isLoading.value = true;
      errorText.value = "";
      try {
        const response = await apiClient.getCourseSection(courseId.value, sectionId.value);
        section.value = response?.section || null;

        const found = (section.value?.topics || []).find((t) => t.id === topicId.value);
        topic.value = found || null;

        if (!topic.value) {
          errorText.value = "Подтема не найдена";
          return;
        }

        if (topic.value.progress?.status !== "completed") {
          try {
            const startResponse = await apiClient.startCourseTopic(courseId.value, topicId.value);
            const serverRequired = startResponse?.topic?.requiredReadingSeconds;
            const contentRequired = calculateReadingSeconds(topic.value.content || "");
            const required = serverRequired ?? contentRequired;
            requiredReadingSeconds.value = required;

            if (required > 0 && !topic.value.progress?.materialViewed) {
              startTimer(required);
            } else {
              remainingSeconds.value = 0;
            }
          } catch (startError) {
            // Если подтема уже запущена (409) — просчитываем таймер из контента
            if (startError.status === 409 || startError.status === 200) {
              const contentRequired = calculateReadingSeconds(topic.value.content || "");
              requiredReadingSeconds.value = contentRequired;
              if (contentRequired > 0 && !topic.value.progress?.materialViewed) {
                startTimer(contentRequired);
              }
            } else {
              throw startError;
            }
          }
        } else {
          // Подтема уже завершена — таймер не нужен
          requiredReadingSeconds.value = 0;
          remainingSeconds.value = 0;
        }
      } catch (err) {
        errorText.value = err.message || "Попробуйте обновить страницу позже";
      } finally {
        isLoading.value = false;
      }
    }

    async function handleProceed() {
      if (!canProceed.value || isCompleting.value) return;

      if (hasAssessment.value) {
        router.push(`/assessment/${topic.value.assessmentId}`);
        return;
      }

      isCompleting.value = true;
      try {
        await apiClient.completeCourseTopic(courseId.value, topicId.value);
        if (nextTopic.value) {
          router.push(`/courses/${courseId.value}/topics/${sectionId.value}/subtopics/${nextTopic.value.id}`);
        } else {
          router.push(`/courses/${courseId.value}/topics/${sectionId.value}`);
        }
      } catch (err) {
        if (err.status === 409) {
          // Уже завершена или требуется тест
          if (nextTopic.value) {
            router.push(`/courses/${courseId.value}/topics/${sectionId.value}/subtopics/${nextTopic.value.id}`);
          } else {
            router.push(`/courses/${courseId.value}/topics/${sectionId.value}`);
          }
        } else {
          errorText.value = err.message || "Не удалось завершить материал";
        }
      } finally {
        isCompleting.value = false;
      }
    }

    function goBack() {
      router.push(`/courses/${courseId.value}/topics/${sectionId.value}`);
    }

    onMounted(() => {
      init();
    });

    onBeforeUnmount(() => {
      if (timerId) clearInterval(timerId);
    });

    return {
      isLoading,
      errorText,
      topic,
      breadcrumbLabel,
      topicTitle,
      sanitizedContent,
      requiredReadingSeconds,
      remainingSeconds,
      timerCompleted,
      nextTopic,
      canProceed,
      ctaLabel,
      isCompleting,
      handleProceed,
      goBack,
      init,
    };
  },
};
</script>

<style scoped>
/* ── Навигационная шапка ── */
.subtopic-nav {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px 8px;
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--bg-primary);
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s;
}

.back-btn:active {
  background: var(--divider);
}

.breadcrumb-badge {
  background: rgba(99, 102, 241, 0.1);
  color: #4f46e5;
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 8px;
  padding: 4px 10px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: calc(100% - 56px);
}

/* ── Заголовок ── */
.topic-title {
  padding-top: 8px;
}

/* ── Контент подтемы ── */
.topic-content {
  font-size: 16px;
  line-height: 1.65;
  color: var(--text-primary);
}

.topic-content :deep(p) {
  margin-bottom: 12px;
}

.topic-content :deep(p:last-child) {
  margin-bottom: 0;
}

.topic-content :deep(h2),
.topic-content :deep(h3) {
  font-weight: 700;
  margin: 20px 0 8px;
  line-height: 1.3;
}

.topic-content :deep(h2) {
  font-size: 20px;
}

.topic-content :deep(h3) {
  font-size: 17px;
}

.topic-content :deep(ul),
.topic-content :deep(ol) {
  padding-left: 20px;
  margin-bottom: 12px;
}

.topic-content :deep(li) {
  margin-bottom: 6px;
}

.topic-content :deep(img) {
  width: 100%;
  border-radius: 12px;
  margin: 8px 0;
  display: block;
}

.topic-content :deep(video) {
  width: 100%;
  border-radius: 12px;
  margin: 8px 0;
}

.topic-content :deep(iframe) {
  width: 100%;
  aspect-ratio: 16 / 9;
  border: none;
  border-radius: 12px;
  margin: 8px 0;
}

.topic-content :deep(blockquote) {
  border-left: 3px solid var(--accent-blue);
  padding-left: 12px;
  margin: 12px 0;
  color: var(--text-secondary);
}

.topic-content :deep(strong),
.topic-content :deep(b) {
  font-weight: 700;
}

/* ── Подсказка следующей подтемы ── */
.next-hint {
  padding: 12px 0 0;
}

.next-hint__title {
  font-weight: 600;
  color: var(--text-primary);
  margin-top: 2px;
}

/* ── Вспомогательные отступы ── */
.mt-16 {
  margin-top: 16px;
}

.mb-4 {
  margin-bottom: 4px;
}

.mb-8 {
  margin-bottom: 8px;
}

.mb-12 {
  margin-bottom: 12px;
}

.mb-16 {
  margin-bottom: 16px;
}

/* ── Карточка ошибки ── */
.error-card {
  margin-top: 16px;
}

/* ── Пустой контент ── */
.empty-content {
  padding: 20px;
}

/* ── Скелетон ── */
.sk-wrapper {
  padding-top: 16px;
}

.sk-back {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--divider);
  margin-bottom: 12px;
  animation: sk-pulse 1.4s ease-in-out infinite;
}

.sk-badge {
  width: 140px;
  height: 22px;
  border-radius: 8px;
  background: var(--divider);
  margin-bottom: 16px;
  animation: sk-pulse 1.4s ease-in-out infinite;
}

.sk-heading {
  height: 28px;
  border-radius: 6px;
  background: var(--divider);
  margin-bottom: 10px;
  animation: sk-pulse 1.4s ease-in-out infinite;
}

.sk-heading--short {
  width: 60%;
}

.sk-video {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 12px;
  background: var(--divider);
  margin-bottom: 16px;
  animation: sk-pulse 1.4s ease-in-out infinite;
}

.sk-line {
  height: 14px;
  border-radius: 4px;
  background: var(--divider);
  margin-bottom: 10px;
  animation: sk-pulse 1.4s ease-in-out infinite;
}

.sk-line:nth-child(even) {
  width: 80%;
}

@keyframes sk-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>

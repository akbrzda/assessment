<template>
  <div class="page-container subtopic-page">
    <div class="subtopic-shell">
      <div v-if="isLoading" class="subtopic-skeleton">
        <SkeletonBlock class="subtopic-skeleton__chip" />
        <SkeletonBlock class="subtopic-skeleton__title" />
        <SkeletonText :lines="8" />
        <SkeletonBlock class="subtopic-skeleton__cta" />
      </div>

      <div v-else-if="errorText" class="subtopic-error">
        <h3 class="title-small">Не удалось загрузить подтему</h3>
        <p class="body-medium text-secondary">{{ errorText }}</p>
        <button class="btn btn-primary" type="button" @click="init">Повторить</button>
      </div>

      <template v-else-if="topic">
        <div class="subtopic-breadcrumb">
          <span class="subtopic-chip">{{ topicChipLabel }}</span>
        </div>
        <div class="subtopic-content">
          <div v-if="topic.content" class="topic-content" v-html="sanitizedContent"></div>
          <p v-else class="empty-content">Материал отсутствует.</p>
        </div>

        <div class="subtopic-footer">
          <div class="next-topic">
            <p class="next-topic__caption">Следующая подтема</p>
            <p class="next-topic__title">{{ nextTopicLabel }}</p>
          </div>
          <button class="next-button" type="button" :disabled="!canProceed || isCompleting" @click="handleProceed">
            <span>{{ ctaLabel }}</span>
            <ChevronRight v-if="showNextIcon" class="next-button__icon" :size="18" />
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ChevronRight } from "lucide-vue-next";
import { apiClient } from "../services/apiClient";
import { calculateReadingSeconds } from "../utils/readingTime";
import { getVisibleTopics } from "../utils/courseVisibility";
import SkeletonBlock from "../components/skeleton/SkeletonBlock.vue";
import SkeletonText from "../components/skeleton/SkeletonText.vue";

function sanitizeContent(html) {
  if (!html) return "";
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  doc.querySelectorAll("script").forEach((node) => node.remove());
  doc.querySelectorAll("*").forEach((node) => {
    for (const attr of [...node.attributes]) {
      const attrName = attr.name.toLowerCase();
      const attrValue = String(attr.value || "")
        .trim()
        .toLowerCase();
      if (attrName.startsWith("on")) {
        node.removeAttribute(attr.name);
      } else if ((attrName === "href" || attrName === "src") && attrValue.startsWith("javascript:")) {
        node.removeAttribute(attr.name);
      }
    }
  });

  return doc.body.innerHTML;
}

export default {
  name: "SubtopicView",
  components: {
    ChevronRight,
    SkeletonBlock,
    SkeletonText,
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

    const topics = computed(() => getVisibleTopics(section.value?.topics || []));
    const orderedTopics = computed(() =>
      [...topics.value].sort((a, b) => {
        const aOrder = Number(a?.orderIndex || 0);
        const bOrder = Number(b?.orderIndex || 0);
        if (aOrder !== bOrder) {
          return aOrder - bOrder;
        }
        return Number(a?.id || 0) - Number(b?.id || 0);
      }),
    );

    const currentTopicIndex = computed(() => orderedTopics.value.findIndex((t) => t.id === topicId.value));
    const nextTopic = computed(() => {
      const idx = currentTopicIndex.value;
      if (idx < 0 || idx >= orderedTopics.value.length - 1) return null;
      return orderedTopics.value[idx + 1];
    });

    const topicChipLabel = computed(() => {
      if (!section.value || !topic.value) return "";
      const sectionNum = section.value.orderIndex ?? "";
      const resolvedTopicNum = Number(topic.value.orderIndex) || Math.max(1, currentTopicIndex.value + 1);
      const numberLabel = sectionNum ? `${sectionNum}.${resolvedTopicNum}` : String(resolvedTopicNum);
      return numberLabel ? `${numberLabel} ${topic.value.title}` : topic.value.title;
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

    const ctaLabel = computed(() => (nextTopic.value ? "Далее" : "Завершить"));
    const showNextIcon = computed(() => Boolean(nextTopic.value));

    const nextTopicLabel = computed(() => {
      if (nextTopic.value) {
        const sectionNum = section.value?.orderIndex ?? "";
        const resolvedNextNum = Number(nextTopic.value.orderIndex) || Math.max(1, currentTopicIndex.value + 2);
        const numberLabel = sectionNum ? `${sectionNum}.${resolvedNextNum}` : String(resolvedNextNum);
        return `${numberLabel} ${nextTopic.value.title}`;
      }
      return "К списку подтем";
    });

    function stopTimer() {
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
    }

    function startTimer(seconds) {
      stopTimer();
      if (seconds <= 0) {
        remainingSeconds.value = 0;
        return;
      }
      remainingSeconds.value = seconds;
      timerId = setInterval(() => {
        if (remainingSeconds.value > 0) {
          remainingSeconds.value -= 1;
        } else {
          stopTimer();
        }
      }, 1000);
    }

    async function init() {
      stopTimer();
      isLoading.value = true;
      errorText.value = "";
      topic.value = null;
      requiredReadingSeconds.value = 0;
      remainingSeconds.value = 0;

      try {
        const response = await apiClient.getCourseSection(courseId.value, sectionId.value);
        section.value = response?.section || null;

        const found = getVisibleTopics(section.value?.topics || []).find((t) => t.id === topicId.value);
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

      isCompleting.value = true;
      try {
        await apiClient.completeCourseTopic(courseId.value, topicId.value);
        if (nextTopic.value) {
          await router.push({
            name: "course-subtopic",
            params: {
              courseId: courseId.value,
              sectionId: sectionId.value,
              topicId: nextTopic.value.id,
            },
          });
        } else {
          await router.push({
            name: "course-topic",
            params: {
              courseId: courseId.value,
              sectionId: sectionId.value,
            },
          });
        }
      } catch (err) {
        if (err.status === 409) {
          if (nextTopic.value) {
            await router.push({
              name: "course-subtopic",
              params: {
                courseId: courseId.value,
                sectionId: sectionId.value,
                topicId: nextTopic.value.id,
              },
            });
          } else {
            await router.push({
              name: "course-topic",
              params: {
                courseId: courseId.value,
                sectionId: sectionId.value,
              },
            });
          }
        } else {
          errorText.value = err.message || "Не удалось завершить материал";
        }
      } finally {
        isCompleting.value = false;
      }
    }

    watch(
      () => [courseId.value, sectionId.value, topicId.value],
      () => {
        init();
      },
      { immediate: true },
    );

    onBeforeUnmount(() => {
      stopTimer();
    });

    return {
      section,
      isLoading,
      errorText,
      topic,
      topicChipLabel,
      sanitizedContent,
      canProceed,
      ctaLabel,
      showNextIcon,
      isCompleting,
      nextTopicLabel,
      handleProceed,
      init,
    };
  },
};
</script>

<style scoped>
.subtopic-page {
  background: #ffffff;
  min-height: 100vh;
}

.subtopic-shell {
  max-width: 430px;
  margin: 0 auto;
  padding: 14px 16px 14px;
  min-height: calc(100vh - 76px - env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
}

.subtopic-breadcrumb {
  display: flex;
  align-items: flex-start;
  margin-bottom: 10px;
}

.subtopic-chip {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  border-radius: 8px;
  background: #ececf8;
  color: #5e56e6;
  border: 1px solid #dde0f1;
  padding: 3px 10px;
  font-size: 13px;
  line-height: 1.3;
  font-weight: 600;
}

.material-title {
  margin: 0 0 16px;
  color: #111a44;
  font-size: 28px;
  line-height: 1.18;
  font-weight: 800;
  letter-spacing: 0;
}

.subtopic-content {
  flex: 1;
  min-height: 0;
}

.topic-content {
  color: #000000;
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 18px;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.topic-content :deep(h1) {
  margin: 0 0 12px;
  line-height: 1.3;
  font-weight: 700;
}

.topic-content :deep(h2),
.topic-content :deep(h3),
.topic-content :deep(h4),
.topic-content :deep(h5),
.topic-content :deep(h6) {
  margin: 0 0 12px;
  line-height: 1.3;
  font-weight: 700;
}

.topic-content :deep(p) {
  margin: 0 0 12px;
}

.topic-content :deep(ul),
.topic-content :deep(ol) {
  padding-left: 1.6em;
  margin: 4px 0 12px;
  list-style-position: outside;
}

.topic-content :deep(li) {
  margin: 0 0 4px;
  text-indent: 0;
}

.topic-content :deep(a) {
  color: #2563eb;
  text-decoration: underline;
}

.topic-content :deep(img),
.topic-content :deep(table),
.topic-content :deep(pre) {
  max-width: 100%;
}

.topic-content :deep(img),
.topic-content :deep(iframe),
.topic-content :deep(video) {
  width: 100%;
  display: block;
  margin: 12px 0;
}

.empty-content {
  font-size: 16px;
  color: #697196;
  margin-bottom: 16px;
}

.subtopic-footer {
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid #e7e9f3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.next-topic {
  min-width: 0;
  flex: 1;
}

.next-topic__caption {
  margin: 0 0 5px;
  color: #7e86a8;
  font-size: 13px;
}

.next-topic__title {
  margin: 0;
  color: #131c47;
  font-size: 17px;
  line-height: 1.3;
  font-weight: 600;
}

.next-button {
  width: 128px;
  height: 56px;
  border-radius: 16px;
  border: none;
  background: #e8e9f3;
  color: #8a90ab;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-shrink: 0;
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    opacity 0.2s ease;
}

.next-button__icon {
  flex-shrink: 0;
  color: currentColor;
  opacity: 0.95;
}

.next-button:not(:disabled) {
  background: #5e56e6;
  color: #ffffff;
  cursor: pointer;
}

.next-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.subtopic-error {
  margin-top: 24px;
  padding: 20px;
  border: 1px solid #e5e7ef;
  border-radius: 16px;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.subtopic-skeleton {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 6px;
}

.subtopic-skeleton__chip {
  width: 46%;
  height: 28px;
  border-radius: 8px;
}

.subtopic-skeleton__title {
  width: 62%;
  height: 20px;
}

.subtopic-skeleton__cta {
  height: 56px;
  width: 130px;
  border-radius: 16px;
}

@media (max-width: 760px) {
  .subtopic-shell {
    max-width: 100%;
    padding: 14px 16px 12px;
  }

  .subtopic-chip {
    min-height: 32px;
    border-radius: 8px;
    font-size: 16px;
    padding: 5px 10px;
  }

  .material-title {
    font-size: 24px;
    line-height: 1.22;
    margin-bottom: 14px;
  }

  .topic-content {
    font-size: 14px;
    line-height: 1.6;
    margin-bottom: 16px;
  }

  .empty-content {
    font-size: 14px;
  }

  .subtopic-footer {
    margin-top: 18px;
    padding-top: 16px;
  }

  .next-topic__caption {
    font-size: 12px;
  }

  .next-topic__title {
    font-size: 15px;
  }

  .next-button {
    width: 116px;
    height: 56px;
    border-radius: 14px;
    font-size: 13px;
  }
}
</style>

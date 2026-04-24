<template>
  <div class="page-container">
    <div class="container">
      <!-- Skeleton -->
      <div v-if="isLoading" class="topic-skeleton">
        <div class="sk-title"></div>
        <div class="sk-title sk-title--short"></div>
        <div class="sk-progress-card">
          <div class="sk-progress-head">
            <div class="sk-label"></div>
            <div class="sk-percent"></div>
          </div>
          <div class="sk-bar"></div>
          <div class="sk-count"></div>
        </div>
        <div class="sk-section-label"></div>
        <div class="sk-item" v-for="n in 3" :key="n"></div>
      </div>

      <!-- Ошибка -->
      <div v-else-if="errorText" class="card error-state">
        <h3 class="title-small mb-8">Не удалось загрузить тему</h3>
        <p class="body-small text-secondary mb-12">{{ errorText }}</p>
        <button class="btn btn-primary btn-full" type="button" @click="loadSection">Повторить</button>
      </div>

      <!-- Контент -->
      <template v-else-if="section">
        <div class="page-header mb-16">
          <h1 class="title-large">{{ sectionTitle }}</h1>
          <p v-if="section.description" class="body-medium text-secondary mt-4">{{ section.description }}</p>
        </div>

        <section class="progress-card mb-16">
          <div class="topic-progress__head">
            <span class="progress-label">Прогресс темы</span>
            <span class="topic-progress__percent">{{ sectionProgressPercent }}%</span>
          </div>
          <div class="progress-bar mb-8">
            <div class="progress-fill" :style="{ width: `${sectionProgressPercent}%` }"></div>
          </div>
          <p class="progress-count">{{ completedTopicsCount }} из {{ topics.length }} подтем</p>
        </section>

        <div class="subtopics-title mb-12">
          <span class="section-title">Подтемы</span>
        </div>

        <div v-if="!topics.length" class="card empty-state">
          <h3 class="title-small mb-8">Подтемы пока не добавлены</h3>
          <p class="body-small text-secondary">Когда администратор добавит подтемы, они появятся здесь.</p>
        </div>

        <div v-else class="topics-list">
          <SubtopicItem
            v-for="(topic, index) in topics"
            :key="topic.id"
            :topic="topic"
            :index="index"
            :section-order-index="section?.orderIndex"
            @open="openSubtopic"
            @lock-click="openLockReason"
          />
        </div>
      </template>

      <BottomSheet v-model="lockSheet.visible" :title="lockSheet.title" :description="lockSheet.description" />
    </div>
  </div>
</template>

<script>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { apiClient } from "../services/apiClient";
import BottomSheet from "../components/courses/BottomSheet.vue";
import SubtopicItem from "../components/courses/SubtopicItem.vue";

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
  name: "TopicView",
  components: {
    BottomSheet,
    SubtopicItem,
  },
  setup() {
    const route = useRoute();
    const router = useRouter();

    const isLoading = ref(false);
    const errorText = ref("");
    const section = ref(null);
    const lockSheet = ref({
      visible: false,
      title: "Подтема недоступна",
      description: "Сначала завершите предыдущий шаг, чтобы продолжить обучение.",
    });

    const courseId = computed(() => Number(route.params.courseId));
    const sectionId = computed(() => Number(route.params.sectionId));
    const topics = computed(() => section.value?.topics || []);
    const completedTopicsCount = computed(() => topics.value.filter((topic) => topic?.progress?.status === "completed").length);
    const sectionTitle = computed(() => {
      if (!section.value) return "Тема курса";
      const idx = section.value.orderIndex;
      return idx ? `${idx}. ${section.value.title}` : section.value.title;
    });
    const sectionProgressPercent = computed(() => {
      if (!topics.value.length) {
        return 0;
      }
      return Math.round((completedTopicsCount.value / topics.value.length) * 100);
    });

    async function loadSection() {
      isLoading.value = true;
      errorText.value = "";
      try {
        const response = await apiClient.getCourseSection(courseId.value, sectionId.value);
        section.value = response?.section || null;
      } catch (error) {
        section.value = null;
        errorText.value = error.message || "Попробуйте обновить страницу позже";
      } finally {
        isLoading.value = false;
      }
    }

    function openSubtopic(topic) {
      if (topic?.progress?.locked) {
        const statusType = mapLockReasonToStatus(topic?.progress?.lockReasonType);
        router.push(`/courses/${courseId.value}/status/${statusType}`);
        return;
      }

      router.push(`/courses/${courseId.value}/topics/${sectionId.value}/subtopics/${topic.id}`);
    }

    function openLockReason(topic) {
      if (topic?.progress?.lockReasonType) {
        const statusType = mapLockReasonToStatus(topic.progress.lockReasonType);
        router.push(`/courses/${courseId.value}/status/${statusType}`);
        return;
      }

      lockSheet.value = {
        visible: true,
        title: "Подтема недоступна",
        description: topic?.progress?.lockReasonText || "Сначала завершите предыдущий шаг, чтобы продолжить обучение.",
      };
    }

    onMounted(() => {
      loadSection();
    });

    return {
      router,
      courseId,
      section,
      topics,
      completedTopicsCount,
      sectionProgressPercent,
      sectionTitle,
      isLoading,
      errorText,
      loadSection,
      openSubtopic,
      openLockReason,
      lockSheet,
    };
  },
};
</script>

<style scoped>
.page-header {
  padding-top: 0;
}

.mt-4 {
  margin-top: 4px;
}

.mb-16 {
  margin-bottom: 16px;
}

.mb-12 {
  margin-bottom: 12px;
}

.progress-card {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 14px 16px;
  border: 1px solid var(--divider);
}

.topic-progress__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.progress-label {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.topic-progress__percent {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}

.progress-bar {
  height: 6px;
  background: color-mix(in srgb, var(--accent-blue) 20%, var(--bg-primary) 80%);
  border-radius: 999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--accent-blue);
  border-radius: 999px;
  transition: width 0.3s ease;
}

.progress-count {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.empty-state,
.error-state {
  text-align: center;
}

.topics-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.subtopics-title {
  display: flex;
  align-items: center;
}

.section-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
}

/* ── Skeleton ── */
@keyframes sk-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

.topic-skeleton {
  padding-top: 8px;
}

.sk-title,
.sk-label,
.sk-percent,
.sk-bar,
.sk-count,
.sk-section-label,
.sk-item {
  background: var(--divider);
  border-radius: 8px;
  animation: sk-pulse 1.6s ease-in-out infinite;
}

.sk-title {
  height: 32px;
  margin-bottom: 8px;
}

.sk-title--short {
  width: 55%;
  margin-bottom: 20px;
}

.sk-progress-card {
  background: var(--bg-secondary);
  border: 1px solid var(--divider);
  border-radius: 16px;
  padding: 14px 16px;
  margin-bottom: 20px;
}

.sk-progress-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.sk-label {
  height: 16px;
  width: 100px;
}

.sk-percent {
  height: 16px;
  width: 36px;
}

.sk-bar {
  height: 6px;
  border-radius: 999px;
  margin-bottom: 8px;
}

.sk-count {
  height: 13px;
  width: 100px;
}

.sk-section-label {
  height: 18px;
  width: 80px;
  margin-bottom: 12px;
}

.sk-item {
  height: 52px;
  border-radius: 14px;
  margin-bottom: 8px;
}
</style>

<template>
  <div class="page-container">
    <div class="container">

      <!-- Ошибка -->
      <div v-if="isLoading" class="topic-skeleton">
        <SkeletonPageHeader />
        <SkeletonBlock class="topic-skeleton__progress" />
        <SkeletonList :items="4" />
      </div>

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

      <LockPopup v-model="lockSheet.visible" :title="lockSheet.title" :description="lockSheet.description" />
    </div>
  </div>
</template>

<script>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { apiClient } from "../services/apiClient";
import LockPopup from "../components/courses/LockPopup.vue";
import SubtopicItem from "../components/courses/SubtopicItem.vue";
import { getVisibleTopics } from "../utils/courseVisibility";
import SkeletonBlock from "../components/skeleton/SkeletonBlock.vue";
import SkeletonList from "../components/skeleton/SkeletonList.vue";
import SkeletonPageHeader from "../components/skeleton/SkeletonPageHeader.vue";

export default {
  name: "TopicView",
  components: {
    LockPopup,
    SubtopicItem,
    SkeletonBlock,
    SkeletonList,
    SkeletonPageHeader,
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
    const topics = computed(() => getVisibleTopics(section.value?.topics || []));
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
        openLockReason(topic);
        return;
      }

      router.push({
        name: "course-subtopic",
        params: {
          courseId: courseId.value,
          sectionId: sectionId.value,
          topicId: topic.id,
        },
      });
    }

    function openLockReason(topic) {
      lockSheet.value = {
        visible: true,
        title: "Подтема недоступна",
        description: topic?.progress?.lockReasonText || "Сначала необходимо пройти предыдущую подтему.",
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

.topic-skeleton {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.topic-skeleton__progress {
  height: 84px;
  border-radius: 14px;
}
</style>

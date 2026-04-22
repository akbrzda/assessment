<template>
  <div class="page-container">
    <div class="container">
      <div class="page-header mb-12">
        <router-link class="back-link" :to="`/courses/${courseId}`">← Назад к курсу</router-link>
        <h1 class="title-large">{{ section?.title || "Тема курса" }}</h1>
        <p class="body-small text-secondary">{{ section?.description || "Список подтем и их текущий статус" }}</p>
      </div>

      <div v-if="isLoading" class="card loading-state">
        <p class="body-small text-secondary">Загрузка темы...</p>
      </div>

      <div v-else-if="errorText" class="card error-state">
        <h3 class="title-small mb-8">Не удалось загрузить тему</h3>
        <p class="body-small text-secondary mb-12">{{ errorText }}</p>
        <button class="btn btn-primary btn-full" type="button" @click="loadSection">Повторить</button>
      </div>

      <div v-else-if="!topics.length" class="card empty-state">
        <h3 class="title-small mb-8">Подтемы пока не добавлены</h3>
        <p class="body-small text-secondary">Когда администратор добавит подтемы, они появятся здесь.</p>
      </div>

      <div v-else class="topics-list">
        <SubtopicItem
          v-for="(topic, index) in topics"
          :key="topic.id"
          :topic="topic"
          :index="index"
          @open="openSubtopic"
          @lock-click="openLockReason"
        />
      </div>

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
      router.push({
        path: `/courses/${courseId.value}`,
        query: {
          sectionId: String(sectionId.value),
          topicId: String(topic.id),
        },
      });
    }

    function openLockReason(topic) {
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
      courseId,
      section,
      topics,
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
  padding-top: 20px;
}

.back-link {
  display: inline-flex;
  margin-bottom: 8px;
  color: var(--text-secondary, #64748b);
  text-decoration: none;
  font-size: 13px;
}

.loading-state,
.empty-state,
.error-state {
  text-align: center;
}

.topics-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>

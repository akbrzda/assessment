<template>
  <div class="edit-assessment-view">
    <Preloader v-if="loading" />

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <Button @click="goBack">Вернуться к списку</Button>
    </div>

    <div v-else class="edit-container">
      <!-- Заголовок -->
      <div class="page-header">
        <Button variant="ghost" icon="arrow-left" @click="goBack"> Назад </Button>
        <h1 class="page-title">Редактировать аттестацию</h1>
      </div>

      <!-- Форма редактирования -->
      <AssessmentEditForm v-if="assessment" :assessment="assessment" @submit="handleSubmit" @cancel="goBack" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { getAssessmentDetails } from "../api/assessments";
import Preloader from "../components/ui/Preloader.vue";
import Button from "../components/ui/Button.vue";
import AssessmentEditForm from "../components/AssessmentEditForm.vue";

const router = useRouter();
const route = useRoute();

const loading = ref(true);
const error = ref(null);
const assessment = ref(null);

const goBack = () => {
  router.push("/assessments");
};

const handleSubmit = () => {
  router.push("/assessments");
};

const loadAssessment = async () => {
  loading.value = true;
  error.value = null;

  try {
    const id = Number(route.params.id);
    if (!id || isNaN(id)) {
      error.value = "Неверный ID аттестации";
      return;
    }

    const data = await getAssessmentDetails(id);
    assessment.value = {
      ...data.assessment,
      questions: data.questions,
      accessibility: data.accessibility,
      stats: data.stats,
    };

    // Можно редактировать в любом статусе (вопросы и теорию)
    // Параметры блокируются внутри формы для не-pending статусов
  } catch (err) {
    console.error("Load assessment error:", err);
    error.value = err.response?.data?.error || "Ошибка загрузки аттестации";
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadAssessment();
});
</script>

<style scoped>
.edit-assessment-view {
  width: 100%;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.edit-container {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.error-state {
  padding: 64px 32px;
  text-align: center;
  color: var(--text-secondary);
}

.error-state p {
  margin: 0 0 16px 0;
  font-size: 18px;
}

@media (max-width: 768px) {
  .page-title {
    font-size: 22px;
  }
}
</style>

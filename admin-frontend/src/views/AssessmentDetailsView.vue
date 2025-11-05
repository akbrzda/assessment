<template>
  <div class="assessment-details-view">
    <Preloader v-if="loading" />

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <Button @click="goBack">Вернуться к списку</Button>
    </div>

    <div v-else class="details-container">
      <!-- Заголовок с навигацией -->
      <div class="page-header">
        <Button variant="ghost" icon="arrow-left" @click="goBack"> Назад к списку </Button>
      </div>

      <!-- Компонент детализации -->
      <AssessmentDetails :assessmentId="assessmentId" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import Preloader from "../components/ui/Preloader.vue";
import Button from "../components/ui/Button.vue";
import AssessmentDetails from "../components/AssessmentDetails.vue";

const router = useRouter();
const route = useRoute();

const loading = ref(true);
const error = ref(null);
const assessmentId = ref(null);

const goBack = () => {
  router.push("/assessments");
};

onMounted(() => {
  const id = Number(route.params.id);

  if (!id || isNaN(id)) {
    error.value = "Неверный ID аттестации";
    loading.value = false;
    return;
  }

  assessmentId.value = id;
  loading.value = false;
});
</script>

<style scoped>
.assessment-details-view {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 32px;
}

.details-container {
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
  .page-header {
    margin-bottom: 16px;
  }
}
</style>

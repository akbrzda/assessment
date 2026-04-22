<template>
  <div class="assessment-details-view">
    <Preloader v-if="loading" />

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <Button @click="goBack">Вернуться к списку</Button>
    </div>

    <div v-else class="details-container">
      <!-- Хлебные крошки -->
      <nav class="breadcrumbs" aria-label="breadcrumb">
        <span class="breadcrumb-link" @click="$router.push('/assessments')">Аттестации</span>
        <span class="breadcrumb-sep">›</span>
        <span class="breadcrumb-current">Детали аттестации</span>
      </nav>

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

.breadcrumbs {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 24px;
}

.breadcrumb-link {
  color: var(--accent-blue);
  cursor: pointer;
  text-decoration: none;
}

.breadcrumb-link:hover {
  text-decoration: underline;
}

.breadcrumb-sep {
  color: var(--text-secondary);
  opacity: 0.5;
}

.breadcrumb-current {
  color: var(--text-primary);
  font-weight: 500;
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
</style>

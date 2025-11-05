<template>
  <div class="create-assessment-view">
    <!-- Заголовок с навигацией -->
    <div class="page-header">
      <Button variant="ghost" icon="arrow-left" @click="goBack"> Назад к списку </Button>
      <h1 class="page-title">Создать аттестацию</h1>
    </div>

    <!-- Мастер создания -->
    <Card class="wizard-container">
      <AssessmentWizard @submit="handleSubmit" @cancel="goBack" />
    </Card>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";
import Card from "../components/ui/Card.vue";
import Button from "../components/ui/Button.vue";
import AssessmentWizard from "../components/AssessmentWizard.vue";

const router = useRouter();

const goBack = () => {
  router.push("/assessments");
};

const handleSubmit = () => {
  router.push("/assessments");
};
</script>

<style scoped>
.create-assessment-view {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
}

.page-title {
  font-size: 30px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.wizard-container {
  padding: 32px;
}

@media (max-width: 768px) {
  .page-title {
    font-size: 24px;
  }

  .wizard-container {
    padding: 16px;
  }
}
</style>

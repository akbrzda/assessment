<template>
  <div class="question-details-view">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <Button variant="ghost" icon="arrow-left" @click="goBack"> Назад к списку</Button>
        <h2 class="page-heading">Просмотр вопроса</h2>
      </div>
      <div class="header-actions">
        <Button variant="secondary" @click="goToEdit"> Редактировать </Button>
      </div>
    </div>

    <!-- Content Card -->
    <Card>
      <QuestionView :questionId="questionId" />
    </Card>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import Card from "../components/ui/Card.vue";
import Button from "../components/ui/Button.vue";
import QuestionView from "../components/QuestionView.vue";

const router = useRouter();
const route = useRoute();

const questionId = computed(() => Number(route.params.id));

const goBack = () => {
  router.push("/questions");
};

const goToEdit = () => {
  router.push(`/questions/${questionId.value}/edit`);
};
</script>

<style scoped>
.question-details-view {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 0 16px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32px;
  gap: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-heading {
  font-size: 32px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.back-button {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  height: 44px;
  border-radius: 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--divider);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 24px;
  line-height: 1;
  flex-shrink: 0;
}

.back-button:hover {
  background: var(--accent-blue);
  color: white;
  border-color: var(--accent-blue);
  transform: translateY(-1px);
  box-shadow: var(--card-shadow);
}

.back-button:active {
  transform: translateY(0);
}

.header-actions {
  display: flex;
  gap: 12px;
}

@media (max-width: 768px) {
  .page-heading {
    font-size: 24px;
  }

  .page-header {
    flex-wrap: wrap;
  }

  .header-actions {
    width: 100%;
    order: 3;
  }

  .question-details-view {
    padding: 0 8px;
  }
}
</style>

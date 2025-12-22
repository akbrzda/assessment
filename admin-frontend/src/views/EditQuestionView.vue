<template>
  <div class="edit-question-view">
    <!-- Header -->
    <div class="page-header">
      <Button variant="ghost" icon="arrow-left" @click="goBack"> Назад</Button>
      <h2 class="page-heading">Редактировать вопрос</h2>
    </div>

    <!-- Form Card -->
    <Card>
      <QuestionForm :questionId="questionId" :categories="categories" @submit="handleSubmit" @cancel="goBack" />
    </Card>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { getCategories } from "../api/questionBank";
import Card from "../components/ui/Card.vue";
import QuestionForm from "../components/QuestionForm.vue";
import Button from "../components/ui/Button.vue";

const router = useRouter();
const route = useRoute();
const categories = ref([]);

const questionId = computed(() => Number(route.params.id));

const loadCategories = async () => {
  try {
    const data = await getCategories();
    categories.value = data.categories;
  } catch (error) {
    console.error("Load categories error:", error);
  }
};

const handleSubmit = () => {
  router.push("/questions");
};

const goBack = () => {
  router.push("/questions");
};

onMounted(() => {
  loadCategories();
});
</script>

<style scoped>
.edit-question-view {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 0 16px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
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

@media (max-width: 768px) {
  .page-heading {
    font-size: 24px;
  }

  .edit-question-view {
    padding: 0 8px;
  }
}
</style>

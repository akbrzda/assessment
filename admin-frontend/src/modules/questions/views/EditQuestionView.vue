<template>
  <div class="edit-question-view">
    <PageHeader title="Редактировать вопрос">
      <template #actions>
        <Button variant="secondary" icon="arrow-left" @click="goBack">Назад</Button>
      </template>
    </PageHeader>

    <!-- Form Card -->
    <Card>
      <QuestionForm :questionId="questionId" :categories="categories" @submit="handleSubmit" @cancel="goBack" />
    </Card>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { getCategories } from "@/api/questionBank";
import Card from "@/components/ui/Card.vue";
import QuestionForm from "@/modules/questions/components/QuestionForm.vue";
import Button from "@/components/ui/Button.vue";
import PageHeader from "@/components/ui/PageHeader.vue";

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

@media (max-width: 768px) {
  .edit-question-view {
    padding: 0 8px;
  }
}
</style>

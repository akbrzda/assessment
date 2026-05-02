<template>
  <div class="question-details-view">
    <PageHeader title="Просмотр вопроса">
      <template #actions>
        <Button variant="secondary" icon="arrow-left" @click="goBack">Назад</Button>
        <Button variant="secondary" @click="goToEdit"> Редактировать </Button>
      </template>
    </PageHeader>

    <!-- Content Card -->
    <Card>
      <QuestionView :questionId="questionId" />
    </Card>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import Card from "@/components/ui/Card.vue";
import Button from "@/components/ui/Button.vue";
import PageHeader from "@/components/ui/PageHeader.vue";
import QuestionView from "@/modules/questions/components/QuestionView.vue";

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

@media (max-width: 768px) {
  .question-details-view {
    padding: 0 8px;
  }
}
</style>

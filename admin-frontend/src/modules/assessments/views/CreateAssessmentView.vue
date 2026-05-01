<template>
  <div class="create-assessment-view">
    <AssessmentWizard @submit="handleSubmit" @cancel="goBack" />
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";
import AssessmentWizard from "@/modules/assessments/components/AssessmentWizard.vue";

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
}
</style>

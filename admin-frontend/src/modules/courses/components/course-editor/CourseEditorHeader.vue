<template>
  <div class="course-editor-header">
    <div class="course-editor-header-left">
      <Button variant="ghost" icon="arrow-left" size="sm" @click="emit('back')">К списку курсов</Button>
    </div>
    <div class="course-editor-header-right">
      <Button v-if="currentStep < totalSteps" :loading="saving" :disabled="!canProceed" @click="emit('next')">Далее</Button>
      <Button v-else variant="secondary" :loading="saving" @click="emit('save')">Сохранить</Button>
    </div>
  </div>
</template>

<script setup>
import { Button } from "@/components/ui";

defineProps({
  currentStep: { type: Number, required: true },
  totalSteps: { type: Number, required: true },
  canProceed: { type: Boolean, required: true },
  saving: { type: Boolean, required: true },
});

const emit = defineEmits(["back", "next", "save"]);
</script>

<style scoped>
.course-editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}

.course-editor-header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.course-editor-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.course-editor-header-left :deep(.button),
.course-editor-header-right :deep(.button) {
  border-radius: var(--course-radius-md);
  font-size: 14px;
  font-weight: 600;
  min-height: 38px;
  box-shadow: none;
}

.course-editor-header-left :deep(.button-ghost) {
  border: 1px solid var(--course-border);
  background: #fff;
  color: #344054;
}

.course-editor-header-right :deep(.button-primary) {
  background: var(--course-accent-strong);
  color: #fff;
}

.course-editor-header-right :deep(.button-primary:hover:not(.button-disabled)) {
  background: #4f37e8;
  opacity: 1;
}

.course-editor-header-right :deep(.button-secondary) {
  border: 1px solid var(--course-border);
  background: #fff;
  color: #344054;
}
</style>

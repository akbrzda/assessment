<template>
  <div class="course-stepper">
    <div
      v-for="(step, index) in steps"
      :key="step.id"
      class="stepper-item"
      :class="{
        'stepper-active': currentStep === step.id,
        'stepper-completed': currentStep > step.id,
        'stepper-disabled': step.id > currentStep,
      }"
      @click="handleStepClick(step.id)"
    >
      <div v-if="index > 0" class="stepper-connector"></div>
      <div class="stepper-bubble">
        <Check v-if="currentStep > step.id" :size="14" :stroke-width="2.5" />
        <span v-else>{{ step.id }}</span>
      </div>
      <div class="stepper-labels">
        <span class="stepper-title">{{ step.title }}</span>
        <span class="stepper-subtitle">{{ step.subtitle }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Check } from "lucide-vue-next";

const props = defineProps({
  steps: { type: Array, required: true },
  currentStep: { type: Number, required: true },
});

const emit = defineEmits(["step-click"]);

const handleStepClick = (stepId) => {
  if (stepId > props.currentStep) {
    return;
  }
  emit("step-click", stepId);
};
</script>

<style scoped>
.course-stepper {
  display: flex;
  align-items: center;
  background: var(--course-surface);
  border: 1px solid var(--course-border);
  border-radius: var(--course-radius-lg);
  padding: 16px 18px;
  margin-bottom: 18px;
  overflow-x: auto;
  box-shadow: var(--course-shadow);
}

.stepper-item {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.stepper-item.stepper-disabled {
  cursor: not-allowed;
}

.stepper-connector {
  flex: 0 0 28px;
  height: 1px;
  background: var(--course-border);
  margin-right: 8px;
  flex-shrink: 0;
}

.stepper-item.stepper-completed .stepper-connector {
  background: var(--course-accent-strong);
}

.stepper-bubble {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
  border: 1px solid var(--course-border);
  background: #ffffff;
  color: var(--course-text-muted);
  transition: all 0.2s;
}

.stepper-item.stepper-active .stepper-bubble,
.stepper-item.stepper-completed .stepper-bubble {
  border-color: var(--course-accent-strong);
  background: var(--course-accent-strong);
  color: #fff;
}

.stepper-labels {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.stepper-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--course-text);
  white-space: nowrap;
}

.stepper-subtitle {
  font-size: 12px;
  color: var(--course-text-soft);
  white-space: nowrap;
}

.stepper-item.stepper-active .stepper-title {
  color: var(--course-accent-strong);
}
</style>

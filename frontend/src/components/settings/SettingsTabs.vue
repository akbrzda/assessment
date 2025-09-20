<template>
  <div class="tabs">
    <button
      v-for="tab in tabs"
      :key="tab.value"
      type="button"
      class="tabs__button"
      :class="{ 'tabs__button--active': modelValue === tab.value }"
      @click="$emit('update:modelValue', tab.value)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: {
    type: String,
    required: true
  },
  tabs: {
    type: Array,
    default: () => []
  }
});
</script>

<style scoped>
.tabs {
  display: flex;
  gap: 8px;
  background: var(--tg-theme-secondary-bg-color, #f5f7fb);
  border-radius: 14px;
  padding: 6px;
  width: fit-content;
}

.tabs__button {
  border: none;
  border-radius: 10px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  background: transparent;
  color: var(--tg-theme-hint-color, #6f7a8b);
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.tabs__button--active {
  background: var(--tg-theme-button-color, #0a84ff);
  color: var(--tg-theme-button-text-color, #ffffff);
}
</style>

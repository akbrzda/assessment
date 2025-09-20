<template>
  <section class="card">
    <h2 v-if="title" class="card__title">{{ title }}</h2>
    <slot />
  </section>
</template>

<script setup>
const props = defineProps({
  title: {
    type: String,
    default: ''
  }
});
</script>

<style scoped>
.card {
  background: var(--tg-theme-bg-color, #ffffff);
  border-radius: 16px;
  box-shadow: 0 4px 18px rgba(15, 26, 44, 0.08);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}
</style>

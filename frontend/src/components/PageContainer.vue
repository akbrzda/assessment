<template>
  <div class="page">
    <header class="page__header" v-if="title || subtitle">
      <div>
        <h1 class="page__title">{{ title }}</h1>
        <p v-if="subtitle" class="page__subtitle">{{ subtitle }}</p>
      </div>
      <slot name="header-actions" />
    </header>
    <main class="page__content">
      <slot />
    </main>
  </div>
</template>

<script setup>
const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  subtitle: {
    type: String,
    default: ''
  }
});
</script>

<style scoped>
.page {
  padding: 16px;
  padding-bottom: calc(80px + env(safe-area-inset-bottom));
}

.page__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}

.page__title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.page__subtitle {
  margin: 4px 0 0;
  color: var(--tg-theme-hint-color, #6f7a8b);
  font-size: 14px;
}

.page__content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>

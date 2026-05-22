<template>
  <main class="module-disabled-page">
    <section class="module-disabled-card">
      <h1 class="title-medium">Раздел временно отключен</h1>
      <p class="body-medium text-secondary">
        Этот модуль сейчас недоступен. Обратитесь к администратору системы, если доступ нужен для вашей работы.
      </p>
      <p v-if="moduleCode" class="body-small text-secondary">Код модуля: <strong>{{ moduleCode }}</strong></p>
    </section>
  </main>
</template>

<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const moduleCode = computed(() => String(route.query.module || "").trim());
</script>

<style scoped>
.module-disabled-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.module-disabled-card {
  width: 100%;
  max-width: 520px;
  border: 1px solid var(--divider);
  border-radius: 16px;
  background: var(--bg-secondary);
  padding: 20px;
}
</style>

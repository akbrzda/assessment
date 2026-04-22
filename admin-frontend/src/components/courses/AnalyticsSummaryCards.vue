<template>
  <div class="summary-grid">
    <article v-for="card in cards" :key="card.title" class="summary-card">
      <h3>{{ card.title }}</h3>
      <p>{{ card.description }}</p>
      <span class="stub">Данные появятся после подключения источника</span>
    </article>
  </div>
</template>

<script setup>
const cards = [
  {
    title: "Конверсия в завершение",
    description: "Доля пользователей, дошедших до финальной аттестации по курсу.",
  },
  {
    title: "Среднее время прохождения",
    description: "Время от старта курса до завершения обязательных тем.",
  },
  {
    title: "Проблемные темы",
    description: "Темы курса с наибольшим числом повторных попыток и блокировок.",
  },
];
</script>

<style scoped>
.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.summary-card {
  border: 1px solid var(--divider);
  border-radius: 12px;
  padding: 14px;
  background: var(--surface, #fff);
}

.summary-card h3 {
  margin: 0 0 6px;
  font-size: 15px;
}

.summary-card p {
  margin: 0 0 10px;
  font-size: 13px;
  color: var(--text-secondary);
}

.stub {
  display: inline-flex;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.15);
  color: #475569;
  font-size: 12px;
}

@media (max-width: 1024px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
